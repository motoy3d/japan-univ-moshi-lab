import { useTitle } from "../hooks";
import { useSerifFont } from "../fonts";
import { Link } from "react-router-dom";
import { getConfig } from "../config";

/**
 * 模試ラボについて（サービスの説明）。
 * 見た目は「試験の紙」に寄せる: 明朝の見出し、細い罫線、マークシートの楕円。
 * グラデーション・絵文字・アイコンの並んだ機能紹介は使わない。書くことは、確かめた数字だけ。
 */
export function AboutPage() {
  useTitle("模試ラボについて");
  useSerifFont();
  const photo = getConfig().photoGrading;
  return (
    <article className="about">
      <header className="about-head">
        <p className="about-kicker">模試ラボについて</p>
        <h1 className="about-title">
          本番と同じ形の模試を、<br />
          何度でも、無料で。
        </h1>
        <p className="about-lead">
          大学・学部ごとの出題形式に合わせて、問題を一から作っています。
          第1弾は<b>慶應義塾大学 商学部の英語</b>。同じ学部の<b>世界史</b>の模試も受けられます。
        </p>
        <MarkStrip />
        <div className="about-cta">
          <Link className="btn btn-primary" to="/#practice">まず15分の大問演習から</Link>
          <Link className="btn" to="/#mocks">90分の模試を見る</Link>
        </div>
      </header>

      <section className="about-sec">
        <h2><Oval n={1} />形を、本番に合わせました（英語の例）</h2>
        <p>
          大学が公開している2025・2026年度の問題と、予備校の分析で2020〜2026年度の出題を確かめ、
          大問の並び・設問の数・指示文の書き方まで合わせています。
        </p>
        <table className="about-table">
          <thead>
            <tr><th></th><th>本番</th><th>模試ラボ</th></tr>
          </thead>
          <tbody>
            <tr><th>時間・配点</th><td>90分・200点</td><td>90分・200点</td></tr>
            <tr><th>大問</th><td>8題</td><td>8題</td></tr>
            <tr><th>設問（マーク＋記述）</th><td>46＋11問</td><td>46＋11問</td></tr>
            <tr><th>長文1題の語数</th><td>719〜837語</td><td>760〜809語</td></tr>
          </tbody>
        </table>
        <p className="about-note">本番の語数は、2025・2026年度の公開問題を数えたもの（非公開の大問を除く）。</p>
      </section>

      <section className="about-sec">
        <h2><Oval n={2} />紙の大きさも、本番どおり</h2>
        <p>
          英語の問題冊子はA4に1ページずつ印刷すると、本文が本番と同じ大きさ（12ポイント）になります。
          マークシートは、大学の要項にある「解答用紙の様式（見本）」に合わせた横向きです。
          家で、時計を置いて、90分。いちばん本番に近い受け方ができます。
        </p>
      </section>

      <section className="about-sec">
        <h2><Oval n={3} />問題は、すべてオリジナル</h2>
        <p>
          過去問の文章を使ったり、言い換えたりはしていません。
          正解が二つ考えられる設問がないか、全問を一つずつ点検し、解説には「正解の根拠」と「ほかの選択肢がなぜ違うか」を書いています。
        </p>
        <p>
          大問演習（15〜25分）と90分の模試は、別の問題です。演習で読んだ英文が模試に出ることはないので、模試はいつでも初見で受けられます。
        </p>
      </section>

      <section className="about-sec">
        <h2><Oval n={4} />受けたあとが、本番</h2>
        <p>
          採点はその場で。大問別・分野別の得点と、失点の大きい分野から順に「伸びしろ」を出します。
          偏差値は、受験者が30人そろってから表示します（少ない人数の偏差値は当てにならないため）。
          {photo && " 紙で解いた答案は、解答用紙を撮影すると採点できます（読み取った答えは、ご自身で確かめてから採点します）。"}
        </p>
      </section>

      <section className="about-sec about-price">
        <h2><Oval n={5} />料金</h2>
        <p className="about-zero"><span>0</span>円</p>
        <p>
          すべて無料です。登録しなくても受けられます。広告もありません。
          ログインは、受験の記録を残して前回と比べたいときだけ使ってください。
        </p>
      </section>

      <footer className="about-foot">
        <div className="about-cta">
          <Link className="btn btn-primary" to="/#practice">大問演習を解いてみる</Link>
          <Link className="btn" to="/#mocks">模試の一覧へ</Link>
        </div>
        <p className="about-disclaimer">
          模試ラボの問題は、過去の出題形式を参考に独自に作ったものです。慶應義塾大学および同大学の入学試験とは関係ありません。
          配点の内訳は大学が公表していないため、模試ラボ独自の想定です。
        </p>
      </footer>
    </article>
  );
}

/** 見出しの番号。マークシートの塗られた楕円で表す */
function Oval({ n }: { n: number }) {
  return <span className="h-oval" aria-hidden>{n}</span>;
}

/** マークシートの1列。左から順に塗られていく（動きを減らす設定の人には、最初から塗った状態で見せる） */
function MarkStrip() {
  return (
    <div className="mark-strip" aria-hidden>
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((d, i) => (
        <span key={d} className={`ms-o ${[2, 5, 8].includes(i) ? "fill" : ""}`} style={{ animationDelay: `${0.35 + i * 0.06}s` }}>{d}</span>
      ))}
    </div>
  );
}
