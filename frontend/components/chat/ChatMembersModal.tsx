'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { chatHttpUrl } from '@/lib/chat-api';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';
import type { ChatUser } from './chat-context';

const MEMBER_PREVIEW_MAX = 100;

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = arr[i]!;
    const b = arr[j]!;
    arr[i] = b;
    arr[j] = a;
  }
}

function buildPreviewList(members: ChatUser[], selfId: string | undefined): ChatUser[] {
  const self = selfId ? members.find((m) => m.id === selfId) : undefined;
  const rest = members.filter((m) => m.id !== selfId);
  shuffleInPlace(rest);
  const cap = MEMBER_PREVIEW_MAX - (self ? 1 : 0);
  const slice = rest.slice(0, Math.max(0, cap));
  return self ? [self, ...slice] : slice.slice(0, MEMBER_PREVIEW_MAX);
}

function shortAddr(address: string): string {
  const a = (address || '').trim().toLowerCase();
  if (!a.startsWith('0x') || a.length < 12) return a || '—';
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export type ChatMembersModalLabels = {
  loading: string;
  empty: string;
  you: string;
  hint: string;
  close: string;
};

export function ChatMembersModal(props: {
  open: boolean;
  onClose: () => void;
  roomId: string;
  selfId: string | undefined;
  getAuthHeaders: () => Record<string, string>;
  title: string;
  labels: ChatMembersModalLabels;
}) {
  const { open, onClose, roomId, selfId, getAuthHeaders, title, labels } = props;
  const [items, setItems] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetchWithTimeout(chatHttpUrl(`rooms/${roomId}/members`), { headers, timeoutMs: 22000 });
      if (!res.ok) {
        setItems([]);
        return;
      }
      const data = (await res.json()) as { members?: ChatUser[] };
      const list = Array.isArray(data.members) ? data.members : [];
      setItems(buildPreviewList(list, selfId));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [roomId, selfId, getAuthHeaders]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-labelledby="chat-members-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border-subtle bg-surface-1 shadow-2xl max-h-[min(70dvh,520px)] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between gap-2 shrink-0">
          <h3 id="chat-members-modal-title" className="text-sm font-heading font-semibold text-text-primary truncate">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-text-secondary hover:text-text-primary shrink-0"
          >
            {labels.close}
          </button>
        </div>
        <p className="px-4 pt-2 text-[10px] text-text-disabled font-mono leading-snug">{labels.hint}</p>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-2 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
          {loading && (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-plasma-cyan/30 border-t-plasma-cyan rounded-full animate-spin" />
            </div>
          )}
          {!loading && items.length === 0 && (
            <div className="text-center py-10 text-[12px] text-text-disabled">{labels.empty}</div>
          )}
          {!loading &&
            items.map((u) => {
              const isSelf = selfId && u.id === selfId;
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-2/80 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden border border-border-subtle bg-surface-2"
                    style={{ background: u.avatar ? undefined : 'linear-gradient(135deg, #0d9488, #0f766e)' }}
                  >
                    {u.avatar ? (
                      <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-white">
                        {(u.nickname || '?').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-text-primary truncate flex items-center gap-1.5">
                      <span className="truncate">{u.nickname || shortAddr(u.address)}</span>
                      {isSelf && (
                        <span className="text-[9px] font-mono px-1 py-0 rounded bg-[#0d9488]/25 text-[#5eead4] shrink-0">
                          {labels.you}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-text-disabled truncate">{shortAddr(u.address)}</div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
