import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { loadConfig } from "./config";
import { initAnalytics } from "./analytics";
import { applyDesign, designPreviewEnabled, loadDesign } from "./design";
import "./styles.css";

// デザイン（確認用の切り替えが有効な端末だけ、選んだデザイン。ほかは標準）を描画の前に当てる
const designPreview = designPreviewEnabled();
applyDesign(loadDesign(designPreview));

loadConfig().then(() => {
  initAnalytics();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <App designPreview={designPreview} />
      </BrowserRouter>
    </StrictMode>,
  );
});
