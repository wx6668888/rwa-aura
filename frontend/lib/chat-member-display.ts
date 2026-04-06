/** 官方群展示基数 */
export const OFFICIAL_GROUP_MEMBER_DISPLAY_MIN = 3564;

/** 其余公共频道：略高于真实在线人数 */
const CHANNEL_MEMBER_DISPLAY_MIN: Partial<Record<string, number>> = {
  'room-announcements': 412,
  'room-staking': 628,
  'room-trading': 715,
  'room-vip': 384,
};

/** 不含定时「膨胀」的展示基数：各频道保底与真实 memberIds 的较大值 */
export function getBaseDisplayedMemberCount(room: { id: string; memberIds?: string[] } | undefined): number {
  if (!room) return 0;
  const n = room.memberIds?.length ?? 0;
  const floor = CHANNEL_MEMBER_DISPLAY_MIN[room.id];
  if (room.id === 'room-general') return Math.max(OFFICIAL_GROUP_MEMBER_DISPLAY_MIN, n);
  if (typeof floor === 'number') return Math.max(floor, n);
  return n;
}
