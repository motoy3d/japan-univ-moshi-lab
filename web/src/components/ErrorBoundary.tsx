import { Component, type ReactNode } from "react";
import { track } from "../analytics";

/** 画面の描画中の予期しないエラーで真っ白にならないようにし、件数を計測に送る（内容は送らない） */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    track("exception", { description: error.name, fatal: true });
    console.error(error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="container" style={{ paddingTop: 32 }}>
        <h1>表示できませんでした</h1>
        <p>申し訳ありません。ページを読み込み直してください。受験中の解答はこの端末に保存されています。</p>
        <p className="row">
          <button className="btn btn-primary" onClick={() => location.reload()}>読み込み直す</button>
          <a className="btn" href="/">ホームへ</a>
        </p>
      </div>
    );
  }
}
