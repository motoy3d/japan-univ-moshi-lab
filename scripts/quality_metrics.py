# 模試の英文の難しさを数値で測り、入試プロファイルの目標範囲（difficulty）と照合する。
#   python3 scripts/quality_metrics.py content/exams/<id>.json [--reference 本番の英文テキスト]
# 依存: pip install wordfreq（語の頻度。Zipf 値が低いほど難しい語）
# --reference は本番問題の英文（OCR 等）。著作権があるため、ローカルの .local/ にだけ置き、コミットしないこと。
import argparse
import json
import pathlib
import re
import statistics as st
import sys

from wordfreq import zipf_frequency

ROOT = pathlib.Path(__file__).resolve().parent.parent


def clean(t):
    t = re.sub(r"\{\{[buw]:\w+\|?([^}]*)\}\}", lambda m: m.group(1) or "___", t)
    t = re.sub(r"\(\s*\d+\s*\)|（\s*\d+\s*）|[^\x00-\x7f]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def words(t):
    return re.findall(r"[A-Za-z][A-Za-z'-]*", t)


def syl(w):
    w = w.lower()
    v = re.findall(r"[aeiouy]+", w)
    n = len(v) - (1 if w.endswith("e") and len(v) > 1 and not w.endswith("le") else 0)
    return max(1, n)


def metrics(t):
    t = clean(t)
    w = [x.lower().strip("'-") for x in words(t)]
    content = [x for x in w if len(x) > 3]
    z = [zipf_frequency(x, "en") for x in content]
    sents = [s for s in re.split(r"(?<=[.!?])\s+", t) if len(words(s)) > 2]
    fk = 0.39 * len(w) / max(1, len(sents)) + 11.8 * sum(syl(x) for x in w) / max(1, len(w)) - 15.59
    return {
        "words": len(w),
        "sentLen": round(st.mean(len(words(s)) for s in sents), 1) if sents else 0,
        "fkGrade": round(fk, 1),
        "wordLen": round(st.mean(len(x) for x in w), 2) if w else 0,
        "rareShare": round(sum(1 for v in z if v < 4.0) / max(1, len(z)), 3),
    }


def in_range(v, r):
    return r[0] <= v <= r[1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("exam")
    ap.add_argument("--reference", help="本番の英文テキスト（比較用、ローカルのみ）")
    ap.add_argument("--json", help="結果を JSON で書き出すパス")
    a = ap.parse_args()
    exam = json.load(open(a.exam, encoding="utf-8"))
    prof = json.load(open(ROOT / "content/profiles" / f"{exam['profile']}.json", encoding="utf-8"))
    diff = prof["difficulty"]
    out = {"exam": exam["id"], "passages": [], "checks": []}

    longs = [s for s in exam["sections"] if s["label"] in prof["longPassages"]["sections"]]
    for s in longs:
        m = metrics(" ".join(s["passage"]["paragraphs"]))
        part2 = sum(len((q.get("prompt") or "").split()) + sum(len(c.split()) for c in q["choices"]) for q in s["groups"][1]["questions"])
        m.update({"section": s["label"], "partIIWords": part2})
        out["passages"].append(m)

    # 学術的な長文（低頻度語の割合が最も高いもの）が1題、残りは論説レベル
    ranked = sorted(out["passages"], key=lambda m: -m["rareShare"])
    acad, others = ranked[: diff["academicPassage"]["count"]], ranked[diff["academicPassage"]["count"]:]
    for m in acad:
        out["checks"].append((f"長文{m['section']}（学術）低頻度語 {m['rareShare']:.1%}", in_range(m["rareShare"], diff["academicPassage"]["rareShare"])))
        out["checks"].append((f"長文{m['section']}（学術）FK {m['fkGrade']}", in_range(m["fkGrade"], diff["academicPassage"]["fkGrade"])))
    for m in others:
        out["checks"].append((f"長文{m['section']} 低頻度語 {m['rareShare']:.1%}", in_range(m["rareShare"], diff["otherPassages"]["rareShare"])))
        out["checks"].append((f"長文{m['section']} FK {m['fkGrade']}", in_range(m["fkGrade"], diff["otherPassages"]["fkGrade"])))
    for m in out["passages"]:
        out["checks"].append((f"長文{m['section']} (ii) の語数 {m['partIIWords']}", in_range(m["partIIWords"], diff["partIIWordsPerSection"])))

    cloze = next(s for s in exam["sections"] if s["label"] == "V")
    cz = st.mean(zipf_frequency(c.lower(), "en") for g in cloze["groups"] for q in g["questions"] for c in q["choices"])
    out["clozeChoiceZipf"] = round(cz, 2)
    out["checks"].append((f"V 選択肢の平均Zipf {cz:.2f}", in_range(cz, diff["clozeChoiceZipf"])))

    if a.reference:
        ref = open(a.reference, encoding="utf-8").read()
        out["reference"] = metrics(ref)

    print(f"# {exam['id']}  （目標: {prof['id']} の difficulty）")
    for m in out["passages"]:
        print(f"  長文{m['section']}: {m['words']}語 文長{m['sentLen']} FK{m['fkGrade']} 語長{m['wordLen']} 低頻度語{m['rareShare']:.1%} (ii){m['partIIWords']}語")
    if a.reference:
        r = out["reference"]
        print(f"  参照（本番）: {r['words']}語 文長{r['sentLen']} FK{r['fkGrade']} 語長{r['wordLen']} 低頻度語{r['rareShare']:.1%}")
    ok = True
    for label, passed in out["checks"]:
        print(f"  {'✓' if passed else '✗'} {label}")
        ok &= passed
    out["checks"] = [{"label": l, "pass": p} for l, p in out["checks"]]
    if a.json:
        pathlib.Path(a.json).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
