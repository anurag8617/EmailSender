import { Response } from "express";

interface Subscriber {
  res: Response;
  heartbeat: NodeJS.Timeout;
}

const HEARTBEAT_MS = 25_000;

const subscribersByUser = new Map<number, Set<Subscriber>>();

function writeEvent(res: Response, event: Record<string, unknown>): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function subscribe(userId: number, res: Response): void {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  writeEvent(res, { type: "connected", userId });

  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, HEARTBEAT_MS);

  let set = subscribersByUser.get(userId);
  if (!set) {
    set = new Set();
    subscribersByUser.set(userId, set);
  }
  const subscriber: Subscriber = { res, heartbeat };
  set.add(subscriber);

  const cleanup = (): void => {
    clearInterval(heartbeat);
    const setForUser = subscribersByUser.get(userId);
    if (setForUser) {
      setForUser.delete(subscriber);
      if (setForUser.size === 0) subscribersByUser.delete(userId);
    }
  };
  res.on("close", cleanup);
  res.on("error", cleanup);
}

export function broadcast(userId: number, event: Record<string, unknown>): void {
  const set = subscribersByUser.get(userId);
  if (!set || set.size === 0) return;
  for (const subscriber of set) {
    try {
      writeEvent(subscriber.res, event);
    } catch {
      // Ignore connections that can no longer be written to.
    }
  }
}