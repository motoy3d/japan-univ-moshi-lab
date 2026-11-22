import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { track } from "../analytics";
import { getConfig } from "../config";
import { store, useAsync } from "../hooks";
import { allQuestions } from "../../../shared/scoring";
import type { Answers, Exam, PhotoJob } from "../../../shared/types";

/** 端末で長辺 maxSide px の JPEG に縮小し、Base64（data: なし）で返す */
async function toJpegBase64(file: File, maxSide = 2000): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("画像を変換できませんでした"))), "image/jpeg", 0.85));
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function PhotoPage() {
  const { id = "" } = useParams();
  const exam = useAsync(() => api.exam(id), [id]);
  if (exam.error) return <p className="error">{exam.error}</p>;
  if (!exam.data) return <p className="muted">読み込み中…</p>;
  if (!getConfig().photoGrading) return <p className="notice">この環境では撮影採点を使えません。<Link to={`/exams/${id}/take?mode=paper`}>答えを手で入力する</Link></p>;
  return <PhotoForm exam={exam.data} />;
}

function PhotoForm({ exam }: { exam: Exam }) {
  const nav = useNavigate();
  const qs = allQuestions(exam);
  const hasMarks = qs.some((q) => q.kind === "mark");
  const hasWrites = qs.some((q) => q.kind === "write");
  const sheets = [hasMarks && "解答用紙A（マークシート）", hasWrites && "解答用紙B（記述）"].filter(Boolean) as string[];
  const [files, setFiles] = useState<(File | undefined)[]>([]);
  const [status, setStatus] = useState<"idle" | "upload" | "read">("idle");
  const [error, setError] = useState<string>();

  const run = async () => {
    setError(undefined);
    const chosen = files.filter(Boolean) as File[];
    if (!chosen.length) return setError("解答用紙の写真を選んでください");
    try {
      setStatus("upload");
      const images = await Promise.all(chosen.map((f) => toJpegBase64(f)));
      let job: PhotoJob = await api.photoJob({ examId: exam.id, images });
      track("photo_upload", { exam_id: exam.id, images: images.length });
      setStatus("read");
      for (let i = 0; i < 75 && job.status === "PENDING"; i++) {
        await sleep(2000);
        job = await api.photoJobStatus(job.jobId);
      }
      if (job.status !== "DONE" || !job.result) {
        track("photo_read_failed", { exam_id: exam.id });
        throw new Error(job.error ?? "読み取りに時間がかかっています。少し待ってから、もう一度お試しください");
      }
      track("photo_read_done", { exam_id: exam.id });
      // 読み取った答えを「紙の答えの入力」画面の下書きに入れ、本人に確認してもらう
      const answers: Answers = {};
      const low: string[] = [];
      for (const m of job.result.marks) {
        const q = qs.find((x) => x.kind === "mark" && x.no === m.no);
        if (!q) continue;
        if (m.choice) answers[q.id] = m.choice;
        if (m.confidence === "low") low.push(q.id);
      }
      for (const w of job.result.writes) {
        const q = qs.find((x) => x.kind === "write" && (x.label ?? String(x.no)) === w.label);
        if (!q) continue;
        if (w.text) answers[q.id] = w.text;
        if (w.confidence === "low") low.push(q.id);
      }
      store.set(`moshi.draft.${exam.id}.paper`, { answers, startedAt: 0, section: 0 });
      store.set(`moshi.photo.low.${exam.id}`, low);
      store.set(`moshi.photo.filled.${exam.id}`, true);
      nav(`/exams/${exam.id}/take?mode=paper`);
    } catch (e) {
      setError((e as Error).message);
      setStatus("idle");
    }
  };

  return (
    <>
      <p className="muted small" style={{ margin: 0 }}>{exam.edition}</p>
      <h1>解答用紙を撮影して採点</h1>
      <div className="card grid" style={{ gap: 14 }}>
        <ol className="small" style={{ margin: 0, paddingLeft: "1.2em" }}>
          <li>明るい場所で、用紙全体が入るように真上から撮ってください。</li>
          <li>読み取った答えは、採点の前に画面で確認・修正できます。</li>
          <li>氏名欄には名前を書かなくて構いません。写真は読み取り後に削除します（遅くとも1日後）。</li>
        </ol>
        {sheets.map((label, i) => (
          <label key={label} className="photo-slot">
            <span>{label}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFiles((prev) => Object.assign([...prev], { [i]: f }));
              }}
            />
            {files[i] && <img src={URL.createObjectURL(files[i]!)} alt={`${label}のプレビュー`} />}
          </label>
        ))}
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={status !== "idle"} onClick={run}>
          {status === "upload" ? "送信中…" : status === "read" ? "読み取り中…（30秒ほどかかります）" : "読み取る"}
        </button>
        <p className="small muted" style={{ margin: 0 }}>
          撮影採点は1日5回まで使えます。うまく読み取れないときは<Link to={`/exams/${exam.id}/take?mode=paper`}>手で入力</Link>してください。
        </p>
      </div>
    </>
  );
}
