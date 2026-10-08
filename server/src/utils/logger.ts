const time = () => new Date().toISOString().slice(11, 19);

export const logger = {
  info: (...args: unknown[]) => console.log(`[${time()}]`, ...args),
  warn: (...args: unknown[]) => console.warn(`[${time()}] WARN`, ...args),
  error: (...args: unknown[]) => console.error(`[${time()}] ERROR`, ...args),
};
