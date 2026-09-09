import { runEngineTick } from "../scheduler/engine";

/**
 * Phase 7 sending worker.
 *
 * Runs the sending engine on a fixed interval. The engine is idempotent and
 * guarded by a MySQL named lock so multiple API instances never process the
 * same jobs concurrently.
 */

export type WorkerStatus = "idle" | "running" | "stopped";

let status: WorkerStatus = "stopped";
let timer: NodeJS.Timeout | null = null;

const TICK_MS = 15_000;

export function workerStatus(): WorkerStatus {
  return status;
}

export function startSendingEngine(): void {
  if (timer) return;
  status = "running";
  void runEngineTick().catch((error) => {
    console.error("[sending] initial tick failed", error);
  });
  timer = setInterval(() => {
    void runEngineTick().catch((error) => {
      console.error("[sending] tick failed", error);
    });
  }, TICK_MS);
}

export function stopSendingEngine(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  status = "stopped";
}