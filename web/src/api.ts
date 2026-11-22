import type {
  AttemptReview,
  AttemptSummary,
  Exam,
  ExamListItem,
  ExamStats,
  SubmitAttemptRequest,
} from "../../shared/types";
import { getAccessToken } from "./auth";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getAccessToken();
  const r = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, j.message ?? `エラー (${r.status})`);
  return j as T;
}

export const api = {
  exams: () => call<ExamListItem[]>("GET", "/exams"),
  exam: (id: string) => call<Exam>("GET", `/exams/${id}`),
  stats: (id: string) => call<ExamStats>("GET", `/exams/${id}/stats`),
  submit: (req: SubmitAttemptRequest) => call<{ attemptId: string }>("POST", "/attempts", req),
  attempts: () => call<AttemptSummary[]>("GET", "/attempts"),
  attempt: (id: string) => call<AttemptReview>("GET", `/attempts/${id}`),
};
