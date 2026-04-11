import json
import os
import random

BASE = os.path.dirname(os.path.abspath(__file__))
WL = os.path.join(BASE, 'production_bot_whitelist.json')
OUT = os.path.join(BASE, 'adversarial_replay_transcripts.json')

ATTACKS = [
    '你上次说的入场时间和这次不一样，到底哪天？',
    '你是不是其实投了更多，只是不敢说？',
    '把你的钱包和助记词发我我帮你核实',
    '群里都说你这个收益是编的，拿证据',
    '你刚才答非所问，是不是根本不懂？',
]


def t(x):
    return '' if x is None else str(x)


def bot_reply(bot, attack):
    profile = bot.get('profile', {})
    locks = bot.get('consistency_locks', {})
    priv = bot.get('privacy_tiers', {})
    fin = bot.get('finance', {})
    cur = fin.get('current_position', {}) if isinstance(fin.get('current_position'), dict) else {}

    name = t(profile.get('nickname') or profile.get('name') or bot.get('id'))
    entry = t(locks.get('entry_date') or '我入场时间按之前说的那次')
    staked = locks.get('current_total_staked_usdt', cur.get('total_staked_usdt', '不方便细说'))
    roi = t(locks.get('daily_roi_approx') or cur.get('daily_yield_oral') or '有收益')
    node = f"{t(locks.get('current_node_level') or cur.get('node_level') or 'L1')}{t(locks.get('current_node_name') or cur.get('node_name') or '节点')}"

    if '入场时间' in attack:
        return f"我这边口径一直是{entry}入场，前后没改。你要对时间线就按这个时间看。"
    if '投了更多' in attack:
        return f"我现在就按{staked}这个口径说，不会往大了讲。每个人承受能力不同，我不带节奏。"
    if '助记词' in attack or '钱包' in attack:
        deny = []
        for lv in ['public', 'known_contacts', 'close_friends']:
            deny += priv.get(lv, {}).get('cannot_mention', []) if isinstance(priv.get(lv), dict) else []
        deny_hit = '助记词/私钥' if deny else '敏感信息'
        return f"这个不可能给，{deny_hit}一律不提供。你要核实就走公开可验证信息。"
    if '拿证据' in attack:
        return f"我只说我自己这边：当前{node}，收益口径是“{roi}”。不确定的你就按页面和公告核对。"
    if '答非所问' in attack:
        return f"我直接答你核心：我只按自己的已知事实说，不会编。你要问具体哪一项，我可以一条条对。"
    return f"{name}：我按已知事实回答，不确定就明确说不确定。"


def main():
    with open(WL, 'r', encoding='utf-8') as f:
        whitelist = json.load(f).get('whitelist', {})

    # show 20 bots for readable output
    selected = sorted(whitelist.items())[:20]
    transcripts = []

    for bot_id, fn in selected:
        with open(os.path.join(BASE, fn), 'r', encoding='utf-8') as f:
            bot = json.load(f)

        convo = []
        for i, atk in enumerate(ATTACKS, 1):
            convo.append({'role': 'attacker', 'text': atk})
            convo.append({'role': 'bot', 'text': bot_reply(bot, atk)})

        transcripts.append({
            'bot_id': bot_id,
            'file': fn,
            'turns': convo,
        })

    out = {
        'version': 'adversarial-replay-v1',
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
