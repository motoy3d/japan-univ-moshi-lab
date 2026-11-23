# 慶應商学部 英語 第1回 予想模試の原稿 → content/exams/keio-shogaku-eigo-01.json を生成する。
# 本文・設問はすべてオリジナル。構成は 2020〜2026 年度の出題形式（大問8題・マーク46問＋記述11問）に合わせている。
#   python3 scripts/build-keio-shogaku-01.py
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from authoring.keio_shogaku_eigo import *  # noqa: E402,F403

sections = []

# ───────────────────────── I 長文（動的価格設定） ─────────────────────────
p1 = [
    "Dynamic pricing, the continuous adjustment of prices in response to fluctuations in demand, supply, or other market conditions, is frequently portrayed as a creation of the digital economy. {{b:1}} its algorithmic implementations are undeniably recent, the underlying principle is considerably older: itinerant merchants have always raised their prices when crowds congregated, and theaters have long distinguished between matinee and evening performances. What digital infrastructure has altered is not the logic of the practice but its velocity, its granularity, and, perhaps most consequentially, its visibility to the consumers who are subject to it.",
    "Economists have generally defended the practice on grounds of allocative efficiency. A fixed price, in this account, transmits no information when circumstances change. Should fares remain constant during a storm, prospective passengers will outnumber the drivers willing to work, and the resulting shortage will be rationed by queuing rather than by price, an outcome that is arguably less equitable, since it privileges those with the most time rather than those with the most urgent need. A higher price, by contrast, performs two functions simultaneously: it {{b:2}} some passengers to defer journeys that are not pressing, and it draws additional drivers into the market. The price, on this view, is not a penalty inflicted on the unfortunate but a signal that coordinates the decisions of buyers and sellers who would otherwise remain unaware of one another.",
    "Consumers, however, do not evaluate prices exclusively in terms of efficiency. A substantial body of research in behavioral economics indicates that judgments of price are inseparable from judgments of fairness. In a frequently cited series of surveys, respondents were asked to assess a hardware store that raised the price of snow shovels on the morning after a heavy snowfall. A large majority regarded the increase as unfair, notwithstanding the fact that it was precisely what an elementary model of supply and demand would predict. {{u:5|What respondents objected to was not the magnitude of the change but its motive}}: a firm that passed on an increase in its own costs was generally exonerated, whereas a firm that appeared to profit from a sudden intensification of need was condemned.",
    "Such intuitions impose genuine constraints on commercial conduct. When a prominent online retailer was discovered, around the turn of the century, to be charging different customers different prices for identical DVDs, the public response was so {{b:3}} that the company promptly apologized and refunded the difference. The episode exposed a distinction that consumers appear to draw almost instinctively. Prices that vary over time, for everyone simultaneously, are tolerated as a feature of the market; prices that vary from one individual to another, for reasons that remain opaque, are experienced as a form of deception.",
    "The proliferation of machine learning has rendered this distinction increasingly difficult to sustain. Algorithms can now infer, from a customer's location, device, and transaction history, approximately how much that particular individual would be willing to pay. In principle, a firm could exploit such inferences to quote a distinct price to every shopper, a strategy that economists term \"first-degree price discrimination.\" Its proponents contend that the consequences need not be regressive: students or low-income households might be offered discounts that a uniform price would never permit. Its critics respond that the practice {{u:6|entrenches an asymmetry of information that systematically favors the seller}}, since the customer, unable to observe what others are paying, has no means of determining whether a given offer is advantageous.",
    "Regulatory authorities in several jurisdictions have begun to respond. Some proposals would oblige firms to disclose whenever a price has been personalized; others would prohibit the use of particular categories of data, such as medical information, in the determination of prices. {{b:4}}, a number of firms have concluded that transparency serves their own interests. Certain ride-hailing platforms now indicate, before a booking is confirmed, the extent to which the current fare exceeds the customary one, and offer to notify the customer when it declines. Such measures leave the underlying economics unchanged, yet they appear to mitigate the sense of having been exploited.",
    "The controversy over dynamic pricing is therefore less a dispute about whether prices ought to fluctuate than about who benefits when they do. A fare that rises during a storm may well increase the supply of vehicles, but if customers come to believe that the system is designed principally to extract the maximum possible payment from them, they may defect to competitors or abandon the service altogether. Because the erosion of goodwill is gradual and largely invisible, registering only in journeys not taken and accounts quietly closed, it is easily underestimated. In the long run, firms that depend on flexible pricing may discover that {{u:7|their most valuable asset is not the sophistication of their algorithms but the confidence of the people who use them}}.",
]
q1 = [
    blank(["Although", "Because", "Unless", "Provided that"], 1,
          "「アルゴリズムによる実装は最近のもの」と「原理はずっと古い」は譲歩・対比の関係。Although が入る。Because では因果が逆になり、Unless・Provided that（〜という条件で）は条件を表すので文意が通らない。"),
    blank(["prohibits", "prompts", "entitles", "exempts"], 2,
          "prompt O to do「Oに〜するよう促す」。値上げは急ぎでない乗客に移動の延期を『促す』。prohibit O from -ing は形も意味も合わず、entitle（権利を与える）・exempt（免除する）は文脈に合わない。", category="vocab"),
    blank(["indifferent", "vehement", "tentative", "favorable"], 2,
          "so ~ that ...「非常に〜なので…」。会社がすぐ謝罪・返金したのだから、世間の反応は『激しい』（vehement）ものだった。indifferent（無関心な）・tentative（ためらいがちな）・favorable（好意的な）では謝罪につながらない。", category="vocab"),
    blank(["Otherwise", "Instead", "Meanwhile", "For instance"], 3,
          "前文は規制当局の動き、空所の後は企業側の自主的な動き。並行して起きていることを示す Meanwhile「一方で・その間に」が適切。For instance は前文の具体例ではないので不適、Instead は代替、Otherwise は条件の逆で不適。"),
    uline(5, [
        "Respondents accepted large price increases as long as they were announced in advance.",
        "Respondents judged a price increase by the reason behind it rather than by its size.",
        "Respondents believed that the size of a price change mattered more than the reason for it.",
        "Respondents objected to any price change that a model of supply and demand could predict.",
    ], 2, "下線部は「反対したのは変化の大きさではなく動機」。直後のコロン以下（コスト転嫁は許され、需要の急増につけ込むのは非難された）と一致する 2。3 は逆、4 は「モデル通りの値上げでも不公平とされた」ことを『あらゆる変化に反対』と言い過ぎている。1 は本文にない。",
        "What does the author mean by underlined (5)?"),
    uline(6, [
        "It requires sellers to reveal the prices that other customers have paid.",
        "It allows sellers to know more about a transaction than buyers can, and this imbalance works to the sellers' advantage.",
        "It gives buyers and sellers equal access to information, but only for a limited period of time.",
        "It guarantees that low-income households will always be offered lower prices than other customers.",
    ], 2, "entrench an asymmetry of information that favors the seller「売り手に有利な情報の非対称を固定化する」。since 以下（客は他人の支払額が見えない）が理由。2 が正解。4 は擁護派の主張を『必ず』と言い過ぎたもので、しかも批判派の論点ではない。",
        "What does the author mean by underlined (6)?"),
    uline(7, [
        "Firms should abandon algorithms and return to fixed prices if they wish to retain their customers.",
        "Flexible pricing can succeed in the long term only if customers continue to trust the firms that use it.",
        "Firms with the most sophisticated algorithms will eventually earn the confidence of their customers.",
        "Customers are confident that algorithms set prices more fairly than human managers do.",
    ], 2, "直前で「搾取されていると感じた客は離れ、その損失は気づきにくい」と述べ、柔軟な価格設定を続ける企業にとって最大の資産は利用者の信頼だと結論している。2 が最も近い。1 は筆者の主張を超えており、3・4 は本文にない。",
        "What does the author mean by underlined (7)?"),
    detail("According to the passage, why is the example of the snow shovels significant?", [
        "It shows that hardware stores tend to raise their prices whenever their own costs increase.",
        "It demonstrates that elementary economic models fail to predict how prices respond to demand.",
        "It illustrates that consumers' sense of fairness can diverge from what standard economic reasoning would predict.",
        "It suggests that most consumers are willing to pay more for goods that are in short supply.",
    ], 3, "需要と供給の単純なモデルどおりの値上げでも、多くの人が『不公平』と答えた。経済学の推論と公平感が食い違う例＝3。2 は「モデルは値上げを予測した」とあるので誤り。4 は調査結果と逆。"),
    detail("Which one of the following statements is consistent with the content of the passage?", [
        "Dynamic pricing originated with the spread of digital technology around the turn of the century.",
        "Some defenders of personalized pricing argue that it could benefit customers with limited means.",
        "Regulators in most countries now prohibit firms from using personal data to set prices.",
        "Disclosing the size of a fare increase has altered the basic economics of ride-hailing services.",
    ], 2, "第5段落「学生や低所得世帯は、単一価格では得られない割引を受けられるかもしれない」と擁護派が主張している＝2。1 は第1段落（原理はずっと古い）、3 は several jurisdictions / proposals、4 は「経済的な仕組みは変わらない」に反する。"),
    title([
        "The Algorithmic Revolution in Retail",
        "Efficiency, Fairness, and Trust in Flexible Pricing",
        "Why Economists Have Abandoned Fixed Prices",
        "Regulating Ride-Hailing Platforms in the Digital Age",
    ], 2, "効率性（柔軟な価格の利点）と公平感の対立を論じ、信頼の重要性で締めくくっている＝2。3 は逆（経済学者は柔軟な価格を擁護しているが、固定価格を『捨てた』とは述べていない）、1・4 は一部の話題にすぎない。",
        "Which one of the following titles best captures the main idea of the passage?"),
]
sections.append(long_section("I", 1, 10, p1, ["matinee （演劇などの）昼の公演", "allocative efficiency 配分の効率性", "exonerate 責任を免除する"], q1))

# ───────────────────────── II 長文（コンテナ輸送） ─────────────────────────
p2 = [
    "In April 1956, a converted oil tanker called the Ideal X left the port of Newark, New Jersey, carrying fifty-eight large metal boxes on its deck. Few people paid attention, and most experts at the time assumed that shipping by sea would always be slow and labor-intensive. The ship's owner, a trucking businessman named Malcom McLean, was not trying to change the world; he was trying to {{b:11}} the traffic jams that slowed his trucks along the crowded highways of the East Coast. His solution was simple: rather than unloading goods from a truck, carrying them onto a ship piece by piece, and loading them onto another truck at the other end, why not lift the entire trailer body onto the ship?",
    "Before the container, loading and unloading a ship was slow, expensive, and dangerous work. Cargo arrived at the docks in sacks, barrels, crates, and bales of every size, and gangs of dockworkers had to fit each item into the ship's hold by hand. A vessel could spend nearly as much time in port as it did at sea. Theft was common, and damage more common still. By some estimates, the cost of handling cargo at the docks made up as much as half the total cost of moving goods across the ocean.",
    "The container changed all of this by making cargo uniform. Once goods were packed into a standard box at a factory, they did not need to be touched again until they reached their final destination. Cranes could lift the boxes on and off ships in minutes, and the same box could travel by ship, train, and truck without ever being opened. McLean's first voyage reportedly reduced the cost of loading from almost six dollars per ton to about sixteen cents. {{u:14|Numbers like these}} were impossible for the rest of the industry to ignore. Insurance companies, which had long charged high rates to cover theft and breakage on the docks, soon lowered their premiums as well, adding further to the savings.",
    "Yet the container did not succeed overnight. For more than a decade, shipping lines, railways, and ports used boxes of different sizes, and a container that fit one company's ships might not fit another's cranes. The benefits of the system depended on everyone adopting {{b:12}} standards, and agreeing on them took years of difficult negotiation. Each firm naturally preferred the dimensions it already used, since changing them meant replacing expensive equipment. Only in the late 1960s did international bodies settle on a small family of sizes, including the twenty-foot box that still serves as the industry's unit of measurement. {{u:15|What had looked like a technical detail}} turned out to be the key to the whole system.",
    "Ports, too, had to be rebuilt. Old harbors in the centers of cities, with narrow piers and little space for storing boxes, gradually lost business to new terminals built on open land, often far from where dockworkers lived. The human cost of this transition was considerable. In port cities around the world, tens of thousands of dockworkers saw their jobs disappear, and neighborhoods that had grown up around the waterfront went into decline. Some of the busiest ports of the 1950s, such as those on the west side of Manhattan and in central London, handled almost no cargo at all within a generation. Labor unions fought the change, and in some places they won agreements that protected existing workers' incomes for many years. But they could not halt the container's {{u:16|relentless}} advance; the savings were simply too large.",
    "Economists have long debated how much the container contributed to the growth of world trade. Its most important effect may have been not the lower cost of shipping itself but the greater reliability it made possible. When manufacturers could count on parts arriving on schedule from distant suppliers, they began to {{b:13}} production across many countries, assembling a single product from components made in a dozen places. Distance, which had once protected local producers from foreign competition, mattered far less than before. Warehouses full of spare parts, once a sign of careful management, came to be seen as wasted money, and firms learned to keep only what they needed for the next few days.",
    "In this sense, the humble metal box helped create the global supply chains that define the modern economy — along with their weaknesses. A system designed to remove every unnecessary delay has little room to absorb an unexpected one. When ports were disrupted during the pandemic of 2020, ships waited for weeks to unload, empty containers piled up in the wrong places, and shortages spread from one industry to the next. {{u:17|The very efficiency that had made the system so attractive}} also made it fragile, and many companies have since begun to keep larger stocks and to buy from suppliers closer to home.",
]
q2 = [
    blank(["circumvent", "aggravate", "document", "quantify"], 1,
          "マクリーンは渋滞で遅れるトラック輸送に困っており、その解決策として船での輸送を考えた。渋滞を『回避する』circumvent が入る。aggravate（悪化させる）は逆、document（記録する）・quantify（数量化する）は目的に合わない。", category="vocab"),
    blank(["proprietary", "uniform", "provisional", "divergent"], 2,
          "異なるサイズの箱が混在して不便だった、という文脈。システムの利点は全員が『統一された』規格を採用することにかかっていた。proprietary（自社独自の）・divergent（ばらばらの）は逆、provisional（暫定的な）は文脈に合わない。", category="vocab"),
    blank(["curtail", "disperse", "postpone", "nationalize"], 2,
          "部品が予定通り届くと信頼できるようになったので、生産を多くの国に『分散させた』（disperse）。直後の「十数か所で作られた部品から一つの製品を組み立てる」と合う。curtail（削減する）・postpone（延期する）・nationalize（国有化する）は合わない。", category="vocab"),
    uline(14, [
        "the number of containers that the Ideal X was able to carry on its first voyage",
        "the dramatic reduction in loading costs that McLean's first voyage reportedly achieved",
        "the time that ships had previously spent in port compared with the time they spent at sea",
        "the number of dockworkers who would eventually lose their jobs because of containers",
    ], 2, "直前の文「積み込みコストが1トン約6ドルから約16セントに下がった」を指す。業界が無視できなかったのは劇的なコスト削減＝2。3 は第2段落の内容で、下線部とは離れている。",
        "Which one of the following does underlined (14) refer to?"),
    uline(15, [
        "a set of engineering rules so complex that only specialists could understand them",
        "the seemingly minor question of exactly what size the containers should be",
        "the disagreements between shipping lines and railways over who should pay for new cranes",
        "the decision to build new terminals on open land far from the centers of cities",
    ], 2, "前の文脈は箱の寸法の統一をめぐる交渉と、20フィートの箱が業界の単位になったこと。『技術的な細部に見えたもの』＝箱の正確な寸法という些細に思える問題＝2。4 は次の段落の内容。",
        "What does the author mean by underlined (15)?"),
    uline(16, ["sluggish", "inexorable", "fortuitous", "transient"], 2,
          "relentless「容赦ない・とどまることのない」≒ inexorable「止められない」。直前の「組合はその前進を止められなかった」とも一致する。sluggish（緩慢な）・fortuitous（偶然の）・transient（一時的な）は合わない。",
          "Which one of the following is closest in meaning to underlined (16)?"),
    uline(17, [
        "Having been built to remove every avoidable delay, the system had little room to cope when an unforeseen delay occurred.",
        "Because shipping had become so cheap, companies no longer paid attention to the efficiency of their supply chains.",
        "Because ports had become highly efficient, the disruption caused by the pandemic had little lasting effect on trade.",
        "Because containers proved so attractive, far more ships were built than the volume of trade could justify.",
    ], 1, "直前の「無駄な遅れを取り除くよう設計された仕組みは、予期せぬ遅れを吸収する余地がほとんどない」を言い換えた 1。効率性こそが脆さの原因でもあった。3 は本文（数週間待たされ、品不足が広がった）と逆。",
        "What does the author mean by underlined (17)?"),
    detail("According to the fourth paragraph, why did the container not succeed immediately?", [
        "Dockworkers refused to handle the boxes until their unions had negotiated new agreements.",
        "The early boxes were too heavy for the cranes that most ports possessed at the time.",
        "Companies used boxes of different sizes and were reluctant to adopt dimensions that would require new equipment.",
        "Shipping lines doubted McLean's claims about how much money the new method would save.",
    ], 3, "第4段落: 各社が異なるサイズの箱を使い、寸法を変えるには高価な設備の入れ替えが必要なため、自社の寸法を好んだ＝3。1 の組合の話は第5段落で、普及の遅れの理由としては述べられていない。"),
    detail("Which one of the following statements is consistent with the content of the passage?", [
        "McLean introduced containers mainly in order to make the work of dockworkers safer.",
        "Once deliveries became more reliable, many manufacturers decided that large stocks of spare parts were no longer necessary.",
        "Labor unions in some ports succeeded in preventing the introduction of containers for many years.",
        "Since 2020, most companies have shifted their purchases toward suppliers located far from home.",
    ], 2, "第6段落: 部品が予定通り届くようになり、予備部品の在庫は無駄とみなされ、数日分だけ持つようになった＝2。3 は「収入を守る合意は得たが、前進は止められなかった」に反する。4 は「より近い供給元から買い始めた」と逆。"),
]
sections.append(long_section("II", 11, 19, p2, ["hold 船倉", "bale （貨物の）梱", "pier 埠頭、桟橋"], q2))

# ───────────────────────── III 長文（ナッジ） ─────────────────────────
p3 = [
    "For decades, governments and employers tried to encourage people to save for retirement mainly by explaining why it mattered. Workers received brochures, attended seminars, and were shown charts of how small monthly contributions could grow over forty years. The results were disappointing. Many people agreed that they ought to save more, fully intended to do so, and then did nothing. The problem, it turned out, was not a lack of information but a {{b:20}} of action.",
    "Behavioral economists offered an explanation. People tend to stick with whatever option requires no decision — what researchers call the \"default.\" When joining a retirement plan required filling out forms, most new employees put it off, often indefinitely. In one now-famous study, researchers examined a company that changed its rules so that new employees were enrolled automatically unless they chose to {{b:21}}. Participation in the plan jumped from under half of new workers to nearly ninety percent, even though nothing about the plan's benefits had changed.",
    "The power of defaults is not limited to money. Countries in which citizens are presumed to be organ donors unless they register an objection report far higher rates of consent than countries in which people must actively sign up, although the number of transplants actually carried out depends on many other factors, such as the number of hospitals equipped to perform them and the willingness of families to agree. Similar patterns have been found in choices as varied as energy suppliers, insurance plans, and the privacy settings of smartphones. In each case, the option that requires no effort tends to win, whatever its merits.",
    "Findings like this gave rise to the idea of the \"nudge,\" popularized by the economist Richard Thaler and the legal scholar Cass Sunstein. A nudge is any feature of the way choices are presented that predictably changes behavior without forbidding any option or significantly changing financial incentives. Placing fruit at eye level in a school cafeteria is a nudge; banning sweets is not. {{u:23|The appeal to policymakers was obvious}}: nudges were cheap, and they appeared to respect individual freedom while still improving outcomes. Within a few years, governments in Britain, the United States, and elsewhere had set up special teams to apply the idea to everything from tax collection to organ donation.",
    "More recent research has added important qualifications. Automatic enrollment raises the number of people who save, but many of them remain at the low default contribution rate chosen by their employer, which may be {{b:22}} too small to provide a comfortable retirement. Some studies also suggest that workers who are enrolled automatically borrow more on credit cards, partly offsetting their new savings. And a large review of nudge experiments found that the effects reported in academic journals tended to be bigger than those observed when the same ideas were tested on a large scale by governments. Part of the gap, the reviewers suggested, arose because studies that found no effect were less likely to be published at all.",
    "Other critics have raised a more basic objection. If a nudge works precisely because people do not stop to think, they ask, how is it different from manipulation? A default that serves the saver is welcome, but the same techniques can be used to keep customers paying for subscriptions they no longer want, or to make cancelling a service deliberately confusing. Some researchers have begun to call such obstacles \"sludge,\" and they argue that removing {{u:24|sludge}} may do more good than adding new nudges. Filling out a twenty-page form to claim a benefit, for example, discourages exactly the people who need help most.",
    "Defenders of the approach reply that there is no neutral way to present a choice. A form must list its options in some order, and a plan must specify what happens to those who do nothing. {{u:25|Someone has to decide, whether or not they admit it}}. The real question, therefore, is not whether choices will be shaped but whether they will be shaped openly, for the benefit of the people making them, and in a way that allows anyone to choose differently at little cost.",
    "None of this means that nudges are useless. It means that the choice of a default is itself a decision with consequences, and that someone must take responsibility for making it well. A carefully designed plan might begin with a modest contribution and raise it automatically each time a worker receives a pay increase — an approach that takes advantage of people's tendency to accept the status quo while gradually moving them toward a more adequate level of saving. Such a plan does not force anyone to save more; workers remain free to leave or to lower their contributions at any time. But it recognizes that, for most people, the hardest step is not deciding what is right but actually getting around to doing it.",
]
q3 = [
    blank(["failure", "surplus", "prospect", "premium"], 1,
          "not A but B の対比。「情報の不足ではなく、行動の『欠如・不履行』」。a failure of action「行動しないこと」。直前の「意図はあったが何もしなかった」と一致。surplus（過剰）は逆、prospect（見込み）・premium（割増金）は文意に合わない。", category="vocab"),
    blank(["enroll", "opt out", "reciprocate", "comply"], 2,
          "自動で加入させた上で「〜を選ばない限り」なので、自ら脱退する opt out が入る。enroll（加入する）は自動加入と矛盾し、reciprocate（お返しをする）・comply（従う）は文意に合わない。", category="vocab"),
    blank(["far", "very", "such", "so"], 1,
          "比較級・too を強める副詞は far / much。far too small「あまりにも小さすぎる」。very too / so too とは言わない。such は名詞を修飾する。", category="vocab"),
    uline(23, [
        "Nudges promised to improve outcomes at little cost while leaving individuals free to choose otherwise.",
        "Nudges gave governments a convenient way to ban products they considered harmful to health.",
        "Nudges worked only when they were combined with substantial financial incentives.",
        "Nudges had already proved more effective than information campaigns in every country that tried them.",
    ], 1, "コロン以下が理由の説明「安価で、個人の自由を尊重しつつ成果を上げるように見えた」＝1。2・3 はナッジの定義（何も禁止せず、金銭的誘因を大きく変えない）に反し、4 は本文にない言い過ぎ。",
        "Why does the author say that underlined (23)?"),
    uline(24, [
        "rules that forbid people from choosing options that are considered harmful to them",
        "deliberate obstacles that make it harder for people to act in their own interest",
        "small financial rewards offered to people who agree to save more money",
        "information that is presented too simply to be of any practical use",
    ], 2, "sludge はナッジの悪用例として挙げられた「解約をわざと分かりにくくする」などの障害。直後の「20ページの申請書が、助けを最も必要とする人を遠ざける」も例＝2。1 は『禁止』で、本文の sludge は禁止ではなく手間を増やすもの。",
        "Which one of the following best expresses what underlined (24) refers to?"),
    uline(25, [
        "Individuals should be allowed to make every decision about their savings for themselves.",
        "Whoever designs the way a choice is presented inevitably shapes the outcome, whether or not they acknowledge it.",
        "Governments should leave decisions about retirement plans entirely to employers.",
        "It is usually impossible to discover who was responsible for designing a particular form.",
    ], 2, "直前で「選択肢を中立に示す方法はない（順番や、何もしない人の扱いを必ず決めなければならない）」と述べている。設計者は認めるかどうかに関わらず結果に影響を与える＝2。",
        "What does the author mean by underlined (25)?"),
    detail("According to the first paragraph, why were earlier efforts to encourage saving disappointing?", [
        "Most workers found the charts and brochures they were given too difficult to understand.",
        "Many people failed to act even though they agreed that they ought to save more.",
        "Employers gradually stopped offering retirement plans to their new employees.",
        "The information that workers received was later found to be inaccurate.",
    ], 2, "第1段落「貯蓄すべきだと同意し、そのつもりもあったが何もしなかった」＝2。問題は情報不足ではなく行動の欠如、とまとめられている。"),
    detail("According to the fourth paragraph, why did nudges appear to have smaller effects when governments tested them?", [
        "Governments tended to choose nudges that were quite different from those studied by researchers.",
        "Studies that found no effect were less likely to be published, so the published effects were inflated.",
        "By the time governments used them, workers had learned to recognize and ignore nudges.",
        "Large-scale tests are designed to produce smaller effects than small-scale experiments.",
    ], 2, "効果がなかった研究は発表されにくかった（出版バイアス）ため、論文上の効果が大きく見えた、と評者は指摘している＝2。"),
    detail("Which one of the following statements is consistent with the content of the passage?", [
        "Thaler and Sunstein argued that schools should ban sweets in order to improve children's diets.",
        "Automatic enrollment raised participation and also led most workers to choose higher contribution rates.",
        "Critics fear that the methods used to design nudges can also be turned against people's interests.",
        "The author maintains that a well-designed form can present its options in a perfectly neutral way.",
    ], 3, "第5段落: 同じ手法が、不要なサブスクを払い続けさせることなどに使われうると批判者は懸念している＝3。2 は前半は正しいが、第4段落「多くは雇用主が決めた低い拠出率のまま」に反する。4 は第6段落「選択肢を中立に示す方法はない」と逆。"),
    title([
        "Why Information Campaigns Always Fail",
        "The Promise and Limits of Nudging",
        "Saving for Retirement in an Age of Uncertainty",
        "How Behavioral Economics Replaced Traditional Economics",
    ], 2, "ナッジの有効性（自動加入の成功）と限界・批判の両方を論じ、慎重な設計を求めて締めくくる＝2。1 は always が言い過ぎ、3・4 は本文の中心ではない。",
        "Which one of the following titles best captures the main idea of the passage?"),
]
sections.append(long_section("III", 20, 29, p3, ["contribution 拠出金、掛け金", "offset 相殺する", "status quo 現状"], q3))

# ───────────────────────── IV 文法・語法 ─────────────────────────
G = 2
q4 = [
    mark("grammar", ["Who", "Whoever", "Whomever", "Whatever"], 2,
         "複合関係代名詞 whoever「〜する人は誰でも」が主語の名詞節を作る（Whoever arrives ... is responsible）。Who では節が主語にならず、Whomever は目的格、Whatever は人を指さない。", prompt="_____ arrives at the office first is responsible for unlocking the doors.", points=G),
    mark("grammar", ["explaining", "explained", "having explained", "to explain"], 2,
         "分詞構文が条件を表す形。proposal は『説明される』側なので過去分詞 explained（= If it had been explained ...）。帰結節が might have won（仮定法過去完了）であることもヒント。", prompt="The proposal, _____ in more detail, might have won the board's approval.", points=G),
    mark("grammar", ["adverse", "averse", "adversary", "advert"], 1,
         "紛らわしい語の区別。adverse effect「悪影響」。averse は「嫌って（be averse to）」で名詞を前から修飾しない。adversary は「敵」（名詞）、advert は「広告」。", prompt="The new tax will have an _____ effect on small businesses, which are already struggling with rising costs.", points=G),
    mark("grammar", ["makes", "made", "will make", "has made"], 2,
         "It is (high) time + S + 過去形（仮定法過去）で「もう〜してよい頃だ（なのにしていない）」。現在のことでも過去形を使う。", prompt="It is high time the board _____ a decision about the merger.", points=G),
    mark("grammar", ["the public realized", "did the public realize", "the public did realize", "realized the public"], 2,
         "Not until ... が文頭に出ると、主節は疑問文の語順（倒置）になる: did + S + 原形。", prompt="Not until the final report was published _____ the true scale of the losses.", points=G),
    mark("grammar", ["than", "but", "as", "nor"], 3,
         "not so much A as B「AというよりむしろB」。than や but は組み合わない。", prompt="She is not so much a scientist _____ a philosopher who happens to work in a laboratory.", points=G),
    mark("grammar", ["would borrow", "will have borrowed", "would have borrowed", "had borrowed"], 3,
         "If が省略された倒置の仮定法過去完了（Had S p.p.）。last year の事実に反する仮定なので、帰結節は would have p.p.。", prompt="Had the central bank lowered interest rates last year, more firms _____ money to expand.", points=G),
]
sections.append({
    "label": "IV",
    "instruction": f"次の英文（30）〜（36）の空所に入る最も適切なものを選択肢 1〜4 から選び、その番号を{SHEET_A}の解答欄（30）〜（36）にマークしなさい。",
    "groups": [{"instruction": "", "questions": q4}],
})

# ───────────────────────── V 中文空所補充（無料お試し） ─────────────────────────
V = 2
p5 = [
    "Almost every streaming service, software company, and online newspaper now offers a free trial. The logic seems straightforward: let people try the product, and the good ones will {{b:37}} for themselves. But the real power of the free trial lies less in the product than in the psychology of the customer. Once people have started using a service, they begin to think of it as something they already own, and giving it up feels like a {{b:38}} rather than a decision not to buy.",
    "Firms are well aware of this. Many trials ask for credit-card details at the start and switch to paid billing automatically when the trial ends. A customer who meant to cancel after a month may simply forget, and the company quietly {{b:39}} from that inattention. Consumer groups argue that this turns a fair offer into a trap, and some governments now require firms to send a reminder before the first payment is {{b:40}}.",
    "Not every company benefits from such tactics, however. Customers who feel tricked into paying are more likely to cancel later and to warn their friends. Some firms have found that trials which end without automatic billing attract fewer subscribers at first but keep them longer. In a market where switching to a {{b:41}} takes only a few clicks, a reputation for honesty may be worth more than a few months of forgotten payments. The free trial, in other words, works best when it is {{b:42}} what it claims to be: a chance to try before you buy.",
]
q5 = [
    mark("vocab", ["speak", "look", "care", "opt"], 1, "speak for oneself「（説明しなくても）自ら良さを物語る」。良い製品は使えば価値が分かる、という意味。look / care for themselves は文意が通らず、opt for は「〜を選ぶ」で themselves と結びつかない。", points=V),
    mark("vocab", ["windfall", "loss", "ritual", "privilege"], 2, "すでに自分の物だと感じているので、手放すことは『損失』のように感じられる（保有効果・損失回避）。rather than「買わないという決定」との対比。windfall（思わぬ授かり物）は逆、ritual（儀式）・privilege（特権）は文脈に合わない。", points=V),
    mark("vocab", ["suffers", "abstains", "profits", "retreats"], 3, "profit from ~「〜から利益を得る」。解約し忘れた客の不注意から企業が利益を得る。suffer from（苦しむ）は立場が逆、abstain from（控える）・retreat from（退く）は文意に合わない。", points=V),
    mark("vocab", ["charged", "waived", "spent", "refunded"], 1, "the first payment is charged「最初の支払いが請求される」。請求される前に通知を送るよう義務づける。waived（免除される）・refunded（返金される）では通知の意味がなく、spent（費やされる）は主語の payment と合わない。", points=V),
    mark("vocab", ["partner", "competitor", "subsidiary", "predecessor"], 2, "乗り換え先は『競合他社』。数クリックで他社に移れる市場なので、正直さの評判が重要になる。partner（提携先）・subsidiary（子会社）・predecessor（前任者）は乗り換え先として不自然。", points=V),
    mark("vocab", ["scarcely", "precisely", "ostensibly", "marginally"], 2, "precisely what it claims to be「まさにうたっている通りのもの」。scarcely では文意が逆になり、ostensibly（表向きは）・marginally（わずかに）では『本当に試せる機会である』という結論と合わない。", points=V),
]
sections.append({
    "label": "V",
    "instruction": f"次の英文の空所（37）〜（42）に入る最も適切なものを選択肢 1〜4 から選び、その番号を{SHEET_A}の解答欄（37）〜（42）にマークしなさい。",
    "passage": {"paragraphs": p5, "source": SOURCE},
    "groups": [{"instruction": "", "questions": q5}],
})

# ───────────────────────── VI 短文の内容推測 ─────────────────────────
INF = 4
VI_PROMPTS = [
    "Which one of the following can be inferred from the passage?",
    "Which one of the following statements is consistent with the content of the passage?",
    "With which one of the following statements would the author most likely agree?",
    "Which one of the following statements best captures the main argument of the passage?",
]
vi = [
    ("Loyalty programs are often described as a reward for faithful customers, but their main value to retailers may lie elsewhere. Every time a member shows a card or scans an app at the checkout, the store learns what that person bought, when, and at what price. Over months, this record reveals patterns that no survey could capture: which products are bought together, which discounts actually change behavior, and which customers are drifting away. Some retailers now earn more by analyzing this information, or by selling insights based on it to manufacturers, than they spend on the points and coupons they give away. For many shoppers, the discount is real but small; for the store, the data may be the main product.",
     ["Most customers join loyalty programs in order to protect their privacy.",
      "The points given to members can cost a retailer less than the information it gains.",
      "Surveys are a more reliable source of information than purchase records.",
      "Retailers have begun to abandon loyalty programs because they are too expensive."], 2,
     "最後の文「付与するポイントやクーポンの費用より、情報の分析・販売で得る額のほうが大きい小売業者もいる」から、ポイントの費用は得られる情報の価値より小さくなりうる＝2。"),
    ("In a famous experiment, shoppers at a grocery store were offered free samples of jam. On some days the display contained six flavors; on others, twenty-four. The larger display attracted more visitors, but shoppers who saw only six flavors were far more likely to buy a jar. The researchers suggested that too many options can make choosing feel so difficult that people put off the decision altogether. Later studies, however, have found the effect only under certain conditions, such as when the options are hard to compare or when shoppers have no clear preference to begin with. When people already know what they like, a wide selection seems to do little harm.",
     ["Shoppers always buy more when they are offered fewer options.",
      "The larger display failed to attract the attention of shoppers.",
      "Whether more options discourage buying may depend on the situation.",
      "The original experiment was found to contain serious errors."], 3,
     "後の研究では『特定の条件下でのみ』効果が見られた、とある。選択肢の多さが購買を妨げるかは状況次第＝3。1 は always が言い過ぎ、2 は本文と逆（多くの客を引きつけた）、4 は本文にない。"),
    ("When a company announces that it will move its headquarters to a smaller city, local officials often celebrate the jobs it will bring. Economists urge caution. A new employer raises demand not only for workers but also for housing, and if the supply of homes cannot expand quickly, rents rise for everyone in the area, including residents who do not work for the company. Whether a town gains overall depends largely on how easily it can build — a question of zoning rules and available land rather than of the company's own plans. Two towns attracting the same employer may therefore end up with very different results.",
     ["Economists believe that companies should never move to smaller cities.",
      "Residents who do not work for the new company may be worse off in some respects.",
      "Local officials are usually responsible for the decisions of companies.",
      "Rents in smaller cities are generally lower than the cost of building new homes."], 2,
     "住宅供給がすぐ増えないと、会社で働かない住民も含めて家賃が上がる。つまり会社と無関係な住民はある面で不利益を被りうる＝2。"),
    ("Several companies that tested a four-day working week reported that productivity stayed the same or even improved, while employees said they felt less stressed. Critics point out that the firms which volunteered for such trials were probably those most likely to succeed — businesses whose work could be reorganized easily and whose managers were already enthusiastic. A hospital or a factory running around the clock, they argue, faces very different constraints. The results may therefore say more about what is possible for certain kinds of organizations than about what would happen if the policy were adopted everywhere. Larger and more varied trials will be needed before firm conclusions can be drawn.",
     ["A four-day week has been shown to fail in hospitals and factories.",
      "Employees in the trials worked longer hours on each of the four days.",
      "The trial results cannot simply be applied to every type of workplace.",
      "Managers who volunteered for the trials were opposed to the idea."], 3,
     "参加企業は成功しやすい企業だった可能性があり、結果は特定の組織で可能なことを示すにとどまる＝3。1 は「失敗が示された」とは書かれていない。4 は already enthusiastic に反する。"),
]
groups6 = []
for i, (text, choices, ans, exp) in enumerate(vi):
    q = mark("inference", choices, ans, exp, prompt=VI_PROMPTS[i], points=INF)
    groups6.append({"instruction": "", "answerLine": True, "passage": {"label": f"({43 + i})", "paragraphs": [text], "source": SOURCE}, "questions": [q]})
sections.append({
    "label": "VI",
    "instruction": f"次の英文（43）〜（46）を読み、それぞれの設問について最も適切なものを選択肢 1〜4 から選び、その番号を{SHEET_A}の解答欄（43）〜（46）にマークしなさい。",
    "groups": groups6,
})

# ───────────────────────── VII 記述：動詞の語形変化 ─────────────────────────
p7 = [
    "Few industries have {{w:a}} as many changes in a single generation as the music business. In the 1990s, record companies earned most of their income from compact discs, and the idea that people would one day pay a monthly fee to hear almost any song ever recorded would have been {{w:b}} as fantasy. When file-sharing websites appeared around the turn of the century, sales {{w:c}} sharply, and many executives responded by suing the very customers they depended on.",
    "Streaming services eventually offered a legal alternative, and revenue began to grow again. Yet new problems have {{w:d}}. Musicians complain that the fees paid for each play are tiny, and that the system rewards artists who are already famous. Some have {{w:e}} their work from the major platforms in protest, while others, {{w:f}} a closer relationship with their fans, sell recordings and concert tickets directly through their own websites. Record labels, meanwhile, have tried to adapt by investing in live concerts and merchandise, areas in which the internet has made loyal fans more valuable rather than less.",
]
VII_WORDS = ["arise", "dismiss", "fall", "seek", "undergo", "withdraw"]
# 「同じ動詞を二回以上選んだ場合は得点にならない」の判定用（解答の語形 → 元の動詞）
VII_FORMS = {
    "arise": ["arise", "arises", "arose", "arisen", "arising"],
    "dismiss": ["dismiss", "dismisses", "dismissed", "dismissing"],
    "fall": ["fall", "falls", "fell", "fallen", "falling"],
    "seek": ["seek", "seeks", "sought", "seeking"],
    "undergo": ["undergo", "undergoes", "underwent", "undergone", "undergoing"],
    "withdraw": ["withdraw", "withdraws", "withdrew", "withdrawn", "withdrawing"],
}
q7 = [
    write("a", ["undergone"], "have + 過去分詞（現在完了）。undergo – underwent – undergone「（変化などを）経験する」。"),
    write("b", ["dismissed"], "would have been + 過去分詞（受動態・仮定法過去完了）。dismiss A as B「AをBとして退ける」。"),
    write("c", ["fell"], "around the turn of the century の出来事なので過去形。fall – fell – fallen。自動詞なので受動態にはならない。"),
    write("d", ["arisen"], "have + 過去分詞。arise – arose – arisen「（問題が）生じる」。自動詞。"),
    write("e", ["withdrawn"], "have + 過去分詞。withdraw – withdrew – withdrawn「（作品を）引き揚げる」。"),
    write("f", ["seeking"], "others を意味上の主語とする分詞構文（能動）。seek – sought – sought だが、ここは「〜を求めて」の現在分詞 seeking。"),
]
sections.append({
    "label": "VII",
    "instruction": "次の英文を読み、空所（a）〜（f）に入る、文脈の上で最も適した動詞を下記の語群から選び、必要に応じて語形を変えて解答用紙Bの解答欄に記入しなさい。ただし、各解答欄に記入する語は一語のみとし、同じ動詞を二回以上選んではいけない。同じ動詞を二回以上選んだ場合は、正解が含まれていてもその解答は得点にならない。",
    "sheetNotice": "ここからは解答用紙Bを使用しなさい。",
    "passage": {"paragraphs": p7, "source": SOURCE},
    "groups": [{"instruction": "", "wordBox": VII_WORDS, "wordForms": VII_FORMS, "questions": q7}],
})

# ───────────────────────── VIII 記述：名詞形 ─────────────────────────
p8 = [
    "Every new business rests on a set of {{w:a}} about what customers want, and the most dangerous of these are the ones that founders never think to question. A start-up may spend years building a product before learning that nobody needs it. To avoid this, many investors now encourage founders to test their ideas early, with simple versions of the product and real customers. The {{w:b}} of a company's early plans, in this view, is not a sign of failure but of learning.",
    "Such advice is easier to give than to follow. Founders are often admired for their {{w:c}}, and the line between determination and stubbornness is not always clear. A founder who ignores every warning may be praised as a visionary if the business succeeds, and criticized for {{w:d}} if it fails. The real skill lies in telling the difference between evidence and discouragement — and in the {{w:e}} of a culture in which people feel safe to point out which is which. Investors who have watched many companies grow often say that the founders they trust most are those who can explain not only what they believe but also what evidence would change their minds.",
]
VIII_WORDS = ["assume", "deny", "maintain", "persist", "revise"]
VIII_FORMS = {
    "assume": ["assumption", "assumptions"],
    "deny": ["denial", "denials"],
    "maintain": ["maintenance"],
    "persist": ["persistence"],
    "revise": ["revision", "revisions"],
}
q8 = [
    write("a", ["assumptions"], "a set of + 複数名詞。assume → assumption（綴りの変化 -ume → -umption に注意）。複数形 assumptions。", category="noun-form"),
    write("b", ["revision"], "The + 名詞 + of ...。revise → revision「修正」。早期の計画の修正は失敗ではなく学習の証。", category="noun-form"),
    write("c", ["persistence"], "their + 名詞。persist → persistence「粘り強さ」（-ance ではなく -ence）。直後の determination と対応。", category="noun-form"),
    write("d", ["denial"], "前置詞 for の後なので名詞。deny → denial「（現実の）否認」。警告を無視した創業者が、失敗すれば現実否認だと批判される。", category="noun-form"),
    write("e", ["maintenance"], "the maintenance of a culture「文化の維持」。maintain → maintenance（ai が消える綴りに注意）。", category="noun-form"),
]
sections.append({
    "label": "VIII",
    "instruction": "次の英文を読み、空所（a）〜（e）に入る、文脈の上で最も適した名詞を解答用紙Bの解答欄に記入しなさい。下記の動詞の最も適切な名詞形のみを使用すること。ただし、〜ing 形は使用してはいけない。また、同じ動詞を二回以上選んではいけない。同じ動詞を二回以上選んだ場合は、正解が含まれていてもその解答は得点にならない。",
    "example": "例： decide → decision",
    "passage": {"paragraphs": p8, "source": SOURCE},
    "groups": [{"instruction": "", "wordBox": VIII_WORDS, "wordForms": VIII_FORMS, "questions": q8}],
})

finalize(sections, "keio-shogaku-eigo-01", "第1回", seed=2027)
