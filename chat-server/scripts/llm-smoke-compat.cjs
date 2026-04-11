#!/usr/bin/env node
/**
 * 直连测试 LLM_OPENAI_COMPAT_*（OpenAI Chat Completions 兼容网关，如 Codex 代理）。
 * 用法：在 chat-server 目录执行  npm run llm:smoke-compat
 * 依赖：chat-server/.env 中已配置 LLM_OPENAI_COMPAT_BASE_URL + Key（勿提交 Git）。
 */
'use strict';

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const root = path.join(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });
const backendEnv = path.join(root, '..', 'backend', '.env');
if (fs.existsSync(backendEnv)) dotenv.config({ path: backendEnv, override: false });

function firstCompatKey() {
  const multi = String(process.env.LLM_OPENAI_COMPAT_API_KEYS || '')
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const one = String(process.env.LLM_OPENAI_COMPAT_API_KEY || '').trim();
  return multi[0] || one || '';
}

async function main() {
  const base = String(process.env.LLM_OPENAI_COMPAT_BASE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const key = firstCompatKey();
  const model = String(process.env.LLM_OPENAI_COMPAT_MODEL || 'gpt-5').trim();

  if (!base || !key) {
    console.error(
      '[llm-smoke-compat] 缺少环境变量：请在 chat-server/.env 设置 LLM_OPENAI_COMPAT_BASE_URL 与 LLM_OPENAI_COMPAT_API_KEY（或 LLM_OPENAI_COMPAT_API_KEYS）'
    );
    process.exit(1);
  }

  const url = `${base}/chat/completions`;
  const body = {
    model,
    messages: [
      { role: 'system', content: 'Reply with exactly one line: PONG_COMPAT_OK' },
      { role: 'user', content: 'ping' },
    ],
    max_tokens: 48,
    temperature: 0.2,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!res.ok) {
    console.error('[llm-smoke-compat] HTTP', res.status);
    console.error(text.slice(0, 800));
    process.exit(2);
  }

  const content = json?.choices?.[0]?.message?.content;
  const preview = String(content || '').trim().slice(0, 240);
  console.log('[llm-smoke-compat] OK', { model, replyPreview: preview || '(empty)' });
  process.exit(0);
}

main().catch((e) => {
  console.error('[llm-smoke-compat]', e);
  process.exit(3);
});
