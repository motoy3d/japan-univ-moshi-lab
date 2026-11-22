# 模試の英文の難しさを数値で測り、本番の英文（参照用テキスト）と比べる。
#   python3 scripts/quality_metrics.py <本番の英文テキスト（OCR等・リポジトリには入れない）> content/exams/<id>.json
# 依存: pip install wordfreq（語の頻度。Zipf 値が低いほど難しい語）
# 本番の問題文は著作権があるため、比較用のテキストはローカルにだけ置き、コミットしないこと。
import json, re, sys, statistics as st
from wordfreq import zipf_frequency

real = open(sys.argv[1]).read()
exam = json.load(open(sys.argv[2]))

def clean(t):
    t = re.sub(r"\{\{[buw]:\w+\|?([^}]*)\}\}", lambda m: m.group(1) or "___", t)
    t = re.sub(r"\(\s*\d+\s*\)|（\s*\d+\s*）|[^\x00-\x7f]", " ", t)
    return re.sub(r"\s+", " ", t).strip()

def syl(w):
    w = w.lower(); v = re.findall(r"[aeiouy]+", w)
    n = len(v) - (1 if w.endswith("e") and len(v) > 1 and not w.endswith("le") else 0)
    return max(1, n)

def fk(t):
    ws = words(t); ss = [s for s in re.split(r"(?<=[.!?])\s+", t) if len(words(s)) > 2]
    return 0.39 * len(ws) / len(ss) + 11.8 * sum(syl(w) for w in ws) / len(ws) - 15.59

def words(t):
    return re.findall(r"[A-Za-z][A-Za-z'-]*", t)

def metrics(name, t):
    t = clean(t); w = [x.lower().strip("'-") for x in words(t)]
    content = [x for x in w if len(x) > 3]
    z = [zipf_frequency(x, "en") for x in content]
    sents = [s for s in re.split(r"(?<=[.!?])\s+", t) if len(words(s)) > 2]
    return {
        "name": name, "words": len(w),
        "sent_len": round(st.mean(len(words(s)) for s in sents), 1),
        "FK_grade": round(fk(t), 1),
        "word_len": round(st.mean(len(x) for x in w), 2),
        "rare<4.0": f"{100*sum(1 for v in z if v < 4.0)/len(z):.1f}%",
        "rare<3.0": f"{100*sum(1 for v in z if v < 3.0)/len(z):.1f}%",
    }

def between(a, b):
    i = real.find(a); j = real.find(b, i + 1)
    return real[i:j]

rows = []
r1 = between("Genealogy, in essence", "[Adapted from a book chapter")
r3 = between("Why should we seek education?", "[Adapted from an article by Robert Reich]")
rows.append(metrics("本番 長文I", r1)); rows.append(metrics("本番 長文III", r3))
for s in exam["sections"][:3]:
    rows.append(metrics(f"模試 長文{s['label']}", " ".join(s["passage"]["paragraphs"])))
# 設問・選択肢（長文I〜III）
qreal = between("( i ) In the context", "IV 次") if "IV 次" in real else ""
# 本番: (i) の最初から IV の指示直前まで
i = real.find("( i ) In the context"); j = real.find("(30)")
rows.append(metrics("本番 長文の設問・選択肢", real[i:j]))
qs = []
for s in exam["sections"][:3]:
    for g in s["groups"]:
        for q in g["questions"]:
            qs.append((q.get("prompt") or "") + " " + " ".join(q["choices"]))
rows.append(metrics("模試 長文の設問・選択肢", " ".join(qs)))
# 文法IV
i = real.find("(30)"); j = real.find("(37)")
rows.append(metrics("本番 文法IV", real[i:j]))
s4 = exam["sections"][3]
rows.append(metrics("模試 文法IV", " ".join(q["prompt"] + " " + " ".join(q["choices"]) for g in s4["groups"] for q in g["questions"])))
for r in rows: print(r)

# 空所補充の選択肢（1語）の語彙レベル
def choice_zipf(choices):
    z = [zipf_frequency(c.lower(), "en") for c in choices if re.fullmatch(r"[A-Za-z]+", c)]
    return round(st.mean(z), 2), len(z)
i = real.find("(37) 1"); seg = real[i:i+700]
v_real = [w for w in re.findall(r"\b[a-z]{3,}\b", seg)]
v_ours = [c for g in exam["sections"][4]["groups"] for q in g["questions"] for c in q["choices"]]
print("V選択肢 平均Zipf 本番", choice_zipf(v_real), "模試", choice_zipf(v_ours))
print("本番V選択肢", v_real[:24])
