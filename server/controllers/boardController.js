const Board = require('../models/Board');
const Column = require('../models/Column');
const Task = require('../models/Task');

/**
 * GET /api/projects/:id/board
 *
 * Returns the board for a project with all columns (sorted by order),
 * each column carrying its tasks (sorted by order).
 *
 * One board query + one column query + one task query = 3 DB reads total,
 * regardless of how many columns/tasks exist (no N+1).
 *
 * req.project is attached by resolveWorkspace.fromProject.
 */
const getBoard = async (req, res, next) => {
  try {
    const board = await Board.findOne({ project: req.project._id }).lean();
    if (!board) return res.status(404).json({ message: 'Board not found for this project' });

    // All columns for this board, sorted by fractional order
    const columns = await Column.find({ board: board._id }).sort({ order: 1 }).lean();

    // All tasks across all columns in one query — no N+1
    const columnIds = columns.map((c) => c._id);
    const allTasks = await Task.find({ column: { $in: columnIds } })
      .sort({ order: 1 })
      .populate('assignees', 'name email avatar')
      .populate('comments.author', 'name email avatar')
      .lean();

    // Group tasks by their column id
    const tasksByColumn = allTasks.reduce((acc, task) => {
      const key = task.column.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});

    const columnsWithTasks = columns.map((col) => ({
      ...col,
      tasks: tasksByColumn[col._id.toString()] || [],
    }));

    res.json({ board: { ...board, columns: columnsWithTasks } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBoard };
