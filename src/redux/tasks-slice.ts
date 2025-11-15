import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Task } from '@services/google-tasks-facade';
import type { GoogleTasksFacade } from '@services/google-tasks-facade';

/**
 * Tasks state interface.
 */
export interface TasksState {
	/** All tasks indexed by ID */
	tasks: Record<string, Task>;
	/** Task IDs for the current date range */
	taskIds: string[];
	/** Loading state */
	loading: boolean;
	/** Error message if any */
	error: string | null;
	/** Last fetch timestamp */
	lastFetch: number | null;
	/** Current date range */
	dateRange: {
		start: string;
		end: string;
	} | null;
}

/**
 * Initial state.
 */
const initialState: TasksState = {
	tasks: {},
	taskIds: [],
	loading: false,
	error: null,
	lastFetch: null,
	dateRange: null,
};

/**
 * Async thunk to fetch tasks.
 */
export const fetchTasks = createAsyncThunk<
	Task[],
	{ startDate: string; endDate: string; facade: GoogleTasksFacade },
	{ rejectValue: string }
>(
	'tasks/fetchTasks',
	async ({ startDate, endDate, facade }, thunkAPI) => {
		try {
			const tasks = await facade.fetchTasks({ startDate, endDate });
			return tasks;
		} catch (error) {
			return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch tasks');
		}
	}
);

/**
 * Async thunk to create a task.
 */
export const createTask = createAsyncThunk<
	Task,
	{ task: Partial<Task>; facade: GoogleTasksFacade },
	{ rejectValue: string }
>(
	'tasks/createTask',
	async ({ task, facade }, thunkAPI) => {
		try {
			const createdTask = await facade.createTask(task);
			return createdTask;
		} catch (error) {
			return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Failed to create task');
		}
	}
);

/**
 * Async thunk to update a task.
 */
export const updateTask = createAsyncThunk<
	Task,
	{ taskId: string; updates: Partial<Task>; facade: GoogleTasksFacade },
	{ rejectValue: string }
>(
	'tasks/updateTask',
	async ({ taskId, updates, facade }, thunkAPI) => {
		try {
			const updatedTask = await facade.updateTask(taskId, updates);
			return updatedTask;
		} catch (error) {
			return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Failed to update task');
		}
	}
);

/**
 * Async thunk to delete a task.
 */
export const deleteTask = createAsyncThunk<
	string,
	{ taskId: string; facade: GoogleTasksFacade },
	{ rejectValue: string }
>(
	'tasks/deleteTask',
	async ({ taskId, facade }, thunkAPI) => {
		try {
			await facade.deleteTask(taskId);
			return taskId;
		} catch (error) {
			return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Failed to delete task');
		}
	}
);

/**
 * Async thunk to complete a task.
 */
export const completeTask = createAsyncThunk<
	Task,
	{ taskId: string; facade: GoogleTasksFacade },
	{ rejectValue: string }
>(
	'tasks/completeTask',
	async ({ taskId, facade }, thunkAPI) => {
		try {
			const completedTask = await facade.completeTask(taskId);
			return completedTask;
		} catch (error) {
			return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Failed to complete task');
		}
	}
);

/**
 * Tasks slice.
 */
const tasksSlice = createSlice({
	name: 'tasks',
	initialState,
	reducers: {
		/**
		 * Clear all tasks.
		 */
		clearTasks: (state) => {
			state.tasks = {};
			state.taskIds = [];
			state.error = null;
		},
		/**
		 * Clear error.
		 */
		clearError: (state) => {
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		// Fetch tasks
		builder.addCase(fetchTasks.pending, (state) => {
			state.loading = true;
			state.error = null;
		});
		builder.addCase(fetchTasks.fulfilled, (state, action) => {
			state.loading = false;
			state.lastFetch = Date.now();
			state.dateRange = {
				start: action.meta.arg.startDate,
				end: action.meta.arg.endDate,
			};
			// Index tasks by ID
			const tasks: Record<string, Task> = {};
			const taskIds: string[] = [];
			action.payload.forEach((task) => {
				tasks[task.id] = task;
				taskIds.push(task.id);
			});
			state.tasks = tasks;
			state.taskIds = taskIds;
		});
		builder.addCase(fetchTasks.rejected, (state, action) => {
			state.loading = false;
			state.error = action.payload || 'Failed to fetch tasks';
		});

		// Create task
		builder.addCase(createTask.pending, (state) => {
			state.loading = true;
			state.error = null;
		});
		builder.addCase(createTask.fulfilled, (state, action) => {
			state.loading = false;
			const task = action.payload;
			state.tasks[task.id] = task;
			state.taskIds.push(task.id);
		});
		builder.addCase(createTask.rejected, (state, action) => {
			state.loading = false;
			state.error = action.payload || 'Failed to create task';
		});

		// Update task
		builder.addCase(updateTask.pending, (state) => {
			state.loading = true;
			state.error = null;
		});
		builder.addCase(updateTask.fulfilled, (state, action) => {
			state.loading = false;
			const task = action.payload;
			state.tasks[task.id] = task;
		});
		builder.addCase(updateTask.rejected, (state, action) => {
			state.loading = false;
			state.error = action.payload || 'Failed to update task';
		});

		// Delete task
		builder.addCase(deleteTask.pending, (state) => {
			state.loading = true;
			state.error = null;
		});
		builder.addCase(deleteTask.fulfilled, (state, action) => {
			state.loading = false;
			const taskId = action.payload;
			delete state.tasks[taskId];
			state.taskIds = state.taskIds.filter((id) => id !== taskId);
		});
		builder.addCase(deleteTask.rejected, (state, action) => {
			state.loading = false;
			state.error = action.payload || 'Failed to delete task';
		});

		// Complete task
		builder.addCase(completeTask.pending, (state) => {
			state.loading = true;
			state.error = null;
		});
		builder.addCase(completeTask.fulfilled, (state, action) => {
			state.loading = false;
			const task = action.payload;
			state.tasks[task.id] = task;
		});
		builder.addCase(completeTask.rejected, (state, action) => {
			state.loading = false;
			state.error = action.payload || 'Failed to complete task';
		});
	},
});

export const { clearTasks, clearError } = tasksSlice.actions;
export default tasksSlice.reducer;

/**
 * Selectors
 */
export const selectAllTasks = (state: { tasks: TasksState }) =>
	state.tasks.taskIds.map((id) => state.tasks.tasks[id]);

export const selectTaskById = (state: { tasks: TasksState }, taskId: string) =>
	state.tasks.tasks[taskId];

export const selectTasksLoading = (state: { tasks: TasksState }) =>
	state.tasks.loading;

export const selectTasksError = (state: { tasks: TasksState }) =>
	state.tasks.error;

export const selectLastFetch = (state: { tasks: TasksState }) =>
	state.tasks.lastFetch;

export const selectDateRange = (state: { tasks: TasksState }) =>
	state.tasks.dateRange;

export const selectCompletedTasks = (state: { tasks: TasksState }) =>
	state.tasks.taskIds
		.map((id) => state.tasks.tasks[id])
		.filter((task) => task.status === 'completed');

export const selectPendingTasks = (state: { tasks: TasksState }) =>
	state.tasks.taskIds
		.map((id) => state.tasks.tasks[id])
		.filter((task) => task.status === 'needsAction');

