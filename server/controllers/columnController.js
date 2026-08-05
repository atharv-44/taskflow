const Column = require('../models/Column');
const { computeOrder, needsRebalance, rebalance } = require('../utils/fractionalOrder');
const writeTracker = require('../utils/writeTracker');

/**
 * POST /api/boards/:id/columns
 *
 * Create a column appended to the end of the board.
 * order = lastColumn.order + 1  (or 1 if the board has no columns yet)
 *
 * req.board is attached by resolveWorkspace.fromBoard.
 */
const createColumn = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Column name is required' });

    // Find the highest existing order to append at the end
    const lastCol = await Column.findOne({ board: req.board._id })
      .sort({ order: -1 })
      .lean();

    const order = lastCol ? lastCol.order + 1 : 1;

    writeTracker.increment('Column.create');
    const column = await Column.create({ board: req.board._id, name, order });

    res.status(201).json({
      column,
      _meta: { writesPerformed: writeTracker.getCount(), ops: writeTracker.getOps() },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/columns/:id/reorder
 *
 * Reorder a column on the board using fractional ordering.
 *
 * Body:
 *   prevOrder {Number|null}  — order of the column immediately before the target slot
 *   nextOrder {Number|null}  — order of the column immediately after the target slot
 *
 * Normal case: ONE document write (findByIdAndUpdate on this column only).
 * Rebalance:   fires if the new order converges within REBALANCE_THRESHOLD
 *              of a neighbor — executes one bulkWrite on all board columns.
 *
 * req.column + req.board attached by resolveWorkspace.fromColumn.
 */
const reorderColumn = async (req, res, next) => {
  try {
    const { prevOrder = null, nextOrder = null } = req.body;

    const newOrder = computeOrder(prevOrder, nextOrder);

    // ── Single document write ──────────────────────────────────
    writeTracker.increment('Column.findByIdAndUpdate - reorder');
    const column = await Column.findByIdAndUpdate(
      req.column._id,
      { order: newOrder },
      { returnDocument: 'after' }
    );
    // ──────────────────────────────────────────────────────────

    let rebalanced = false;
    if (needsRebalance(newOrder, prevOrder, nextOrder)) {
      await rebalance(Column, 'board', req.column.board, (label) =>
        writeTracker.increment(label)
      );
      rebalanced = true;
    }

    res.json({
      column,
      rebalanced,
      _meta: {
        writesPerformed: writeTracker.getCount(),
        ops: writeTracker.getOps(),
        computedOrder: newOrder,
        prevOrder,
        nextOrder,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createColumn, reorderColumn };
