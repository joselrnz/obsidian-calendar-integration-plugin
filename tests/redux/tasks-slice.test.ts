import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import tasksReducer, {
	fetchTasks,
	createTask,
	updateTask,
	deleteTask,
	completeTask,
	clearTasks,
	clearError,
	selectAllTasks,
	selectTaskById,
	selectTasksLoading,
	selectTasksError,
	selectCompletedTasks,
	selectPendingTasks,
} from '../../src/redux/tasks-slice';
import type { TasksState } from '../../src/redux/tasks-slice';
import { createMockGoogleCalendarAPI, createTestTask } from '../mocks/google-api-mock';
import { GoogleTasksFacade } from '../../src/services/google-tasks-facade';

describe('Tasks Slice', () => {
	let store: ReturnType<typeof configureStore>;
	let mockAPI: ReturnType<typeof createMockGoogleCalendarAPI>;
	let facade: GoogleTasksFacade;

	beforeEach(() => {
		mockAPI = createMockGoogleCalendarAPI();
		facade = new GoogleTasksFacade(mockAPI as any);

		store = configureStore({
			reducer: {
				tasks: tasksReducer,
			},
			middleware: (getDefaultMiddleware) =>
				getDefaultMiddleware({
					serializableCheck: {
						ignoredActionPaths: ['meta.arg.facade', 'payload.facade'],
					},
				}),
		});
	});

	describe('Initial State', () => {
		it('should have correct initial state', () => {
			const state = store.getState().tasks;
			expect(state.tasks).toEqual({});
			expect(state.taskIds).toEqual([]);
			expect(state.loading).toBe(false);
			expect(state.error).toBe(null);
			expect(state.lastFetch).toBe(null);
			expect(state.dateRange).toBe(null);
		});
	});

	describe('Reducers', () => {
		it('should clear tasks', () => {
			// Add some tasks first
			store.dispatch({
				type: fetchTasks.fulfilled.type,
				payload: [createTestTask({ id: 'task-1' })],
				meta: { arg: { startDate: '2024-01-15', endDate: '2024-01-16' } },
			});

			// Clear tasks
			store.dispatch(clearTasks());

			const state = store.getState().tasks;
			expect(state.tasks).toEqual({});
			expect(state.taskIds).toEqual([]);
			expect(state.error).toBe(null);
		});

		it('should clear error', () => {
			// Set an error first
			store.dispatch({
				type: fetchTasks.rejected.type,
				payload: 'Test error',
			});

			// Clear error
			store.dispatch(clearError());

			const state = store.getState().tasks;
			expect(state.error).toBe(null);
		});
	});

	describe('fetchTasks', () => {
		it('should set loading to true when pending', () => {
			store.dispatch({
				type: fetchTasks.pending.type,
			});

			const state = store.getState().tasks;
			expect(state.loading).toBe(true);
			expect(state.error).toBe(null);
		});

		it('should store tasks when fulfilled', () => {
			const tasks = [
				createTestTask({ id: 'task-1', title: 'Task 1' }),
				createTestTask({ id: 'task-2', title: 'Task 2' }),
			];

			store.dispatch({
				type: fetchTasks.fulfilled.type,
				payload: tasks,
				meta: { arg: { startDate: '2024-01-15', endDate: '2024-01-16' } },
			});

			const state = store.getState().tasks;
			expect(state.loading).toBe(false);
			expect(state.taskIds).toEqual(['task-1', 'task-2']);
			expect(state.tasks['task-1'].title).toBe('Task 1');
			expect(state.tasks['task-2'].title).toBe('Task 2');
			expect(state.lastFetch).toBeGreaterThan(0);
			expect(state.dateRange).toEqual({
				start: '2024-01-15',
				end: '2024-01-16',
			});
		});

		it('should set error when rejected', () => {
			store.dispatch({
				type: fetchTasks.rejected.type,
				payload: 'Failed to fetch tasks',
			});

			const state = store.getState().tasks;
			expect(state.loading).toBe(false);
			expect(state.error).toBe('Failed to fetch tasks');
		});

		it('should fetch tasks via thunk', async () => {
			await facade.initialize();

			const result = await store.dispatch(
				fetchTasks({
					startDate: '2024-01-15',
					endDate: '2024-01-16',
					facade,
				})
			);

			expect(result.type).toBe(fetchTasks.fulfilled.type);
			const state = store.getState().tasks;
			expect(state.taskIds.length).toBeGreaterThan(0);
		});
	});

	describe('createTask', () => {
		it('should add task when fulfilled', () => {
			const newTask = createTestTask({ id: 'new-task', title: 'New Task' });

			store.dispatch({
				type: createTask.fulfilled.type,
				payload: newTask,
			});

			const state = store.getState().tasks;
			expect(state.tasks['new-task']).toBeDefined();
			expect(state.tasks['new-task'].title).toBe('New Task');
			expect(state.taskIds).toContain('new-task');
		});
	});

	describe('updateTask', () => {
		it('should update task when fulfilled', () => {
			// Add task first
			const task = createTestTask({ id: 'task-1', title: 'Original' });
			store.dispatch({
				type: createTask.fulfilled.type,
				payload: task,
			});

			// Update task
			const updatedTask = createTestTask({ id: 'task-1', title: 'Updated' });
			store.dispatch({
				type: updateTask.fulfilled.type,
				payload: updatedTask,
			});

			const state = store.getState().tasks;
			expect(state.tasks['task-1'].title).toBe('Updated');
		});
	});

	describe('deleteTask', () => {
		it('should remove task when fulfilled', () => {
			// Add task first
			const task = createTestTask({ id: 'task-1', title: 'To Delete' });
			store.dispatch({
				type: createTask.fulfilled.type,
				payload: task,
			});

			// Delete task
			store.dispatch({
				type: deleteTask.fulfilled.type,
				payload: 'task-1',
			});

			const state = store.getState().tasks;
			expect(state.tasks['task-1']).toBeUndefined();
			expect(state.taskIds).not.toContain('task-1');
		});
	});

	describe('completeTask', () => {
		it('should mark task as completed when fulfilled', () => {
			// Add task first
			const task = createTestTask({ id: 'task-1', status: 'needsAction' });
			store.dispatch({
				type: createTask.fulfilled.type,
				payload: task,
			});

			// Complete task
			const completedTask = createTestTask({ id: 'task-1', status: 'completed' });
			store.dispatch({
				type: completeTask.fulfilled.type,
				payload: completedTask,
			});

			const state = store.getState().tasks;
			expect(state.tasks['task-1'].status).toBe('completed');
		});
	});

	describe('Selectors', () => {
		beforeEach(() => {
			const tasks = [
				createTestTask({ id: 'task-1', title: 'Task 1', status: 'needsAction' }),
				createTestTask({ id: 'task-2', title: 'Task 2', status: 'completed' }),
				createTestTask({ id: 'task-3', title: 'Task 3', status: 'needsAction' }),
			];

			store.dispatch({
				type: fetchTasks.fulfilled.type,
				payload: tasks,
				meta: { arg: { startDate: '2024-01-15', endDate: '2024-01-16' } },
			});
		});

		it('should select all tasks', () => {
			const state = store.getState();
			const tasks = selectAllTasks(state);
			expect(tasks).toHaveLength(3);
			expect(tasks[0].id).toBe('task-1');
			expect(tasks[1].id).toBe('task-2');
			expect(tasks[2].id).toBe('task-3');
		});

		it('should select task by id', () => {
			const state = store.getState();
			const task = selectTaskById(state, 'task-1');
			expect(task).toBeDefined();
			expect(task.title).toBe('Task 1');
		});

		it('should select loading state', () => {
			store.dispatch({
				type: fetchTasks.pending.type,
			});

			const state = store.getState();
			expect(selectTasksLoading(state)).toBe(true);
		});

		it('should select error state', () => {
			store.dispatch({
				type: fetchTasks.rejected.type,
				payload: 'Test error',
			});

			const state = store.getState();
			expect(selectTasksError(state)).toBe('Test error');
		});

		it('should select completed tasks', () => {
			const state = store.getState();
			const completed = selectCompletedTasks(state);
			expect(completed).toHaveLength(1);
			expect(completed[0].id).toBe('task-2');
		});

		it('should select pending tasks', () => {
			const state = store.getState();
			const pending = selectPendingTasks(state);
			expect(pending).toHaveLength(2);
			expect(pending[0].id).toBe('task-1');
			expect(pending[1].id).toBe('task-3');
		});
	});
});

