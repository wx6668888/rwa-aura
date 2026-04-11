#!/usr/bin/env python3
import glob
import hashlib
import json
import os
import re
from typing import Dict, List, Tuple


TARGET_BUCKETS = [
    ("response_templates", None),
    ("conversation_policy.ask_clarification_templates", None),
    ("conversation_policy.refuse_templates", "responses"),
    ("rumor_and_conflict_playbook.negative_rumor", "sample_lines"),
    ("rumor_and_conflict_playbook.group_conflict", "deescalation_lines"),
    ("response_variation_pack.intent_groups", None),
]


def hpick(seed: str, arr: List[str], salt: str = "") -> str:
    if not arr:
        return ""
    hv = int(hashlib.md5((seed + "|" + salt).encode("utf-8")).hexdigest(), 16)
    return arr[hv % len(arr)]


def normalize_ws(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def remove_polluted_phrases(s: str) -> str:
    t = s
    t = re.sub(r"(确认数发(?:在)?群里了吗[？?]?|发(?:在)?群里了吗[？?]?|群里确认了吗[？?]?|确认数发群里了没[？?]?)", "", t)
    t = t.replace("比存银行强", "我自己更看重节奏稳一点")
    t = t.replace("就投了点，不多", "我是按自己承受范围来")
    t = t.replace("每天都有，挺好的", "整体还算稳定，我就先按计划走")
    t = re.sub(r"\s{2,}", " ", t).strip(" ，,")
    return normalize_ws(t)


def persona_meta(d: Dict) -> Tuple[str, str, str, int]:
    bid = str(d.get("id", "RWA_BOT_000"))
    profile = d.get("profile") or {}
    occ = str(profile.get("occupation") or "普通上班")
    city = str(profile.get("current_location") or "本地")
    nick = str(profile.get("nickname") or profile.get("name") or bid)
    fin = (d.get("finance") or {}).get("current_position") or {}
    locks = d.get("consistency_locks") or {}
    total = fin.get("total_staked_usdt", locks.get("current_total_staked_usdt", 0))
    try:
        total = int(total or 0)
    except Exception:
        total = 0
    return bid, occ, city, nick, total


def rewrite_line(s: str, bid: str, occ: str, city: str, nick: str, total_usdt: int, idx: int) -> str:
    s = remove_polluted_phrases(s)
    seed = f"{bid}:{idx}:{s}"

    hard = {
        "在": [
            "在呢，刚忙完一阵。",
            "在，我刚看到消息。",
            "在的，回你了。",
            "在这，刚腾出空。",
        ],
        "嗯，看到了": [
            "看到了，我这边马上回。",
            "收到，你这条我看见了。",
            "看见了，我接着说。",
            "嗯我在，看到了。",
        ],
        "在嘞，刚才忙": [
            "在，刚刚手头有点忙。",
            "我在，刚才在忙别的。",
            "在呢，刚忙完回你。",
            "我在，刚空下来。",
        ],
    }
    if s in hard:
        return hpick(seed, hard[s], "hard")

    # investment-specific replacements
    if "投了多少" in s or "投资" in s or "仓位" in s:
        if total_usdt > 0:
            opts = [
                f"我这边大概是 {total_usdt}u 左右，按自己承受范围来的。",
                f"我目前差不多 {total_usdt}u，先稳着做，不追高。",
                f"我这边大概 {total_usdt}u，上下有点浮动但就这个量级。",
                f"我现在大概 {total_usdt}u，主要按自己的节奏慢慢来。",
            ]
            return hpick(seed, opts, "invest_yes")
        opts = [
            "我这边是按自己承受范围做的，不会硬报大数。",
            "仓位这块我偏保守，就按自己情况来。",
            "我这边分批做，不会一次上太多。",
        ]
        return hpick(seed, opts, "invest_no")

    replacements = [
        ("先别", ["先不要", "先缓一下", "先稳一手"]),
        ("先看", ["先对一下", "先核对下", "先确认一下"]),
        ("不确定", ["拿不准", "没十成把握", "这个我不敢拍板"]),
        ("你自己决定", ["你按自己情况定", "还是你自己拿主意", "最终你自己判断"]),
        ("先这样，不急", ["先按这个节奏，不着急", "先稳着来，别赶", "先不着急推进"]),
        ("我先", ["我这边先", "我一般先", "按我习惯先"]),
        ("别慌", ["先别急", "先稳住", "先不要上头"]),
    ]
    out = s
    for src, arr in replacements:
        if src in out:
            out = out.replace(src, hpick(seed, arr, src), 1)

    # inject light persona anchor to make pools per-bot
    city_short = city.split("省")[-1] if "省" in city else city
    anchor_opts = [
        f"按我这边做{occ}的节奏看，先稳着。",
        f"我在{city_short}这边一般先核对再说。",
        f"按我平时{occ}的习惯，我会先看清楚。",
        f"{nick}这边的做法是先把信息对齐。",
    ]
    if len(out) <= 8:
        out = f"{out} {hpick(seed, anchor_opts, 'anchor_short')}"
    elif re.search(r"[。！？!?]$", out):
        if int(hashlib.md5((seed + "|append").encode("utf-8")).hexdigest(), 16) % 3 == 0:
            out = f"{out}{hpick(seed, anchor_opts, 'anchor_append')}"
    else:
        if int(hashlib.md5((seed + "|append2").encode("utf-8")).hexdigest(), 16) % 3 == 0:
            out = f"{out}。{hpick(seed, anchor_opts, 'anchor_append2')}"

    out = remove_polluted_phrases(out)
    if not out:
        out = hpick(seed, anchor_opts, "fallback")
    return normalize_ws(out)


def ensure_unique(lines: List[str], bid: str, occ: str, city: str, nick: str, seen_global: set, total_usdt: int) -> List[str]:
    out: List[str] = []
    seen_local = set()
    for i, raw in enumerate(lines):
        s = rewrite_line(str(raw), bid, occ, city, nick, total_usdt, i)
        tries = 0
        while (s in seen_local or s in seen_global) and tries < 5:
            s = rewrite_line(s + f" {tries+1}", bid, occ, city, nick, total_usdt, i + tries + 1)
            tries += 1
        if not s:
            continue
        seen_local.add(s)
        seen_global.add(s)
        out.append(s)
    return out


def patch_dict_of_lists(obj: Dict, bid: str, occ: str, city: str, nick: str, seen_global: set, total_usdt: int):
    for k, v in list(obj.items()):
        if isinstance(v, list):
            obj[k] = ensure_unique(v, bid, occ, city, nick, seen_global, total_usdt)


def main():
    files = sorted(glob.glob("chat-server/botsoul/RWA_BOT_*.txt"))
    by_id: Dict[str, str] = {}
    for f in files:
        try:
            d = json.load(open(f, "r", encoding="utf-8"))
        except Exception:
            continue
        bid = d.get("id")
        if not isinstance(bid, str):
            continue
        base = os.path.basename(f)
        prev = by_id.get(bid)
        if prev is None or re.fullmatch(rf"{re.escape(bid)}\.txt", base):
            by_id[bid] = f

    seen_global = set()
    changed = 0

    for bid, f in sorted(by_id.items()):
        d = json.load(open(f, "r", encoding="utf-8"))
        bid, occ, city, nick, total_usdt = persona_meta(d)
        before = json.dumps(d, ensure_ascii=False, sort_keys=True)

        # 1) response_templates.*
        rt = d.get("response_templates")
        if isinstance(rt, dict):
            patch_dict_of_lists(rt, bid, occ, city, nick, seen_global, total_usdt)

        # 2) conversation_policy.ask_clarification_templates.*
        cp = d.get("conversation_policy")
        if isinstance(cp, dict):
            aq = cp.get("ask_clarification_templates")
            if isinstance(aq, dict):
                patch_dict_of_lists(aq, bid, occ, city, nick, seen_global, total_usdt)

            # 3) conversation_policy.refuse_templates.*.responses
            rf = cp.get("refuse_templates")
            if isinstance(rf, dict):
                for _, node in rf.items():
                    if isinstance(node, dict) and isinstance(node.get("responses"), list):
                        node["responses"] = ensure_unique(node["responses"], bid, occ, city, nick, seen_global, total_usdt)

        # 4) rumor/conflict lines
        rc = d.get("rumor_and_conflict_playbook")
        if isinstance(rc, dict):
            nr = rc.get("negative_rumor")
            if isinstance(nr, dict) and isinstance(nr.get("sample_lines"), list):
                nr["sample_lines"] = ensure_unique(nr["sample_lines"], bid, occ, city, nick, seen_global, total_usdt)
            gc = rc.get("group_conflict")
            if isinstance(gc, dict) and isinstance(gc.get("deescalation_lines"), list):
                gc["deescalation_lines"] = ensure_unique(gc["deescalation_lines"], bid, occ, city, nick, seen_global, total_usdt)

        # 5) response_variation_pack.intent_groups.*
        rvp = d.get("response_variation_pack")
        if isinstance(rvp, dict):
            ig = rvp.get("intent_groups")
            if isinstance(ig, dict):
                patch_dict_of_lists(ig, bid, occ, city, nick, seen_global, total_usdt)

        after = json.dumps(d, ensure_ascii=False, sort_keys=True)
        if before != after:
            changed += 1
            with open(f, "w", encoding="utf-8") as wf:
                json.dump(d, wf, ensure_ascii=False, indent=2)
                wf.write("\n")

    print(f"changed_files={changed}")
    print(f"total_personas={len(by_id)}")


if __name__ == "__main__":
    main()

