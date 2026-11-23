# 慶應商学部 英語 第2回 予想模試の原稿 → content/exams/keio-shogaku-eigo-02.json を生成する。
# 本文・設問はすべてオリジナル。手順は docs/authoring/README.md、形式は content/profiles/keio-shogaku-eigo.json。
#   python3 scripts/build-keio-shogaku-02.py
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from authoring.keio_shogaku_eigo import *  # noqa: E402,F403

sections = []

# ───────────────────────── I 長文・学術（遠隔地交易と信用） ─────────────────────────
p1 = [
    "Long-distance trade has always confronted a problem that is easy to state and difficult to solve. A merchant who dispatches goods to a distant port must rely on an agent whose conduct he cannot observe, whose honesty he cannot verify, and whom, should the agent abscond with the proceeds, he can rarely pursue through any court. {{b:1}} considerable the profits of such trade may have been, the risks of entrusting one's capital to a stranger were greater still, and historians have long asked how commerce across seas and borders managed to flourish in the absence of the legal institutions that modern traders take for granted.",
    "One influential answer emphasizes the role of the coalition. Studying letters preserved in the storeroom of a medieval synagogue in Cairo, economic historians have reconstructed the practices of a community of eleventh-century traders who operated across the Mediterranean. These merchants routinely served as agents for one another, and they shared information about the conduct of the agents they employed. An agent discovered to have cheated one member would find that no member of the coalition was willing to hire him again. Because the future income forfeited by a dishonest agent exceeded anything he could gain by a single act of fraud, honesty was, in effect, {{b:2}}. The mechanism required no judge and no police; {{u:5|it required only that information circulate faster than the cheat could move}}.",
    "{{u:6|The elegance of this account has made it a fixture of textbooks}}, yet it has not gone unchallenged. Critics have pointed out that the same letters contain frequent references to courts, contracts, and witnesses, suggesting that the merchants relied on formal legal remedies far more than the coalition model allows. Others have questioned whether the community was as closed as the theory requires: a reputation mechanism works only if those who are excluded have nowhere else to go, and the archival evidence suggests that agents moved fairly freely between networks. {{b:3}}, the debate is less about whether reputation mattered than about whether it operated in isolation from law or in combination with it.",
    "This distinction matters because the two possibilities imply very different paths of development. If reputation substitutes for law, then the growth of impersonal markets, in which strangers trade with strangers, must await the arrival of a state capable of enforcing contracts. If, {{b:4}}, reputation and law complement each other, then informal networks may have served as a kind of scaffolding, allowing commercial practices to mature before the formal institutions that would eventually supersede them were in place. On this second reading, the coalition was not an alternative to the rule of law but one of its precursors.",
    "Studies of other trading communities lend some support to the complementary view. Among the merchant guilds of medieval Europe, for example, collective punishment was frequently directed not at individual cheats but at entire cities: if a trader from one town defaulted on a debt, a guild elsewhere might impose an embargo on all merchants from that town until the debt was repaid. Such sanctions were crude and occasionally unjust, since they penalized the innocent along with the guilty, but they gave civic authorities a powerful incentive to adjudicate disputes impartially and to compel their own citizens to honor their obligations. Reputation, in this arrangement, attached to communities rather than to persons, and its enforcement depended on the very political institutions that the coalition model treats as absent.",
    "{{u:7|The question is not merely of antiquarian interest}}. Much of the world's commerce still takes place in settings where courts are slow, expensive, or unreliable, and where traders depend on personal networks to decide whom to trust. Online marketplaces have, in a sense, reinvented the coalition: ratings and reviews allow a buyer in one country to judge the reliability of a seller in another whom she will never meet. Yet these systems also reproduce the weaknesses of their predecessors. Reviews can be purchased, ratings inflated, and a seller excluded from one platform can reappear on another under a new name. The platforms, moreover, are not neutral communities of equals but private firms with commercial interests of their own, and their decisions about whom to exclude are rarely subject to appeal.",
    "What the historical record suggests, then, is that trust in markets has seldom rested on a single foundation. Reputation, kinship, religious affiliation, written contracts, and the threat of litigation have typically operated together, each compensating for the deficiencies of the others. Scholars who search for the one institution that made long-distance trade possible are likely to be disappointed. The more productive inquiry asks how particular combinations of formal and informal enforcement arose, why some proved more durable than others, and under what conditions merchants were willing to extend credit to people whom they would never see.",
]
q1 = [
    blank(["However", "Whatever", "Whenever", "Moreover"], 1,
          "However + 形容詞 + S + V「どれほど〜でも」（譲歩）。However considerable the profits may have been で「利益がどれほど大きくても、リスクはさらに大きかった」。Whatever は名詞を伴う（whatever profits）、Whenever は時、Moreover は接続副詞で節をつなげない。", category="vocab"),
    blank(["self-defeating", "self-enforcing", "self-evident", "self-effacing"], 2,
          "不正をした代理人は将来の収入をすべて失うので、裁判所がなくても正直さが『自然に守られる』＝ self-enforcing（自己拘束的な）。直後の「判事も警察もいらない」と一致。self-defeating（自滅的な）は逆、self-evident（自明の）は仕組みの説明にならず、self-effacing（控えめな）は人柄の語。", category="vocab"),
    blank(["By contrast", "For instance", "In short", "Otherwise"], 3,
          "批判の内容（法的手段も使っていた・共同体は閉じていなかった）を受けて、論争の焦点を『要するに』とまとめる In short。By contrast（対照的に）・For instance（例えば）は前後の関係に合わず、Otherwise（さもなければ）は条件の逆。"),
    blank(["as a result", "in addition", "for this reason", "on the other hand"], 4,
          "If reputation substitutes for law ... と If ... reputation and law complement each other ... の二つの可能性を対比している。on the other hand が適切。as a result・for this reason は因果、in addition は追加で、対立する仮定をつなげない。"),
    uline(5, [
        "agents had to travel more quickly than the merchants who employed them",
        "the coalition had to tell merchants outside the community which agents could be trusted",
        "news of an agent's dishonesty had to spread before he could find new employers",
        "merchants had to report a dishonest agent to a judge before he left the region",
    ], 3, "仕組みが機能するには、不正の情報が『ごまかした者が動くよりも速く』仲間に広まる必要がある。つまり、不正の知らせが次の雇い主に届くのが先でなければならない。1 は移動の速さの比較を取り違えている。2 は情報が共同体の『外』に伝わる話になっていて本文と違う。4 は「判事も警察もいらない」と矛盾。",
        "Which one of the following best explains what is meant by underlined (5)? The mechanism depended on the condition that ___."),
    uline(6, [
        "The account remains popular in textbooks even though critics have proved it false.",
        "The coalition explanation is widely taught partly because it is simple and persuasive.",
        "The account is admired mainly because it is based on records of courts and contracts.",
        "Historians agree that the coalition model is the final word on the subject.",
    ], 2, "elegance（簡潔で美しいこと）のために教科書の定番（fixture）になった、という意味。2 が一致。直後に yet it has not gone unchallenged とあるので 4 は誤り。1 は「批判されている」を「誤りと証明された」に言い過ぎ。3 は、裁判や契約への言及はむしろ批判側の根拠。",
        "What does the author mean by underlined (6)?"),
    uline(7, [
        "the question matters mainly to specialists in the history of the Mediterranean",
        "the issues raised by medieval trade remain relevant to commerce today",
        "online marketplaces have overcome the weaknesses of earlier reputation systems",
        "modern courts have solved the problems faced by medieval merchants",
    ], 2, "antiquarian「骨董的・好古趣味の」。単なる昔話ではない、と述べたあとで、裁判所が頼りにならない現代の商取引やオンライン市場の評価制度に話を広げている。2 が一致。1 は antiquarian の否定を取り違えている。3 は「先行者の弱点を再現している」と矛盾、4 は「裁判所が遅く高く信頼できない地域が多い」と矛盾。",
        "Underlined (7) suggests that ___."),
    detail("According to the passage, which one of the following was a criticism of the coalition model?", [
        "The coalition was too large for information about agents to circulate quickly.",
        "Kinship turned out to matter more than reputation in medieval trade.",
        "Agents who cheated could still be hired by other members of the coalition.",
        "Agents appear to have been able to move fairly freely between networks.",
    ], 4, "第3段落の二つ目の批判「排除された者に行き場がなければ機能しないが、代理人はネットワーク間をかなり自由に移っていた」と一致する 4。1・2 は批判として述べられていない。3 は、同盟の内部では再雇用されないという理論の前提と逆で、批判は『同盟の外』に行き場があったという点。"),
    detail("Which one of the following is NOT mentioned in the passage as a weakness of online rating systems?", [
        "Reviews can be bought.",
        "Sellers who have been excluded can return under a different name.",
        "Ratings tend to favor sellers who have been in business the longest.",
        "Decisions to exclude sellers can seldom be challenged.",
    ], 3, "第6段落で挙げられている弱点は、レビューの買収・評価の水増し・名前を変えての再登場・排除の決定に異議を申し立てにくいこと。営業年数の長い売り手が有利になるという点は述べられていないので 3。"),
    title([
        "How Online Platforms Replaced Medieval Courts",
        "Reputation, Law, and the Foundations of Trust in Long-Distance Trade",
        "The Coalition Model: How Reputation Made Law Unnecessary",
        "Collective Punishment and the Medieval Merchant Guilds",
    ], 2, "遠隔地交易での信用の問題、評判の仕組み（同盟）への批判、評判と法の補完関係、現代への示唆を経て「信用は単一の基盤に依らない」と結ぶ。2 が全体を表す。1 はオンライン市場の話に偏り、裁判所に取って代わったとも言っていない。3 は筆者が疑問視する『評判が法の代わりになった』という見方。4 は第5段落の一例だけ。"),
]
sections.append(long_section("I", 1, 10, p1, ["abscond 持ち逃げする", "embargo 取引停止、禁輸", "antiquarian 好古趣味の、骨董的な"], q1))

# ───────────────────────── II 長文・物語／歴史（バーコード） ─────────────────────────
p2 = [
    "In 1948, a graduate student named Bernard Silver overheard the president of a local food chain asking a dean at his college to develop a system that would read product information automatically at the checkout. The dean declined, but Silver mentioned the conversation to his friend Norman Joseph Woodland, a fellow student with a talent for practical problems. Woodland became so {{b:11}} with the idea that he left school, moved into his grandfather's apartment in Florida, and spent the winter thinking of little else.",
    "The breakthrough, as Woodland later told the story, came on a beach. He had learned Morse code as a Boy Scout, and while sitting on the sand he absent-mindedly pushed his fingers into it and drew them toward himself, leaving four parallel lines. {{u:14|It occurred to him that the dots and dashes of Morse code could be stretched into thin and thick lines}}, and that a light shone across such a pattern would be reflected differently by each line. Woodland and Silver applied for a patent in 1949 for a design made of circles, one inside another, so that the code could be read from any direction.",
    "The invention, however, was far ahead of the technology needed to use it. Reading the code required a powerful light source and a way of converting reflected light into electrical signals, and the machine the two men built was the size of a desk and so hot that it was dangerous to touch. No store could have afforded it, and even if one had, few products at the time carried anything that such a machine could read. The patent was sold for a modest sum in 1952, and Silver died young in 1963, having earned almost nothing from the idea. It was the arrival of cheap lasers and computer chips in the late 1960s that finally made automatic scanning {{b:12}}.",
    "{{u:15|Even then, technology alone was not enough}}. A code is useful only if everyone agrees to use the same one, and in the early 1970s American food manufacturers and retailers were deeply divided. Manufacturers would bear the cost of printing codes on their packaging, while the savings would go mainly to retailers, who could reduce the number of cashiers and keep more accurate records of their stock. An industry committee was formed to choose a single standard. After considering proposals from several companies, it selected a rectangular design developed at IBM, in part because it could be printed more reliably than circles, which tended to smear when the ink ran in the direction the printing press was moving. Woodland, by then an IBM employee, had worked on the project.",
    "On June 26, 1974, a cashier at a supermarket in Troy, Ohio, scanned a packet of chewing gum, the first product sold using the new Universal Product Code. The choice of item was partly symbolic: the organizers wanted to show that even the smallest packages could carry a code. Yet adoption was slow at first. Scanners were expensive, few products carried codes, and some consumer groups protested that stores would stop marking prices on individual items, making it harder for shoppers to compare costs. {{b:13}} the end of the decade, only a small fraction of American supermarkets had installed scanners.",
    "What eventually tipped the balance was not the checkout but the stockroom. Once codes became common, retailers discovered that the data collected at the register could tell them precisely which products sold, where, and when. Orders could be placed automatically, shelves restocked before they emptied, and slow-selling goods removed. Power within the industry shifted gradually from manufacturers, who had once largely decided what stores would sell, to large retailers, who now knew more about their customers than anyone else did. {{u:16|The humble stripes, in other words, did far more than shorten the line at the register}}.",
    "The same logic soon spread beyond groceries. Department stores, pharmacies, and booksellers adopted their own versions of the code, and manufacturers began printing it on almost everything they made. Warehouses used it to track pallets, and delivery companies attached it to parcels so that each one could be followed from sender to recipient. What had been designed to speed up the sale of a can of soup gradually became a common language for describing the movement of goods around the world.",
    "Woodland received the National Medal of Technology in 1992. By then, codes descended from his drawing in the sand were being scanned billions of times a day, on everything from airline luggage to hospital wristbands. The two friends who had first imagined the system, however, had seen almost none of the fortune that it eventually helped others to make.",
]
q2 = [
    blank(["acquainted", "obsessed", "disappointed", "familiar"], 2,
          "be obsessed with ~「〜に取りつかれる」。学校を辞めてその冬はほかのことをほとんど考えなかったのだから obsessed。acquainted / familiar with は「知っている」程度、disappointed（がっかりした）では大学を辞めて没頭する流れに合わない。", category="vocab"),
    blank(["obsolete", "illegal", "practical", "unnecessary"], 3,
          "机ほどの大きさで熱くて危険、どの店も買えなかった装置が、安価なレーザーとチップの登場で『実用的』になった。make O practical。obsolete（時代遅れの）・unnecessary は逆、illegal は文脈にない。", category="vocab"),
    blank(["Beyond", "Despite", "Without", "By"], 4,
          "by the end of the decade「その10年の終わりまでに（なっても）」＋過去完了 had installed。導入が遅かったという流れに合う。Despite・Without は意味が通らず、Beyond the end of the decade は「10年の終わりを越えて」で過去完了と合わない。", category="vocab"),
    uline(14, [
        "four parallel lines would be enough to identify any product",
        "circles would be easier for a machine to read than straight lines",
        "a pattern drawn in sand could be read by a machine from any direction",
        "information could be represented by lines of different widths",
    ], 4, "モールス信号の点と線を『細い線と太い線』に引き延ばせば、情報を線の太さの違いで表せる、という着想。4 が一致。1 は砂に引いた線の本数を取り違えている。2・3 の円形・読む方向は後で出てくる設計の話で、下線部の内容ではない。",
        "The idea described in underlined (14) was that ___."),
    uline(15, [
        "Lasers were still too expensive for most stores to buy.",
        "Retailers were unwilling to pay for printing codes on packaging.",
        "Businesses also had to agree on a single, shared code.",
        "Scanners could not yet read rectangular codes reliably.",
    ], 3, "直後に「コードはみんなが同じものを使うと合意して初めて役に立つ」とあり、業界委員会で単一の規格を選ぶ話が続く。技術に加えて『共通規格への合意』が必要だったので 3。1 は前段落で安価になったと述べている。2 は印刷費を負担するのはメーカーで、立場が逆。4 は本文にない。",
        "What does the author mean by underlined (15)?"),
    uline(16, [
        "barcodes changed who held information and power in the retail industry",
        "barcodes allowed manufacturers to learn more about customers than stores did",
        "manufacturers gained more control over what stores would sell",
        "the main benefit of barcodes was the speed of the checkout",
    ], 1, "段落全体で、レジのデータにより小売店が商品の動きを把握し、力がメーカーから大手小売店に移ったと述べている。『レジの列を短くした以上のこと』とは 1。2・3 は力と情報の移動の向きが逆、4 は下線部が否定している内容。",
        "Which one of the following best explains underlined (16)?"),
    detail("Why was the first design made of circles?", [
        "Because circles were less likely to smear during printing.",
        "Because the code could then be read from any direction.",
        "Because IBM had already patented the rectangular design.",
        "Because circles could be printed more cheaply than straight lines.",
    ], 2, "第2段落末 so that the code could be read from any direction。1 は逆で、円形はにじみやすいことが後に長方形が選ばれた理由。3・4 は本文にない。"),
    detail("Which one of the following is NOT given as a reason why the new system was adopted slowly at first?", [
        "Scanners cost a great deal of money.",
        "Only a small number of products carried codes.",
        "Some people worried that prices would no longer be marked on items.",
        "Stores feared that scanners would slow down the checkout at busy times.",
    ], 4, "第5段落の理由は、スキャナーが高価・コード付き商品が少ない・個々の商品に価格が表示されなくなるという消費者団体の抗議の三つ。混雑時にレジが遅くなるという懸念は述べられていないので 4。"),
    detail("Which one of the following is true according to the passage?", [
        "Silver earned a large sum when the patent was sold in 1952.",
        "The first item scanned was chosen because it was the most popular product in the store.",
        "In the early days, retailers stood to gain more directly from the system than manufacturers did.",
        "Woodland developed the rectangular design on his own after leaving IBM.",
    ], 3, "第4段落「印刷の費用はメーカーが負担し、節約の恩恵は主に小売店に」と一致する 3。1 は最終段落・第3段落と矛盾。2 は「最も小さな商品でも」という象徴的な理由と矛盾。4 は IBM の社員としてプロジェクトに関わったという記述と矛盾。"),
]
sections.append(long_section("II", 11, 19, p2, ["absent-mindedly ぼんやりと", "smear （インクが）にじむ", "wristband リストバンド"], q2))

# ───────────────────────── III 長文・論説（修理の価値） ─────────────────────────
p3 = [
    "Not long ago, owning a toaster meant owning it for decades. When it broke, someone in the household dismantled it, or carried it to a shop down the street where a technician replaced the faulty part for a modest fee. Today, the same breakdown usually ends with the appliance in a landfill and a new one in a delivery box. The change is often explained as a matter of simple economics: labor has become expensive, manufactured goods have become cheap, and so repair no longer makes sense. {{b:20}}, I want to argue that this explanation, though not wrong, leaves out most of the story.",
    "Consider how products are now designed. Many devices are held together with adhesive rather than screws, so that opening them without damage is all but impossible. Batteries are sealed inside their cases. Spare parts, when they are available at all, are sold only to authorized dealers, and the diagnostic software needed to identify a fault is often proprietary. None of these choices is required by the laws of physics. They reflect decisions by manufacturers who have discovered that a customer who cannot repair a product is a customer who must buy another one. {{u:23|Repair has not simply become uneconomic; in many cases it has been made uneconomic}}.",
    "Manufacturers offer plausible-sounding justifications. Sealed designs, they say, make products thinner, lighter, and more resistant to water. Restricting repairs to trained technicians protects customers from botched work and dangerous batteries, and protects the company's reputation when an amateur's mistake causes a fire. There is some truth in these claims. {{b:21}} they would be more persuasive if the same companies did not also charge prices for authorized repairs that approach the cost of a new device, or refuse to supply parts for models only a few years old.",
    "The costs of this arrangement do not appear on any receipt. Electronic waste is now one of the fastest-growing kinds of rubbish in the world, and only a small portion of it is properly recycled. The rest is burned, buried, or shipped to poorer countries, where workers extract valuable metals under hazardous conditions. Every discarded device also represents the energy and raw materials consumed in manufacturing it, much of which could have been saved had the product lasted a few more years. When we compare the price of a repair with the price of a replacement, {{u:24|we are comparing numbers that leave these costs out}}.",
    "There is also a subtler loss. Repair was once a source of steady, skilled employment in almost every neighborhood, and a way for ordinary people to understand the objects they depended on. A person who has replaced a broken screen knows something about how a phone is made, and is less likely to feel helpless before it. {{b:22}} we have handed that understanding over to manufacturers, we have become {{u:25|consumers in the narrowest sense}}: people who use things but cannot look after them.",
    "In recent years, volunteers in many cities have tried to revive these skills through so-called repair cafés, informal gatherings at which residents bring broken lamps, bicycles, and clothing to be fixed with the help of experienced amateurs. The organizers are usually careful to say that their aim is not to replace professional repairers but to change attitudes. Visitors are encouraged to watch, ask questions, and do as much of the work as they can themselves. Many arrive expecting a service and leave, somewhat to their surprise, with the feeling that the object in their hands is no longer a mystery.",
    "Some governments have begun to respond. Laws in several places now require manufacturers to make spare parts and repair manuals available for a set number of years, and to design products whose batteries can be replaced by their owners. In some countries, products must also carry a label showing how easily they can be repaired, so that buyers can take durability into account before they spend their money. Skeptics warn that such rules will raise prices and slow innovation. Perhaps they will, a little. But a modest rise in the price of a phone that lasts six years instead of three is not a loss to the consumer; it is a saving. The real question is not whether we can afford to protect repair, but whether we can afford not to.",
    "None of this requires nostalgia for a world of mended socks and radio shops. It requires only that we stop treating the short life of our possessions as a natural fact, and recognize it for what it largely is: the result of choices that could have been made differently, and still can be.",
]
q3 = [
    blank(["As a result", "In the same way", "For example", "Even so"], 4,
          "直前は「修理が割に合わないのは人件費が高く製品が安いから」という一般的な説明。空所の後で「その説明は間違いではないが大部分を見落としている」と反論するので、譲歩・逆接の Even so「そうだとしても」。As a result（結果として）・In the same way（同様に）・For example（例えば）はいずれも反論につながらない。"),
    blank(["But", "Because", "Unless", "So"], 1,
          "There is some truth in these claims.（一理ある）と認めたうえで「しかし、同じ企業が…でなければもっと説得力があるのだが」と続く。譲歩→逆接の But。Because・Unless は節が主節につながらず、So では「一理ある」から「説得力が落ちる」が導けない。"),
    blank(["Even if", "Now that", "Unless", "Before"], 2,
          "now that ~「今や〜なので」。理解をメーカーに委ねてしまった『今』、私たちは最も狭い意味での消費者になった。現在完了 we have handed / we have become と自然に対応する。Even if（たとえ〜でも）・Unless（〜しない限り）・Before（〜する前に）では因果が成り立たない。"),
    uline(23, [
        "Repair costs have risen only because the wages of technicians have increased.",
        "Consumers have chosen convenience over durability of their own accord.",
        "Safety rules have made repair work too costly for small shops.",
        "The difficulty of repair is often the result of deliberate decisions by manufacturers.",
    ], 4, "『割に合わなくなった』のではなく『割に合わなくされた』。接着剤・密閉電池・部品や診断ソフトの囲い込みはメーカーの選択だという段落の主張なので 4。1 は筆者が「それだけではない」と言っている説明。2 は消費者の選択の話にすり替えている。3 は本文にない（安全はメーカーの言い分として出てくるだけ）。",
        "What does the author mean by underlined (23)?"),
    uline(24, [
        "the price of a repair usually includes hidden charges",
        "the prices we compare ignore the environmental and social costs of throwing products away",
        "recycling has made new products cheaper than repairs",
        "repairs cost more than replacements only in poorer countries",
    ], 2, "these costs は段落で述べた電子ごみ・危険な環境での金属回収・製造時のエネルギーと原材料。修理代と買い替え代の比較にはそれらが含まれていない、ということなので 2。1 は修理代の内訳の話にすり替えている。3 は「適切にリサイクルされるのはごく一部」と矛盾。4 は本文にない。",
        "Underlined (24) suggests that ___."),
    uline(25, [
        "people who use products without being able to maintain them",
        "people who buy more things than they actually need",
        "people who care more about price than about quality",
        "people who prefer to repair everything themselves",
    ], 1, "コロンの後で people who use things but cannot look after them と言い換えている。1 が一致。2 は本文にない（下線部の定義は「使えるが手入れできない」）。3 は本文にない。4 は逆。",
        "In underlined (25), the author refers to ___."),
    detail("How does the author respond to the manufacturers' justifications described in the third paragraph?", [
        "The author rejects them as completely false.",
        "The author accepts them without reservation.",
        "The author admits they are partly true but doubts them in light of the companies' other practices.",
        "The author accepts only their point about safety and rejects the rest.",
    ], 3, "There is some truth in these claims. と一部認めたうえで、正規修理の価格の高さや部品供給の打ち切りを挙げて説得力を疑っている。3 が一致。1・2 はどちらも極端。4 は安全の点だけを認めたとは書かれていない。"),
    detail("According to the passage, what is the main aim of repair cafés?", [
        "To replace professional repairers with volunteers.",
        "To repair goods free of charge for people who cannot afford professionals.",
        "To teach visitors how to become professional repairers.",
        "To change the way people think about the things they own.",
    ], 4, "The organizers ... say that their aim is not to replace professional repairers but to change attitudes. 4 が一致。1 は明確に否定されている。2 は無料修理サービスとしての説明で、目的が違う。3 は本文にない。"),
    detail("Which one of the following does the author NOT claim?", [
        "Labor costs play no part at all in the decline of repair.",
        "Electronic waste is growing faster than most other kinds of rubbish.",
        "Some laws now require spare parts to be available for a certain period.",
        "A product that lasts longer can save consumers money even if it costs more.",
    ], 1, "筆者は人件費の説明を though not wrong（間違いではない）と認めているので、1 は筆者の主張ではない。2 は第4段落、3・4 は第7段落の内容。"),
    title([
        "The Rising Cost of Labor in the Repair Industry",
        "Made to Be Replaced: Why Repair Deserves Protection",
        "The Hidden Environmental Cost of Electronic Waste",
        "Repair Cafés and the Revival of Neighborhood Skills",
    ], 2, "製品の短命さはメーカーの選択の結果であり、修理を守る価値がある、というのが全体の主張。2 が一致。1 は筆者が不十分とする説明。3 は第4段落、4 は第6段落の一部だけを取り上げている。"),
]
sections.append(long_section("III", 20, 29, p3, ["landfill ごみ埋め立て地", "hazardous 危険な", "nostalgia 郷愁"], q3))

# ───────────────────────── IV 文法・語法 ─────────────────────────
sections.append(grammar_section([
    grammar("Hardly _____ the meeting begun when the fire alarm went off.", ["had", "has", "did", "would"], 1,
            "Hardly had S p.p. when ~「SがVするとすぐに〜」。否定の副詞 Hardly が文頭に出て倒置。主節は過去完了、when 節は過去形（went off）。"),
    grammar("The committee recommended that the new rules _____ into effect immediately.", ["came", "come", "comes", "coming"], 2,
            "recommend that S (should) 原形。提案・要求・推薦の動詞に続く that 節では動詞の原形（仮定法現在）を使う。主語が複数でも過去でも come のまま。"),
    grammar("_____ from a distance, the island looks like a sleeping whale.", ["Seeing", "To see", "Seen", "Having seen"], 3,
            "分詞構文の意味上の主語は主節の主語 the island。島は『見られる』側なので過去分詞 Seen（= When it is seen）。Seeing・Having seen では島が見ることになる。"),
    grammar("The new manager is said _____ several companies before joining us.", ["to run", "having run", "that he ran", "to have run"], 4,
            "be said to have p.p.「〜したと言われている」。言われているのは現在、経営したのはそれ以前なので完了不定詞。to run では現在の習慣になり before joining us と合わない。"),
    grammar("It is about time the government _____ serious action on the housing shortage.", ["took", "takes", "will take", "has taken"], 1,
            "It is (about) time + S + 過去形（仮定法過去）「もう〜してよい頃だ」。現在の話でも過去形を使う。"),
    grammar("I would appreciate _____ if you could send me the documents by Friday.", ["that", "it", "this", "what"], 2,
            "I would appreciate it if ~「〜していただけるとありがたい」。appreciate は他動詞で目的語が必要なので、if 節を受ける形式目的語 it を置く。"),
    grammar("Tickets bought online remain _____ for one year from the date of purchase.", ["validity", "valid", "validate", "validly"], 2,
            "remain + 形容詞（補語）「〜のままである」。valid「有効な」。validity は名詞、validate は動詞、validly は副詞で、いずれも remain の補語にならない。"),
]))

# ───────────────────────── V 中文空所補充（ポイントカード） ─────────────────────────
sections.append(cloze_section([
    "Airline frequent-flyer programs were introduced in the early 1980s as a simple way to {{b:37}} passengers to fly with the same company again and again. Travelers earned points for every journey and could exchange them for free tickets. The idea proved so successful that it was soon copied by hotels, supermarkets, and coffee shops, and today it is hard to find a business that does not offer some kind of reward for repeat purchases.",
    "Yet the economics of these programs have changed in ways that few members fully {{b:38}}. Airlines now earn far more by selling points to banks, which give them to credit-card holders, than they spend on the flights that points are used to buy. Because the company alone decides how many points a seat costs, it can quietly reduce the value of points already earned, a practice critics compare to a government printing money. Members may find that a reward which once required 25,000 points now requires 40,000, with no advance {{b:39}} given.",
    "Supermarket schemes raise a different concern. In return for modest discounts, shoppers allow stores to build a detailed {{b:40}} of their habits: what they buy, when, and in what quantities. This information is valuable not only for setting prices but also for selling to advertisers. Most customers accept the bargain without reading the terms, and it is far from clear that they would {{b:41}} to it if they understood how much they were giving away.",
    "None of this means that loyalty programs are a {{b:42}}. Frequent customers do receive real benefits, and many enjoy the sense of progress that comes from collecting points. But a reward that can be changed at the company's convenience is less a gift than a tool, and members would be wise to treat it as such.",
], [
    cloze(["encourage", "discourage", "prohibit", "excuse"], 1,
          "encourage O to do「Oに〜するよう促す」。ポイントは同じ会社を繰り返し使ってもらうための仕組み。discourage は逆、prohibit O to do は語法も意味も合わず（prohibit O from -ing）、excuse は「許す・免除する」。"),
    cloze(["depreciate", "appreciate", "accommodate", "substitute"], 2,
          "appreciate「（真価・重要性を）正しく理解する」。仕組みの変化を十分に理解している会員は少ない。depreciate（価値が下がる・下げる）は形が似ているだけで目的語の関係が合わない。accommodate（収容する・適応させる）・substitute（代わりに使う）も不適。"),
    cloze(["license", "notice", "patience", "mercy"], 2,
          "advance notice「事前の通知」。必要ポイントが予告なく引き上げられることを言っている。license（許可）・patience（忍耐）・mercy（慈悲）は「与えられる事前の〜」として文脈に合わない。"),
    cloze(["proverb", "protest", "profile", "prospect"], 3,
          "build a detailed profile of ~「〜の詳細な人物像（記録）を作る」。コロン以下の「何を・いつ・どれだけ買うか」がその中身。proverb（ことわざ）・protest（抗議）・prospect（見込み）は形が似ているだけ。"),
    cloze(["consent", "complain", "insist", "retire"], 1,
          "consent to ~「〜に同意する」。条件を理解していたら、その取引に同意するかは疑わしい。complain to は「（人）に苦情を言う」で取引が目的語にならず、insist（on が必要）・retire は意味が合わない。"),
    cloze(["virtue", "fashion", "fraud", "triumph"], 3,
          "None of this means ...「だからといって〜というわけではない」の後で、直後に「常連客は本当に恩恵を受けている」と続く。批判の流れから当然出てくる極端な結論『詐欺だ』を打ち消している。virtue（美徳）・triumph（大成功）では前段落の批判とつながらず、fashion（流行）は打ち消す意味がない。"),
]))

# ───────────────────────── VI 短文の内容推測 ─────────────────────────
sections.append(short_section([
    ("In a series of experiments, researchers asked participants to assemble simple storage boxes from flat-packed kits or to fold sheets of paper into origami animals. The participants were then asked how much they would be willing to pay for the objects. Those who had made the objects themselves consistently offered more than participants who were shown identical objects made by someone else, and they valued their own creations almost as highly as those made by experts, even when their own work was visibly clumsy. The effect vanished, however, when participants were asked to build an object and then take it apart before it was finished, or when they were given a kit that was too difficult to complete.",
     ["People value objects made by others more highly than objects they have made themselves.",
      "Participants who were skilled at assembly valued their work less than clumsy participants did.",
      "Finishing a task seems to be necessary for people to place extra value on their own work.",
      "Simple products are generally overvalued by the consumers who buy them."], 3,
     "作った物を高く評価する効果は、完成前に分解させたり完成できないキットを渡したりすると消えた。そこから『完成させること』が必要だと推測できる 3。1 は「自分で作った人のほうが高い値をつけた」と逆。2・4 は本文から推測できない。"),
    ("Before the late nineteenth century, most towns kept their own local time, set by the position of the sun. Noon in one city might fall several minutes earlier or later than noon in another city a short distance to the east or west. This caused few problems when travel was slow, but the spread of railways made it a serious inconvenience: timetables had to list dozens of different local times, and travelers frequently missed their connections. In 1883, railway companies in the United States and Canada agreed to divide the continent into a small number of standard time zones. Many towns adopted railway time, though some resisted for years, and the system did not become federal law in the United States until 1918.",
     ["Neighboring towns once kept local times that differed by several hours.",
      "Standard time zones were introduced by private companies before they were required by law.",
      "Every town in North America adopted the standard time zones immediately in 1883.",
      "Railway companies opposed the creation of standard time zones."], 2,
     "1883年に鉄道会社が標準時を取り決め、合衆国の連邦法になったのは1918年。民間企業が法律より先に導入したので 2。1 は「数分」と矛盾、3 は「何年も抵抗した町もあった」と矛盾、4 は逆。"),
    ("It has become fashionable to blame smartphones for the decline in reading among young people. The explanation is convenient, but it overlooks how little time many schools now devote to reading whole books. When students encounter literature mainly as short extracts accompanied by comprehension questions, they learn to read for answers rather than for pleasure, and it is hardly surprising that few of them choose to read once the questions stop. Phones compete for attention, certainly, but a habit that was never formed cannot be destroyed. If we want young people to read, we should give them the time and the freedom to finish books they have chosen themselves.",
     ["Smartphones are the main reason why young people have stopped reading.",
      "Comprehension questions are the most effective way to build a reading habit.",
      "Students should be required to read the same books as their classmates.",
      "Schools share responsibility for young people's lack of interest in reading."], 4,
     "スマホのせいにするのは都合がよいが、学校が本を丸ごと読む時間をほとんど取らず、抜粋と設問で『答えのために読む』ことを教えている点を見落としている、という主張。4 に同意するはず。1 は筆者が退ける説明、2 は逆、3 は「自分で選んだ本」と矛盾。"),
    ("Cities that host the Olympic Games routinely promise that the event will bring lasting benefits through tourism, investment, and improved infrastructure. The record suggests otherwise. Studies of recent Games have found that costs almost always exceed the original estimates, often by a wide margin, while the expected rise in tourism is frequently offset by regular visitors who stay away to avoid crowds and high prices. Stadiums built for a few weeks of competition can become expensive to maintain and difficult to use afterward. This does not mean that hosting is never worthwhile, but cities would do better to judge proposals by realistic estimates than by the optimistic forecasts of those who stand to profit from them.",
     ["Cities should judge the costs and benefits of hosting the Games more realistically.",
      "Hosting the Olympic Games always causes a city lasting financial harm.",
      "Tourism is the most reliable source of profit for host cities.",
      "Stadiums should be designed to be used only during the Games."], 1,
     "費用の超過や観光客の相殺などを挙げたうえで、最後に『利益を得る人々の楽観的な予測ではなく現実的な見積もりで判断すべきだ』と結論している。1 が主張。2 は This does not mean that hosting is never worthwhile と矛盾（言い過ぎ）、3 は逆、4 は本文にない。"),
]))

# ───────────────────────── VII 記述：動詞の語形変化 ─────────────────────────
VII_FORMS = {
    "abandon": ["abandon", "abandons", "abandoned", "abandoning"],
    "acquire": ["acquire", "acquires", "acquired", "acquiring"],
    "evolve": ["evolve", "evolves", "evolved", "evolving"],
    "foresee": ["foresee", "foresees", "foresaw", "foreseen", "foreseeing"],
    "found": ["found", "founds", "founded", "founding"],
    "sign": ["sign", "signs", "signed", "signing"],
}
sections.append(verb_section([
    "In the late seventeenth century, a coffeehouse near the River Thames run by a man named Edward Lloyd had {{w:a}} a reputation as the best place in London to hear news about ships. Lloyd employed reliable messengers, and the information they brought back from the docks was read aloud to customers several times a day. Merchants who wished to insure a cargo would write the details of the voyage on a slip of paper and pass it around the room, and those willing to accept a share of the risk {{w:b}} their names beneath them, which is thought to be the origin of the word \"underwriter.\"",
    "Over the following century, these informal gatherings gradually {{w:c}} into an organized market. The members eventually moved out of the coffeehouse altogether, but its name has never been {{w:d}}, and the market that grew out of Lloyd's tables remains one of the largest centers of insurance in the world. Its history is a reminder that institutions which now seem permanent were often {{w:e}} almost by accident, by people who could hardly have {{w:f}} what their arrangements would one day become.",
], list(VII_FORMS), VII_FORMS, [
    write("a", ["acquired"], "had + 過去分詞（過去完了）。acquire a reputation「評判を得る」。"),
    write("b", ["signed"], "would write ... and pass it around（過去の習慣）に続く過去の出来事なので過去形 signed（would sign も意味は通るが一語で答える）。sign one's name「署名する」。"),
    write("c", ["evolved"], "Over the following century の過去の変化。evolve into ~「〜へと発展する」。自動詞なので受動態にしない。"),
    write("d", ["abandoned"], "has never been + 過去分詞（現在完了の受動態）。名前が『捨てられた』ことはない＝今も Lloyd's の名が使われている。"),
    write("e", ["founded"], "were + 過去分詞（受動態）。found – founded – founded「設立する」。find の過去形 found と混同しないこと（found の過去分詞は founded）。"),
    write("f", ["foreseen"], "could hardly have + 過去分詞「ほとんど予見できなかっただろう」。foresee – foresaw – foreseen。"),
]))

# ───────────────────────── VIII 記述：名詞形 ─────────────────────────
VIII_FORMS = {
    "accuse": ["accusation", "accusations"],
    "agree": ["agreement", "agreements"],
    "define": ["definition", "definitions"],
    "exaggerate": ["exaggeration", "exaggerations"],
    "prepare": ["preparation", "preparations"],
}
sections.append(noun_section([
    "Successful negotiation depends less on clever tactics than on careful {{w:a}}. Before meeting the other side, experienced negotiators study the interests of everyone involved and decide in advance the point at which they will walk away. Without such a clear {{w:b}} of their own limits, it is easy to accept a poor deal simply to escape the discomfort of disagreement.",
    "At the table, the most common mistake is to treat the other party's first offer as an insult rather than as information. An extreme demand may be no more than an {{w:c}} designed to test how much the other side will give, but it may also reveal what that side values most. Good negotiators respond with questions instead of {{w:d}}, and they look for trades that cost them little but matter greatly to their counterpart. The aim is not victory but an {{w:e}} that both sides can defend to the people they represent. Agreements that neither party can explain to its own colleagues rarely last; the most durable outcomes are those in which each side can point to something it gained.",
], list(VIII_FORMS), VIII_FORMS, [
    write("a", ["preparation", "preparations"], "careful + 名詞。prepare → preparation「準備」。直後の「会う前に利害を調べ、席を立つ点を決めておく」がその中身。", category="noun-form"),
    write("b", ["definition"], "a clear + 名詞 + of ~。define → definition「明確化・定義」。自分の限界（譲れる線）を明確にしておくこと。", category="noun-form"),
    write("c", ["exaggeration"], "an + 名詞。exaggerate → exaggeration「誇張」。極端な要求は、相手がどこまで譲るかを試すための誇張にすぎないこともある。", category="noun-form"),
    write("d", ["accusations", "accusation"], "instead of + 名詞。accuse → accusation「非難」。質問で応じるのであって、非難で応じるのではない。一般論なので複数形 accusations が自然（単数も可）。", category="noun-form"),
    write("e", ["agreement"], "an + 名詞 + that 節。agree → agreement「合意」。勝つことではなく、双方が自分の側に説明できる合意が目的。", category="noun-form"),
], example="例： arrive → arrival"))

finalize(sections, "keio-shogaku-eigo-02", "第2回", seed=2028)
