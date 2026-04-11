#!/usr/bin/env node
/**
 * 直连测试 ANTHROPIC_API_KEY（原生 Claude API，非 OpenRouter）。
 * 用法：在 chat-server 目录执行 npm run llm:smoke-anthropic
 */
'use strict';

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const root = path.join(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });
const backendEnv = path.join(root, '..', 'backend', '.env');
if (fs.existsSync(backendEnv)) dotenv.config({ path: backendEnv, override: false });

function firstAnthropicKey() {
  const multi = String(process.env.ANTHROPIC_API_KEYS || '')
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const one = String(process.env.ANTHROPIC_API_KEY || '').trim();
  const legacy = String(process.env.CLAUDE_API_KEY || '').trim();
  if (legacy.startsWith('sk-ant')) return legacy;
  return multi[0] || one || '';
}

async function main() {
  const key = firstAnthropicKey();
  const model = String(process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022').trim();
  if (!key || !key.startsWith('sk-ant')) {
    console.error(
      '[llm-smoke-anthropic] 请在 .env 设置 ANTHROPIC_API_KEY（或 sk-ant-* 的 CLAUDE_API_KEY）；不要填进 LLM_OPENAI_COMPAT_*。'
    );
    process.exit(1);
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 64,
      messages: [{ role: 'user', content: 'Reply with exactly: PONG_ANTHROPIC_OK' }],
    }),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!res.ok) {
    console.error('[llm-smoke-anthropic] HTTP', res.status);
    console.error(text.slice(0, 900));
    process.exit(2);
  }

  const block = json?.content?.find((b) => b.type === 'text');
  const preview = String(block?.text || '').trim().slice(0, 200);
  console.log('[llm-smoke-anthropic] OK', { model, replyPreview: preview || '(empty)' });
  process.exit(0);
}

main().catch((e) => {
  console.error('[llm-smoke-anthropic]', e);
  process.exit(3);
});
