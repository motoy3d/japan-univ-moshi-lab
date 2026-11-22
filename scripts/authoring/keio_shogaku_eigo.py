# 慶應義塾大学 商学部 英語 の模試を組み立てる共通部品。
# 各回の原稿スクリプト（scripts/build-keio-shogaku-NN.py）から使う。形式の根拠は
# content/profiles/keio-shogaku-eigo.json と docs/authoring/README.md を参照。
import json
import pathlib
import random
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]

# 配点（大学は非公表。予備校の想定配点を参考にした本模試の配点）
BLANK = 3   # 長文の空所補充
READ = 5    # 長文の下線部・内容一致・表題
GRAMMAR = 2  # IV
CLOZE = 2   # V
INFER = 4   # VI
WRITE = 3   # VII・VIII

SOURCE = "[Original passage written for this mock exam]"
SHEET_A = "解答用紙A（マークシート）"
TITLE_PROMPT = "Which one of the following titles best captures the main idea of the passage?"
VI_PROMPTS = [
    "Which one of the following can be inferred from the passage?",
    "Which one of the following statements is consistent with the content of the passage?",
    "With which one of the following statements would the author most likely agree?",
    "Which one of the following statements best captures the main argument of the passage?",
]


# ---------- 設問 ----------
# 設問番号は finalize() でまとめて振る（本番と同じく、長文は「空所 → その他」の順に番号を付けるため）
def mark(category, choices, answer, explanation, prompt=None, points=None):
    q = {"id": None, "kind": "mark", "no": None, "category": category}
    if prompt:
        q["prompt"] = prompt
    q.update({"choices": choices, "points": points, "answer": answer, "explanation": explanation})
    return q


def write(label, answers, explanation, points=WRITE, category="verb-form"):
    return {
        "id": None, "kind": "write", "no": None, "label": label, "category": category,
        "points": points, "answer": answers, "explanation": explanation,
    }


def blank(choices, answer, exp, category="logic"):
    """長文の空所（本文に {{b:N}}）。category: logic（論理・接続）/ vocab（語彙・語法）"""
    return mark(category, choices, answer, exp, points=BLANK)


def uline(no_hint, choices, answer, exp, prompt):
    """長文の下線部の設問（本文に {{u:N|...}}、prompt に underlined (N)）"""
    return mark("paraphrase", choices, answer, exp, prompt=prompt, points=READ)


def detail(prompt, choices, answer, exp):
    return mark("detail", choices, answer, exp, prompt=prompt, points=READ)


def title(choices, answer, exp, prompt=TITLE_PROMPT):
    return mark("main-idea", choices, answer, exp, prompt=prompt, points=READ)


def grammar(prompt, choices, answer, exp):
    """IV。prompt の空所は _____"""
    return mark("grammar", choices, answer, exp, prompt=prompt, points=GRAMMAR)


def cloze(choices, answer, exp):
    """V（本文に {{b:N}}）"""
    return mark("vocab", choices, answer, exp, points=CLOZE)


# ---------- 大問 ----------
def mark_instruction(first, last, what="の設問について最も適切なものを"):
    return f"次の英文を読み、（{first}）〜（{last}）{what}選択肢 1〜4 から選び、その番号を{SHEET_A}の解答欄（{first}）〜（{last}）にマークしなさい。"


def long_section(label, first, last, paragraphs, notes, questions):
    # 本番どおり (i) 空所の設問 → (ii) その他の設問。番号もこの順に振る
    blanks = [q for q in questions if not q.get("prompt")]
    others = [q for q in questions if q.get("prompt")]
    return {
        "label": label,
        "instruction": mark_instruction(first, last),
        "passage": {"paragraphs": paragraphs, "notes": notes, "source": SOURCE},
        "groups": [
            {"instruction": "(i) In the context of this passage, choose the most suitable expression to fill in each blank.", "answerLine": True, "questions": blanks},
            {"instruction": "(ii) In the context of this passage, choose the best answer for each question.", "answerLine": True, "questions": others},
        ],
    }


def grammar_section(questions, first=30, last=36):
    return {
        "label": "IV",
        "instruction": f"次の英文（{first}）〜（{last}）の空所に入る最も適切なものを選択肢 1〜4 から選び、その番号を{SHEET_A}の解答欄（{first}）〜（{last}）にマークしなさい。",
        "groups": [{"instruction": "", "questions": questions}],
    }


def cloze_section(paragraphs, questions, first=37, last=42):
    return {
        "label": "V",
        "instruction": f"次の英文の空所（{first}）〜（{last}）に入る最も適切なものを選択肢 1〜4 から選び、その番号を{SHEET_A}の解答欄（{first}）〜（{last}）にマークしなさい。",
        "passage": {"paragraphs": paragraphs, "source": SOURCE},
        "groups": [{"instruction": "", "questions": questions}],
    }


def short_section(items, first=43):
    """VI。items = [(本文, 選択肢, 正解, 解説), ...]（4題）。設問文は VI_PROMPTS の順"""
    groups = []
    for i, (text, choices, ans, exp) in enumerate(items):
        q = mark("inference", choices, ans, exp, prompt=VI_PROMPTS[i], points=INFER)
        groups.append({"instruction": "", "answerLine": True, "passage": {"label": f"({first + i})", "paragraphs": [text], "source": SOURCE}, "questions": [q]})
    return {
        "label": "VI",
        "instruction": f"次の英文（{first}）〜（{first + len(items) - 1}）を読み、それぞれの設問について最も適切なものを選択肢 1〜4 から選び、その番号を{SHEET_A}の解答欄（{first}）〜（{first + len(items) - 1}）にマークしなさい。",
        "groups": groups,
    }


def verb_section(paragraphs, words, forms, questions):
    """VII。words は語群（アルファベット順）、forms は {動詞: [語形...]}（二回使用の判定用）"""
    return {
        "label": "VII",
        "instruction": "次の英文を読み、空所（a）〜（f）に入る、文脈の上で最も適した動詞を下記の語群から選び、必要に応じて語形を変えて解答用紙Bの解答欄に記入しなさい。ただし、各解答欄に記入する語は一語のみとし、同じ動詞を二回以上選んではいけない。同じ動詞を二回以上選んだ場合は、正解が含まれていてもその解答は得点にならない。",
        "sheetNotice": "ここからは解答用紙Bを使用しなさい。",
        "passage": {"paragraphs": paragraphs, "source": SOURCE},
        "groups": [{"instruction": "", "wordBox": sorted(words), "wordForms": forms, "questions": questions}],
    }


def noun_section(paragraphs, words, forms, questions, example="例： decide → decision"):
    """VIII。動詞の名詞形のみ（〜ing 形は不可）"""
    return {
        "label": "VIII",
        "instruction": "次の英文を読み、空所（a）〜（e）に入る、文脈の上で最も適した名詞を解答用紙Bの解答欄に記入しなさい。下記の動詞の最も適切な名詞形のみを使用すること。ただし、〜ing 形は使用してはいけない。また、同じ動詞を二回以上選んではいけない。同じ動詞を二回以上選んだ場合は、正解が含まれていてもその解答は得点にならない。",
        "example": example,
        "passage": {"paragraphs": paragraphs, "source": SOURCE},
        "groups": [{"instruction": "", "wordBox": sorted(words), "wordForms": forms, "questions": questions}],
    }


# ---------- 仕上げ ----------
_CHOICE_NO = re.compile(r"(?<![第\d.０-９])([1-4])(?=\s*(?:は|が|・|。|も|で|の|、|）|\)|$|と))")


def _swap_numbers(text, a, b):
    if a == b:
        return text
    return _CHOICE_NO.sub(lambda m: str(b) if m.group(1) == str(a) else str(a) if m.group(1) == str(b) else m.group(1), text)


COVER_NOTES = [
    "受験番号と氏名は、解答用紙A（マークシート）と解答用紙Bのそれぞれ所定の欄に必ず記入すること。さらに、解答用紙A（マークシート）の受験番号欄をマークすること。",
    "解答は、すべて指定された解答用紙の所定の欄に記入またはマークすること。I〜VI は解答用紙A（マークシート）、VII・VIII は解答用紙Bを使用する。",
    "解答用紙A（マークシート）への記入に先立って、用紙上に記載された注意事項を必ず読むこと。",
    "解答用紙A（マークシート）にはHBの黒鉛筆を使用し、たとえば（12）と表示のある問いに対して 3 と解答する場合は、解答欄（12）の 3 をマークすること。",
    "問題冊子の余白は下書きに用いてよい。",
    "試験開始の合図とともに全てのページが揃っているか確認し、ページの抜けや重複があった場合は直ちに監督者に申し出ること。",
]
DISCLAIMER = "本模試は、過去の出題形式（大問構成・設問形式・分量）を参考に独自に作成したオリジナル問題です。慶應義塾大学および同大学の入学試験とは一切関係がありません。配点は大学から公表されていないため、本模試独自の想定配点です。"


def finalize(sections, exam_id, edition, seed):
    """番号を振り、正解の位置を均等化して content/exams/<exam_id>.json に書き出す"""
    n_mark = n_write = 0
    for sec in sections:
        for g in sec["groups"]:
            for q in g["questions"]:
                if q["kind"] == "mark":
                    n_mark += 1
                    q["id"], q["no"] = f"m{n_mark}", n_mark
                else:
                    n_write += 1
                    q["id"], q["no"] = f"w{n_write}", n_write

    # 正解の位置を 1〜4 に均等に散らす（作問時は正解を2番目に置きがちなため）。
    # 正解の選択肢と、目標の位置にある選択肢を入れ替え、解説中の選択肢番号も入れ替える。
    marks = [q for sec in sections for g in sec["groups"] for q in g["questions"] if q["kind"] == "mark"]
    targets = ([1, 2, 3, 4] * (len(marks) // 4 + 1))[: len(marks)]
    random.Random(seed).shuffle(targets)
    for q, t in zip(marks, targets):
        a = q["answer"]
        if a != t:
            ch = q["choices"]
            ch[a - 1], ch[t - 1] = ch[t - 1], ch[a - 1]
            q["answer"] = t
            q["explanation"] = _swap_numbers(q["explanation"], a, t)

    exam = {
        "id": exam_id,
        "profile": "keio-shogaku-eigo",
        "university": "慶應義塾大学",
        "faculty": "商学部",
        "subject": "英語",
        "title": "慶應義塾大学 商学部 英語 予想模試",
        "edition": edition,
        "durationMin": 90,
        "totalPoints": 200,
        "coverNotes": COVER_NOTES,
        "disclaimer": DISCLAIMER,
        "sections": sections,
    }
    out = ROOT / "content/exams" / f"{exam_id}.json"
    out.write_text(json.dumps(exam, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for s in sections:
        texts = list(s.get("passage", {}).get("paragraphs", []))
        for g in s["groups"]:
            texts += g.get("passage", {}).get("paragraphs", [])
        words = len(re.sub(r"\{\{[buw]:\w+\|?|\}\}", " ", " ".join(texts)).split())
        qs = [q for g in s["groups"] for q in g["questions"]]
        print(f"{s['label']:>4}: {words:4d} words, {len(qs):2d} 問, {sum(q['points'] for q in qs):3d} 点")
    print("mark", n_mark, "write", n_write, "total", sum(q["points"] for s in sections for g in s["groups"] for q in g["questions"]))
    return exam
