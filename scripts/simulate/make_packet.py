# 仮想受験者用の「問題冊子」を作る。
#   python3 scripts/simulate/make_packet.py <exam.json> <persona.json> <出力.md> [--like <模試.json>]
#
# 受験者が知らない語を [?] に伏せ、読む速さから時間切れになる大問を決めて、答えを含まない冊子を書き出す。
# 解答者（独立した AI）はこの冊子だけを読み、受験者になりきって解く。手順は docs/authoring/README.md の 6 章。
#
# --like: 本番の公開部分のように一部の大問しかない試験のとき、欠けている大問にかかる時間を模試で見積もり、
#         持ち時間（90分）をその割合で縮める。
# 依存: wordfreq
import argparse
import hashlib
import json
import math
import re

from wordfreq import zipf_frequency

WORD = re.compile(r"[A-Za-z][A-Za-z'-]*")


# ---------- 語彙 ----------
def variants(w):
    """語形変化を取り除いた候補（frequency は活用形より原形のほうが高いことが多い）"""
    w = w.lower().strip("'-")
    out = {w}
    for suf, rep in [("ies", "y"), ("es", ""), ("s", ""), ("ied", "y"), ("ed", ""), ("ed", "e"), ("ing", ""), ("ing", "e"), ("ly", ""), ("er", ""), ("est", "")]:
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            out.add(w[: -len(suf)] + rep)
    if w.endswith("'s"):
        out.add(w[:-2])
    return out


class Vocab:
    def __init__(self, persona, glossary=()):
        self.z50 = persona["vocab"]["zipf50"]
        self.spread = persona["vocab"]["spread"]
        self.seed = persona["id"]
        self.glossary = {g.lower() for g in glossary}
        self.unknown = set()

    def knows(self, word, sentence_start=False):
        w = word.lower().strip("'-")
        if len(w) <= 3 or w in self.glossary:
            return True
        if word[0].isupper() and not sentence_start:
            return True  # 固有名詞（人名・地名）は読めるものとする
        parts = [p for p in re.split(r"-", w) if p]
        if len(parts) > 1:
            return all(self.knows(p) for p in parts)
        z = max(zipf_frequency(v, "en") for v in variants(w))
        p = 1 / (1 + math.exp(-(z - self.z50) / self.spread))
        # 同じ語はどこに出ても同じ結果になるよう、受験者と語から決まる乱数を使う
        lemma = min(variants(w), key=len)
        u = int(hashlib.sha256(f"{self.seed}:{lemma}".encode()).hexdigest()[:8], 16) / 0xFFFFFFFF
        known = u < p
        if not known:
            self.unknown.add(lemma)
        return known

    def mask(self, text):
        out, pos = [], 0
        for m in WORD.finditer(text):
            before = text[:m.start()].rstrip()
            start = before == "" or before[-1] in ".!?:\"“(" or before.endswith("}}")
            out.append(text[pos:m.start()])
            out.append(m.group(0) if self.knows(m.group(0), start) else "[?]")
            pos = m.end()
        out.append(text[pos:])
        return "".join(out)


# ---------- 表示 ----------
def render(text, vocab, mask=True):
    # 下線部などの記号を先に退避してから伏せる（記号の中の語も伏せる）
    def u(m):
        inner = vocab.mask(m.group(2)) if mask else m.group(2)
        return f"〔下線({m.group(1)}): {inner}〕"
    text = re.sub(r"\{\{u:(\w+)\|([^}]*)\}\}", u, text)
    parts = re.split(r"(\{\{[bw]:\w+\}\}|〔下線\(\d+\): [^〕]*〕)", text)
    out = []
    for p in parts:
        m = re.fullmatch(r"\{\{[bw]:(\w+)\}\}", p)
        if m:
            out.append(f"( {m.group(1)} )")
        elif p.startswith("〔下線"):
            out.append(p)
        else:
            out.append(vocab.mask(p) if mask else p)
    return "".join(out)


SENT = re.compile(r"(?<=[.!?])[\"”]?\s+(?=[A-Z{\"“])")
MARK = re.compile(r"\( \w+ \)|〔下線\(\d+\): [^〕]*〕")


def render_passage(text, vocab, collapse):
    """本文を文ごとに伏せる。知らない語が collapse 個以上ある文は、受験者が意味を取れなかった文として丸ごと伏せる
    （空所・下線部の記号だけは位置が分かるように残す）"""
    out = []
    for sent in SENT.split(text):
        r = render(sent, vocab)
        if collapse and r.count("[?]") >= collapse:
            marks = MARK.findall(r)
            r = "〔意味が取れなかった文" + ("：" + " ".join(marks) if marks else "") + "〕"
        out.append(r)
    return " ".join(out)


def knows_item(persona, exam_id, qno):
    """文法問題を『知っている』か。受験者・試験・設問から決まる乱数で、grammarKnown の確率で知っている"""
    u = int(hashlib.sha256(f"{persona['id']}:{exam_id}:{qno}".encode()).hexdigest()[:8], 16) / 0xFFFFFFFF
    return u < persona.get("grammarKnown", 1.0)


def nwords(text):
    return len(WORD.findall(re.sub(r"\{\{[buw]:\w+\|?|\}\}", " ", text)))


# ---------- 時間 ----------
def group_need(g, persona, with_passage=True):
    words = nwords(" ".join(g.get("passage", {}).get("paragraphs", []))) if with_passage else 0
    secs = 0
    for q in g["questions"]:
        words += nwords(q.get("prompt", "")) + sum(nwords(c) for c in q.get("choices", []))
        secs += persona["secondsPerMark"] if q["kind"] == "mark" else persona["secondsPerWrite"]
    return words / persona["readingWpm"] * 60 + secs


def section_need(s, persona):
    words = nwords(" ".join(s.get("passage", {}).get("paragraphs", [])))
    return words / persona["readingWpm"] * 60 + sum(group_need(g, persona) for g in s["groups"])


def missing_need(exam, like, persona):
    """exam に欠けている大問・小問グループの所要時間を、模試 like で見積もる"""
    have = {s["label"]: s for s in exam["sections"]}
    extra = 0
    for s in like["sections"]:
        if s["label"] not in have:
            extra += section_need(s, persona)
        else:
            k = len(s["groups"]) - len(have[s["label"]]["groups"])
            if k > 0:
                extra += sum(group_need(g, persona) for g in s["groups"][-k:])
    return extra


# ---------- 冊子 ----------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("exam")
    ap.add_argument("persona")
    ap.add_argument("out")
    ap.add_argument("--like", help="欠けている大問の時間を見積もる模試（本番の公開部分を解くとき）")
    a = ap.parse_args()
    exam = json.load(open(a.exam, encoding="utf-8"))
    persona = json.load(open(a.persona, encoding="utf-8"))

    glossary = []
    for s in exam["sections"]:
        for n in s.get("passage", {}).get("notes", []) or []:
            glossary += WORD.findall(n.split(" ")[0])
    vocab = Vocab(persona, glossary)

    budget = exam["durationMin"] * 60
    order = {lab: i for i, lab in enumerate(persona["order"])}
    secs = sorted(exam["sections"], key=lambda s: order.get(s["label"], 99))
    if a.like:
        like = json.load(open(a.like, encoding="utf-8"))
        have = sum(section_need(s, persona) for s in secs)
        budget = budget * have / (have + missing_need(exam, like, persona))

    status, left = {}, budget
    for s in secs:
        need = section_need(s, persona)
        status[s["label"]] = "full" if left >= need else ("partial" if left >= need * 0.4 else "timeout")
        status[s["label"] + "_frac"] = max(0.0, min(1.0, left / need))
        left -= need

    L = []
    L.append(f"# 試験冊子（{exam['university']} {exam['faculty']} {exam['subject']}）")
    L.append("")
    L.append("## あなたが演じる受験者")
    L.append(f"- {persona['label']}")
    L.append(f"- {persona['description']}")
    L.append("- 苦手な（知らない・あやふやな）文法・語法事項：")
    L += [f"  - {x}" for x in persona["grammarWeak"]]
    L.append("- 解き方の癖：")
    L += [f"  - {x}" for x in persona["behavior"]]
    L.append("")
    L.append("## ルール（必ず守ること）")
    L.append("- `[?]` はこの受験者が意味を知らない語。元の語を推測して復元してはいけない。高校生が前後の文脈から推測できる範囲でだけ意味を補うこと。")
    L.append("- 選択肢の中の `[?]` も同じ。意味の分からない選択肢は、他の選択肢との比較や消去法でしか判断できない。")
    L.append("- 苦手な文法事項に当たる問題は、確信を持てないものとして推測で答えること。")
    L.append("- 【時間切れ】と書かれた大問は、本文を読む時間がなかった。示された範囲だけで判断し、残りは勘で答えること（空欄にはしない）。")
    L.append("- 外部の知識（この英文の出典や、この試験の正解を知っていること）を使ってはいけない。")
    L.append("- 記号 ( 1 ) は空所、〔下線(5): …〕は下線部、( a ) は記述の空所。")
    L.append("")

    for s in secs:
        st = status[s["label"]]
        frac = status[s["label"] + "_frac"]
        L.append(f"## {s['label']}")
        if st == "timeout":
            L.append("【時間切れ】この大問に着手する時間がほとんど残っていなかった。本文は読めていない。設問と選択肢だけを見て、勘で答えること。")
        elif st == "partial":
            L.append(f"【時間切れ】時間が足りず、本文は前半（約{int(frac * 100)}%）しか読めなかった。読めていない部分に関わる設問は勘で答えること。")
        L.append(s["instruction"])
        if s.get("example"):
            L.append(s["example"])
        paras = s.get("passage", {}).get("paragraphs", [])
        if st != "timeout" and paras:
            if st == "partial":
                total = sum(nwords(p) for p in paras)
                keep, acc = [], 0
                for p in paras:
                    if acc >= total * frac:
                        break
                    keep.append(p)
                    acc += nwords(p)
                paras = keep + ["（ここから先は読む時間がなかった）"]
            L.append("")
            L += [render_passage(p, vocab, persona.get("sentenceCollapse")) if not p.startswith("（") else p for p in paras]
            notes = s.get("passage", {}).get("notes") or []
            if notes:
                L.append("（注）" + " / ".join(notes))
        elif st == "timeout" and paras:
            L.append("（本文は読んでいない。ただし空所・下線部の番号の位置は分からない）")
        for g in s["groups"]:
            L.append("")
            if g.get("instruction"):
                L.append(g["instruction"])
            gp = g.get("passage", {}).get("paragraphs", [])
            if gp:
                L.append(f"{g['passage'].get('label', '')} " + (" ".join(render_passage(p, vocab, persona.get("sentenceCollapse")) for p in gp) if st != "timeout" else "（本文は読んでいない）"))
            if g.get("wordBox"):
                box = [w + ("（意味を知らない）" if not vocab.knows(w) else "") for w in g["wordBox"]]
                L.append("語群: " + " / ".join(box))
            for q in g["questions"]:
                if q["kind"] == "mark":
                    prompt = q.get("prompt") or ""
                    if s["label"] == "IV":
                        # 文法問題は語形そのものが手がかりなので選択肢は伏せない（苦手事項で調整する）
                        weak = "" if knows_item(persona, exam["id"], q["no"]) else "　【この問題の文法・語法事項はあやふや：確信を持てず、推測で選ぶ】"
                        L.append(f"({q['no']}) {render(prompt, vocab)}{weak}")
                        L += [f"    {i}. {c}" for i, c in enumerate(q["choices"], 1)]
                    else:
                        L.append(f"({q['no']}) {render(prompt, vocab)}".rstrip())
                        L += [f"    {i}. {render(c, vocab)}" for i, c in enumerate(q["choices"], 1)]
                else:
                    L.append(f"記述 ({q['label']}) → 解答番号 w{q['no']}")
        L.append("")

    marks = [q for s in exam["sections"] for g in s["groups"] for q in g["questions"] if q["kind"] == "mark"]
    writes = [q for s in exam["sections"] for g in s["groups"] for q in g["questions"] if q["kind"] == "write"]
    L.append("## 解答の書き方")
    L.append("最後に、次の形の JSON だけを ```json のコードブロックで出力すること（マークは 1〜4 の数字、記述は英単語1語）。")
    example = {f"m{q['no']}": 1 for q in marks[:2]}
    example.update({f"w{q['no']}": "word" for q in writes[:1]})
    L.append("```json")
    L.append(json.dumps({"answers": example, "confidence": {"m1": "確信/迷った/勘"}, "notes": "全体の感想（難しかった大問、時間配分など）"}, ensure_ascii=False))
    L.append("```")
    ids = [f"m{q['no']}" for q in marks] + [f"w{q['no']}" for q in writes]
    L.append("解答番号は次のすべてについて答えること（冊子にない番号は書かない）。confidence も全問について書くこと: " + ", ".join(ids))

    open(a.out, "w", encoding="utf-8").write("\n".join(L) + "\n")
    used = budget - left
    summary = {
        "exam": exam["id"], "persona": persona["id"], "budgetMin": round(budget / 60, 1), "needMin": round(used / 60, 1),
        "sections": {s["label"]: status[s["label"]] for s in secs},
        "unknownWords": len(vocab.unknown),
        "unknownSample": sorted(vocab.unknown)[:40],
    }
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
