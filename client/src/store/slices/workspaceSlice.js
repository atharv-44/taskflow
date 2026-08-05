import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchWorkspaces = createAsyncThunk('workspace/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/workspaces');
    return response.data.workspaces;
  } catch (err) {
    return rejectWithValue(err.response.data);
  }
});

export const createWorkspace = createAsyncThunk('workspace/create', async (data, { rejectWithValue }) => {
  try {
    const response = await api.post('/workspaces', data);
    return response.data.workspace;
  } catch (err) {
    return rejectWithValue(err.response.data);
  }
});

export const fetchProjects = createAsyncThunk('workspace/fetchProjects', async (workspaceId, { rejectWithValue }) => {
  try {
    const response = await api.get(`/workspaces/${workspaceId}/projects`);
    return { workspaceId, projects: response.data.projects };
  } catch (err) {
    return rejectWithValue(err.response.data);
  }
});

export const createProject = createAsyncThunk('workspace/createProject', async ({ workspaceId, name, description }, { rejectWithValue }) => {
  try {
    const response = await api.post(`/workspaces/${workspaceId}/projects`, { name, description });
    return { workspaceId, project: response.data.project };
  } catch (err) {
    return rejectWithValue(err.response.data);
  }
});

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState: {
    workspaces: [],
    projectsByWorkspace: {},
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkspaces.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.workspaces = action.payload;
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message;
      })
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.workspaces.unshift(action.payload);
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.projectsByWorkspace[action.payload.workspaceId] = action.payload.projects;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        if (!state.projectsByWorkspace[action.payload.workspaceId]) {
          state.projectsByWorkspace[action.payload.workspaceId] = [];
        }
        state.projectsByWorkspace[action.payload.workspaceId].unshift(action.payload.project);
      });
  },
});

export default workspaceSlice.reducer;
