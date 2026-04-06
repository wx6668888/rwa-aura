import type { User } from '../models/types';

/** 与前端 shortWalletAddress 一致：大厅消息列表展示用 */
export function shortWalletForPublicChat(address: string): string {
  const a = (address || '').trim().toLowerCase();
  if (!a.startsWith('0x') || a.length < 12) return a || '0x…';
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/**
 * 客户端消息/广播：机器人对外昵称与真人钱包一致，用地址缩写；内存 User.nickname 仍为人设全名（供 LLM）。
 */
export function toPublicChatUser(user: User): User {
  if (!user.isBot) return user;
  // 群主/管理员机器人保留昵称（如“群主”），其余机器人展示短地址
  if (user.isAdmin) return user;
  return {
    ...user,
    nickname: shortWalletForPublicChat(user.address),
  };
}
