/**
 * writeTracker.js
 *
 * Per-request DB write counter using Node's AsyncLocalStorage.
 *
 * Why AsyncLocalStorage?
 *   Express is single-process but handles concurrent requests. A module-level
 *   counter would get confused across overlapping requests. ALS gives each
 *   request its own isolated store that propagates automatically through
 *   async/await chains — no passing req objects into utility functions.
 *
 * Usage:
 *   // In server.js:
 *   app.use((req, res, next) => writeTracker.run(() => next()));
 *
 *   // In any controller or utility (no req ref needed):
 *   writeTracker.increment('Task.findByIdAndUpdate - move');
 *   const count = writeTracker.getCount();
 *   const ops   = writeTracker.getOps();
 */

const { AsyncLocalStorage } = require('async_hooks');

const als = new AsyncLocalStorage();

/** Wrap a request's call chain in a fresh write-tracking context. */
const run = (fn) => als.run({ count: 0, ops: [] }, fn);

/**
 * Record one DB write in the current request's context.
 * @param {string} label - human-readable description (e.g. 'Task.findByIdAndUpdate - move')
 */
const increment = (label = 'write') => {
  const store = als.getStore();
  if (store) {
    store.count++;
    store.ops.push(label);
  }
};

/** Returns the number of tracked writes in the current request. */
const getCount = () => als.getStore()?.count ?? 0;

/** Returns the array of write labels in the current request. */
const getOps = () => als.getStore()?.ops ?? [];

module.exports = { run, increment, getCount, getOps };
