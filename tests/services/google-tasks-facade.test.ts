import { describe, it, expect, beforeEach } from 'vitest';
import { GoogleTasksFacade } from '../../src/services/google-tasks-facade';
import { createMockGoogleCalendarAPI } from '../mocks/google-api-mock';

describe('GoogleTasksFacade', () => {
	let facade: GoogleTasksFacade;
	let mockAPI: any;

	beforeEach(() => {
		mockAPI = createMockGoogleCalendarAPI();
		facade = new GoogleTasksFacade(mockAPI);
	});

	describe('initialization', () => {
		it('should initialize successfully', async () => {
			await facade.initialize();
			expect(facade.isReady()).toBe(true);
		});

		it('should not initialize twice', async () => {
			await facade.initialize();
			await facade.initialize();
			expect(facade.isReady()).toBe(true);
		});

		it('should throw error if API is not provided', async () => {
			const invalidFacade = new GoogleTasksFacade(null as any);
			await expect(invalidFacade.initialize()).rejects.toThrow('Google Calendar API not provided');
		});
	});

	describe('fetchTasks', () => {
		beforeEach(async () => {
			await facade.initialize();
		});

		it('should fetch tasks for a date range', async () => {
			const tasks = await facade.fetchTasks({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			expect(tasks).toHaveLength(1);
			expect(tasks[0].title).toBe('Test Task 1');
			expect(mockAPI.getEventsAndTasksForDateRange).toHaveBeenCalledWith('2024-01-15', '2024-01-16');
		});

		it('should cache tasks', async () => {
			// First call
			await facade.fetchTasks({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// Second call (should use cache)
			await facade.fetchTasks({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// API should only be called once
			expect(mockAPI.getEventsAndTasksForDateRange).toHaveBeenCalledTimes(1);
		});

		it('should clear cache when requested', async () => {
			// First call
			await facade.fetchTasks({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// Clear cache
			facade.clearCache();

			// Second call (should not use cache)
			await facade.fetchTasks({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// API should be called twice
			expect(mockAPI.getEventsAndTasksForDateRange).toHaveBeenCalledTimes(2);
		});

		it('should handle API errors', async () => {
			mockAPI.getEventsAndTasksForDateRange.mockRejectedValue(new Error('API Error'));

			await expect(
				facade.fetchTasks({
					startDate: '2024-01-15',
					endDate: '2024-01-16',
				})
			).rejects.toThrow('Failed to fetch tasks');
		});
	});

	describe('fetchTasksForDate', () => {
		beforeEach(async () => {
			await facade.initialize();
		});

		it('should fetch tasks for a single date', async () => {
			const tasks = await facade.fetchTasksForDate('2024-01-15');

			expect(tasks).toHaveLength(1);
			expect(mockAPI.getEventsAndTasksForDateRange).toHaveBeenCalledWith('2024-01-15', '2024-01-15');
		});
	});

	describe('createTask', () => {
		beforeEach(async () => {
			await facade.initialize();
		});

		it('should create a new task', async () => {
			const newTask = {
				title: 'New Task',
				status: 'needsAction' as const,
			};

			const createdTask = await facade.createTask(newTask);

			expect(createdTask.id).toBe('new-task-id');
			expect(createdTask.title).toBe('New Task');
			expect(mockAPI.createTask).toHaveBeenCalledWith(
				expect.objectContaining({
					title: 'New Task',
					status: 'needsAction',
				}),
				'@default'
			);
		});

		it('should clear cache after creating task', async () => {
			// Populate cache
			await facade.fetchTasks({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// Create task
			await facade.createTask({
				title: 'New Task',
				status: 'needsAction',
			});

			// Fetch again (should not use cache)
			await facade.fetchTasks({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// API should be called twice
			expect(mockAPI.getEventsAndTasksForDateRange).toHaveBeenCalledTimes(2);
		});
	});

	describe('updateTask', () => {
		beforeEach(async () => {
			await facade.initialize();
		});

		it('should update an existing task', async () => {
			const updates = {
				title: 'Updated Task',
			};

			const updatedTask = await facade.updateTask('task-1', updates);

			expect(updatedTask.id).toBe('task-1');
			expect(updatedTask.title).toBe('Updated Task');
			expect(mockAPI.updateTask).toHaveBeenCalledWith(
				'task-1',
				expect.objectContaining({
					title: 'Updated Task',
				}),
				'@default'
			);
		});

		it('should clear cache after updating task', async () => {
			// Populate cache
			await facade.fetchTasks({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// Update task
			await facade.updateTask('task-1', {
				title: 'Updated Task',
			});

			// Fetch again (should not use cache)
			await facade.fetchTasks({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// API should be called twice
			expect(mockAPI.getEventsAndTasksForDateRange).toHaveBeenCalledTimes(2);
		});
	});

	describe('deleteTask', () => {
		beforeEach(async () => {
			await facade.initialize();
		});

		it('should delete a task', async () => {
			await facade.deleteTask('task-1');

			expect(mockAPI.deleteTask).toHaveBeenCalledWith('task-1', '@default');
		});

		it('should clear cache after deleting task', async () => {
			// Populate cache
			await facade.fetchTasks({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// Delete task
			await facade.deleteTask('task-1');

			// Fetch again (should not use cache)
			await facade.fetchTasks({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// API should be called twice
			expect(mockAPI.getEventsAndTasksForDateRange).toHaveBeenCalledTimes(2);
		});
	});

	describe('completeTask', () => {
		beforeEach(async () => {
			await facade.initialize();
		});

		it('should mark task as completed', async () => {
			const completedTask = await facade.completeTask('task-1');

			expect(completedTask.id).toBe('task-1');
			expect(mockAPI.updateTask).toHaveBeenCalledWith(
				'task-1',
				expect.objectContaining({
					status: 'completed',
					completed: expect.any(String),
				}),
				'@default'
			);
		});
	});

	describe('dispose', () => {
		it('should clear cache on dispose', async () => {
			await facade.initialize();

			await facade.fetchTasks({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			await facade.dispose();

			expect(facade.isReady()).toBe(false);
		});
	});
});

