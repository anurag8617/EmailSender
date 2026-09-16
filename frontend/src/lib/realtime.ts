import { API_URL } from "./api";

export type JobStatus = "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED" | "SKIPPED";

export type RealtimeEventMap = {
  connected: { type: "connected"; userId: number };
  job: {
    type: "job";
    campaignId: number;
    jobId: number;
    status: JobStatus;
    accountId: number | null;
    leadId: number;
    leadEmail: string;
    sentAt?: string;
    error?: string;
  };
  campaign: { type: "campaign"; id: number; status: string };
  "campaign-removed": { type: "campaign-removed"; id: number };
  account: { type: "account"; id: number; status: string };
  "account-removed": { type: "account-removed"; id: number };
};

export type RealtimeEvent = RealtimeEventMap[keyof RealtimeEventMap];

type Listener = (event: RealtimeEvent) => void;

let source: EventSource | null = null;
const listeners = new Set<Listener>();

function emit(event: RealtimeEvent): void {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Ignore listener errors so one bad handler never breaks the stream.
    }
  }
}

function open(): void {
  if (source) return;
  source = new EventSource(`${API_URL}/api/events`, { withCredentials: true });
  source.addEventListener("message", (event) => {
    try {
      const parsed = JSON.parse(event.data) as RealtimeEvent;
      if (parsed && typeof parsed.type === "string") emit(parsed);
    } catch {
      // Ignore malformed payloads.
    }
  });
}

function close(): void {
  if (source) {
    source.close();
    source = null;
  }
}

export function subscribeRealtime(listener: Listener): () => void {
  listeners.add(listener);
  open();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) close();
  };
}