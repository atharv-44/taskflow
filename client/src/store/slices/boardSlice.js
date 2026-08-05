import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const fetchBoard = createAsyncThunk('board/fetchBoard', async (projectId, { rejectWithValue }) => {
  try {
    const response = await api.get(`/projects/${projectId}/board`);
    return response.data.board;
  } catch (err) {
    return rejectWithValue(err.response.data);
  }
});

export const createColumn = createAsyncThunk('board/createColumn', async ({ boardId, name }, { rejectWithValue }) => {
  try {
    const response = await api.post(`/boards/${boardId}/columns`, { name });
    return response.data.column;
  } catch (err) {
    return rejectWithValue(err.response.data);
  }
});

export const createTask = createAsyncThunk('board/createTask', async ({ columnId, taskData }, { rejectWithValue }) => {
  try {
    const response = await api.post(`/columns/${columnId}/tasks`, taskData);
    return response.data.task;
  } catch (err) {
    return rejectWithValue(err.response.data);
  }
});

export const updateTask = createAsyncThunk('board/updateTask', async ({ taskId, taskData }, { rejectWithValue }) => {
  try {
    const response = await api.patch(`/tasks/${taskId}`, taskData);
    return response.data.task;
  } catch (err) {
    return rejectWithValue(err.response.data);
  }
});

export const addComment = createAsyncThunk('board/addComment', async ({ taskId, text }, { rejectWithValue }) => {
  try {
    const response = await api.post(`/tasks/${taskId}/comments`, { text });
    return response.data.task;
  } catch (err) {
    return rejectWithValue(err.response.data);
  }
});

export const moveTask = createAsyncThunk('board/moveTask', async ({ taskId, targetColumnId, prevOrder, nextOrder }, { rejectWithValue }) => {
  try {
    const response = await api.patch(`/tasks/${taskId}/move`, { targetColumnId, prevOrder, nextOrder });
    return response.data; // contains task, rebalanced, columnTasks
  } catch (err) {
    return rejectWithValue(err.response.data);
  }
});

export const reorderColumn = createAsyncThunk('board/reorderColumn', async ({ columnId, prevOrder, nextOrder }, { rejectWithValue }) => {
  try {
    const response = await api.patch(`/columns/${columnId}/reorder`, { prevOrder, nextOrder });
    return response.data;
  } catch (err) {
    return rejectWithValue(err.response.data);
  }
});

const boardSlice = createSlice({
  name: 'board',
  initialState: {
    data: null, // The board object including columns and tasks
    status: 'idle',
    error: null,
  },
  reducers: {
    // Optimistic UI updates
    optimisticMoveTask: (state, action) => {
      const { sourceColId, destColId, sourceIndex, destIndex, newOrder } = action.payload;
      
      const sourceCol = state.data.columns.find(c => c._id === sourceColId);
      const destCol = state.data.columns.find(c => c._id === destColId);
      
      if (!sourceCol || !destCol) return;

      const [movedTask] = sourceCol.tasks.splice(sourceIndex, 1);
      movedTask.order = newOrder;
      movedTask.column = destColId;
      
      destCol.tasks.splice(destIndex, 0, movedTask);
      
      // Ensure tasks are sorted just in case
      destCol.tasks.sort((a, b) => a.order - b.order);
    },
    optimisticReorderColumn: (state, action) => {
      const { sourceIndex, destIndex, newOrder } = action.payload;
      const [movedCol] = state.data.columns.splice(sourceIndex, 1);
      movedCol.order = newOrder;
      state.data.columns.splice(destIndex, 0, movedCol);
      state.data.columns.sort((a, b) => a.order - b.order);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBoard.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchBoard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
        // Ensure everything is sorted initially
        state.data.columns.sort((a, b) => a.order - b.order);
        state.data.columns.forEach(col => {
          col.tasks = col.tasks || [];
          col.tasks.sort((a, b) => a.order - b.order);
        });
      })
      .addCase(fetchBoard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message;
      })
      .addCase(createColumn.fulfilled, (state, action) => {
        if (state.data) {
          action.payload.tasks = [];
          state.data.columns.push(action.payload);
          state.data.columns.sort((a, b) => a.order - b.order);
        }
      })
      .addCase(createTask.fulfilled, (state, action) => {
        if (state.data) {
          const col = state.data.columns.find(c => c._id === action.payload.column);
          if (col) {
            col.tasks.push(action.payload);
            col.tasks.sort((a, b) => a.order - b.order);
          }
        }
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        if (state.data) {
          const col = state.data.columns.find(c => c._id === action.payload.column);
          if (col) {
            const taskIndex = col.tasks.findIndex(t => t._id === action.payload._id);
            if (taskIndex !== -1) {
              col.tasks[taskIndex] = action.payload;
            }
          }
        }
      })
      .addCase(addComment.fulfilled, (state, action) => {
        if (state.data) {
          const col = state.data.columns.find(c => c._id === action.payload.column);
          if (col) {
            const taskIndex = col.tasks.findIndex(t => t._id === action.payload._id);
            if (taskIndex !== -1) {
              col.tasks[taskIndex] = action.payload;
            }
          }
        }
      })
      .addCase(moveTask.fulfilled, (state, action) => {
        // If rebalanced, we might need to fully refresh the column state
        if (action.payload.rebalanced) {
          const targetColId = action.payload.task.column;
          const col = state.data.columns.find(c => c._id === targetColId);
          if (col) {
            col.tasks = action.payload.columnTasks; // Trust the server's sorted integer list
          }
        }
        // Otherwise, the optimistic update already handled it!
      });
  },
});

export const { optimisticMoveTask, optimisticReorderColumn } = boardSlice.actions;
export default boardSlice.reducer;
