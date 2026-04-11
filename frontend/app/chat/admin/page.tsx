'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { chatHttpUrl } from '@/lib/chat-api'
import { getChatAuthRequestHeaders } from '@/lib/chat-auth-storage'

type ReportStatus = 'open' | 'resolved' | 'rejected' | 'escalated'

type ReportRow = {
  id: string
  reporterUserId: string
  targetUserId?: string | null
  roomId?: string | null
  messageId?: string | null
  category: string
  reasonText?: string | null
  status: ReportStatus
  reviewedBy?: string | null
  reviewedAt?: number | null
  resolutionNote?: string | null
  createdAt: number
}

type AuditRow = {
  id: string
  operatorUserId: string
  action: string
  targetType?: string | null
  targetId?: string | null
  detail?: any
  createdAt: number
}

function fmtTime(ts?: number | null) {
  if (!ts) return '-'
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return String(ts)
  }
}

export default function ChatAdminPage() {
  const [reports, setReports] = useState<ReportRow[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'reports' | 'audit'>('reports')

  const [reportStatus, setReportStatus] = useState<'all' | ReportStatus>('open')
  const [resolveStatus, setResolveStatus] = useState<'resolved' | 'rejected' | 'escalated'>('resolved')
  const [resolutionNote, setResolutionNote] = useState('')
  const [muteMinutes, setMuteMinutes] = useState('0')
  const [deleteMessage, setDeleteMessage] = useState(false)
  const [removeRoomMember, setRemoveRoomMember] = useState(false)
  const [resolvingId, setResolvingId] = useState('')

  const [auditAction, setAuditAction] = useState('')
  const [auditOperatorUserId, setAuditOperatorUserId] = useState('')
  const [auditLimit, setAuditLimit] = useState('50')
  const [auditOffset, setAuditOffset] = useState('0')

  const authHeaders = useMemo(() => getChatAuthRequestHeaders(), [])

  const loadReports = useCallback(async () => {
    if (!authHeaders) {
      setError('未检测到聊天登录态，请先去 /chat 完成钱包签名登录')
      return
    }
    setLoadingReports(true)
    setError('')
    try {
      const q = reportStatus === 'all' ? '' : `?status=${encodeURIComponent(reportStatus)}`
      const res = await fetch(chatHttpUrl(`admin/reports${q}`), { headers: authHeaders })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setReports(Array.isArray(data?.reports) ? data.reports : [])
    } catch (e: any) {
      setError(e?.message || '加载举报失败')
    } finally {
      setLoadingReports(false)
    }
  }, [authHeaders, reportStatus])

  const loadAuditLogs = useCallback(async () => {
    if (!authHeaders) {
      setError('未检测到聊天登录态，请先去 /chat 完成钱包签名登录')
      return
    }
    setLoadingAudit(true)
    setError('')
    try {
      const sp = new URLSearchParams()
      if (auditAction.trim()) sp.set('action', auditAction.trim())
      if (auditOperatorUserId.trim()) sp.set('operatorUserId', auditOperatorUserId.trim())
      sp.set('limit', String(Math.max(1, Math.min(200, Number(auditLimit) || 50))))
      sp.set('offset', String(Math.max(0, Number(auditOffset) || 0)))
      const res = await fetch(chatHttpUrl(`admin/audit-logs?${sp.toString()}`), { headers: authHeaders })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setAuditLogs(Array.isArray(data?.logs) ? data.logs : [])
    } catch (e: any) {
      setError(e?.message || '加载审计日志失败')
    } finally {
      setLoadingAudit(false)
    }
  }, [authHeaders, auditAction, auditOperatorUserId, auditLimit, auditOffset])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  const resolveReport = useCallback(
    async (reportId: string) => {
      if (!authHeaders) return
      setResolvingId(reportId)
      setError('')
      try {
        const res = await fetch(chatHttpUrl(`admin/reports/${reportId}/resolve`), {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: resolveStatus,
            resolutionNote: resolutionNote.trim() || undefined,
            actions: {
              deleteMessage,
              removeRoomMember,
              muteMinutes: Math.max(0, Number(muteMinutes) || 0),
            },
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        await loadReports()
      } catch (e: any) {
        setError(e?.message || '处理举报失败')
      } finally {
        setResolvingId('')
      }
    },
    [authHeaders, resolveStatus, resolutionNote, deleteMessage, removeRoomMember, muteMinutes, loadReports]
  )

  return (
    <div className="min-h-screen bg-[#05050a] text-[#f1f5f9] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">Chat Admin</h1>
          <div className="flex items-center gap-2">
            <Link href="/chat" className="px-3 py-2 rounded border border-[#ffffff22] hover:bg-[#ffffff10] text-sm">
              返回聊天
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            className={`px-3 py-2 rounded text-sm border ${activeTab === 'reports' ? 'bg-[#00f5d4]/15 border-[#00f5d4]/40 text-[#00f5d4]' : 'border-[#ffffff22]'}`}
            onClick={() => setActiveTab('reports')}
          >
            举报工单
          </button>
          <button
            className={`px-3 py-2 rounded text-sm border ${activeTab === 'audit' ? 'bg-[#00f5d4]/15 border-[#00f5d4]/40 text-[#00f5d4]' : 'border-[#ffffff22]'}`}
            onClick={() => setActiveTab('audit')}
          >
            审计日志
          </button>
        </div>

        {activeTab === 'reports' ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#ffffff1a] bg-[#0f1118] p-4 space-y-3">
              <div className="text-sm font-semibold">处理参数（点击任意工单“处理”时生效）</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select value={reportStatus} onChange={(e) => setReportStatus(e.target.value as any)} className="bg-[#0a0a0f] border border-[#ffffff22] rounded px-2 py-2 text-sm">
                  <option value="all">全部状态</option>
                  <option value="open">open</option>
                  <option value="resolved">resolved</option>
                  <option value="rejected">rejected</option>
                  <option value="escalated">escalated</option>
                </select>
                <select value={resolveStatus} onChange={(e) => setResolveStatus(e.target.value as any)} className="bg-[#0a0a0f] border border-[#ffffff22] rounded px-2 py-2 text-sm">
                  <option value="resolved">resolved</option>
                  <option value="rejected">rejected</option>
                  <option value="escalated">escalated</option>
                </select>
                <input value={muteMinutes} onChange={(e) => setMuteMinutes(e.target.value)} placeholder="mute minutes" className="bg-[#0a0a0f] border border-[#ffffff22] rounded px-2 py-2 text-sm" />
                <input value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} placeholder="resolution note" className="bg-[#0a0a0f] border border-[#ffffff22] rounded px-2 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-4 text-sm">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={deleteMessage} onChange={(e) => setDeleteMessage(e.target.checked)} />deleteMessage</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={removeRoomMember} onChange={(e) => setRemoveRoomMember(e.target.checked)} />removeRoomMember</label>
                <button className="px-3 py-1.5 rounded border border-[#ffffff22] hover:bg-[#ffffff10]" onClick={() => void loadReports()}>
                  {loadingReports ? '加载中...' : '刷新举报'}
                </button>
              </div>
            </div>

            <div className="overflow-auto rounded-xl border border-[#ffffff1a] bg-[#0f1118]">
              <table className="w-full text-sm">
                <thead className="bg-[#ffffff08] text-[#94a3b8]">
                  <tr>
                    <th className="text-left p-2">id</th>
                    <th className="text-left p-2">status</th>
                    <th className="text-left p-2">category</th>
                    <th className="text-left p-2">targetUser</th>
                    <th className="text-left p-2">room/message</th>
                    <th className="text-left p-2">reason</th>
                    <th className="text-left p-2">created</th>
                    <th className="text-left p-2">op</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-t border-[#ffffff12]">
                      <td className="p-2 font-mono text-xs">{r.id}</td>
                      <td className="p-2">{r.status}</td>
                      <td className="p-2">{r.category}</td>
                      <td className="p-2 font-mono text-xs">{r.targetUserId || '-'}</td>
                      <td className="p-2 font-mono text-xs">{r.roomId || '-'} / {r.messageId || '-'}</td>
                      <td className="p-2 max-w-[280px] truncate" title={r.reasonText || ''}>{r.reasonText || '-'}</td>
                      <td className="p-2 text-xs">{fmtTime(r.createdAt)}</td>
                      <td className="p-2">
                        <button
                          disabled={resolvingId === r.id}
                          onClick={() => void resolveReport(r.id)}
                          className="px-2 py-1 rounded border border-[#00f5d455] text-[#00f5d4] disabled:opacity-50"
                        >
                          {resolvingId === r.id ? '处理中' : '处理'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!reports.length ? (
                    <tr><td className="p-3 text-[#64748b]" colSpan={8}>暂无数据</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#ffffff1a] bg-[#0f1118] p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input value={auditAction} onChange={(e) => setAuditAction(e.target.value)} placeholder="action" className="bg-[#0a0a0f] border border-[#ffffff22] rounded px-2 py-2 text-sm" />
                <input value={auditOperatorUserId} onChange={(e) => setAuditOperatorUserId(e.target.value)} placeholder="operatorUserId" className="bg-[#0a0a0f] border border-[#ffffff22] rounded px-2 py-2 text-sm" />
                <input value={auditLimit} onChange={(e) => setAuditLimit(e.target.value)} placeholder="limit" className="bg-[#0a0a0f] border border-[#ffffff22] rounded px-2 py-2 text-sm" />
                <input value={auditOffset} onChange={(e) => setAuditOffset(e.target.value)} placeholder="offset" className="bg-[#0a0a0f] border border-[#ffffff22] rounded px-2 py-2 text-sm" />
                <button className="px-3 py-2 rounded border border-[#ffffff22] hover:bg-[#ffffff10] text-sm" onClick={() => void loadAuditLogs()}>
                  {loadingAudit ? '加载中...' : '查询日志'}
                </button>
              </div>
            </div>

            <div className="overflow-auto rounded-xl border border-[#ffffff1a] bg-[#0f1118]">
              <table className="w-full text-sm">
                <thead className="bg-[#ffffff08] text-[#94a3b8]">
                  <tr>
                    <th className="text-left p-2">time</th>
                    <th className="text-left p-2">action</th>
                    <th className="text-left p-2">operator</th>
                    <th className="text-left p-2">target</th>
                    <th className="text-left p-2">detail</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((l) => (
                    <tr key={l.id} className="border-t border-[#ffffff12]">
                      <td className="p-2 text-xs">{fmtTime(l.createdAt)}</td>
                      <td className="p-2 font-mono text-xs">{l.action}</td>
                      <td className="p-2 font-mono text-xs">{l.operatorUserId}</td>
                      <td className="p-2 font-mono text-xs">{l.targetType || '-'} / {l.targetId || '-'}</td>
                      <td className="p-2">
                        <pre className="text-[11px] text-[#94a3b8] whitespace-pre-wrap break-all max-w-[520px]">
                          {JSON.stringify(l.detail ?? null)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                  {!auditLogs.length ? (
                    <tr><td className="p-3 text-[#64748b]" colSpan={5}>暂无数据</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

