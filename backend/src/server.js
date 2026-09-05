import app from './app.js';
import { env } from './config/env.js';
import { logger } from './shared/logger.js';
import { killExistingServer } from '../scripts/kill-port.js';

// Free port from any previously running server before binding
killExistingServer(env.PORT);

const server = app.listen(env.PORT, () => {
  logger.info(`pay365-api listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.warn(`Port ${env.PORT} is in use. Killing existing process and restarting...`);
    killExistingServer(env.PORT);
    setTimeout(() => {
      server.close();
      app.listen(env.PORT, () => {
        logger.info(`pay365-api listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
      });
    }, 500);
  } else {
    logger.error('Server startup error:', err);
  }
});
