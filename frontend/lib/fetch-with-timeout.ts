/**
 * 带超时的 fetch，避免 DApp 内置浏览器 / 弱网下请求挂死导致 UI 永久「加载中」。
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 22000, ...rest } = init
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(input, { ...rest, signal: ctrl.signal })
  } finally {
    clearTimeout(id)
  }
}
