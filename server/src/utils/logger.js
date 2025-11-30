import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, '..', '..', 'logs');

// Ensure logs directory exists (best-effort, ignore errors)
try {
  // eslint-disable-next-line n/no-sync
  await import('fs').then(fsMod => {
    const fs = fsMod.default || fsMod;
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  });
} catch {
  // ignore
}

/**
 * Shared Winston logger instance.
 *
 * @type {winston.Logger}
 */
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'unlinker-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
          const base = `${timestamp} [${level}]: ${message}`;
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          const stackStr = stack ? `\n${stack}` : '';
          return base + metaStr + stackStr;
        })
      )
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log')
    })
  ]
});


