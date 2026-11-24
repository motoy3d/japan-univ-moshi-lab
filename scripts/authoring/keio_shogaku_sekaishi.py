# 慶應義塾大学 商学部 世界史 の模試を組み立てる共通部品。
# 各回の原稿スクリプト（scripts/build-keio-shogaku-sekaishi-NN.py）から使う。形式の根拠は
# content/profiles/keio-shogaku-sekaishi.json と docs/authoring/README.md を参照。
#
# 本番の形式（2025・2026年度の公開問題で確認）:
#   - 大問3題。各大問は日本語の長いリード文と、
#     問1: 文中の空欄（2桁の番号の組）に入る語句を、11 から番号の付いた語群から選んでマーク
#     問2以降: 下線部や（あ）に関連する語句の記述と、15〜40字の短い論述（解答用紙B）
#   - 空欄は (1)(2) のように2つの解答欄を1組で使い、語群の番号（2桁）の十の位と一の位をマークする。
import json
import pathlib
import re
import unicodedata

ROOT = pathlib.Path(__file__).resolve().parents[2]

# 配点（大学は非公表。本模試独自の想定配点）
MARK = 1    # 空欄1つ（2桁で1組）
WRITE = 2   # 語句の記述
ESSAY = 3   # 論述（自己採点）

CHOICE_START = 11
SHEET_A = "解答用紙A（マークシート）"


# ---------- 設問 ----------
def blank(answer, category, explanation):
    """本文の空欄（本文には [[キー]] と書く）。answer は語群の語句と完全に同じ文字列"""
    return {"answer": answer, "category": category, "explanation": explanation}


def write(label, prompt, answers, explanation, category, figure=None, points=WRITE):
    """語句の記述。answers は正解として認める表記をすべて並べる（・や＝の有無は採点時に吸収する）。
    figure: {"src": "/figures/xxx.svg", "alt": 答えを書かない説明, "source": 出典}（グラフ・地図の設問）"""
    w = {"kind": "write", "label": label, "prompt": prompt, "answers": answers,
         "explanation": explanation, "category": category, "points": points}
    if figure:
        w["figure"] = figure
    return w


def essay(label, prompt, max_chars, model, viewpoints, points=ESSAY):
    """論述（字数制限つき）。自動採点はせず、模範解答と採点の観点を示して自己採点してもらう"""
    if len(model) > max_chars:
        raise ValueError(f"{label}: 模範解答が {len(model)} 字で {max_chars} 字を超えている: {model}")
    exp = f"【模範解答】{model}（{len(model)}字）\n【採点の観点】" + " ".join(f"{'①②③④'[i]}{v}" for i, v in enumerate(viewpoints))
    return {"kind": "write", "label": label, "prompt": prompt, "answers": [model],
            "explanation": exp, "category": "wh-essay", "points": points,
            "selfGrade": True, "maxChars": max_chars}


# ---------- 語群の並べ方 ----------
# 本番の語群は「数字（小さい順）→ 英字 → 五十音順（漢字は読みで）」に並び、11 から番号が付く。
_SMALL = str.maketrans("ぁぃぅぇぉっゃゅょゎ", "あいうえおつやゆよわ")


def _kana_key(reading):
    s = unicodedata.normalize("NFD", reading)
    base = "".join(ch for ch in s if ch not in "\u3099\u309a").translate(_SMALL).replace("ー", "")
    return (base, reading)


def bank_key(item):
    term, reading = item
    if re.fullmatch(r"\d+", term):
        return (0, int(term), "")
    if re.match(r"[A-Za-z]", term):
        return (1, 0, term.upper())
    if not reading:
        raise ValueError(f"語群の「{term}」に読みがない")
    return (2, 0, _kana_key(reading))


# ---------- 大問 ----------
_counter = {"mark": 0}


def section(label, paragraphs, blanks, bank, writes):
    """大問を組み立てる。
    paragraphs: 本文。空欄は [[キー]]、下線部は {{u:a|語句}}、記述の空欄（あ）は文字のまま書く。
    blanks: キー → blank()。本文に出てくる順に解答番号を振る。
    bank: 語群（(語句, 読み) のリスト）。正解の語句をすべて含めること。
    writes: write() / essay() のリスト（問2以降の順）。"""
    terms = [t for t, _ in bank]
    if len(set(terms)) != len(terms):
        dup = sorted({t for t in terms if terms.count(t) > 1})
        raise ValueError(f"大問{label}: 語群が重複 {dup}")
    ordered = [t for t, _ in sorted(bank, key=bank_key)]
    used = []
    marks = []

    def repl(m):
        key = m.group(1)
        if key not in blanks:
            raise KeyError(f"大問{label}: 空欄 {key} の定義がない")
        if key in used:
            raise ValueError(f"大問{label}: 空欄 {key} が二回出ている")
        used.append(key)
        b = blanks[key]
        if b["answer"] not in ordered:
            raise ValueError(f"大問{label}: 正解「{b['answer']}」が語群にない")
        _counter["mark"] += 1
        n = _counter["mark"]
        marks.append({
            "id": f"m{n}", "kind": "mark", "no": n, "label": f"{2 * n - 1}-{2 * n}",
            "category": b["category"], "points": MARK,
            "answer": ordered.index(b["answer"]) + 1, "explanation": b["explanation"],
        })
        return f"{{{{b:{n}}}}}"

    paras = [re.sub(r"\[\[(\w+)\]\]", repl, p) for p in paragraphs]
    unused = set(blanks) - set(used)
    if unused:
        raise ValueError(f"大問{label}: 本文に出てこない空欄 {sorted(unused)}")
    # 本文に出てこない語句が正解になっていないか（正解の重複）
    answers = [m["answer"] for m in marks]
    if len(set(answers)) != len(answers):
        raise ValueError(f"大問{label}: 同じ語句が二つの空欄の正解になっている")
    for t in ordered:
        # 語群の語がそのまま本文に出ていると、受験者に答えが見えてしまう（正解の語は空欄なので本文には出ない）
        if len(t) >= 2 and not t.isdigit() and any(t in re.sub(r"\{\{b:\d+\}\}", "", p) for p in paras):
            raise ValueError(f"大問{label}: 語群の「{t}」が本文にそのまま出ている")

    first, last = marks[0]["no"], marks[-1]["no"]
    c = lambda n: f"（{2 * n - 1}）（{2 * n}）"
    mark_group = {
        "instruction": f"問1　文中の空欄{c(first)}〜{c(last)}にあてはまる最も適当な語句を下記の語群から選び，その番号を{SHEET_A}の解答欄（{2 * first - 1}）〜（{2 * last}）にマークしなさい。",
        "choices": ordered,
        "choiceStart": CHOICE_START,
        "questions": marks,
    }
    wqs = []
    for w in writes:
        q = {"id": None, "kind": "write", "no": None, "label": w["label"], "category": w["category"],
             "prompt": w["prompt"], "points": w["points"], "answer": w["answers"], "explanation": w["explanation"]}
        if w.get("figure"):
            fig = w["figure"]
            if not (ROOT / "web" / "public" / fig["src"].lstrip("/")).exists():
                raise FileNotFoundError(f"図 {fig['src']} が web/public にない")
            q["figure"] = fig
        if w.get("selfGrade"):
            q["selfGrade"] = True
            q["maxChars"] = w["maxChars"]
        wqs.append(q)
    write_group = {"instruction": "問2以降は，解答用紙Bの所定の欄に記入しなさい。", "questions": wqs}
    return {
        "label": label,
        "instruction": "次の文章を読み，下記の問いに答えなさい。",
        "passage": {"paragraphs": paras},
        "groups": [mark_group, write_group],
    }


COVER_NOTES = [
    "受験番号と氏名は，解答用紙A（マークシート）と解答用紙Bのそれぞれ所定の欄に必ず記入すること。",
    "空欄の解答は，語群の番号（2桁）を解答用紙A（マークシート）にマークすること。たとえば空欄（19）（20）の解答が 36 の場合は，解答欄（19）の 3 と，解答欄（20）の 6 をマークする。",
    "問2以降の解答は，解答用紙Bの所定の欄に記入すること。字数の指定がある設問では，句読点も1字に数える。",
    "解答用紙A（マークシート）にはHBの黒鉛筆を使用すること。",
    "問題冊子の余白は下書きに用いてよい。",
]

DISCLAIMER = "本模試は、過去の出題形式（大問構成・設問形式・分量）を参考に独自に作成したオリジナル問題です。慶應義塾大学および同大学の入学試験とは一切関係がありません。配点は大学から公表されていないため、本模試独自の想定配点です。論述の設問は自動採点の対象外で、模範解答と採点の観点を見て自己採点します。"


def finalize(sections, exam_id, edition):
    w = 0
    for s in sections:
        for g in s["groups"]:
            for q in g["questions"]:
                if q["kind"] == "write":
                    w += 1
                    q["id"], q["no"] = f"w{w}", w
    exam = {
        "id": exam_id,
        "profile": "keio-shogaku-sekaishi",
        "university": "慶應義塾大学",
        "faculty": "商学部",
        "subject": "世界史",
        "title": "慶應義塾大学 商学部 世界史 予想模試",
        "edition": edition,
        "durationMin": 60,
        "totalPoints": 100,
        "coverNotes": COVER_NOTES,
        "disclaimer": DISCLAIMER,
        "sections": sections,
    }
    out = ROOT / "content" / "exams" / f"{exam_id}.json"
    out.write_text(json.dumps(exam, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    # 確認用の表示
    total = 0
    for s in sections:
        qs = [q for g in s["groups"] for q in g["questions"]]
        pts = sum(q["points"] for q in qs)
        total += pts
        chars = len(re.sub(r"\{\{b:\d+\}\}|\{\{u:\w+\||\}\}", "", "".join(s["passage"]["paragraphs"])))
        nm = sum(q["kind"] == "mark" for q in qs)
        nw = sum(q["kind"] == "write" for q in qs)
        ne = sum(bool(q.get("selfGrade")) for q in qs)
        print(f"大問{s['label']}: 本文 {chars}字 / 空欄 {nm}（解答欄 {nm * 2}）/ 記述 {nw}（うち論述 {ne}）/ 語群 {len(s['groups'][0]['choices'])}語 / {pts}点")
    print(f"→ {out.relative_to(ROOT)}（{total}点）")
    _counter["mark"] = 0
    return exam
