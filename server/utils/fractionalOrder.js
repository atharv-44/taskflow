/**
 * fractionalOrder.js
 *
 * The core ordering primitive for TaskFlow's drag-and-drop.
 *
 * Design goal: a card reorder == ONE document write, not O(n) reindex.
 *
 * How it works:
 *   - Each item carries a float `order` field.
 *   - When placed between two items, the new order is the arithmetic midpoint.
 *   - Precision degrades after many halvings: once two neighbors are within
 *     REBALANCE_THRESHOLD of each other, a one-time integer rebalance fires.
 *
 * Interview note:
 *   This is equivalent to the LSEQ / fractional indexing approach used by
 *   linear.app, Figma (for z-index), and Notion. The rebalance is the only
 *   O(n) operation and is rare in practice.
 */

const REBALANCE_THRESHOLD = 0.0001;

/**
 * computeOrder(prevOrder, nextOrder) → Number
 *
 * Returns the order value for an item inserted between two neighbors.
 *
 *   placed at start (no prev) : nextOrder / 2
 *   placed at end   (no next) : prevOrder + 1
 *   placed in middle          : (prevOrder + nextOrder) / 2
 *
 * Both args may be null/undefined.
 */
function computeOrder(prevOrder, nextOrder) {
  const prev = prevOrder == null ? undefined : prevOrder;
  const next = nextOrder == null ? undefined : nextOrder;

  if (prev === undefined && next === undefined) return 1;
  if (prev === undefined) return next / 2;
  if (next === undefined) return prev + 1;
  return (prev + next) / 2;
}

/**
 * needsRebalance(newOrder, prevOrder, nextOrder) → Boolean
 *
 * Returns true when the newly placed item is within REBALANCE_THRESHOLD
 * of either neighbor — the signal that floating-point precision is running out.
 */
function needsRebalance(newOrder, prevOrder, nextOrder) {
  if (prevOrder != null && Math.abs(newOrder - prevOrder) < REBALANCE_THRESHOLD) return true;
  if (nextOrder != null && Math.abs(newOrder - nextOrder) < REBALANCE_THRESHOLD) return true;
  return false;
}

/**
 * rebalance(Model, parentField, parentId, onWrite?) → Number
 *
 * Fetches all siblings (sorted by current order), reassigns them integer
 * orders 1, 2, 3, … via a single bulkWrite call, and returns the count.
 *
 * This is the ONLY O(n) write path. Everything else is one document.
 *
 * @param {Model}    Model       - Mongoose model (Task | Column)
 * @param {string}   parentField - field name linking to parent ('column' | 'board')
 * @param {ObjectId} parentId    - parent's _id
 * @param {Function} onWrite     - optional callback invoked after bulkWrite (for tracking)
 */
async function rebalance(Model, parentField, parentId, onWrite) {
  const items = await Model.find({ [parentField]: parentId }).sort({ order: 1 }).lean();
  if (items.length === 0) return 0;

  const bulkOps = items.map((item, i) => ({
    updateOne: {
      filter: { _id: item._id },
      update: { $set: { order: i + 1 } },
    },
  }));

  await Model.bulkWrite(bulkOps);

  // One logical write (one bulkWrite call) — not items.length writes
  if (onWrite) onWrite(`rebalance·bulkWrite(${items.length} items → integers 1…${items.length})`);

  return items.length;
}

module.exports = { computeOrder, needsRebalance, rebalance, REBALANCE_THRESHOLD };
