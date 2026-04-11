import json
import os
import re
from statistics import mean

BASE = os.path.dirname(os.path.abspath(__file__))
WL_PATH = os.path.join(BASE, 'production_bot_whitelist.json')
OUT_PATH = os.path.join(BASE, 'bot_leak_risk_top20_report.json')


def load_whitelist():
    with open(WL_PATH, 'r', encoding='utf-8') as f:
        return json.load(f).get('whitelist', {})


def safe_len(x):
    if isinstance(x, (list, dict, str)):
        return len(x)
    return 0


def score_bot(bot):
    score = 0
    reasons = []

    locks = bot.get('consistency_locks', {}) if isinstance(bot.get('consistency_locks'), dict) else {}
    finance = bot.get('finance', {}) if isinstance(bot.get('finance'), dict) else {}
    profile = bot.get('profile', {}) if isinstance(bot.get('profile'), dict) else {}

    # R1: timeline anchor quality
    ta = bot.get('timeline_anchor', {}) if isinstance(bot.get('timeline_anchor'), dict) else {}
    events = ta.get('critical_events', []) if isinstance(ta.get('critical_events'), list) else []
    unknown_dates = 0
    for e in events:
        if not isinstance(e, dict):
            continue
        d = str(e.get('date', '')).strip().lower()
        if d in ('', 'unknown', 'unknown_date', '待定'):
            unknown_dates += 1
        if 'must_exist' in d or 'if_exists' in d:
            unknown_dates += 1
    if unknown_dates >= 2:
        score += 14
        reasons.append(f'timeline_unknown_dates={unknown_dates}')
    elif unknown_dates == 1:
        score += 8
        reasons.append('timeline_has_unknown_date')

    if len(events) <= 2:
        score += 6
        reasons.append('timeline_events_too_few')

    # R2: contradiction pressure
    forbidden = locks.get('forbidden_contradictions', []) if isinstance(locks.get('forbidden_contradictions'), list) else []
    if len(forbidden) < 5:
        score += 8
        reasons.append('few_forbidden_contradictions')

    # R3: response diversity quality
    rvp = bot.get('response_variation_pack', {}) if isinstance(bot.get('response_variation_pack'), dict) else {}
    intents = rvp.get('intent_groups', {}) if isinstance(rvp.get('intent_groups'), dict) else {}
    intent_sizes = [safe_len(v) for v in intents.values() if isinstance(v, list)]
    if not intent_sizes:
        score += 18
        reasons.append('no_intent_groups')
    else:
        min_size = min(intent_sizes)
        if min_size < 8:
            score += 12
            reasons.append(f'intent_group_min_size={min_size}')
        avg_size = mean(intent_sizes)
        if avg_size < 9:
            score += 6
            reasons.append(f'intent_group_avg_low={avg_size:.1f}')

    # R4: memory depth consistency
    ms = bot.get('memory_seed_v2', {}) if isinstance(bot.get('memory_seed_v2'), dict) else {}
    epi = ms.get('episodic_memories', []) if isinstance(ms.get('episodic_memories'), list) else []
    sem = ms.get('semantic_knowledge', []) if isinstance(ms.get('semantic_knowledge'), list) else []
    if len(epi) < 4:
        score += 12
        reasons.append(f'episodic_memories_low={len(epi)}')
    if len(sem) < 2:
        score += 5
        reasons.append(f'semantic_knowledge_low={len(sem)}')

    # R5: relationship plausibility
    rel = bot.get('relationship_graph_strict', {}) if isinstance(bot.get('relationship_graph_strict'), dict) else {}
    people = rel.get('people', []) if isinstance(rel.get('people'), list) else []
    if len(people) < 3:
        score += 9
        reasons.append('relationship_people_too_few')

    # R6: privacy boundary robustness
    privacy = bot.get('privacy_tiers', {}) if isinstance(bot.get('privacy_tiers'), dict) else {}
    for lvl in ['public', 'known_contacts', 'close_friends']:
        p = privacy.get(lvl, {}) if isinstance(privacy.get(lvl), dict) else {}
        if not isinstance(p.get('cannot_mention'), list) or len(p.get('cannot_mention', [])) < 2:
            score += 4
            reasons.append(f'privacy_{lvl}_cannot_mention_weak')

    # R7: numeric consistency cues
    current_total = locks.get('current_total_staked_usdt')
    amount_timeline = finance.get('amount_timeline', []) if isinstance(finance.get('amount_timeline'), list) else []
    total_from_timeline = 0
    for item in amount_timeline:
        if isinstance(item, dict) and 'amount_usdt' in item and str(item.get('action', '')).find('提现') == -1:
            try:
                total_from_timeline += float(item.get('amount_usdt'))
            except Exception:
                pass
    if current_total not in (None, '') and total_from_timeline > 0:
        try:
            ct = float(current_total)
            if abs(ct - total_from_timeline) > max(300, ct * 0.3):
                score += 10
                reasons.append(f'amount_timeline_mismatch current={ct} timeline={total_from_timeline}')
        except Exception:
            score += 4
            reasons.append('current_total_not_numeric')

    # R8: style over-template risk
    cp = bot.get('conversation_policy', {}) if isinstance(bot.get('conversation_policy'), dict) else {}
    hrg = cp.get('human_realism_guard', {}) if isinstance(cp.get('human_realism_guard'), dict) else {}
    if not hrg:
        score += 5
        reasons.append('missing_human_realism_guard')

    return int(score), reasons


def classify(score):
    if score >= 45:
        return 'high'
    if score >= 25:
        return 'medium'
    return 'low'


def main():
    wl = load_whitelist()
    rows = []

    for bot_id, fn in sorted(wl.items()):
        path = os.path.join(BASE, fn)
        with open(path, 'r', encoding='utf-8') as f:
            bot = json.load(f)
        score, reasons = score_bot(bot)
        rows.append({
            'bot_id': bot_id,
            'file': fn,
            'score': score,
            'risk_level': classify(score),
            'top_reasons': reasons[:8],
        })

    rows_sorted = sorted(rows, key=lambda x: (-x['score'], x['bot_id']))
    top20 = rows_sorted[:20]

    dist = {'high': 0, 'medium': 0, 'low': 0}
    for r in rows:
        dist[r['risk_level']] += 1

    # build fix map by reason prefix
    fix_map = {
        'timeline_unknown_dates': '补全timeline_anchor关键事件的具体日期（至少到天）',
        'timeline_has_unknown_date': '将unknown日期替换为finance/consistency可追溯日期',
        'timeline_events_too_few': '补充至少3-5个关键事件并加先后约束',
        'few_forbidden_contradictions': '扩充forbidden_contradictions到>=8条',
        'no_intent_groups': '补全response_variation_pack.intent_groups结构',
        'intent_group_min_size': '每个intent组至少补到8-12条变体',
        'intent_group_avg_low': '提高变体均值，避免模板复读',
        'episodic_memories_low': '补充可追问的episodic memories（含时间/触发/情绪）',
        'semantic_knowledge_low': '增加语义知识点，区分知道/听说/不懂',
        'relationship_people_too_few': '补全relationship_graph_strict.people至少3层关系',
        'privacy_public_cannot_mention_weak': '增强public层不能披露字段',
        'privacy_known_contacts_cannot_mention_weak': '增强known_contacts层隐私边界',
        'privacy_close_friends_cannot_mention_weak': '增强close_friends层隐私边界',
        'amount_timeline_mismatch': '校正amount_timeline与current_total_staked一致性',
        'missing_human_realism_guard': '补充conversation_policy.human_realism_guard',
    }

    targeted_fixes = []
    for r in top20:
        plans = []
        for reason in r['top_reasons']:
            k = reason.split('=')[0].split(' ')[0]
            if k in fix_map and fix_map[k] not in plans:
                plans.append(fix_map[k])
        targeted_fixes.append({
            'bot_id': r['bot_id'],
            'file': r['file'],
            'score': r['score'],
            'risk_level': r['risk_level'],
            'fix_plan': plans[:5],
        })

    out = {
        'version': 'leak-risk-eval-v1',
        'summary': {
            'total': len(rows),
            'risk_distribution': dist,
            'top20_max_score': top20[0]['score'] if top20 else 0,
            'top20_min_score': top20[-1]['score'] if top20 else 0,
        },
        'top20': top20,
        'targeted_fix_plan_top20': targeted_fixes,
    }

    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print('written', OUT_PATH)
    print('distribution', dist)
    print('top20_count', len(top20))


if __name__ == '__main__':
    main()
