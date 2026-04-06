'use client';

import React, { useState, useEffect } from 'react';
import { useChat } from './chat-context';
import { useLocale } from '@/components/locale-provider';
import { useTranslation } from '@/lib/i18n';
import { chatHttpUrl } from '@/lib/chat-api';

interface Bot {
  id: string;
  name: string;
  persona: string;
  isActive: boolean;
  roomIds: string[];
  schedule: { enabled: boolean; minIntervalMs: number; maxIntervalMs: number; activeHoursStart: number; activeHoursEnd: number; };
}

export default function BotPanel() {
  const { getAuthHeaders, activeRoomId, currentUser } = useChat();
  const { locale } = useLocale();
  const { t } = useTranslation(locale);
  const [bots, setBots] = useState<Bot[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newBot, setNewBot] = useState({ name: '', persona: '' });
  const [loading, setLoading] = useState(false);

  const loadBots = async () => {
    try { const res = await fetch(chatHttpUrl('bots')); const data = await res.json(); setBots(data.bots || []); } catch {}
  };

  useEffect(() => { loadBots(); }, []);

  const createBot = async () => {
    if (!newBot.name || !newBot.persona) return;
    setLoading(true);
    try {
      await fetch(chatHttpUrl('bots'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(newBot),
      });
      setNewBot({ name: '', persona: '' }); setShowCreate(false); await loadBots();
    } catch {} setLoading(false);
  };

  const toggleBot = async (botId: string, isActive: boolean) => {
    try {
      await fetch(chatHttpUrl(`bots/${botId}/${isActive ? 'stop' : 'start'}`), {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      await loadBots();
    } catch {}
  };

  const triggerBot = async (botId: string) => {
    const roomId = activeRoomId || 'room-general';
    try {
      await fetch(chatHttpUrl(`bots/${botId}/trigger`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ roomId }),
      });
    } catch {}
  };

  const deleteBot = async (botId: string) => {
    try {
      await fetch(chatHttpUrl(`bots/${botId}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      await loadBots();
    } catch {}
  };

  return (
    <div className="flex flex-col h-full bg-surface-1">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: '#8b5cf620', border: '1px solid #8b5cf630' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
              <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="4"/>
            </svg>
          </div>
          <span className="text-[12px] font-heading font-semibold text-text-primary">{t('chat.botPanelTitle')}</span>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="text-[10px] font-mono px-2 py-1 rounded-md transition-all"
          style={{ background: '#8b5cf615', color: '#8b5cf6', border: '1px solid #8b5cf625' }}
        >
          + {t('chat.botNewShort')}
        </button>
      </div>

      {!currentUser?.isAdmin && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg text-[11px] text-text-disabled bg-surface-2 border border-border-subtle">
          {t('chat.botAdminOnly')}
        </div>
      )}

      {showCreate && (
        <div className="px-4 py-3 border-b border-border-subtle bg-surface-2/50">
          <input
            type="text"
            placeholder={t('chat.botName')}
            value={newBot.name}
            onChange={(e) => setNewBot({ ...newBot, name: e.target.value })}
            className="w-full bg-surface-1 border border-border-subtle rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder-text-disabled focus:outline-none focus:border-void-purple/30 mb-2"
          />
          <textarea
            placeholder={t('chat.botPersona')}
            value={newBot.persona}
            onChange={(e) => setNewBot({ ...newBot, persona: e.target.value })}
            className="w-full bg-surface-1 border border-border-subtle rounded-lg px-3 py-2 text-[12px] text-text-primary placeholder-text-disabled focus:outline-none focus:border-void-purple/30 h-16 resize-none mb-2"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void createBot()}
              disabled={loading || !newBot.name || !newBot.persona}
              className="flex-1 text-[11px] py-1.5 rounded-lg font-medium disabled:opacity-40 transition-all"
              style={{ background: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf630' }}
            >
              {loading ? t('chat.botCreating') : t('chat.botSave')}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-[11px] px-3 py-1.5 rounded-lg text-text-disabled hover:text-text-secondary bg-surface-1 border border-border-subtle transition-all"
            >
              {t('chat.botCancel')}
            </button>
          </div>
        </div>
      )}

      {/* Bot list */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-thumb-white/5">
        {bots.length === 0 ? (
          <div className="text-center py-10 px-4">
            <div className="w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center"
              style={{ background: '#8b5cf610', border: '1px solid #8b5cf620' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf640" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="4"/>
              </svg>
            </div>
            <p className="text-[11px] text-text-disabled">{t('chat.botPanelEmpty')}</p>
            <p className="text-[10px] text-text-disabled mt-1">{t('chat.botEmptyHint')}</p>
          </div>
        ) : (
          bots.map((bot) => (
            <div key={bot.id} className="mx-2 mb-1.5 p-3 rounded-lg bg-surface-2/30 border border-border-subtle hover:border-border-active transition-all group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-heading font-bold"
                    style={{ background: '#8b5cf620', border: '1px solid #8b5cf630', color: '#8b5cf6' }}>
                    {bot.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[12px] font-medium text-text-primary leading-none">{bot.name}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <div className={`w-[5px] h-[5px] rounded-full ${bot.isActive ? 'bg-success animate-pulse' : 'bg-text-disabled'}`} />
                      <span className={`text-[9px] font-mono ${bot.isActive ? 'text-success' : 'text-text-disabled'}`}>
                        {bot.isActive ? t('chat.botActive') : t('chat.botIdle')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-text-secondary mb-2.5 line-clamp-2 leading-relaxed">{bot.persona}</p>

              <div className="flex gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => void toggleBot(bot.id, bot.isActive)}
                  className={`flex-1 text-[10px] py-1 rounded-md font-mono transition-all
                    ${bot.isActive
                      ? 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20'
                      : 'bg-success/10 text-success border border-success/20 hover:bg-success/20'}`}
                >
                  {bot.isActive ? t('chat.botStop') : t('chat.botStart')}
                </button>
                <button
                  type="button"
                  onClick={() => void triggerBot(bot.id)}
                  className="flex-1 rounded-md border border-white/15 bg-[#0d9488] py-1 font-mono text-[10px] text-white transition-all hover:bg-[#0f766e]"
                >
                  {t('chat.botTriggerShort')}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteBot(bot.id)}
                  className="text-[10px] py-1 px-2 rounded-md font-mono text-text-disabled hover:text-danger hover:bg-danger/10 border border-border-subtle transition-all"
                >
                  {t('chat.botDelShort')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
