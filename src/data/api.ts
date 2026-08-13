import { studyConfig } from "../config/studyConfig";
import type { StudyEvent } from "../types";

/**
 * Apps Script ne sait pas répondre à une requête préliminaire OPTIONS. Toutes
 * les requêtes doivent donc rester des « simple requests » au sens CORS :
 * GET sans en-tête personnalisé, POST en text/plain (le JSON voyage dans le
 * corps et est parsé côté serveur). La réponse arrive après une redirection
 * vers script.googleusercontent.com, qui porte Access-Control-Allow-Origin: *.
 */

export interface AssignResult {
  row_id?: number;
  resumed?: boolean;
  completed?: boolean;
  code?: string;
  test?: boolean;
  error?: "full" | "closed" | "busy" | string;
}

export interface CompleteResult {
  code?: string;
  error?: string;
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { redirect: "follow", ...init });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // Apps Script renvoie une page HTML d'erreur quand le déploiement est mal
    // configuré (accès restreint, script en erreur) : le dire clairement.
    throw new Error(`réponse non-JSON du serveur (${text.slice(0, 80)})`);
  }
}

function endpoint(params: Record<string, string>): string {
  const u = new URL(studyConfig.appsScriptUrl);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

function post<T>(body: unknown): Promise<T> {
  return call<T>(studyConfig.appsScriptUrl, {
    method: "POST",
    // text/plain : type « simple », donc pas de requête préliminaire.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });
}

export function assign(pid: string, sessionId: string, isTest: boolean): Promise<AssignResult> {
  return call<AssignResult>(
    endpoint({ action: "assign", pid, session_id: sessionId, test: isTest ? "1" : "0" }),
  );
}

export function sendEvents(
  meta: { pid: string; session_id: string; row_id: number | null; is_test: boolean },
  events: StudyEvent[],
): Promise<{ ok?: boolean; error?: string }> {
  return post({ action: "events", ...meta, events });
}

export function complete(meta: {
  pid: string;
  session_id: string;
  row_id: number | null;
  is_test: boolean;
}): Promise<CompleteResult> {
  return post<CompleteResult>({ action: "complete", ...meta });
}
