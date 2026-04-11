import json
import os
import re
from collections import defaultdict

BASE = os.path.dirname(os.path.abspath(__file__))
PATTERN = re.compile(r'^RWA_BOT_(\d{3})(?:_(.+))?\.txt$')


def candidate_rank(filename: str, data: dict) -> tuple:
    # Higher is better
    m = PATTERN.match(filename)
    suffix = (m.group(2) or '').lower() if m else ''

    # Priority by naming convention
    # 1) exact canonical name: RWA_BOT_###.txt
    # 2) *_clean.txt
    # 3) *_persona.txt
    # 4) other suffix variants
    if suffix == '':
        naming = 400
    elif suffix == 'clean':
        naming = 300
    elif suffix == 'persona':
        naming = 200
    else:
        naming = 100

    # Content completeness bonus
    keys = set(data.keys()) if isinstance(data, dict) else set()
    must_have = {
        'schema_version', 'id', 'runtime_binding', 'profile', 'finance',
        'memory_seed_v2', 'response_templates', 'decision_tree', 'audit'
    }
    completeness = len(keys & must_have)

    # Prefer schema_ref over $schema-only
    schema_bonus = 20 if 'schema_ref' in keys else 0

    # Higher version string if parseable (major.minor.patch)
    ver = str(data.get('version', '0.0.0'))
    vm = re.match(r'^(\d+)\.(\d+)\.(\d+)$', ver)
    if vm:
        ver_score = int(vm.group(1)) * 10000 + int(vm.group(2)) * 100 + int(vm.group(3))
    else:
        ver_score = 0

    # Final tie-breaker: lexical desc
    return (naming, completeness, schema_bonus, ver_score, filename)


def main():
    groups = defaultdict(list)
    parse_errors = {}

    for fn in sorted(os.listdir(BASE)):
        m = PATTERN.match(fn)
        if not m:
            continue
        path = os.path.join(BASE, fn)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            parse_errors[fn] = str(e)
            continue
        groups[m.group(1)].append((fn, data))

    whitelist = {}
    conflicts = {}

    for bot_num, arr in sorted(groups.items()):
        scored = sorted(arr, key=lambda x: candidate_rank(x[0], x[1]), reverse=True)
        selected_fn, selected_data = scored[0]
        bot_id = selected_data.get('id', f'RWA_BOT_{bot_num}')
        whitelist[bot_id] = selected_fn

        if len(scored) > 1:
            conflicts[bot_id] = {
                'selected': selected_fn,
                'candidates': [x[0] for x in scored],
            }

    out = {
        'version': 'prod-whitelist-v1',
        'policy': {
            'selection_order': [
                'RWA_BOT_###.txt (canonical exact)',
                'RWA_BOT_###_clean.txt',
                'RWA_BOT_###_persona.txt',
                'RWA_BOT_###_<other>.txt',
            ],
            'tie_breakers': [
                'more required keys present',
                'prefer schema_ref',
                'higher semantic version',
                'lexicographical fallback',
            ],
        },
        'summary': {
            'total_ids': len(whitelist),
            'conflict_ids': len(conflicts),
            'parse_error_count': len(parse_errors),
        },
        'whitelist': whitelist,
        'conflicts': conflicts,
        'parse_errors': parse_errors,
    }

    out_path = os.path.join(BASE, 'production_bot_whitelist.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print('written', out_path)
    print('total_ids', len(whitelist))
    print('conflict_ids', len(conflicts))
    for bid, info in conflicts.items():
        print('conflict', bid, '->', info['selected'], 'from', info['candidates'])


if __name__ == '__main__':
    main()
