const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireWorkspaceRole } = require('../middleware/workspaceAuth');
const { fromColumn } = require('../middleware/resolveWorkspace');
const { reorderColumn } = require('../controllers/columnController');
const { createTask } = require('../controllers/taskController');

// PATCH /api/columns/:id/reorder
// Single document write in normal case; rebalance fires only if threshold crossed
router.patch('/:id/reorder', protect, fromColumn, requireWorkspaceRole('member'), reorderColumn);

// POST /api/columns/:id/tasks
router.post('/:id/tasks', protect, fromColumn, requireWorkspaceRole('member'), createTask);

module.exports = router;
