import app from "./app";
import { env } from "./config/env";
import { startSendingEngine } from "./workers";

app.listen(env.port, () => {
  console.log(`[backend] API listening on http://localhost:${env.port}`);
  startSendingEngine();
});