const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireWorkspaceRole } = require('../middleware/workspaceAuth');
const { fromBoard } = require('../middleware/resolveWorkspace');
const { createColumn } = require('../controllers/columnController');

// POST /api/boards/:id/columns
// Walks: board → project → workspace, then checks membership (any member can add columns)
router.post('/:id/columns', protect, fromBoard, requireWorkspaceRole('member'), createColumn);

module.exports = router;
