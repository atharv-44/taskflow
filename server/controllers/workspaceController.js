const Workspace = require('../models/Workspace');
const Project = require('../models/Project');
const Board = require('../models/Board');
const User = require('../models/User');

/**
 * GET /api/workspaces
 * Returns all workspaces the authenticated user is a member of.
 */
const getMyWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await Workspace.find({ 'members.user': req.user._id })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ createdAt: -1 });
    res.json({ workspaces });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/workspaces
 * Create a workspace. Creator is automatically added as admin.
 */
const createWorkspace = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Workspace name is required' });

    const workspace = await Workspace.create({
      name,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }],
    });

    res.status(201).json({ workspace });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/workspaces/:id
 * Get workspace details. Caller must be a member (checked by requireWorkspaceRole).
 */
const getWorkspace = async (req, res, next) => {
  try {
    // req.workspace is already populated by requireWorkspaceRole middleware
    const workspace = await Workspace.findById(req.workspace._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.json({ workspace });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/workspaces/:id/invite
 * Add a member by email. Admin only.
 * Body: { email, role? }  — role defaults to 'member'
 */
const inviteMember = async (req, res, next) => {
  try {
    const { email, role = 'member' } = req.body;

    if (!email) return res.status(400).json({ message: 'email is required' });
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ message: "role must be 'admin' or 'member'" });
    }

    const invitee = await User.findOne({ email });
    if (!invitee) {
      return res.status(404).json({ message: `No user found with email: ${email}` });
    }

    const workspace = req.workspace; // attached by requireWorkspaceRole

    // Prevent duplicate membership
    const alreadyMember = workspace.members.some(
      (m) => m.user.toString() === invitee._id.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({ message: 'User is already a member of this workspace' });
    }

    workspace.members.push({ user: invitee._id, role });
    await workspace.save();

    const updated = await Workspace.findById(workspace._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.json({ message: 'Member invited successfully', workspace: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/workspaces/:id/projects
 * Create a project inside a workspace. Admin only.
 * Also creates the 1:1 Board immediately.
 */
const createProject = async (req, res, next) => {
  try {
    const { name, description = '' } = req.body;
    if (!name) return res.status(400).json({ message: 'Project name is required' });

    const project = await Project.create({
      name,
      description,
      workspace: req.workspace._id,
      members: [req.user._id], // creator is automatically a member
    });

    // Create the 1:1 board immediately so the board always exists
    const board = await Board.create({
      name: `${name} Board`,
      project: project._id,
    });

    res.status(201).json({ project, board });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/workspaces/:id/projects
 * List all projects in a workspace. Any member can view.
 */
const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ workspace: req.workspace._id })
      .populate('members', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ projects });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyWorkspaces, createWorkspace, getWorkspace, inviteMember, createProject, getProjects };

