const Workspace = require('../models/Workspace');

/**
 * requireWorkspaceRole(requiredRole)
 *
 * Factory middleware that verifies the authenticated user's role in a workspace
 * via a LIVE database lookup. Role is never trusted from the JWT payload.
 *
 * Two operating modes:
 *  1. Workspace routes  — req.params.id is the workspaceId; we fetch it.
 *  2. Nested resources  — a resolveWorkspace.* middleware already attached
 *     req.workspace; we reuse it to skip a redundant DB round-trip while
 *     still performing the live membership check on fresh data.
 *
 * On success: sets req.workspaceRole and calls next().
 */
const requireWorkspaceRole = (requiredRole) => async (req, res, next) => {
  try {
    // Prefer a workspace already resolved by fromProject/fromBoard/fromColumn/fromTask
    let workspace = req.workspace;

    if (!workspace) {
      const workspaceId = req.params.id || req.params.workspaceId;
      workspace = await Workspace.findById(workspaceId);
      if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
      req.workspace = workspace;
    }

    const memberEntry = workspace.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!memberEntry) {
      return res.status(403).json({ message: 'You are not a member of this workspace' });
    }

    // Role hierarchy: admin (2) satisfies any member (1) requirement
    const roleHierarchy = { member: 1, admin: 2 };
    if (roleHierarchy[memberEntry.role] < roleHierarchy[requiredRole]) {
      return res.status(403).json({
        message: `This action requires the '${requiredRole}' role`,
      });
    }

    req.workspaceRole = memberEntry.role;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireWorkspaceRole };
