/**
 * utils/logger.js
 * Lightweight structured logger.
 * In production, swap the console calls for winston / pino as needed.
 */

const isDev = process.env.NODE_ENV !== "production";

const timestamp = () => new Date().toISOString();

const logger = {
  info: (msg, meta = {}) => {
    console.log(JSON.stringify({ level: "info", time: timestamp(), msg, ...meta }));
  },

  warn: (msg, meta = {}) => {
    console.warn(JSON.stringify({ level: "warn", time: timestamp(), msg, ...meta }));
  },

  error: (msg, meta = {}) => {
    console.error(JSON.stringify({ level: "error", time: timestamp(), msg, ...meta }));
  },

  // Only logged in development
  debug: (msg, meta = {}) => {
    if (isDev) {
      console.debug(JSON.stringify({ level: "debug", time: timestamp(), msg, ...meta }));
    }
  },
};

module.exports = logger;
