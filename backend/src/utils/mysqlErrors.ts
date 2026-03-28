/** MySQL 重复键（唯一索引冲突），用于日结占位 INSERT 防重 */
export function isMysqlDuplicateKey(err: unknown): boolean {
  const e = err as { errno?: number; code?: string };
  return e?.errno === 1062 || e?.code === 'ER_DUP_ENTRY';
}
