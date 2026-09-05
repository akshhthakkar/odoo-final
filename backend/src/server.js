import app from './app.js';
import { env } from './config/env.js';
import { logger } from './shared/logger.js';

app.listen(env.PORT, () => {
  logger.info(`pay365-api listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});
