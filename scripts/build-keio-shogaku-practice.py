# 慶應商学部 英語 大問演習の原稿 → content/practice/*.json を生成する。
# 大問演習の問題は模試（第1回・第2回…）とは別にストックし、模試には再掲しない（npm run validate が重複を検査）。
# 本文・設問はすべてオリジナル。手順は docs/authoring/README.md、設計は docs/design/validation-mvp.md。
#   python3 scripts/build-keio-shogaku-practice.py
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from authoring.keio_shogaku_eigo import *  # noqa: E402,F403

# ───────────────────────── 演習1 長文（論説）: 返品無料の代償 ─────────────────────────
p = [
    "When online retailers first began offering free returns, the policy seemed like a simple way to overcome the main obstacle to buying clothes on the internet: customers could not try anything on. If a jacket did not fit, it could be sent back at no cost, and the risk of an unsuccessful purchase shifted from the buyer to the seller. The strategy worked. Sales of clothing and shoes online grew rapidly, and free returns soon became an expectation rather than a privilege. {{b:1}}, the generosity that helped build online fashion has created problems that few companies anticipated.",
    "The most obvious problem is cost. A returned item must be collected, transported, inspected, cleaned or repackaged, and either returned to stock or disposed of. For inexpensive goods, these steps can cost more than the item itself, which is why some retailers quietly throw away returned products rather than resell them. Industry estimates suggest that a significant share of returned clothing never reaches a shelf again. {{u:4|What the customer experiences as a free service is, in reality, a cost that has simply been moved elsewhere}}: into higher prices for everyone, into thinner profit margins, or into landfills.",
    "The environmental consequences are no less serious. Each return adds another journey by truck, and sometimes by plane, to the journey the product has already made. Packaging is used twice. Products that cannot be resold may be shredded or burned, and the materials and energy used in making them are lost. Several governments have begun to consider rules that would prevent retailers from destroying unsold or returned goods, a measure that would make the true scale of the problem harder to ignore.",
    "Customer behavior has also changed. Because returning a product costs nothing, many shoppers now order several sizes or colors of the same item, keep one, and send the rest back. This practice, sometimes called bracketing, is entirely rational from the buyer's point of view. For the retailer, however, it means that a single sale may require handling three or four parcels. A smaller group of customers goes further, wearing clothes once for a special occasion and then returning them as though they were unused. {{b:2}} such behavior is difficult to prove, it is impossible to prevent entirely without inconveniencing honest customers.",
    "Some companies have responded by charging a small fee for returns, and their experience is instructive. When a few well-known retailers introduced such charges, critics predicted that customers would abandon them. In several cases, the opposite happened: the number of returns fell sharply, while sales declined only slightly. It seems that a modest fee does not discourage people from buying, but it does encourage them to think more carefully before they buy. {{u:5|The fee, in other words, works less as a source of revenue than as a signal}}.",
    "Other approaches rely on technology. Virtual fitting tools, which ask shoppers for their measurements or use photographs to recommend a size, promise to reduce the uncertainty that leads to bracketing. Detailed reviews in which customers describe how an item fits, whether it runs small, for instance, can serve a similar purpose. Such tools are useful, but they address only part of the problem. A customer who orders five dresses for a wedding because she cannot decide which one she likes best is not uncertain about her size; she is using the retailer's warehouse as a fitting room.",
    "The calculation is further complicated by the speed of modern delivery. Customers who once waited a week for a parcel now expect it the next day, and many retailers promise that refunds will be issued within hours of a return being dropped off. Every such promise adds to the pressure on warehouses, where returned items compete for space and staff with new orders that must be dispatched on time. Returns that arrive in the busy weeks after a holiday can take so long to process that the goods are out of season before they are ready to sell again.",
    "Underlying all of this is a question about fairness. Under the current system, customers who rarely return anything help to pay for the habits of those who return a great deal. {{b:3}} retailers are reluctant to say so openly, since no company wishes to be seen as accusing its own customers, a growing number now monitor return rates and limit or refuse service in the most extreme cases.",
    "None of this means that free returns should disappear. For many shoppers, particularly those in rural areas without nearby stores, the ability to return goods easily is what makes online shopping practical at all. But the policy was designed for a world in which returns were an exception. {{u:6|Now that they have become part of the routine, the price of that convenience deserves to be seen rather than hidden}}.",
]
q = [
    blank(["Thus", "Likewise", "Yet", "For example"], 3,
          "前段落は「返品無料は成功し、当たり前になった」。空所の後は「その気前のよさが予想外の問題を生んだ」。逆接の Yet。Thus（だから）・Likewise（同様に）・For example（例えば）では成功から問題への転換を表せない。"),
    blank(["Unless", "Since", "Until", "Whether"], 2,
          "since ~「〜なので」。証明が難しいので、正直な客に不便をかけずに完全に防ぐことはできない。Unless（〜しない限り）・Until（〜まで）は意味が通らず、Whether は「〜かどうか」で主節につながらない。"),
    blank(["Because", "If", "Although", "Once"], 3,
          "although ~「〜だが」。小売業者は公には言いたがらないが、返品率を監視する企業は増えている。譲歩。Because では「言いたがらないから監視する」となり因果が合わない。If・Once も文意が通らない。"),
    uline(4, [
        "customers who return items are charged hidden fees by the retailer",
        "returns cost retailers almost nothing because most products are resold",
        "the expense of returns is ultimately paid by someone, even if not by the person returning the item",
        "governments pay for the disposal of products that are returned",
    ], 3, "コロンの後に「全員の値上げ・利益の縮小・埋め立て地へ」とあり、費用は消えたのではなく別の所へ移っただけ、という意味。3 が一致。1 は返品した本人が払うことになり逆、2 は「再販されないものも多い」と矛盾、4 は本文にない。",
        "What does the author mean by underlined (4)?"),
    uline(5, [
        "Retailers introduced the fee mainly to increase their income.",
        "The fee shows customers which products are most likely to be returned.",
        "Customers pay the fee to prove that they are serious buyers.",
        "The main effect of the fee is to change customers' behavior rather than to earn money.",
    ], 4, "直前に「手数料は購入を減らさないが、買う前によく考えさせる」とある。収入源としてより、行動を変える合図として働くという意味で 4。1 は逆。2・3 は signal を取り違えている。",
        "Which one of the following best explains underlined (5)?"),
    uline(6, [
        "returns should no longer be allowed for products bought online",
        "the costs of returns should be made visible instead of being concealed in other prices",
        "online shopping should be offered only to customers in rural areas",
        "customers should stop worrying about how much returns cost",
    ], 2, "返品が日常になった今、その便利さの「値段」は隠すのではなく見えるようにすべきだ、という主張。2 が一致。1 は直前の「返品無料をなくすべきではない」と矛盾。3・4 は本文にない。",
        "Underlined (6) suggests that ___."),
    detail("According to the passage, why do some retailers throw away returned products?", [
        "Because returned clothing is always damaged.",
        "Because the law does not allow returned goods to be resold.",
        "Because processing them can cost more than the products are worth.",
        "Because customers prefer to buy brand-new products.",
    ], 3, "第2段落「安い商品は、返品の処理の費用が商品の値段を上回ることがある。だから再販せず捨てる」。3 が一致。1 は always が言い過ぎ、2 は逆（廃棄を禁じる規制が検討されている）、4 は本文にない。"),
    detail("What happened when some retailers introduced a fee for returns?", [
        "Customers stopped shopping at those retailers altogether.",
        "Returns decreased considerably, while sales fell only a little.",
        "Both sales and returns increased.",
        "Returns stayed the same, but sales fell sharply.",
    ], 2, "第5段落 the number of returns fell sharply, while sales declined only slightly。2 が一致。1 は批判者の予想で、実際は逆。3・4 は本文と矛盾。"),
    detail("Which one of the following does the author NOT mention as a response to the problem of returns?", [
        "Charging customers a small fee for returns.",
        "Offering discounts to customers who keep everything they order.",
        "Recommending sizes with virtual fitting tools.",
        "Monitoring return rates and limiting service in extreme cases.",
    ], 2, "返品手数料（第5段落）、仮想試着（第6段落）、返品率の監視（第7段落）は述べられている。注文をすべて手元に残す客への割引は述べられていないので 2。"),
    title([
        "How to Choose the Right Size When Shopping Online",
        "Why Online Shopping Will Soon Replace Stores",
        "Virtual Fitting Rooms: The End of Returns",
        "The Hidden Price of Free Returns",
    ], 4, "返品無料の費用・環境負荷・客の行動・公平さを論じ、便利さの代償を見えるようにすべきだと結ぶ。4 が全体を表す。3 は技術の部分だけで、しかも「問題の一部しか解決しない」と述べている。1・2 は本文にない。"),
]
finalize_practice([long_section("III", 1, 10, p, ["bracketing 同じ商品を複数のサイズ・色で注文し、合わない物を返品すること", "shred 細かく裁断する", "warehouse 倉庫"], q)],
                  "keio-shogaku-eigo-p01", "大問演習1 長文（論説）返品無料の代償", "長文（論説）", 25, seed=101)

# ───────────────────────── 演習2 長文（物語・歴史）: レジスターの発明 ─────────────────────────
p = [
    "In the late 1870s, James Ritty ran a saloon in Dayton, Ohio, and he had a problem that many shopkeepers of his time would have recognized: he suspected that some of his employees were keeping part of the money they took from customers. Like most small business owners of the period, he kept his accounts by hand, and the cash in his drawer at closing time rarely matched what he believed he had sold. Without a reliable record of each sale, there was no way to prove anything. Ritty could {{b:1}} his staff closely when he was present, but he could not be in the saloon every hour it was open.",
    "The solution, according to the story usually told, came to him on a voyage to Europe. Touring the engine room of the steamship, he became fascinated by a device that counted how many times the ship's propeller turned. If a machine could keep an exact record of the revolutions of a propeller, he reasoned, {{u:4|it could surely keep a record of the money that passed across a counter}}.",
    "Back in Dayton, Ritty and his brother John built a series of machines. The version they patented in 1879 displayed the amount of each sale on a dial that customers could see, and it kept a running total inside the machine. The device did not make theft impossible, but it made it far more difficult, because the owner could compare the total recorded by the machine with the money in the drawer at the end of the day. Ritty called his invention, with some optimism, an incorruptible cashier.",
    "The idea of a mechanical record was not entirely new. Inventors had already built machines that added up columns of figures, and some banks used devices that counted coins. What made Ritty's design different was its purpose. It was not meant to help an honest clerk calculate more quickly but to make a dishonest one easier to detect, and it kept its record inside a locked case, where neither the clerk nor the customer could alter it.",
    "Commercially, however, the machine was {{b:2}}. Shopkeepers were reluctant to spend money on an expensive device, and many employees resented a machine whose purpose was to check their honesty. Ritty, who had a saloon to run, soon lost interest in the business and sold it. It passed through several owners before it was bought in 1884 by John Henry Patterson, a businessman who had used one of the machines in his own store and had been impressed by the difference it made.",
    "Patterson's genius lay less in engineering than in selling. He renamed the business the National Cash Register Company and built one of the first modern sales organizations. Salesmen were given scripts to memorize, assigned territories, and set targets; those who met them were rewarded, and those who did not were replaced. Patterson also understood that {{u:5|he was not really selling a machine at all}}. What a shopkeeper bought was confidence: the knowledge that the day's takings would match the day's sales.",
    "Training was only part of the system. Patterson sent his salesmen to observe shops before they visited them, so that they could point out how much money a particular owner was likely to be losing. He insisted that they demonstrate the machine rather than describe it, and he collected their experiences into a manual of answers to every objection a shopkeeper might raise. {{u:6|Some of these methods, which seem obvious today, were new at the time}}.",
    "The machines changed as well. A bell that rang whenever the drawer opened alerted the owner to every transaction. Printed paper rolls created a permanent record, and later models produced receipts that customers could take away. Each improvement made the register more useful not only for preventing theft but for understanding the business: which goods sold best, at what times of day, and with what profit. By the early twentieth century, the cash register had become a fixture of shops throughout the United States and was spreading abroad.",
    "Patterson's methods were not always admired. His company was accused of aggressive tactics against competitors, and in 1913 he and several of his managers were convicted of violating antitrust law, although the conviction was later overturned. {{b:3}}, the sales techniques developed at his company were widely copied, and many of the men he trained went on to lead other firms. The device that began as one saloon keeper's answer to petty theft thus left a mark on the history of business that went far beyond the counter.",
]
q = [
    blank(["dismiss", "watch", "praise", "ignore"], 2,
          "watch O closely「Oを注意して見張る」。店にいる間は見張れるが、いつもいられるわけではない、という流れ。dismiss（解雇する）・praise（ほめる）・ignore（無視する）は closely と合わず、文脈にも合わない。", category="vocab"),
    blank(["an instant success", "a legal requirement", "a disappointment", "a family secret"], 3,
          "Commercially, however,「しかし商売としては」の逆接と、直後の「高価で買い渋られ、従業員にも嫌われ、Ritty は手放した」から a disappointment（期待外れ）。an instant success は逆。", category="vocab"),
    blank(["As a result", "Nevertheless", "For instance", "In other words"], 2,
          "前文は「彼のやり方は称賛されず、有罪判決も受けた」。空所の後は「それでも彼の販売手法は広く真似された」。逆接の Nevertheless。As a result（その結果）・For instance・In other words は前後の対立を表せない。"),
    uline(4, [
        "ships should carry cash registers for their passengers",
        "a mechanical counter could be adapted to record sales in a shop",
        "propellers could be used to power machines in shops",
        "employees could be trained to count money more accurately",
    ], 2, "スクリューの回転数を正確に記録できる機械があるなら、店の売上も記録できるはずだ、という着想。2 が一致。3 は動力の話にすり替え、1・4 は本文にない。",
        "Underlined (4) describes Ritty's idea that ___."),
    uline(5, [
        "the machines were given away to shopkeepers free of charge",
        "the company earned most of its money from repairs",
        "the real value customers paid for was the assurance that their money was recorded accurately",
        "he sold training courses rather than cash registers",
    ], 3, "直後の What a shopkeeper bought was confidence（安心）と一致する 3。1・2・4 は本文にない。",
        "What does the author mean by underlined (5)?"),
    uline(6, [
        "Patterson's sales methods are no longer used by any company today.",
        "Sales techniques that are now common were innovative when Patterson introduced them.",
        "The methods were so obvious that no other company bothered to copy them.",
        "Shopkeepers of the time found the cash register easy to understand.",
    ], 2, "今では当たり前に見える手法も、当時は新しかったという意味。2 が一致。最終段落「広く真似された」とも合う。1・3 はそれと矛盾し、4 は販売手法の話ではない。",
        "What does the author mean by underlined (6)?"),
    detail("Why were shopkeepers at first unwilling to buy the machine?", [
        "It was too large to fit on a counter.",
        "It often recorded the wrong amounts.",
        "It was expensive, and employees disliked being checked by it.",
        "The law did not allow it to be used in saloons.",
    ], 3, "第4段落「高価な機械に金を出し渋り、従業員の多くは正直さを確かめる機械に反感を持った」。3 が一致。1・2・4 は本文にない。"),
    detail("According to the passage, how did later models of the cash register help owners?", [
        "They automatically ordered new stock from suppliers.",
        "They showed which goods sold best and when.",
        "They calculated the wages of each employee.",
        "They prevented customers from paying with paper money.",
    ], 2, "第7段落「どの商品がいつ、どれだけの利益で売れたかを理解するのに役立った」。2 が一致。1・3・4 は本文にない。"),
    detail("Which one of the following is true according to the passage?", [
        "Patterson had used one of the machines in his own store before buying the business.",
        "Ritty became wealthy by running the cash register business for many years.",
        "Patterson's conviction in 1913 was never reversed.",
        "The first patented machine printed receipts for customers.",
    ], 1, "第4段落 a businessman who had used one of the machines in his own store と一致する 1。2 は「すぐに関心を失い手放した」と矛盾、3 は「後に覆された」と矛盾、4 は受け取りを出すのは後の型。"),
]
finalize_practice([long_section("II", 1, 9, p, ["saloon 酒場", "propeller （船の）スクリュー", "antitrust law 独占禁止法"], q)],
                  "keio-shogaku-eigo-p02", "大問演習2 長文（物語・歴史）レジスターの発明", "長文（物語・歴史）", 25, seed=102)

# ───────────────────────── 演習3 文法・語法（7問）＋ 中文空所（6問） ─────────────────────────
iv = grammar_section([
    grammar("The number of students who study abroad _____ increased steadily over the past decade.", ["have", "has", "are", "were"], 2,
            "主語は The number of ~「〜の数」で単数。over the past decade（この10年で）なので現在完了 has increased。A number of ~（多くの〜）なら複数扱いになるので区別する。"),
    grammar("I'm looking forward to _____ you at the conference next month.", ["see", "be seen", "seeing", "have seen"], 3,
            "look forward to -ing「〜するのを楽しみにする」。to は前置詞なので後ろは動名詞。"),
    grammar("She is one of the few people _____ opinions the committee always respects.", ["whom", "which", "that", "whose"], 4,
            "先行詞 people と opinions が「〜の意見」の所有関係なので whose。whom・that・which では後ろの opinions とつながらない。"),
    grammar("The bridge, _____ in 1890, is still used by thousands of cars every day.", ["built", "building", "having built", "to build"], 1,
            "橋は『建てられた』側なので過去分詞 built（= which was built）。having built では橋が何かを建てたことになる。"),
    grammar("You had better _____ your umbrella; it looks like rain.", ["to take", "take", "taking", "took"], 2,
            "had better + 動詞の原形「〜したほうがよい」。to 不定詞や -ing にしない。"),
    grammar("Not a single word _____ during the entire meeting.", ["he said", "said he", "did he say", "he did say"], 3,
            "否定語句 Not a single word が文頭に出ると、疑問文の語順（倒置）になる: did + S + 原形。"),
    grammar("The new policy had a _____ effect on sales, which rose by 20 percent.", ["considerate", "considering", "considered", "considerable"], 4,
            "considerable「かなりの」。considerate は「思いやりのある」で人について使う。considering・considered は形容詞として effect を修飾しない。紛らわしい派生語の区別。"),
], first=1, last=7)
v = cloze_section([
    "Few experiences are as universally {{b:8}} as waiting in line. Yet research on queues suggests that the length of a wait matters less than how it feels. People tend to overestimate the time they spend waiting, especially when they have nothing to do, and an unexplained delay seems far longer than one whose cause is known.",
    "Businesses have learned to {{b:9}} this. Elevators are surrounded by mirrors partly so that people have something to look at while they wait. Theme parks post estimated waiting times that are slightly longer than the real ones, so that visitors are pleasantly surprised when they reach the front sooner than {{b:10}}. Some airports have moved arrival gates farther from baggage claim, so that passengers spend more time walking and less time standing beside an empty belt; complaints fell, even though the total time was the same.",
    "Fairness also matters. A single line that feeds several counters feels fairer than separate lines in front of each counter, because no one has to watch a neighboring line move faster. People will {{b:11}} a longer wait if they believe that everyone is being treated equally, but even a short delay can cause anger if someone appears to {{b:12}} the line.",
    "None of these techniques makes the wait itself shorter. What they change is the experience of waiting, which, for the person standing in line, is the only thing that {{b:13}}.",
], [
    cloze(["admired", "disliked", "anticipated", "rewarded"], 2,
          "直後の Yet 以下で「待ち時間は長さより感じ方」と、待つことの不快さを前提に話が進む。as universally disliked as ~「〜ほど誰もが嫌うものはない」。admired（称賛される）・rewarded（報われる）は逆、anticipated（待ち望まれる）も合わない。"),
    cloze(["deny", "forbid", "exploit", "resent"], 3,
          "exploit「（性質などを）うまく利用する」。人が待ち時間を長く感じるという性質を、企業は利用することを学んだ。具体例（鏡・待ち時間の表示）がその利用法。deny（否定する）・forbid（禁じる）・resent（腹を立てる）は合わない。"),
    cloze(["expected", "deserved", "ordered", "allowed"], 1,
          "sooner than expected「予想より早く」。実際より長めの待ち時間を表示しておくので、予想より早く着いて喜ぶ。"),
    cloze(["resist", "tolerate", "regret", "postpone"], 2,
          "tolerate「我慢する、許容する」。皆が平等に扱われていると思えば、長い待ち時間も我慢できる。but 以下の「短い遅れでも怒る」との対比。resist（抵抗する）・regret（後悔する）・postpone（延期する）は合わない。"),
    cloze(["join", "leave", "form", "jump"], 4,
          "jump the line「列に割り込む」。誰かが割り込めば、短い遅れでも怒りを招く。公平さの話の流れに合う。join（並ぶ）・leave（列を離れる）・form（列を作る）は怒りの原因にならない。"),
    cloze(["lasts", "matters", "fails", "waits"], 2,
          "the only thing that matters「唯一重要なこと」。待ち時間自体は変わらないが、並んでいる人にとって大事なのは待つ体験だけ、という結論。lasts（続く）・fails（失敗する）・waits は文意が通らない。"),
], first=8, last=13)
finalize_practice([iv, v], "keio-shogaku-eigo-p03", "大問演習3 文法・語法と中文の空所補充", "文法・語法／中文空所", 15, seed=103)

# ───────────────────────── 演習4 短文の内容推測（4題） ─────────────────────────
vi = short_section([
    ("A cinema once offered popcorn in two sizes: a small box for three dollars and a large one for seven. Most customers chose the small box. When the cinema added a medium size priced at six and a half dollars, sales of the large box rose sharply, even though few people bought the medium. Economists call this the decoy effect. The medium option was not designed to be chosen; its purpose was to make the large box look like a bargain by comparison. Similar techniques appear in magazine subscriptions, restaurant menus, and software plans, where one option exists mainly to steer customers toward another.",
     ["Customers always choose the most expensive option available.",
      "The medium size became the cinema's most profitable product.",
      "An option can influence people's choices even if few of them select it.",
      "The decoy effect is found only in the sale of food."], 3,
     "ほとんど売れない中サイズを加えただけで大サイズが売れた。選ばれない選択肢でも選択に影響する、と推測できる 3。1 は「多くは小を選んだ」と矛盾、2 は「中はほとんど売れない」と矛盾、4 は雑誌・ソフトなどの例と矛盾。"),
    ("When a honeybee finds a rich source of food, it returns to the hive and performs a movement known as the waggle dance. The direction of the dance on the vertical surface of the comb indicates the direction of the food relative to the sun, and the length of the waggle portion indicates the distance. Other bees follow the dancer closely and then fly out to search. Remarkably, the information is not perfectly precise: bees that follow a dance often land some distance from the target and must search the area. Some researchers believe this imprecision may be useful, since it leads bees to discover nearby flowers that the original forager missed.",
     ["Bees that follow a dance always land exactly on the food source.",
      "The waggle dance communicates both the direction and the distance of food.",
      "The waggle dance is performed outside the hive.",
      "Researchers agree that the imprecision of the dance is harmful to bees."], 2,
     "ダンスの向きが方向を、尻振りの長さが距離を示すので 2。1 は「目標から離れた所に降りることが多い」と矛盾、3 は「巣に戻って踊る」と矛盾、4 は「役に立つかもしれない」と矛盾。"),
    ("Many students now take lecture notes on laptops, which allow them to record far more of what is said than they could by hand. Yet more is not necessarily better. Students who type tend to copy the lecturer's words almost exactly, while those who write by hand are forced to summarize, because they cannot keep up otherwise. Summarizing requires deciding what matters, and that decision is itself a form of learning. The laptop is not the problem; the habit of transcription is. Students who type could gain the same benefit if they resisted the temptation to record everything and instead wrote down only what they had understood.",
     ["Laptops should be banned from lecture halls.",
      "Students should record lectures as completely as possible.",
      "Notes written by hand are valuable mainly because they are easier to read later.",
      "Students learn more when they process information than when they copy it word for word."], 4,
     "要約には何が大事かの判断が必要で、それ自体が学習になる。問題はパソコンではなく書き写す習慣、という主張。4 に同意するはず。1 は「パソコンが問題ではない」と矛盾、2 は逆、3 は本文にない。"),
    ("Volunteer tourism, in which travelers pay to spend a few weeks helping at schools or building projects abroad, has grown into a large industry. Its appeal is easy to understand: participants see a new country while doing something worthwhile. But short visits by untrained volunteers can do more harm than good. Children may become attached to a series of adults who then disappear, and construction work carried out by inexperienced visitors often has to be redone by local workers. Those who want to help would often achieve more by donating the money they would spend on travel to organizations that employ local staff.",
     ["Volunteer tourism benefits local communities in every case.",
      "People who want to help may do more by supporting local organizations than by volunteering briefly abroad.",
      "Travelers should never visit schools in other countries.",
      "Construction projects abroad should be carried out only by volunteers."], 2,
     "短期の未経験の参加者はかえって害になることがあり、旅費を現地の人を雇う団体に寄付するほうが役立つ、という主張。2 が要旨。1 は逆、3 は言い過ぎ、4 は本文と逆。"),
], first=1)
finalize_practice([vi], "keio-shogaku-eigo-p04", "大問演習4 短文の内容推測", "短文の内容推測", 15, seed=104)

# ───────────────────────── 演習5 記述: 動詞の語形（6問）＋ 名詞形（5問） ─────────────────────────
VII_FORMS = {
    "conclude": ["conclude", "concludes", "concluded", "concluding"],
    "fling": ["fling", "flings", "flung", "flinging"],
    "overtake": ["overtake", "overtakes", "overtook", "overtaken", "overtaking"],
    "play": ["play", "plays", "played", "playing"],
    "rely": ["rely", "relies", "relied", "relying"],
    "sweep": ["sweep", "sweeps", "swept", "sweeping"],
}
vii = verb_section([
    "The first machines that resembled bicycles appeared in the early nineteenth century. They had no pedals and {{w:a}} entirely on the rider's feet, which pushed against the ground. Pedals attached to the front wheel were added in the 1860s, and makers soon {{w:b}} that a larger front wheel would carry the rider farther with each turn. The result was the high-wheeled bicycle, which was fast but dangerous: a rider who struck a stone could be {{w:c}} over the handlebars.",
    "The so-called safety bicycle, with two wheels of equal size and a chain driving the rear wheel, eventually {{w:d}} the high-wheeler in popularity. Combined with air-filled tires, it made cycling comfortable enough for ordinary people, and in the 1890s a cycling boom {{w:e}} across Europe and North America. Many historians argue that the bicycle {{w:f}} an important part in changing social customs, giving women in particular a new freedom of movement. Clubs were formed, races drew large crowds, and newspapers printed maps of the best routes out of the city. Roads that had been neglected since the arrival of the railway were improved, partly in response to pressure from cyclists.",
], list(VII_FORMS), VII_FORMS, [
    write("a", ["relied"], "主語 They（初期の自転車）の過去の性質なので過去形。rely on ~「〜に頼る」。足で地面を蹴って進むしかなかった。"),
    write("b", ["concluded"], "makers soon ___ that ~ の過去形。conclude that ~「〜と結論づける」。"),
    write("c", ["flung"], "could be + 過去分詞（受動態）。fling – flung – flung「投げ出す」。石に当たると、ハンドルの上から投げ出されかねなかった。"),
    write("d", ["overtook"], "eventually（やがて）の過去の出来事なので過去形。overtake – overtook – overtaken「追い越す」。人気で前輪の大きな型を追い越した。"),
    write("e", ["swept"], "in the 1890s の過去の出来事。sweep across ~「〜を席巻する」。sweep – swept – swept。"),
    write("f", ["played"], "play a part in ~「〜で役割を果たす」。歴史家の見方として過去の出来事を述べるので過去形。"),
])
VIII_FORMS = {
    "compose": ["composure", "composition", "compositions"],
    "criticize": ["criticism", "criticisms"],
    "deliver": ["delivery", "deliveries", "deliverance"],
    "err": ["error", "errors"],
    "repeat": ["repetition", "repetitions"],
}
viii = noun_section([
    "Most people find speaking in public difficult, and the fear is not entirely irrational. An audience can see every hesitation, and a single {{w:a}}, such as a forgotten word or a slide in the wrong order, may seem enormous to the speaker, even if no one else notices it.",
    "Experienced speakers rely less on talent than on {{w:b}}. They rehearse aloud, often several times, and they ask colleagues for honest {{w:c}} of their talks. Their {{w:d}} on stage comes not from the absence of nerves but from the knowledge that they are ready. Above all, they remember that the purpose of a talk is not to display the speaker but to help the audience; a speaker who concentrates on the {{w:e}} of a clear message is less likely to worry about being judged. Many also arrive early to check the room, test the equipment, and speak a few words from the stage, so that nothing about the setting feels unfamiliar when the audience arrives. Some even watch recordings of their own talks, a painful exercise that nonetheless reveals habits they would never otherwise notice.",
], list(VIII_FORMS), VIII_FORMS, [
    write("a", ["error"], "a single + 単数名詞。err → error「誤り」。忘れた単語、順番を間違えたスライドがその例。", category="noun-form"),
    write("b", ["repetition"], "rely ... on + 名詞。repeat → repetition「繰り返し」。直後の「何度も声に出して練習する」と対応。", category="noun-form"),
    write("c", ["criticism"], "honest + 名詞 + of ~。criticize → criticism「批評」。同僚に率直な批評を求める。", category="noun-form"),
    write("d", ["composure"], "Their + 名詞。compose → composure「落ち着き」（composition は「構成・作文」で文脈に合わない）。準備ができているという自覚から来る落ち着き。", category="noun-form"),
    write("e", ["delivery"], "the + 名詞 + of ~。deliver → delivery「（話の）伝え方・伝達」。明確なメッセージを伝えることに集中する。", category="noun-form"),
], example="例： permit → permission")
finalize_practice([vii, viii], "keio-shogaku-eigo-p05", "大問演習5 記述（動詞の語形・名詞形）", "記述（語形・名詞形）", 15, seed=105)

# ───────────────────────── 演習6 長文（学術）: 数値への信頼 ─────────────────────────
p = [
    "Modern institutions display a striking confidence in numbers. Governments evaluate schools by examination results, hospitals by waiting times, and universities by rankings that compress a vast range of activities into a single figure. This reliance on quantification is frequently presented as a triumph of objectivity over prejudice: a number, it is assumed, cannot favor its friends, and few would wish to return to a world in which such decisions depended entirely on the impressions of individual officials. {{b:1}} the historical record suggests a more complicated story, in which the authority of numbers derives less from their accuracy than from the particular social circumstances in which they are produced and used.",
    "Historians of science have observed that reliance on quantitative rules tends to flourish precisely where trust in personal judgment is weak. An official whose decisions are open to challenge by powerful outsiders has every incentive to {{b:2}} discretion in favor of procedures that can be applied mechanically and defended publicly. {{u:5|A rule followed to the letter protects the person who follows it}}, even when it produces results that an experienced practitioner would recognize as foolish. Quantification, on this account, is not so much a method of discovering truth as a strategy of self-defense adopted by those who lack the standing to be believed on their own authority.",
    "This interpretation helps to explain a pattern that might otherwise seem paradoxical. Elite professions with secure social prestige, such as medicine and law in many countries, long resisted attempts to reduce their expertise to explicit formulae, relying instead on the cultivated judgment of their members. By contrast, newer or more exposed occupations, such as engineers in public service, actuaries, and accountants, embraced standardized methods with enthusiasm. {{b:3}} their calculations could be checked by anyone with the appropriate training, their conclusions acquired a kind of impersonal authority that no individual reputation could supply.",
    "The spread of cost-benefit analysis in public administration illustrates the same dynamic. Agencies required to justify large investments to skeptical legislatures and courts found that a monetary comparison of costs and benefits, however rough its underlying assumptions, was far easier to defend than an appeal to the experience of their staff. Over time, techniques that had been adopted as a shield came to be regarded as the very definition of rational decision-making, and the judgments embedded in them, such as the value assigned to a saved hour or a prevented injury, became difficult to see, let alone to question.",
    "The consequences of this shift have not been uniformly positive. When a measure becomes the basis for rewards and penalties, those being measured adapt their behavior to the measure rather than to the purpose it was meant to serve. Schools may concentrate on the skills that examinations test; hospitals may reduce reported waiting times by redefining the moment at which a wait is said to begin. {{u:6|The number improves while the reality it was supposed to represent remains unchanged, or deteriorates}}. Economists have described this tendency in various forms, but its core insight is simple: an indicator that is used to control behavior gradually loses its value as a description of that behavior. Similar distortions appear wherever targets are attached to simple counts. A police force judged by the proportion of crimes it solves may become reluctant to record crimes that are unlikely to be solved; a research council that rewards the number of articles published may encourage scholars to divide a single study into several thin papers. In each case the measure was introduced to make performance visible, and in each case it altered the performance it was meant to observe.",
    "None of this implies that numbers should be abandoned. Quantitative indicators make it possible to compare institutions across great distances, to detect problems that individual observers would miss, and to hold powerful actors to account in ways that personal testimony cannot. The difficulty lies in forgetting that every measure embodies choices about what to count, how to count it, and what to leave out, and that these choices are made by people with interests of their own. {{b:4}} such choices are made visible and open to debate, quantification can strengthen public deliberation; when they are concealed behind an appearance of technical neutrality, it tends to replace deliberation altogether.",
    "The question, then, is not whether to trust numbers but how. A society that treats figures as self-interpreting facts surrenders a portion of its judgment to whoever designs the measures. One that understands numbers as the products of social agreement can use them as instruments of accountability while remaining alert to what they obscure. The authority of quantification, in short, is something that must be continually earned rather than simply assumed.",
]
q = [
    blank(["Hence", "Moreover", "Similarly", "Yet"], 4,
          "前は「数値は客観性の勝利だと考えられている」という通念、空所の後は「歴史はもっと複雑な話を示す」。通念に対する逆接の Yet。Hence（それゆえ）・Moreover（さらに）・Similarly（同様に）は通念を補強する側で、転換にならない。"),
    blank(["exercise", "renounce", "expand", "celebrate"], 2,
          "renounce O in favor of ~「〜のためにOを放棄する」。攻撃されやすい役人は、機械的に適用でき公に弁護できる手続きを選んで、自分の裁量（discretion）を捨てる。exercise discretion（裁量を行使する）は in favor of procedures と逆の意味になる。", category="vocab"),
    blank(["Unless", "Whereas", "Because", "Lest"], 3,
          "計算を誰でも検証できる『ので』、その結論は個人の評判では得られない非人格的な権威を得た。因果の Because。Whereas（一方）は対比、Unless（〜しない限り）・Lest（〜しないように）は文意が通らない。"),
    blank(["Where", "Unless", "Although", "Lest"], 1,
          "Where such choices are made visible ..., ~; when they are concealed ..., ~ の対比。『〜する場合には』の Where が、後半の when と対応する。Unless では意味が逆になり、Although・Lest は文意が通らない。"),
    uline(5, [
        "Rules are always more accurate than human judgment.",
        "Officials who apply fixed procedures are less exposed to criticism for their decisions.",
        "Experienced practitioners seldom make foolish decisions.",
        "People who break rules are rarely punished for doing so.",
    ], 2, "規則を文字どおり守れば、結果が愚かでも守った本人は守られる。つまり、決まった手続きに従う役人は決定を批判されにくい。2 が一致。直前の『攻撃されうる役人は機械的な手続きを選ぶ』、直後の『自己防衛の戦略』とも合う。1 は always が言い過ぎで、本文は正確さより社会的事情を強調している。",
        "Which one of the following best explains underlined (5)?"),
    uline(6, [
        "hospitals deliberately make patients wait longer in order to improve their figures",
        "numbers tend to become more accurate the longer they are used",
        "an indicator can be manipulated so that it no longer reflects what it was designed to measure",
        "schools should stop testing their students altogether",
    ], 3, "数値は改善するのに、本来表すはずの実態は変わらないか悪化する。指標が操作され、測るはずのものを反映しなくなるという意味で 3。1 は病院の例をねじ曲げている（待ち時間を長くするのではなく、待ち時間の数え始めを変える）。2・4 は本文にない。",
        "Underlined (6) suggests that ___."),
    detail("According to the passage, why did some newer occupations embrace standardized methods?", [
        "Because the law required them to use fixed formulae.",
        "Because they enjoyed more prestige than doctors and lawyers.",
        "Because standardized methods were always more accurate than judgment.",
        "Because checkable calculations gave them an authority their individual reputations could not.",
    ], 4, "第3段落「計算を誰でも検証できるので、個人の評判では得られない非人格的な権威を得た」。4 が一致。2 は逆（地位が不安定な職業）。1・3 は本文にない。"),
    detail("Which one of the following does the author present as a benefit of quantitative indicators?", [
        "They make it possible to compare institutions that are far apart.",
        "They remove the need for human choices in measurement.",
        "They guarantee that the institutions being measured will improve.",
        "They make public debate unnecessary.",
    ], 1, "第6段落「遠く離れた機関を比較できる」。1 が一致。2 は「すべての指標は人の選択を含む」と矛盾、3 は第5段落と矛盾、4 は「議論を強めうる」と逆。"),
    detail("Which one of the following is NOT stated in the passage?", [
        "Some established professions long resisted reducing their expertise to formulae.",
        "Measures used for rewards and penalties can change the behavior of those measured.",
        "Cost-benefit analysis was first developed by doctors to justify treatments.",
        "Every measure reflects choices about what to count and what to leave out.",
    ], 3, "費用便益分析は行政機関が議会や裁判所に投資を正当化するために広めたもので、医師が開発したとは書かれていない。3 が述べられていない。1 は第3段落、2 は第5段落、4 は第6段落。"),
    title([
        "Trusting Numbers: The Social Foundations of Quantitative Authority",
        "How Hospitals Reduce Their Reported Waiting Times",
        "The Decline of Judgment in the Medical Profession",
        "Why Numbers Never Lie: The Triumph of Objectivity",
    ], 1, "数値の権威は正確さより社会的事情に由来し、その選択を見えるようにして使うべきだ、という全体の主張に合う 1。4 は筆者が疑問視する通念。2・3 は一部の例にすぎない。"),
]
finalize_practice([long_section("I", 1, 10, p, ["discretion 裁量", "actuary 保険数理士", "cost-benefit analysis 費用便益分析"], q)],
                  "keio-shogaku-eigo-p06", "大問演習6 長文（学術）数値への信頼", "長文（学術）", 25, seed=106)
