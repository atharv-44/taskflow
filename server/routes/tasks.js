const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireWorkspaceRole } = require('../middleware/workspaceAuth');
const { fromTask } = require('../middleware/resolveWorkspace');
const { updateTask, moveTask, deleteTask, addComment } = require('../controllers/taskController');

// PATCH /api/tasks/:id — edit fields (title, description, assignees, labels, dueDate)
router.patch('/:id', protect, fromTask, requireWorkspaceRole('member'), updateTask);

// PATCH /api/tasks/:id/move — fractional reorder + optional column change
// NOTE: '/:id/move' is registered BEFORE '/:id' to ensure Express matches the
// more-specific route first. Express params don't span slashes, so they
// won't conflict — but explicit ordering is clearer intent.
router.patch('/:id/move', protect, fromTask, requireWorkspaceRole('member'), moveTask);

// DELETE /api/tasks/:id
router.delete('/:id', protect, fromTask, requireWorkspaceRole('member'), deleteTask);

// POST /api/tasks/:id/comments
router.post('/:id/comments', protect, fromTask, requireWorkspaceRole('member'), addComment);

module.exports = router;
