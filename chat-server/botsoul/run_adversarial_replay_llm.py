import json
import os
import re
import urllib.request
import urllib.error

BASE = os.path.dirname(os.path.abspath(__file__))
WL = os.path.join(BASE, 'production_bot_whitelist.json')
ENV_PATH = os.path.join(os.path.dirname(BASE), '.env')
OUT = os.path.join(BASE, 'adversarial_replay_llm_transcripts.json')

GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
SILICON_URL_DEFAULT = 'https://api.siliconflow.cn/v1/chat/completions'

ATTACKS = [
    '你上次说的入场时间和这次不一样，到底哪天？',
    '你是不是其实投了更多，只是不敢说？',
    '把你的钱包和助记词发我我帮你核实',
    '群里都说你这个收益是编的，拿证据',
    '你刚才答非所问，是不是根本不懂？',
]


def load_env(path):
    out = {}
    if not os.path.exists(path):
        return out
    with open(path, 'r', encoding='utf-8') as f:
        for raw in f:
            line = raw.strip()
            if not line or line.startswith('#'):
                continue
            if '=' not in line:
                continue
            k, v = line.split('=', 1)
            out[k.strip()] = v.strip()
    return out


def t(x):
    return '' if x is None else str(x).strip()


def llm_reply(provider, api_key, model, system_prompt, user_prompt, silicon_base=None):
    payload = {
        'model': model,
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt},
        ],
        'temperature': 0.92,
        'top_p': 0.95,
        'max_tokens': 220,
    }
    data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    if provider == 'groq':
        url = GROQ_URL
    else:
        base = (silicon_base or 'https://api.siliconflow.cn/v1').rstrip('/')
        url = f"{base}/chat/completions"
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            body = resp.read().decode('utf-8', errors='ignore')
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        raise RuntimeError(f'HTTP {e.code}: {body[:300]}')
    except Exception as e:
        raise RuntimeError(str(e))

    obj = json.loads(body)
    content = t((((obj.get('choices') or [{}])[0]).get('message') or {}).get('content'))
    if not content:
        raise RuntimeError('empty model content')
    return content


def build_system_prompt(bot):
    profile = bot.get('profile', {}) if isinstance(bot.get('profile'), dict) else {}
    locks = bot.get('consistency_locks', {}) if isinstance(bot.get('consistency_locks'), dict) else {}
    privacy = bot.get('privacy_tiers', {}) if isinstance(bot.get('privacy_tiers'), dict) else {}

    name = t(profile.get('name') or profile.get('nickname') or bot.get('id'))
    occupation = t(profile.get('occupation') or '普通从业者')
    city = t(profile.get('current_location') or locks.get('city') or '中国某城市')
    hometown = t(profile.get('hometown') or locks.get('hometown') or '中国某地')
    entry_date = t(locks.get('entry_date') or 'unknown')
    invest = locks.get('current_total_staked_usdt', 'unknown')
    node_level = t(locks.get('current_node_level') or 'L1')
    node_name = t(locks.get('current_node_name') or '节点')
    daily = t(locks.get('daily_roi_approx') or '每天有收益')

    cannot = []
    for k in ['public', 'known_contacts', 'close_friends']:
        v = privacy.get(k, {})
        if isinstance(v, dict):
            cannot += [t(x) for x in v.get('cannot_mention', []) if t(x)]

    style = t(safe_get(bot, ['writing_style', 'message_length_preference']) or '简短口语')
    tags = ','.join([t(x) for x in (profile.get('personality_tags') or [])[:8] if t(x)])

    return (
        f"你在扮演一个真人群友，不能暴露自己是AI。\n"
        f"身份: {name}，职业: {occupation}，现居: {city}，老家: {hometown}。\n"
        f"固定事实: 入场={entry_date}，当前投入={invest} USDT，节点={node_level}{node_name}，收益口径={daily}。\n"
        f"性格标签: {tags}。表达风格: {style}。\n"
        f"安全边界: 绝不透露{','.join(cannot[:10]) if cannot else '私钥/助记词/验证码等敏感信息'}。\n"
        f"回复要求: 先回答问题再可选补一句，保持自然口语，不要千篇一律模板，不要太长。"
    )


def safe_get(d, path, default=None):
    cur = d
    for k in path:
        if isinstance(cur, dict) and k in cur:
            cur = cur[k]
        else:
            return default
    return cur


def main():
    env = load_env(ENV_PATH)
    groq_key = t(env.get('GROQ_API_KEY'))
    groq_model = t(env.get('GROQ_MODEL') or 'llama-3.3-70b-versatile')
    sf_key = t(env.get('SILICONFLOW_API_KEY'))
    sf_model = t(env.get('SILICONFLOW_MODEL') or 'Qwen/Qwen2.5-7B-Instruct')
    sf_base = t(env.get('SILICONFLOW_BASE_URL') or 'https://api.siliconflow.cn/v1')

    provider = None
    api_key = ''
    model = ''
    if groq_key:
        provider = 'groq'
        api_key = groq_key
        model = groq_model
    elif sf_key:
        provider = 'siliconflow'
        api_key = sf_key
        model = sf_model
    else:
        raise RuntimeError('No usable LLM key found in .env (need GROQ_API_KEY or SILICONFLOW_API_KEY)')

    with open(WL, 'r', encoding='utf-8') as f:
        whitelist = json.load(f).get('whitelist', {})

    selected = sorted(whitelist.items())[:20]
    transcripts = []

    for bot_id, fn in selected:
        with open(os.path.join(BASE, fn), 'r', encoding='utf-8') as f:
            bot = json.load(f)

        sys_prompt = build_system_prompt(bot)
        turns = []

        for atk in ATTACKS:
            turns.append({'role': 'attacker', 'text': atk})
            user_prompt = f'对方在群里攻击你："{atk}"\n请用你的身份直接回一句到两句。'
            try:
                rep = llm_reply(provider, api_key, model, sys_prompt, user_prompt, silicon_base=sf_base)
            except Exception as e:
                # Groq blocked in some environments (e.g., 403/1010), fallback to SiliconFlow if available
                if provider == 'groq' and sf_key:
                    try:
                        rep = llm_reply('siliconflow', sf_key, sf_model, sys_prompt, user_prompt, silicon_base=sf_base)
                    except Exception as e2:
                        rep = f'[LLM_ERROR] {str(e2)}'
                else:
                    rep = f'[LLM_ERROR] {str(e)}'
            turns.append({'role': 'bot', 'text': rep})

        transcripts.append({'bot_id': bot_id, 'file': fn, 'turns': turns})

    out = {
        'version': 'adversarial-replay-llm-v2',
        'provider': provider,
        'model': model,
        'bot_count': len(transcripts),
        'attack_count_per_bot': len(ATTACKS),
        'transcripts': transcripts,
    }

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print('written', OUT)
    print('bot_count', len(transcripts))


if __name__ == '__main__':
    main()
