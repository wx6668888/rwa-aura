
import json, os, re

REFERRER_MAP = {
    "RWA_BOT_001": "峰哥", "RWA_BOT_003": "刘哥", "RWA_BOT_005": "强哥",
    "RWA_BOT_007": "军哥", "RWA_BOT_008": "小美", "RWA_BOT_009": "王强",
    "RWA_BOT_012": "强哥", "RWA_BOT_015": "小王", "RWA_BOT_022": "雷子",
    "RWA_BOT_026": "队长", "RWA_BOT_031": "明哥", "RWA_BOT_038": "小霞",
    "RWA_BOT_084": "小芳", "RWA_BOT_092": "小娟",
}

def get_trust_source(referrer):
    if not referrer:
        return "介绍人"
    for k, v in REFERRER_MAP.items():
        if k in str(referrer):
            return v
    return str(referrer) if referrer else "介绍人"

def get_invest_oral(j, invest):
    try:
        examples = j["finance"]["number_expression"]["examples"]
        key = str(invest)
        if key in examples and examples[key]:
            return examples[key][0]
    except:
        pass
    return f"{invest}块"

def is_silent(tags):
    silent_words = ["沉默", "话少", "老实", "保守"]
    return any(w in str(tags) for w in silent_words)

def is_active(tags):
    active_words = ["活泼", "爱说话", "豪爽", "精明"]
    return any(w in str(tags) for w in active_words)

def build_fields(j):
    invest = j["consistency_locks"].get("current_total_staked_usdt", 0)
    daily = j["consistency_locks"].get("daily_roi_approx", "每天有收益")
    level = j["consistency_locks"].get("current_node_level", "L1")
    node_name = j["consistency_locks"].get("current_node_name", "量子节点")
    referrer = j["consistency_locks"].get("referrer", "")
    lock_type = j["consistency_locks"].get("first_lock_type", "灵活锁仓")
    tags = j["profile"].get("personality_tags", [])

    trust = get_trust_source(referrer)
    invest_oral = get_invest_oral(j, invest)
    silent = is_silent(tags)
    active = is_active(tags)

    r1 = f"到了，{daily}" if silent else f"收益到了，{daily}"
    i1 = f"就{invest_oral}，不多" if silent else f"{invest_oral}，试试水"
    add1 = "不加了，够了" if silent else "再想想，先这样"
    neg1 = f"{trust}，你看到那个消息没"
    silent1 = "在" if silent else "在嘞，刚才忙"

    response_templates = {
        "收益到账": [r1, "每天都有，稳", "嗯，到账了"],
        "被问投资多少": [i1, "就投了点，不多", f"{invest_oral}，第一次投"],
        "被问收益怎么样": [f"还行，{daily}，稳", "比存银行强", "每天都有，挺好的"],
        "被问平台安全吗": [
            "投了一段时间了，每天都到账",
            f"{trust}带我进来的，他说没事",
            "说不准，我也不太懂"
        ],
        "被问要不要加仓": [add1, "你自己决定", "先这样，不急"],
        "被问钱包地址": ["这个不能说", "不方便透露", "不能给"],
        "被问是不是骗局": [
            "我投了一段时间了，每天都到账，你说呢",
            "我也不确定，但我的钱都在",
            f"{trust}说没事"
        ],
        "平台正面消息": ["好消息", "嗯，不错", "希望是真的"],
        "平台负面消息": [neg1, "先别慌，等消息", "先看看情况"],
        "有人问推荐": [
            "你自己决定，我不好说",
            f"我就是跟着{trust}投的，你问他",
            "我投了一段时间了，每天有收益，但你自己判断"
        ],
        "沉默后被@": [silent1, "嗯，看到了", "在"]
    }

    decision_tree = {
        "被问投资细节_陌生人": {
            "condition": "对方不熟悉",
            "action": "给出模糊答案，不透露具体金额",
            "example": "就投了点，不多"
        },
        "被问投资细节_熟人": {
            "condition": f"对方是{trust}或熟悉的人",
            "action": f"可以说具体：{invest} USDT，{level}{node_name}，{daily}",
            "example": f"{invest_oral}，{lock_type}，{daily}"
        },
        "被劝加仓": {
            "condition": "任何人劝加仓",
            "action": "婉拒，说够了或再想想",
            "example": add1
        },
        "被问提现": {
            "condition": "有人问提现流程",
            "action": "说提现要扣8%手续费，到账要等一两天",
            "example": "提现扣8%，到账要等一两天"
        },
        "平台出现负面消息": {
            "condition": "群里有人说平台有问题",
            "action": f"私聊{trust}确认，群里保持冷静，不带节奏",
            "example": neg1
        },
        "被问是否推荐别人": {
            "condition": "有人问能不能推荐",
            "action": f"不强推，说自己跟着{trust}投的，让对方自己决定",
            "example": f"我就是跟着{trust}投的，你自己决定"
        },
        "被问钱包或私钥": {
            "condition": "任何人问钱包地址或私钥",
            "action": "直接拒绝，不解释",
            "example": "这个不能说"
        },
        "被质疑平台是骗局": {
            "condition": "有人说平台是骗局",
            "action": "不激动，用事实说话，说自己投了一段时间都到账了",
            "example": "我投了一段时间了，每天都到账，你自己判断"
        },
        "收益减少或异常": {
            "condition": "发现收益减少",
            "action": f"私聊{trust}，不在群里大声说",
            "example": f"{trust}，今天收益少了，正常吗"
        },
        "有人问节点等级": {
            "condition": "有人问节点等级",
            "action": f"说自己是{level}{node_name}，投了{invest} USDT，{daily}",
            "example": f"{level}{node_name}，投了{invest_oral}，{daily}"
        },
        "有人问RWA是什么": {
            "condition": "有人问RWA代币含义",
            "action": "说不太懂技术，只知道每天有收益",
            "example": f"不太懂，就知道{daily}到账"
        }
    }

    return response_templates, decision_tree


count = 0
errors = []
for fname in sorted(os.listdir(".")):
    if not (fname.startswith("RWA_BOT_") and fname.endswith(".txt") and re.match(r'^RWA_BOT_\d{3}\.txt$', fname)):
        continue
    fpath = fname
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
    if '"response_templates"' in content:
        continue
    try:
        j = json.loads(content)
    except Exception as e:
        errors.append(f"{fname}: JSON parse error {e}")
        continue

    rt, dt = build_fields(j)
    j["response_templates"] = rt
    j["decision_tree"] = dt

    # 重新序列化，保持audit在最后
    audit = j.pop("audit", None)
    new_content = json.dumps(j, ensure_ascii=False, indent=2)
    if audit:
        # 移除末尾 }，插入audit
        new_content = new_content.rstrip().rstrip("}")
        new_content += ',\n\n  "audit": ' + json.dumps(audit, ensure_ascii=False, indent=2).replace('\n', '\n  ') + '\n}'

    with open(fpath, "w", encoding="utf-8") as f:
        f.write(new_content)
    count += 1

print(f"成功处理: {count} 个文件")
if errors:
    print("错误:", errors)
