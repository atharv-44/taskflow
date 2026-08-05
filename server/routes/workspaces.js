const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { requireWorkspaceRole } = require('../middleware/workspaceAuth');
const {
  getMyWorkspaces,
  createWorkspace,
  getWorkspace,
  inviteMember,
  createProject,
  getProjects,
} = require('../controllers/workspaceController');

// GET /api/workspaces — list all workspaces the current user belongs to
router.get('/', protect, getMyWorkspaces);

// POST /api/workspaces — create a workspace (any authenticated user)
router.post('/', protect, createWorkspace);

// GET /api/workspaces/:id — get workspace (any member)
router.get('/:id', protect, requireWorkspaceRole('member'), getWorkspace);

// POST /api/workspaces/:id/invite — invite by email (admin only)
router.post('/:id/invite', protect, requireWorkspaceRole('admin'), inviteMember);

// POST /api/workspaces/:id/projects — create project (admin only)
router.post('/:id/projects', protect, requireWorkspaceRole('admin'), createProject);

// GET /api/workspaces/:id/projects — list projects (any member)
router.get('/:id/projects', protect, requireWorkspaceRole('member'), getProjects);

module.exports = router;
