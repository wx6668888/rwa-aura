import json
import os
from copy import deepcopy

BASE = os.path.dirname(os.path.abspath(__file__))
WHITELIST_PATH = os.path.join(BASE, 'production_bot_whitelist.json')
TEMPLATE_PATH = os.path.join(BASE, 'schema_v5_template.json')
REPORT_PATH = os.path.join(BASE, 'schema_v5_injection_report.json')

NEW_KEYS = [
    'identity_guard',
    'conversation_policy',
    'relationship_graph_strict',
    'timeline_anchor',
    'knowledge_boundary',
    'response_variation_pack',
    'rumor_and_conflict_playbook',
    'memory_decay_and_update',
]


def build_bot_specific_defaults(bot: dict, tpl: dict) -> dict:
    out = deepcopy(tpl)

    profile = bot.get('profile', {}) if isinstance(bot.get('profile'), dict) else {}
    locks = bot.get('consistency_locks', {}) if isinstance(bot.get('consistency_locks'), dict) else {}
    finance = bot.get('finance', {}) if isinstance(bot.get('finance'), dict) else {}

    # identity_guard
    ig = out.get('identity_guard', {})
    imm = ig.get('immutable_facts', {})
    imm['id'] = bot.get('id')
    imm['name'] = profile.get('name')
    imm['occupation'] = profile.get('occupation')
    imm['hometown'] = profile.get('hometown')
    imm['current_city'] = profile.get('current_location')
    ig['immutable_facts'] = imm

    forbidden = list(ig.get('forbidden_claims', []))
    for x in locks.get('forbidden_contradictions', []):
        s = f"contradiction::{x}"
        if s not in forbidden:
            forbidden.append(s)
    ig['forbidden_claims'] = forbidden
    out['identity_guard'] = ig

    # relationship_graph_strict
    rel = out.get('relationship_graph_strict', {})
    clusters = []
    cbd = bot.get('cross_bot_dynamics', {})
    if isinstance(cbd, dict):
        clusters = cbd.get('social_clusters', []) or []
    if clusters:
        rel_people = rel.get('people', [])
        for c in clusters[:3]:
            if not isinstance(c, dict):
                continue
            rid = c.get('cluster_id', '群友')
            rel_people.append({
                'name': str(rid),
                'relation_type': 'known_cluster',
                'trust_level': float(c.get('mutual_trust_level', 0.55) or 0.55),
                'can_disclose_level': 'known_contacts',
            })
        rel['people'] = rel_people
    out['relationship_graph_strict'] = rel

    # timeline_anchor
    tl = out.get('timeline_anchor', {})
    ce = tl.get('critical_events', [])
    entry_date = locks.get('entry_date')
    platform_date = locks.get('platform_launch_date')
    first_amt = locks.get('first_investment_usdt')
    if ce and isinstance(ce, list):
        for item in ce:
            if not isinstance(item, dict):
                continue
            if item.get('event') == 'first_investment':
                item['date'] = entry_date or item.get('date')
                item['amount_usdt'] = first_amt
        tl['critical_events'] = ce
    tl['platform_launch_date'] = platform_date
    out['timeline_anchor'] = tl

    # knowledge_boundary confidence tweak by profile
    kb = out.get('knowledge_boundary', {})
    conf = kb.get('confidence_score', {})
    edu = str(profile.get('education', ''))
    occ = str(profile.get('occupation', ''))
    if '老板' in occ or '管理' in occ:
        conf['platform_rules'] = max(float(conf.get('platform_rules', 0.65)), 0.72)
    if '高中' in edu:
        conf['technical_details'] = min(float(conf.get('technical_details', 0.35)), 0.4)
    kb['confidence_score'] = conf
    out['knowledge_boundary'] = kb

    # response_variation_pack: append one personalized short line
    rvp = out.get('response_variation_pack', {})
    igroups = rvp.get('intent_groups', {})
    invest = locks.get('current_total_staked_usdt', finance.get('current_position', {}).get('total_staked_usdt'))
    if invest:
        igroups.setdefault('被问投入', [])
        line = f"我现在大概投了{invest}，按自己节奏来"
        if line not in igroups['被问投入']:
            igroups['被问投入'].append(line)
    rvp['intent_groups'] = igroups
    out['response_variation_pack'] = rvp

    # memory_decay_and_update: bind stable anchors
    md = out.get('memory_decay_and_update', {})
    stable = list(md.get('stable_memory', []))
    for x in ['entry_story_core', 'current_node_level', 'current_total_staked_usdt']:
        if x not in stable:
            stable.append(x)
    md['stable_memory'] = stable
    md['stable_anchor_values'] = {
        'entry_date': entry_date,
        'node_level': locks.get('current_node_level'),
        'total_staked_usdt': locks.get('current_total_staked_usdt'),
        'daily_roi_approx': locks.get('daily_roi_approx'),
    }
    out['memory_decay_and_update'] = md

    return out


def main():
    with open(WHITELIST_PATH, 'r', encoding='utf-8') as f:
        wl = json.load(f)
    with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        tpl = json.load(f)

    base_template = tpl.get('v5_new_fields', {})
    whitelist = wl.get('whitelist', {})

    injected_files = []
    already_full = []
    errors = {}

    for bot_id, filename in whitelist.items():
        path = os.path.join(BASE, filename)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            errors[filename] = f'parse_error: {e}'
            continue

        missing = [k for k in NEW_KEYS if k not in data]
        if not missing:
            already_full.append(filename)
            continue

        bot_defaults = build_bot_specific_defaults(data, base_template)
        for k in missing:
            data[k] = deepcopy(bot_defaults[k])

        if str(data.get('schema_version')) != '5.0.0':
            data['schema_version'] = '5.0.0'
        data['schema_ref'] = 'kiro_persona_v5.0.0'

        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        injected_files.append({
            'bot_id': bot_id,
            'file': filename,
            'added_fields': missing,
        })

    report = {
        'summary': {
            'target_count': len(whitelist),
            'injected_count': len(injected_files),
            'already_full_count': len(already_full),
            'error_count': len(errors),
        },
        'injected_files': injected_files,
        'already_full_files': already_full,
        'errors': errors,
        'new_keys': NEW_KEYS,
    }

    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print('target', len(whitelist))
    print('injected', len(injected_files))
    print('already_full', len(already_full))
    print('errors', len(errors))
    print('report', REPORT_PATH)


if __name__ == '__main__':
    main()
