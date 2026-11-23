# 仮想受験者の解答を採点し、結果を JSON で保存する／複数の結果を表にまとめる。
#   python3 scripts/simulate/score.py grade <exam.json> <persona_id> <解答者の出力.txt> <結果.json>
#   python3 scripts/simulate/score.py report <結果.json> ... [--md 出力.md]
#
# 比較用の共通部分（本番の公開部分と同じ大問）での得点率を compareRate として出す。
# 本番は II・V・VII と VI の2題が非公開のため、I・III・IV・VI・VIII で比べる。
import argparse
import json
import re
import sys

COMMON = ["I", "III", "IV", "VI", "VIII"]


def extract_json(text):
    blocks = re.findall(r"```json\s*(\{.*?\})\s*```", text, re.S)
    if not blocks:
        blocks = re.findall(r"(\{\s*\"answers\".*\})", text, re.S)
    return json.loads(blocks[-1])


def grade(exam, persona, raw):
    out = extract_json(raw)
    ans = out["answers"]
    conf = out.get("confidence", {})
    secs = {}
    for s in exam["sections"]:
        got = full = 0
        items = []
        for g in s["groups"]:
            # 「同じ動詞を二回以上選んだ場合は得点にならない」
            reused = set()
            forms = g.get("wordForms")
            if forms:
                seen = {}
                for q in g["questions"]:
                    a = str(ans.get(f"w{q['no']}", "")).strip().lower()
                    for verb, fs in forms.items():
                        if a in [f.lower() for f in fs]:
                            seen.setdefault(verb, []).append(q["no"])
                reused = {n for v in seen.values() if len(v) > 1 for n in v}
            for q in g["questions"]:
                key = f"{'m' if q['kind'] == 'mark' else 'w'}{q['no']}"
                a = ans.get(key)
                if q["kind"] == "mark":
                    ok = str(a).strip() == str(q["answer"])
                else:
                    ok = str(a or "").strip().lower() in [x.lower() for x in q["answer"]] and q["no"] not in reused
                full += q["points"]
                got += q["points"] if ok else 0
                items.append({"id": key, "category": q.get("category"), "ok": ok, "answer": a, "confidence": conf.get(key)})
        secs[s["label"]] = {"got": got, "full": full, "items": items}
    total = sum(v["got"] for v in secs.values())
    full = sum(v["full"] for v in secs.values())
    cg = sum(secs[l]["got"] for l in COMMON if l in secs)
    cf = sum(secs[l]["full"] for l in COMMON if l in secs)
    return {
        "exam": exam["id"], "persona": persona,
        "total": total, "full": full, "rate": round(total / full, 3),
        "compareRate": round(cg / cf, 3) if cf else None,
        "sections": {k: {"got": v["got"], "full": v["full"], "rate": round(v["got"] / v["full"], 3)} for k, v in secs.items()},
        "items": [i for v in secs.values() for i in v["items"]],
        "notes": out.get("notes", ""),
    }


def report(results, md=None):
    exams = sorted({r["exam"] for r in results}, key=lambda e: (not e.startswith("ref"), e))
    personas = sorted({r["persona"] for r in results})
    by = {(r["exam"], r["persona"]): r for r in results}
    L = ["| 受験者 | " + " | ".join(exams) + " |", "|---|" + "---|" * len(exams)]
    for p in personas:
        row = []
        for e in exams:
            r = by.get((e, p))
            row.append(f"{r['compareRate']:.0%}（全体 {r['rate']:.0%}）" if r else "—")
        L.append(f"| {p} | " + " | ".join(row) + " |")
    L.append("")
    L.append("共通部分（I・III・IV・VI・VIII）の得点率。括弧内は試験全体の得点率。")
    L.append("")
    for p in personas:
        L.append(f"### {p} の大問別得点率")
        labels = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]
        L.append("| 試験 | " + " | ".join(labels) + " |")
        L.append("|---|" + "---|" * len(labels))
        for e in exams:
            r = by.get((e, p))
            if r:
                L.append(f"| {e} | " + " | ".join(f"{r['sections'][l]['rate']:.0%}" if l in r["sections"] else "—" for l in labels) + " |")
        L.append("")
    text = "\n".join(L)
    if md:
        open(md, "w", encoding="utf-8").write(text + "\n")
    print(text)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    g = sub.add_parser("grade")
    g.add_argument("exam")
    g.add_argument("persona")
    g.add_argument("raw")
    g.add_argument("out")
    r = sub.add_parser("report")
    r.add_argument("results", nargs="+")
    r.add_argument("--md")
    a = ap.parse_args()
    if a.cmd == "grade":
        exam = json.load(open(a.exam, encoding="utf-8"))
        res = grade(exam, a.persona, open(a.raw, encoding="utf-8").read())
        json.dump(res, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"{res['exam']} {res['persona']}: {res['total']}/{res['full']} ({res['rate']:.0%}) 共通部分 {res['compareRate']:.0%}")
        print("  " + " ".join(f"{k}:{v['got']}/{v['full']}" for k, v in res["sections"].items()))
    else:
        report([json.load(open(p, encoding="utf-8")) for p in a.results], a.md)


if __name__ == "__main__":
    sys.exit(main())
