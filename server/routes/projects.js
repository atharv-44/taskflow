const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireWorkspaceRole } = require('../middleware/workspaceAuth');
const { fromProject } = require('../middleware/resolveWorkspace');
const { getBoard } = require('../controllers/boardController');

// GET /api/projects/:id/board
// Walks: project → workspace, then checks membership
router.get('/:id/board', protect, fromProject, requireWorkspaceRole('member'), getBoard);

module.exports = router;
