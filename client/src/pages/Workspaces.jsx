import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchWorkspaces, createWorkspace, fetchProjects, createProject } from '../store/slices/workspaceSlice';

export default function Workspaces() {
  const dispatch = useDispatch();
  const { workspaces, projectsByWorkspace, status } = useSelector((state) => state.workspace);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newProjectNames, setNewProjectNames] = useState({});

  useEffect(() => {
    dispatch(fetchWorkspaces());
  }, [dispatch]);

  useEffect(() => {
    if (workspaces.length > 0) {
      workspaces.forEach((ws) => {
        if (!projectsByWorkspace[ws._id]) {
          dispatch(fetchProjects(ws._id));
        }
      });
    }
  }, [workspaces, dispatch]);

  const handleCreateWorkspace = (e) => {
    e.preventDefault();
    if (newWorkspaceName.trim()) {
      dispatch(createWorkspace({ name: newWorkspaceName }));
      setNewWorkspaceName('');
    }
  };

  const handleCreateProject = (e, workspaceId) => {
    e.preventDefault();
    const name = newProjectNames[workspaceId];
    if (name?.trim()) {
      dispatch(createProject({ workspaceId, name, description: '' }));
      setNewProjectNames({ ...newProjectNames, [workspaceId]: '' });
    }
  };

  if (status === 'loading') return <div className="p-4">Loading workspaces...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Your Workspaces</h2>
        <form onSubmit={handleCreateWorkspace} className="flex gap-2">
          <input
            type="text"
            placeholder="New Workspace Name"
            className="border p-2 rounded"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            required
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create</button>
        </form>
      </div>

      <div className="space-y-8">
        {workspaces.map((ws) => (
          <div key={ws._id} className="bg-white p-6 rounded shadow">
            <h3 className="text-xl font-bold mb-4">{ws.name}</h3>
            
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">Projects</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {(projectsByWorkspace[ws._id] || []).map((project) => (
                  <Link 
                    key={project._id} 
                    to={`/projects/${project._id}/board`}
                    className="block p-4 border rounded hover:shadow-md transition bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="font-medium text-blue-600">{project.name}</div>
                    <div className="text-sm text-gray-500 mt-1">Go to Board →</div>
                  </Link>
                ))}
              </div>
            </div>

            <form onSubmit={(e) => handleCreateProject(e, ws._id)} className="flex gap-2 mt-4">
              <input
                type="text"
                placeholder="New Project Name"
                className="border p-2 rounded text-sm w-64"
                value={newProjectNames[ws._id] || ''}
                onChange={(e) => setNewProjectNames({ ...newProjectNames, [ws._id]: e.target.value })}
                required
              />
              <button type="submit" className="bg-gray-200 text-gray-800 px-3 py-2 rounded text-sm hover:bg-gray-300">Add Project</button>
            </form>
          </div>
        ))}
        {workspaces.length === 0 && <p className="text-gray-500">You don't belong to any workspaces yet.</p>}
      </div>
    </div>
  );
}
