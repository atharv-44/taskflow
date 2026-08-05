const Task = require('../models/Task');
const Column = require('../models/Column');
const { computeOrder, needsRebalance, rebalance } = require('../utils/fractionalOrder');
const writeTracker = require('../utils/writeTracker');

/**
 * POST /api/columns/:id/tasks
 *
 * Create a task appended to the end of the column.
 * order = lastTask.order + 1  (or 1 if column is empty)
 *
 * req.column attached by resolveWorkspace.fromColumn.
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, assignees, labels, dueDate } = req.body;
    if (!title) return res.status(400).json({ message: 'Task title is required' });

    const lastTask = await Task.findOne({ column: req.column._id })
      .sort({ order: -1 })
      .lean();

    const order = lastTask ? lastTask.order + 1 : 1;

    writeTracker.increment('Task.create');
    const task = await Task.create({
      column: req.column._id,
      title,
      description: description || '',
      assignees: assignees || [],
      labels: labels || [],
      dueDate: dueDate || null,
      order,
      activityLog: [{ action: 'created', user: req.user._id, timestamp: new Date() }],
    });

    res.status(201).json({
      task,
      _meta: { writesPerformed: writeTracker.getCount(), ops: writeTracker.getOps() },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/tasks/:id
 *
 * Update task fields (title, description, assignees, labels, dueDate).
 * Does NOT handle column/order changes — use PATCH /tasks/:id/move for that.
 *
 * req.task attached by resolveWorkspace.fromTask.
 */
const updateTask = async (req, res, next) => {
  try {
    const { title, description, assignees, labels, dueDate } = req.body;

    const setFields = {};
    if (title !== undefined) setFields.title = title;
    if (description !== undefined) setFields.description = description;
    if (assignees !== undefined) setFields.assignees = assignees;
    if (labels !== undefined) setFields.labels = labels;
    if (dueDate !== undefined) setFields.dueDate = dueDate;

    if (Object.keys(setFields).length === 0) {
      return res.status(400).json({ message: 'No updatable fields provided' });
    }

    const updatePayload = {
      $set: setFields,
      $push: { activityLog: { action: 'updated', user: req.user._id, timestamp: new Date() } },
    };

    writeTracker.increment('Task.findByIdAndUpdate - edit');
    const task = await Task.findByIdAndUpdate(req.task._id, updatePayload, { returnDocument: 'after' })
      .populate('assignees', 'name email avatar');

    res.json({
      task,
      _meta: { writesPerformed: writeTracker.getCount(), ops: writeTracker.getOps() },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/tasks/:id/move
 *
 * Move a task to a (possibly different) column and reposition it using
 * fractional ordering.
 *
 * Body:
 *   targetColumnId {string}       — destination column (_id)
 *   prevOrder      {Number|null}  — order of the task immediately before the slot
 *   nextOrder      {Number|null}  — order of the task immediately after the slot
 *
 * ════════════════════════════════════════════════════════════════
 *  CRITICAL INVARIANT — this must remain ONE document write:
 *
 *  The moved task's { column, order } are updated in a SINGLE
 *  findByIdAndUpdate call. Adjacent sibling tasks are NEVER touched
 *  unless needsRebalance() fires — which is the whole reason this
 *  algorithm exists.
 *
 *  The response includes _meta.writesPerformed so tests can assert
 *  this invariant holds.
 * ════════════════════════════════════════════════════════════════
 *
 * req.task + req.board attached by resolveWorkspace.fromTask.
 */
const moveTask = async (req, res, next) => {
  try {
    const { targetColumnId, prevOrder = null, nextOrder = null } = req.body;

    if (!targetColumnId) {
      return res.status(400).json({ message: 'targetColumnId is required' });
    }

    // Validate target column exists and belongs to the same board (prevents cross-board moves)
    const targetColumn = await Column.findById(targetColumnId).lean();
    if (!targetColumn) return res.status(404).json({ message: 'Target column not found' });

    if (targetColumn.board.toString() !== req.board._id.toString()) {
      return res.status(400).json({ message: 'Target column is not on the same board' });
    }

    const newOrder = computeOrder(prevOrder, nextOrder);

    // ── THE SINGLE WRITE ──────────────────────────────────────────────────────
    writeTracker.increment('Task.findByIdAndUpdate - move (single write)');
    const task = await Task.findByIdAndUpdate(
      req.task._id,
      {
        $set: { column: targetColumnId, order: newOrder },
        $push: { activityLog: { action: 'moved', user: req.user._id, timestamp: new Date() } },
      },
      { new: true }
    ).populate('assignees', 'name email avatar');
    // ─────────────────────────────────────────────────────────────────────────

    let rebalanced = false;
    if (needsRebalance(newOrder, prevOrder, nextOrder)) {
      await rebalance(Task, 'column', targetColumnId, (label) =>
        writeTracker.increment(label)
      );
      rebalanced = true;
    }

    // Return the target column's full sorted task list so callers can verify state
    const columnTasks = await Task.find({ column: targetColumnId })
      .sort({ order: 1 })
      .select('_id title order column')
      .lean();

    res.json({
      task,
      rebalanced,
      newOrder,
      columnTasks,
      _meta: {
        writesPerformed: writeTracker.getCount(),
        ops: writeTracker.getOps(),
        computedOrder: newOrder,
        prevOrder,
        nextOrder,
        expectedMidpoint:
          prevOrder != null && nextOrder != null ? (prevOrder + nextOrder) / 2 : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/tasks/:id
 *
 * req.task attached by resolveWorkspace.fromTask.
 */
const deleteTask = async (req, res, next) => {
  try {
    writeTracker.increment('Task.findByIdAndDelete');
    await Task.findByIdAndDelete(req.task._id);
    res.json({
      message: 'Task deleted successfully',
      _meta: { writesPerformed: writeTracker.getCount(), ops: writeTracker.getOps() },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/tasks/:id/comments
 *
 * Body: { text }
 * req.task attached by resolveWorkspace.fromTask.
 */
const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Comment text is required' });

    writeTracker.increment('Task.findByIdAndUpdate - add comment');
    const task = await Task.findByIdAndUpdate(
      req.task._id,
      {
        $push: {
          comments: { author: req.user._id, text },
          activityLog: { action: 'commented', user: req.user._id, timestamp: new Date() },
        },
      },
      { new: true }
    ).populate('comments.author', 'name email avatar');

    res.status(201).json({
      task,
      _meta: { writesPerformed: writeTracker.getCount(), ops: writeTracker.getOps() },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createTask, updateTask, moveTask, deleteTask, addComment };
