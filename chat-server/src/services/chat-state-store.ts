/** 全员可见的官方房间 id（与 ChatService.createDefaultRooms 一致） */
export const OFFICIAL_CHAT_ROOM_IDS = [
  'room-general',
  'room-announcements',
  'room-staking',
  'room-trading',
  'room-vip',
] as const;

export const OFFICIAL_CHAT_ROOM_ID_SET = new Set<string>(OFFICIAL_CHAT_ROOM_IDS);

type ChatStateRow = {
  state_json: string;
  updated_at: Date | string;
};

type MysqlPoolLike = {
  query: (sql: string, params?: any[]) => Promise<[any[], any]>;
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export class ChatStateStore {
  private pool: MysqlPoolLike;
  private readonly stateKey = 'default';
  private readonly tableName = 'chat_state_snapshots';
  private lastSnapshotSyncAt = 0;
  private lastNormalizedSyncAt = 0;

  constructor() {
    // Reuse backend-installed mysql2 to avoid chat-server dependency permission mismatch.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mysql = require('/www/wwwroot/rwaprotocol.dpdns.org/backend/node_modules/mysql2/promise');
    const host = process.env.CHAT_DB_HOST || process.env.DB_HOST || '127.0.0.1';
    const port = Number(process.env.CHAT_DB_PORT || process.env.DB_PORT || 3306);
    const user = process.env.CHAT_DB_USER || process.env.DB_USER || 'root';
    const password = process.env.CHAT_DB_PASSWORD || process.env.DB_PASSWORD || '';
    const database = process.env.CHAT_DB_NAME || process.env.DB_NAME || 'rwa_protocol';

    this.pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 5,
      charset: 'utf8mb4',
    });
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS \`${this.tableName}\` (
        state_key VARCHAR(64) NOT NULL PRIMARY KEY,
        state_json LONGTEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    await this.ensureNormalizedSchema();
  }

  private async ensureNormalizedSchema(): Promise<void> {
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS chat_users (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        address VARCHAR(128) NOT NULL,
        nickname VARCHAR(255) NOT NULL,
        avatar VARCHAR(255) NULL,
        node_level VARCHAR(16) NOT NULL,
        is_bot TINYINT(1) NOT NULL DEFAULT 0,
        is_admin TINYINT(1) NOT NULL DEFAULT 0,
        is_online TINYINT(1) NOT NULL DEFAULT 0,
        mute_until_ms BIGINT NOT NULL DEFAULT 0,
        last_seen BIGINT NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_chat_users_address (address)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS chat_rooms (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        type VARCHAR(32) NOT NULL,
        icon VARCHAR(64) NULL,
        owner_id VARCHAR(64) NOT NULL,
        is_public TINYINT(1) NOT NULL DEFAULT 1,
        min_token_gate DOUBLE NOT NULL DEFAULT 0,
        invite_code VARCHAR(32) NULL,
        created_at BIGINT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_chat_rooms_invite_code (invite_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS chat_room_members (
        room_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (room_id, user_id),
        KEY idx_chat_room_members_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        room_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        content LONGTEXT NOT NULL,
        type VARCHAR(32) NOT NULL,
        reply_to VARCHAR(64) NULL,
        ts BIGINT NOT NULL,
        edited TINYINT(1) NOT NULL DEFAULT 0,
        metadata_json LONGTEXT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_chat_messages_room_ts (room_id, ts),
        KEY idx_chat_messages_user_ts (user_id, ts)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS chat_reports (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        reporter_user_id VARCHAR(64) NOT NULL,
        target_user_id VARCHAR(64) NULL,
        room_id VARCHAR(64) NULL,
        message_id VARCHAR(64) NULL,
        category VARCHAR(64) NOT NULL,
        reason_text TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'open',
        reviewed_by VARCHAR(64) NULL,
        reviewed_at BIGINT NULL,
        resolution_note TEXT NULL,
        created_at BIGINT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_chat_reports_status_created (status, created_at),
        KEY idx_chat_reports_reporter (reporter_user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS chat_admin_audit_logs (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        operator_user_id VARCHAR(64) NOT NULL,
        action VARCHAR(128) NOT NULL,
        target_type VARCHAR(64) NULL,
        target_id VARCHAR(128) NULL,
        detail_json LONGTEXT NULL,
        created_at BIGINT NOT NULL,
        KEY idx_chat_admin_audit_logs_operator_created (operator_user_id, created_at),
        KEY idx_chat_admin_audit_logs_action_created (action, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    try {
      await this.pool.query(
        `ALTER TABLE chat_users
         ADD COLUMN mute_until_ms BIGINT NOT NULL DEFAULT 0`
      );
    } catch (e: any) {
      // MySQL/MariaDB compatibility: ignore when column already exists.
      if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    try {
      await this.pool.query(`ALTER TABLE chat_rooms ADD COLUMN invite_code VARCHAR(32) NULL`);
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    try {
      await this.pool.query(`CREATE UNIQUE INDEX uniq_chat_rooms_invite_code ON chat_rooms (invite_code)`);
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME' && e?.errno !== 1061) throw e;
    }
  }

  async loadSnapshot(): Promise<any | null> {
    const [rowsAny] = await this.pool.query(
      `SELECT state_json, updated_at FROM \`${this.tableName}\` WHERE state_key = ? LIMIT 1`,
      [this.stateKey]
    );
    const rows = rowsAny as ChatStateRow[];
    const row = rows?.[0];
    if (!row?.state_json) return null;
    try {
      return JSON.parse(row.state_json);
    } catch {
      return null;
    }
  }

  async saveSnapshot(snapshot: unknown): Promise<void> {
    const stateJson = JSON.stringify(snapshot ?? {});
    await this.pool.query(
      `INSERT INTO \`${this.tableName}\` (state_key, state_json) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE state_json = VALUES(state_json), updated_at = CURRENT_TIMESTAMP`,
      [this.stateKey, stateJson]
    );
    this.lastSnapshotSyncAt = Date.now();
  }

  async syncNormalizedFromSnapshot(snapshot: any): Promise<void> {
    const users = Array.isArray(snapshot?.users) ? snapshot.users : [];
    const rooms = Array.isArray(snapshot?.rooms) ? snapshot.rooms : [];
    const messagesMap = snapshot?.messages && typeof snapshot.messages === 'object' ? snapshot.messages : {};

    const roomMembers: Array<{ roomId: string; userId: string }> = [];
    for (const r of rooms) {
      const members = Array.isArray(r?.memberIds) ? r.memberIds : [];
      for (const m of members) {
        roomMembers.push({ roomId: String(r.id || ''), userId: String(m || '') });
      }
    }

    const messages: any[] = [];
    for (const [roomId, list] of Object.entries(messagesMap)) {
      if (!Array.isArray(list)) continue;
      for (const msg of list) {
        messages.push({ ...msg, roomId: msg?.roomId || roomId });
      }
    }

    await this.pool.query('START TRANSACTION');
    try {
      for (const u of users) {
        await this.pool.query(
          `INSERT INTO chat_users
            (id, address, nickname, avatar, node_level, is_bot, is_admin, is_online, mute_until_ms, last_seen, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             address = VALUES(address),
             nickname = VALUES(nickname),
             avatar = VALUES(avatar),
             node_level = VALUES(node_level),
             is_bot = VALUES(is_bot),
             is_admin = VALUES(is_admin),
             is_online = VALUES(is_online),
             mute_until_ms = VALUES(mute_until_ms),
             last_seen = VALUES(last_seen),
             created_at = VALUES(created_at),
             updated_at = CURRENT_TIMESTAMP`,
          [
            String(u?.id || ''),
            String(u?.address || ''),
            String(u?.nickname || ''),
            u?.avatar ? String(u.avatar) : null,
            String(u?.nodeLevel || 'L1'),
            u?.isBot ? 1 : 0,
            u?.isAdmin ? 1 : 0,
            u?.isOnline ? 1 : 0,
            Number((u as any)?.muteUntilMs || 0),
            Number(u?.lastSeen || 0),
            Number(u?.createdAt || 0),
          ]
        );
      }

      for (const r of rooms) {
        await this.pool.query(
          `INSERT INTO chat_rooms
            (id, name, description, type, icon, owner_id, is_public, min_token_gate, created_at, invite_code)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             name = VALUES(name),
             description = VALUES(description),
             type = VALUES(type),
             icon = VALUES(icon),
             owner_id = VALUES(owner_id),
             is_public = VALUES(is_public),
             min_token_gate = VALUES(min_token_gate),
             created_at = VALUES(created_at),
             invite_code = VALUES(invite_code),
             updated_at = CURRENT_TIMESTAMP`,
          [
            String(r?.id || ''),
            String(r?.name || ''),
            String(r?.description || ''),
            String(r?.type || 'group'),
            r?.icon ? String(r.icon) : null,
            String(r?.ownerId || ''),
            r?.isPublic ? 1 : 0,
            Number(r?.minTokenGate || 0),
            Number(r?.createdAt || 0),
            r?.inviteCode ? String(r.inviteCode) : null,
          ]
        );
      }

      const membersByRoom = new Map<string, Set<string>>();
      for (const rm of roomMembers) {
        const roomId = String(rm.roomId || '');
        const userId = String(rm.userId || '');
        if (!roomId || !userId) continue;
        const set = membersByRoom.get(roomId) || new Set<string>();
        set.add(userId);
        membersByRoom.set(roomId, set);
      }
      for (const r of rooms) {
        const roomId = String(r?.id || '');
        if (!roomId) continue;
        const nextMembers = Array.from(membersByRoom.get(roomId) || new Set<string>());
        const [rows] = await this.pool.query(
          `SELECT user_id AS userId FROM chat_room_members WHERE room_id = ?`,
          [roomId]
        );
        const currentMembers = (rows as Array<{ userId: string }>).map((x) => String(x.userId));
        const nextSet = new Set(nextMembers);
        const currentSet = new Set(currentMembers);
        const toInsert = nextMembers.filter((x) => !currentSet.has(x));
        const toDelete = currentMembers.filter((x) => !nextSet.has(x));

        for (const uid of toInsert) {
          await this.pool.query(`INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)`, [roomId, uid]);
        }
        for (const chunk of chunkArray(toDelete, 200)) {
          if (chunk.length === 0) continue;
          const placeholders = chunk.map(() => '?').join(',');
          await this.pool.query(
            `DELETE FROM chat_room_members WHERE room_id = ? AND user_id IN (${placeholders})`,
            [roomId, ...chunk]
          );
        }
      }

      const messageIdsByRoom = new Map<string, Set<string>>();
      for (const m of messages) {
        const roomId = String(m?.roomId || '');
        const msgId = String(m?.id || '');
        if (!roomId || !msgId) continue;
        const set = messageIdsByRoom.get(roomId) || new Set<string>();
        set.add(msgId);
        messageIdsByRoom.set(roomId, set);

        await this.pool.query(
          `INSERT INTO chat_messages
            (id, room_id, user_id, content, type, reply_to, ts, edited, metadata_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             room_id = VALUES(room_id),
             user_id = VALUES(user_id),
             content = VALUES(content),
             type = VALUES(type),
             reply_to = VALUES(reply_to),
             ts = VALUES(ts),
             edited = VALUES(edited),
             metadata_json = VALUES(metadata_json),
             updated_at = CURRENT_TIMESTAMP`,
          [
            msgId,
            roomId,
            String(m?.userId || ''),
            String(m?.content || ''),
            String(m?.type || 'text'),
            m?.replyTo ? String(m.replyTo) : null,
            Number(m?.timestamp || 0),
            m?.edited ? 1 : 0,
            m?.metadata ? JSON.stringify(m.metadata) : null,
          ]
        );
      }

      // Keep DB room messages strictly aligned with latest snapshot by room.
      for (const r of rooms) {
        const roomId = String(r?.id || '');
        if (!roomId) continue;
        const nextIds = Array.from(messageIdsByRoom.get(roomId) || new Set<string>());
        const [rows] = await this.pool.query(`SELECT id FROM chat_messages WHERE room_id = ?`, [roomId]);
        const currentIds = (rows as Array<{ id: string }>).map((x) => String(x.id));
        if (nextIds.length === 0) {
          await this.pool.query(`DELETE FROM chat_messages WHERE room_id = ?`, [roomId]);
          continue;
        }
        const nextSet = new Set(nextIds);
        const staleIds = currentIds.filter((id) => !nextSet.has(id));
        for (const chunk of chunkArray(staleIds, 200)) {
          if (chunk.length === 0) continue;
          const placeholders = chunk.map(() => '?').join(',');
          await this.pool.query(
            `DELETE FROM chat_messages WHERE room_id = ? AND id IN (${placeholders})`,
            [roomId, ...chunk]
          );
        }
      }

      await this.pool.query('COMMIT');
      this.lastNormalizedSyncAt = Date.now();
    } catch (e) {
      await this.pool.query('ROLLBACK');
      throw e;
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async getSnapshotUpdatedAt(): Promise<number | null> {
    try {
      const [rowsAny] = await this.pool.query(
        `SELECT UNIX_TIMESTAMP(updated_at) AS updatedAtUnix
         FROM \`${this.tableName}\`
         WHERE state_key = ? LIMIT 1`,
        [this.stateKey]
      );
      const row = (rowsAny as Array<{ updatedAtUnix?: number }>)[0];
      if (!row?.updatedAtUnix) return null;
      return Number(row.updatedAtUnix) * 1000;
    } catch {
      return null;
    }
  }

  getLastSnapshotSyncAt(): number {
    return this.lastSnapshotSyncAt;
  }

  getLastNormalizedSyncAt(): number {
    return this.lastNormalizedSyncAt;
  }

  async getRoomsForUser(userId?: string): Promise<any[]> {
    const officialPlaceholders = OFFICIAL_CHAT_ROOM_IDS.map(() => '?').join(',');
    const officialParams = [...OFFICIAL_CHAT_ROOM_IDS];

    if (!userId) {
      const [rows] = await this.pool.query(
        `SELECT id, name, description, type, icon, owner_id AS ownerId, is_public AS isPublic, min_token_gate AS minTokenGate, created_at AS createdAt, invite_code AS inviteCode
         FROM chat_rooms
         WHERE id IN (${officialPlaceholders})
         ORDER BY (id = 'room-general') DESC, created_at ASC, id ASC`,
        officialParams
      );
      const rooms = rows as any[];
      for (const r of rooms) r.memberIds = await this.getRoomMemberIds(String(r.id));
      return rooms;
    }

    const [rows] = await this.pool.query(
      `SELECT DISTINCT r.id, r.name, r.description, r.type, r.icon, r.owner_id AS ownerId, r.is_public AS isPublic, r.min_token_gate AS minTokenGate, r.created_at AS createdAt, r.invite_code AS inviteCode
       FROM chat_rooms r
       LEFT JOIN chat_room_members m ON m.room_id = r.id AND m.user_id = ?
       WHERE r.id IN (${officialPlaceholders}) OR m.user_id IS NOT NULL
       ORDER BY (r.id = 'room-general') DESC, r.created_at ASC, r.id ASC`,
      [userId, ...officialParams]
    );
    const rooms = rows as any[];
    for (const r of rooms) r.memberIds = await this.getRoomMemberIds(String(r.id));
    return rooms;
  }

  async getRoomMemberIds(roomId: string): Promise<string[]> {
    const [rows] = await this.pool.query(`SELECT user_id AS userId FROM chat_room_members WHERE room_id = ?`, [roomId]);
    return (rows as Array<{ userId: string }>).map((r) => String(r.userId));
  }

  async isRoomMember(roomId: string, userId: string): Promise<boolean> {
    const [rows] = await this.pool.query(
      `SELECT 1 AS ok FROM chat_room_members WHERE room_id = ? AND user_id = ? LIMIT 1`,
      [roomId, userId]
    );
    return (rows as any[]).length > 0;
  }

  async getRoomById(roomId: string): Promise<any | null> {
    const [rows] = await this.pool.query(
      `SELECT id, name, description, type, icon, owner_id AS ownerId, is_public AS isPublic, min_token_gate AS minTokenGate, created_at AS createdAt, invite_code AS inviteCode
       FROM chat_rooms WHERE id = ? LIMIT 1`,
      [roomId]
    );
    const row = (rows as any[])[0];
    if (!row) return null;
    row.memberIds = await this.getRoomMemberIds(String(row.id));
    return row;
  }

  async getMessagesByRoom(roomId: string, limit = 50, before?: number): Promise<any[]> {
    const lim = Math.max(1, Math.min(200, Math.floor(limit || 50)));
    if (before && Number.isFinite(before)) {
      const [rows] = await this.pool.query(
        `SELECT id, room_id AS roomId, user_id AS userId, content, type, reply_to AS replyTo, ts AS timestamp, edited, metadata_json AS metadataJson
         FROM chat_messages
         WHERE room_id = ? AND ts < ?
         ORDER BY ts DESC
         LIMIT ?`,
        [roomId, Number(before), lim]
      );
      return (rows as any[]).reverse().map((r) => ({
        ...r,
        edited: !!r.edited,
        metadata: r.metadataJson ? JSON.parse(r.metadataJson) : undefined,
      }));
    }
    const [rows] = await this.pool.query(
      `SELECT id, room_id AS roomId, user_id AS userId, content, type, reply_to AS replyTo, ts AS timestamp, edited, metadata_json AS metadataJson
       FROM chat_messages
       WHERE room_id = ?
       ORDER BY ts DESC
       LIMIT ?`,
      [roomId, lim]
    );
    return (rows as any[]).reverse().map((r) => ({
      ...r,
      edited: !!r.edited,
      metadata: r.metadataJson ? JSON.parse(r.metadataJson) : undefined,
    }));
  }

  async getMessagesAround(roomId: string, messageId: string, limit = 50): Promise<any[]> {
    const lim = Math.min(100, Math.max(10, Math.floor(limit || 50)));
    const [targetRows] = await this.pool.query(
      `SELECT ts FROM chat_messages WHERE id = ? AND room_id = ? LIMIT 1`,
      [messageId, roomId]
    );
    const target = (targetRows as Array<{ ts: number }>)[0];
    if (!target) return [];
    const targetTs = Number(target.ts || 0);

    const half = Math.floor(lim / 2);
    const [beforeRows] = await this.pool.query(
      `SELECT id, room_id AS roomId, user_id AS userId, content, type, reply_to AS replyTo, ts AS timestamp, edited, metadata_json AS metadataJson
       FROM chat_messages
       WHERE room_id = ? AND ts <= ?
       ORDER BY ts DESC
       LIMIT ?`,
      [roomId, targetTs, half + 1]
    );
    const [afterRows] = await this.pool.query(
      `SELECT id, room_id AS roomId, user_id AS userId, content, type, reply_to AS replyTo, ts AS timestamp, edited, metadata_json AS metadataJson
       FROM chat_messages
       WHERE room_id = ? AND ts > ?
       ORDER BY ts ASC
       LIMIT ?`,
      [roomId, targetTs, lim]
    );

    const combined = [...(beforeRows as any[]).reverse(), ...(afterRows as any[])];
    return combined.slice(0, lim).map((r) => ({
      ...r,
      edited: !!r.edited,
      metadata: r.metadataJson ? JSON.parse(r.metadataJson) : undefined,
    }));
  }

  async searchMessagesGlobalByUserRooms(userId: string, query: string, limit = 40): Promise<any[]> {
    const q = String(query || '').trim().toLowerCase();
    if (q.length < 2) return [];
    const lim = Math.min(200, Math.max(1, Math.floor(limit || 40)));
    const officialPlaceholders = OFFICIAL_CHAT_ROOM_IDS.map(() => '?').join(',');
    const officialParams = [...OFFICIAL_CHAT_ROOM_IDS];
    const [rows] = await this.pool.query(
      `SELECT m.id, m.room_id AS roomId, m.user_id AS userId, m.content, m.type, m.reply_to AS replyTo, m.ts AS timestamp, m.edited, m.metadata_json AS metadataJson
       FROM chat_messages m
       INNER JOIN chat_rooms r ON r.id = m.room_id
       LEFT JOIN chat_room_members mem ON mem.room_id = r.id AND mem.user_id = ?
       WHERE (r.id IN (${officialPlaceholders}) OR mem.user_id IS NOT NULL)
         AND LOWER(m.content) LIKE CONCAT('%', ?, '%')
       ORDER BY m.ts DESC
       LIMIT ?`,
      [userId, ...officialParams, q, lim]
    );
    return (rows as any[]).map((r) => ({
      ...r,
      edited: !!r.edited,
      metadata: r.metadataJson ? JSON.parse(r.metadataJson) : undefined,
    }));
  }

  async searchUsersByAddressPrefix(prefix: string, limit = 5): Promise<any[]> {
    const p = String(prefix || '').trim().toLowerCase();
    const lim = Math.max(1, Math.min(20, Math.floor(limit || 5)));
    const [rows] = await this.pool.query(
      `SELECT id, address, nickname, avatar, node_level AS nodeLevel, is_bot AS isBot, is_admin AS isAdmin, is_online AS isOnline, last_seen AS lastSeen, created_at AS createdAt
       FROM chat_users
       WHERE address LIKE CONCAT(?, '%') AND is_bot = 0
       ORDER BY last_seen DESC
       LIMIT ?`,
      [p, lim]
    );
    return (rows as any[]).map((r) => ({
      ...r,
      isBot: !!r.isBot,
      isAdmin: !!r.isAdmin,
      isOnline: !!r.isOnline,
    }));
  }

  async getUserById(userId: string): Promise<any | null> {
    const [rows] = await this.pool.query(
      `SELECT id, address, nickname, avatar, node_level AS nodeLevel, is_bot AS isBot, is_admin AS isAdmin, is_online AS isOnline, last_seen AS lastSeen, created_at AS createdAt
       FROM chat_users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const r = (rows as any[])[0];
    if (!r) return null;
    return { ...r, isBot: !!r.isBot, isAdmin: !!r.isAdmin, isOnline: !!r.isOnline };
  }

  async upsertMessage(msg: {
    id: string;
    roomId: string;
    userId: string;
    content: string;
    type: string;
    replyTo?: string;
    timestamp: number;
    edited?: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO chat_messages
        (id, room_id, user_id, content, type, reply_to, ts, edited, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        room_id = VALUES(room_id),
        user_id = VALUES(user_id),
        content = VALUES(content),
        type = VALUES(type),
        reply_to = VALUES(reply_to),
        ts = VALUES(ts),
        edited = VALUES(edited),
        metadata_json = VALUES(metadata_json),
        updated_at = CURRENT_TIMESTAMP`,
      [
        String(msg.id),
        String(msg.roomId),
        String(msg.userId),
        String(msg.content || ''),
        String(msg.type || 'text'),
        msg.replyTo ? String(msg.replyTo) : null,
        Number(msg.timestamp || 0),
        msg.edited ? 1 : 0,
        msg.metadata ? JSON.stringify(msg.metadata) : null,
      ]
    );
  }

  async markMessageEdited(messageId: string, content: string): Promise<void> {
    await this.pool.query(
      `UPDATE chat_messages
       SET content = ?, edited = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [String(content || ''), String(messageId)]
    );
  }

  async setUserOnlineStatus(userId: string, online: boolean, lastSeenMs?: number): Promise<void> {
    await this.pool.query(
      `UPDATE chat_users
       SET is_online = ?, last_seen = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [online ? 1 : 0, Number(lastSeenMs || Date.now()), String(userId)]
    );
  }

  async setUserMuteUntil(userId: string, muteUntilMs: number): Promise<void> {
    await this.pool.query(
      `UPDATE chat_users
       SET mute_until_ms = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [Number(muteUntilMs || 0), String(userId)]
    );
  }

  async addRoomMember(roomId: string, userId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO chat_room_members (room_id, user_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE room_id = VALUES(room_id), user_id = VALUES(user_id)`,
      [String(roomId), String(userId)]
    );
  }

  async removeRoomMember(roomId: string, userId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM chat_room_members WHERE room_id = ? AND user_id = ?`,
      [String(roomId), String(userId)]
    );
  }

  async deleteMessageById(messageId: string): Promise<void> {
    await this.pool.query(`DELETE FROM chat_messages WHERE id = ?`, [String(messageId)]);
  }

  async createReport(input: {
    id: string;
    reporterUserId: string;
    targetUserId?: string;
    roomId?: string;
    messageId?: string;
    category: string;
    reasonText?: string;
    createdAt: number;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO chat_reports
       (id, reporter_user_id, target_user_id, room_id, message_id, category, reason_text, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
      [
        input.id,
        input.reporterUserId,
        input.targetUserId || null,
        input.roomId || null,
        input.messageId || null,
        input.category,
        input.reasonText || null,
        input.createdAt,
      ]
    );
  }

  async listReports(status?: string, limit = 50): Promise<any[]> {
    const lim = Math.max(1, Math.min(200, Math.floor(limit || 50)));
    if (status && status.trim()) {
      const [rows] = await this.pool.query(
        `SELECT id, reporter_user_id AS reporterUserId, target_user_id AS targetUserId, room_id AS roomId, message_id AS messageId,
                category, reason_text AS reasonText, status, reviewed_by AS reviewedBy, reviewed_at AS reviewedAt,
                resolution_note AS resolutionNote, created_at AS createdAt
         FROM chat_reports
         WHERE status = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [status.trim(), lim]
      );
      return rows as any[];
    }
    const [rows] = await this.pool.query(
      `SELECT id, reporter_user_id AS reporterUserId, target_user_id AS targetUserId, room_id AS roomId, message_id AS messageId,
              category, reason_text AS reasonText, status, reviewed_by AS reviewedBy, reviewed_at AS reviewedAt,
              resolution_note AS resolutionNote, created_at AS createdAt
       FROM chat_reports
       ORDER BY created_at DESC
       LIMIT ?`,
      [lim]
    );
    return rows as any[];
  }

  async getReportById(reportId: string): Promise<any | null> {
    const [rows] = await this.pool.query(
      `SELECT id, reporter_user_id AS reporterUserId, target_user_id AS targetUserId, room_id AS roomId, message_id AS messageId,
              category, reason_text AS reasonText, status, reviewed_by AS reviewedBy, reviewed_at AS reviewedAt,
              resolution_note AS resolutionNote, created_at AS createdAt
       FROM chat_reports
       WHERE id = ?
       LIMIT 1`,
      [String(reportId)]
    );
    const arr = rows as any[];
    return arr?.[0] || null;
  }

  async resolveReport(reportId: string, reviewerUserId: string, nextStatus: string, resolutionNote?: string): Promise<boolean> {
    const [ret] = await this.pool.query(
      `UPDATE chat_reports
       SET status = ?, reviewed_by = ?, reviewed_at = ?, resolution_note = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [nextStatus, reviewerUserId, Date.now(), resolutionNote || null, reportId]
    );
    const affected = (ret as any)?.affectedRows || 0;
    return affected > 0;
  }

  async appendAuditLog(input: {
    id: string;
    operatorUserId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    detailJson?: string;
    createdAt: number;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO chat_admin_audit_logs
       (id, operator_user_id, action, target_type, target_id, detail_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.operatorUserId,
        input.action,
        input.targetType || null,
        input.targetId || null,
        input.detailJson || null,
        input.createdAt,
      ]
    );
  }

  async listAuditLogs(input?: {
    operatorUserId?: string;
    action?: string;
    fromMs?: number;
    toMs?: number;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    const where: string[] = [];
    const params: any[] = [];
    if (input?.operatorUserId) {
      where.push('operator_user_id = ?');
      params.push(String(input.operatorUserId));
    }
    if (input?.action) {
      where.push('action = ?');
      params.push(String(input.action));
    }
    if (Number.isFinite(input?.fromMs)) {
      where.push('created_at >= ?');
      params.push(Number(input?.fromMs));
    }
    if (Number.isFinite(input?.toMs)) {
      where.push('created_at <= ?');
      params.push(Number(input?.toMs));
    }
    const lim = Math.max(1, Math.min(200, Math.floor(Number(input?.limit || 50))));
    const off = Math.max(0, Math.floor(Number(input?.offset || 0)));

    const sql = `SELECT id, operator_user_id AS operatorUserId, action, target_type AS targetType, target_id AS targetId, detail_json AS detailJson, created_at AS createdAt
      FROM chat_admin_audit_logs
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`;
    const [rows] = await this.pool.query(sql, [...params, lim, off]);
    return (rows as any[]).map((r) => ({
      ...r,
      detail: r.detailJson ? (() => { try { return JSON.parse(r.detailJson); } catch { return r.detailJson; } })() : null,
    }));
  }
}

