export function stable01(i: number, salt = 0): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453123
  return x - Math.floor(x)
}
