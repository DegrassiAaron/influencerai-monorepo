// Default e2e environment knobs
// - Disable BullMQ queues unless a test explicitly enables them
// - Ensure consistent NODE_ENV
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
if (!process.env.DISABLE_BULL) {
  process.env.DISABLE_BULL = '1';
}

// Jest sometimes hangs due to unref'ed timers; ensure long timers don't block exit
const _setTimeout = global.setTimeout as unknown as (...args: any[]) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).setTimeout = (handler: any, timeout?: number, ...args: any[]) => {
  const t = _setTimeout(handler, timeout as any, ...args);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((t as any)?.unref) {
    // Avoid keeping event loop alive
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t as any).unref();
  }
  return t;
};

