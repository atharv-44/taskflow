const Task = require('../models/Task');
const Column = require('../models/Column');
const Board = require('../models/Board');
const Project = require('../models/Project');
const Workspace = require('../models/Workspace');

/**
 * resolveWorkspace — nested resource authorization helpers.
 *
 * Every mutation on a task/column/board must verify workspace membership,
 * but these resources only carry a reference to their immediate parent.
 * These middlewares walk the chain upward and attach the full hierarchy
 * to req so that requireWorkspaceRole can do its live membership check.
 *
 * Chain for tasks:
 *   task → column → board → project → workspace
 *
 * Attached to req:
 *   req.task, req.column, req.board, req.project, req.workspace
 *   (only the levels that exist for the given entry point)
 */

const fromProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const workspace = await Workspace.findById(project.workspace);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    req.project = project;
    req.workspace = workspace;
    next();
  } catch (err) {
    next(err);
  }
};

const fromBoard = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    const project = await Project.findById(board.project).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const workspace = await Workspace.findById(project.workspace);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    req.board = board;
    req.project = project;
    req.workspace = workspace;
    next();
  } catch (err) {
    next(err);
  }
};

const fromColumn = async (req, res, next) => {
  try {
    const column = await Column.findById(req.params.id);
    if (!column) return res.status(404).json({ message: 'Column not found' });

    const board = await Board.findById(column.board);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    const project = await Project.findById(board.project).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const workspace = await Workspace.findById(project.workspace);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    req.column = column;
    req.board = board;
    req.project = project;
    req.workspace = workspace;
    next();
  } catch (err) {
    next(err);
  }
};

const fromTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const column = await Column.findById(task.column);
    if (!column) return res.status(404).json({ message: 'Column not found' });

    const board = await Board.findById(column.board);
    if (!board) return res.status(404).json({ message: 'Board not found' });

    const project = await Project.findById(board.project).lean();
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const workspace = await Workspace.findById(project.workspace);
    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    req.task = task;
    req.column = column;
    req.board = board;
    req.project = project;
    req.workspace = workspace;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { fromProject, fromBoard, fromColumn, fromTask };
