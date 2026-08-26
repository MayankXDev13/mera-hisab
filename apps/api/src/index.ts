import "dotenv/config";
import { createApp } from "./app.js";
import { logger } from "./lib/logger.js";

const port = Number(process.env.PORT ?? 3001);
const app = createApp();

app.listen(port, () => {
  logger.info(`api listening on http://localhost:${port}`);
});
