import json
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))
WL_PATH = os.path.join(BASE, 'production_bot_whitelist.json')
REPORT_PATH = os.path.join(BASE, 'v5_human_refine_report.json')


def load_whitelist():
    with open(WL_PATH, 'r', encoding='utf-8') as f:
        return json.load(f).get('whitelist', {})


def t(x):
    return '' if x is None else str(x).strip()


def classify_region(hometown: str, city: str):
    s = f"{hometown} {city}"
    if any(k in s for k in ['广东', '潮州', '汕头', '深圳', '东莞', '佛山', '广州']):
        return 'guangdong'
    if any(k in s for k in ['湖南', '长沙', '邵阳', '株洲', '湘潭']):
        return 'hunan'
    if any(k in s for k in ['四川', '重庆', '成都', '绵阳']):
        return 'sichuan'
    if any(k in s for k in ['河南', '郑州', '洛阳', '南阳']):
        return 'henan'
    if any(k in s for k in ['东北', '辽宁', '吉林', '黑龙江', '沈阳', '哈尔滨']):
        return 'dongbei'
    return 'generic'


def classify_job(occupation: str):
    o = occupation
    if any(k in o for k in ['司机', '网约车', '货运', '代驾']):
        return 'driver'
    if any(k in o for k in ['餐馆', '饭店', '奶茶', '外卖', '厨', '服务员']):
        return 'catering'
    if any(k in o for k in ['工厂', '车间', '工人', '主管', '质检']):
        return 'factory'
    if any(k in o for k in ['老板', '店主', '个体户', '小卖部', '超市']):
        return 'small_biz'
    if any(k in o for k in ['销售', '业务', '中介']):
        return 'sales'
    return 'generic'


def region_lines(region):
    return {
        'guangdong': ['我这边先稳一手 先核对再讲', '别急 先对下记录先', '我自己会先看清楚再跟'],
        'hunan': ['先莫急 我们把时间线捋顺', '先看事实再下结论', '我一般先核一下再讲'],
        'sichuan': ['先稳到起 莫忙下判断', '这个先摆证据再说', '我先看明白再回你'],
        'henan': ['先别慌 先把记录对齐', '这事先按事实来', '我先核实再说'],
        'dongbei': ['先别上火 咱先把事整明白', '先看证据再定性', '我先对一下再给你准话'],
        'generic': ['先按可验证信息说', '先核对再判断', '我先看清楚再回你'],
    }[region]


def job_lines(job):
    return {
        'driver': ['我在路上一般是先看确认状态 再做下一步', '跑车间隙我就看两眼记录 不会连点', '司机这行最怕心急 操作我都慢一步'],
        'catering': ['店里忙的时候我只做最关键核对 其他等空了再看', '餐饮这边节奏快 我一般先把风险点卡住', '收工后我会把当天记录再过一遍'],
        'factory': ['车间做事讲流程 我这边也是按步骤来', '我习惯先把前后步骤对齐再提交', '工厂干久了 我不做跳步操作'],
        'small_biz': ['做小生意先算风险 这边也是先保底', '现金流压力大 我不会冲动加仓', '我做决定一般先看回撤承受范围'],
        'sales': ['做业务习惯先确认信息源 这边也一样', '我会先分清事实和情绪 再说判断', '先把口径统一再讨论效率更高'],
        'generic': ['我一般先核对关键信息再操作', '先做小步验证更稳', '我不太会盲跟节奏'],
    }[job]


def stress_pack(job):
    base = {
        'low': ['我这边先稳稳看', '按流程走就行', '先不放大焦虑'],
        'medium': ['我先缩短表达 先核对', '先不扩散 先确认', '这会儿我偏保守处理'],
        'high': ['我会先停一步 不乱点', '先找可验证数据再说', '我先私下核实 不在群里放大'],
    }
    if job == 'driver':
        base['high'].append('我在路上更不会乱操作 先靠边再看')
    if job == 'catering':
        base['medium'].append('店里忙我就先记下来 等空了再核')
    if job == 'factory':
        base['low'].append('按SOP走基本不出错')
    return base


def apply_refine(bot):
    profile = bot.get('profile', {}) if isinstance(bot.get('profile'), dict) else {}
    rp = bot.get('response_variation_pack', {}) if isinstance(bot.get('response_variation_pack'), dict) else {}
    cp = bot.get('conversation_policy', {}) if isinstance(bot.get('conversation_policy'), dict) else {}
    rumor = bot.get('rumor_and_conflict_playbook', {}) if isinstance(bot.get('rumor_and_conflict_playbook'), dict) else {}

    hometown = t(profile.get('hometown'))
    city = t(profile.get('current_location'))
    occ = t(profile.get('occupation'))
    region = classify_region(hometown, city)
    job = classify_job(occ)

    intents = rp.get('intent_groups', {}) if isinstance(rp.get('intent_groups'), dict) else {}
    for k in ['收益相关', '风险与质疑', '操作建议']:
        intents.setdefault(k, [])

    add_lines = region_lines(region) + job_lines(job)
    for line in add_lines:
        if line not in intents['操作建议']:
            intents['操作建议'].append(line)

    if region == 'guangdong':
        for s in ['先对下先', '我先看清楚先', '先稳住节奏先']:
            if s not in intents['风险与质疑']:
                intents['风险与质疑'].append(s)

    rp['intent_groups'] = intents
    rp['stress_scenario_pack'] = stress_pack(job)
    rp['local_flavor'] = {
        'region': region,
        'job_cluster': job,
        'style_hint': 'one_local_phrase_max_per_message',
    }
    bot['response_variation_pack'] = rp

    # conversation policy 精修：先答后问，避免空问句
    asp = cp.get('answer_shape_policy', {}) if isinstance(cp.get('answer_shape_policy'), dict) else {}
    asp['must_answer_before_question'] = True
    asp['max_followup_questions'] = 1
    asp['forbid_question_only_reply'] = True
    cp['answer_shape_policy'] = asp

    clar = cp.get('ask_clarification_templates', {}) if isinstance(cp.get('ask_clarification_templates'), dict) else {}
    clar.setdefault('when_conflict_detected', [])
    for s in ['我们先把先后顺序对齐', '先把可验证的那部分定下来', '先不带情绪，先对事实']:
        if s not in clar['when_conflict_detected']:
            clar['when_conflict_detected'].append(s)
    cp['ask_clarification_templates'] = clar
    cp['human_realism_guard'] = {
        'ban_generic_loop_phrases': ['查看详情', '先小额试水+查看规则（重复）'],
        'require_personal_anchor': 'reply_should_include_one_personal_or_context_anchor',
    }
    bot['conversation_policy'] = cp

    # rumor/conflict 精修：职业场景化去冲突
    neg = rumor.get('negative_rumor', {}) if isinstance(rumor.get('negative_rumor'), dict) else {}
    neg.setdefault('sample_lines', [])
    for s in job_lines(job)[:2]:
        line = f'传闻场景我会这样处理：{s}'
        if line not in neg['sample_lines']:
            neg['sample_lines'].append(line)
    rumor['negative_rumor'] = neg

    grp = rumor.get('group_conflict', {}) if isinstance(rumor.get('group_conflict'), dict) else {}
    grp.setdefault('deescalation_lines', [])
    extra = {
        'driver': '我在外面跑车，先不跟着情绪走，先核对',
        'catering': '店里再忙也先把事实摆清楚，不互怼',
        'factory': '按流程说话，别上升人身',
        'small_biz': '做生意最怕冲动，先止损情绪',
        'sales': '口径先统一，别互扣帽子',
        'generic': '先把事实捋清，再讨论观点',
    }[job]
    if extra not in grp['deescalation_lines']:
        grp['deescalation_lines'].append(extra)
    rumor['group_conflict'] = grp
    rumor['persona_conflict_style'] = {'region': region, 'job_cluster': job}
    bot['rumor_and_conflict_playbook'] = rumor

    # 标记版本
    bot['schema_ref'] = 'kiro_persona_v5.0.0-refined-human-v2'
    return region, job


def main():
    wl = load_whitelist()
    patched = 0
    region_count = {}
    job_count = {}

    for bot_id, fn in sorted(wl.items()):
        path = os.path.join(BASE, fn)
        with open(path, 'r', encoding='utf-8') as f:
            bot = json.load(f)
        region, job = apply_refine(bot)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(bot, f, ensure_ascii=False, indent=2)
        patched += 1
        region_count[region] = region_count.get(region, 0) + 1
        job_count[job] = job_count.get(job, 0) + 1

    report = {
        'version': 'human-refine-v2',
        'patched': patched,
        'region_distribution': region_count,
        'job_distribution': job_count,
        'focus': [
            'response_variation_pack localization',
            'conversation_policy anti-question-only',
            'rumor_and_conflict_playbook persona conflict style',
        ],
    }
    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print('patched', patched)
    print('report', REPORT_PATH)


if __name__ == '__main__':
    main()
