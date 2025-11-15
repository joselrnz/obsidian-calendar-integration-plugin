import { BaseService, ServiceError, withRetry, RetryConfig } from './base-service';
import type { GoogleCalendarAPI } from '../api/google-calendar-api';

/**
 * Interface for task data.
 */
export interface Task {
	id: string;
	title: string;
	notes?: string;
	status: 'needsAction' | 'completed';
	due?: string;
	completed?: string;
	parent?: string;
	position?: string;
	links?: Array<{
		type: string;
		description: string;
		link: string;
	}>;
}

/**
 * Interface for fetching tasks.
 */
export interface FetchTasksOptions {
	startDate?: string;
	endDate?: string;
	showCompleted?: boolean;
	maxResults?: number;
	taskListId?: string;
}

/**
 * Google Tasks Facade Service.
 * Provides a clean interface for interacting with Google Tasks API.
 */
export class GoogleTasksFacade extends BaseService {
	private api: GoogleCalendarAPI;
	private cache: Map<string, { data: Task[]; timestamp: number }> = new Map();
	private readonly CACHE_TTL = 60000; // 1 minute
	private retryConfig: RetryConfig;

	constructor(api: GoogleCalendarAPI, retryConfig?: RetryConfig) {
		super();
		this.api = api;
		this.retryConfig = retryConfig || {
			maxRetries: 3,
			initialDelay: 1000,
			backoffMultiplier: 2,
			maxDelay: 30000,
			useJitter: true,
		};
	}

	protected async onInitialize(): Promise<void> {
		// Verify API is initialized
		if (!this.api) {
			throw new ServiceError(
				'Google Calendar API not provided',
				'GoogleTasksFacade'
			);
		}
	}

	protected async onDispose(): Promise<void> {
		// Clear cache
		this.cache.clear();
	}

	/**
	 * Fetch tasks for a date range.
	 */
	async fetchTasks(options: FetchTasksOptions = {}): Promise<Task[]> {
		await this.ensureReady();

		const cacheKey = this.getCacheKey(options);
		const cached = this.getFromCache(cacheKey);

		if (cached) {
			return cached;
		}

		try {
			let tasks: Task[] = [];

			if (options.startDate && options.endDate) {
				const startDate = options.startDate;
				const endDate = options.endDate;
				const result = await withRetry(
					async () => await this.api.getEventsAndTasksForDateRange(
						startDate,
						endDate
					),
					this.retryConfig
				);
				tasks = this.transformTasks(result?.tasks?.items || []);
			} else if (options.startDate) {
				const startDate = options.startDate;
				const result = await withRetry(
					async () => await this.api.getEventsAndTasksForDate(startDate),
					this.retryConfig
				);
				tasks = this.transformTasks(result?.tasks?.items || []);
			} else {
				// Fetch all tasks (no date filter)
				// TODO: Implement fetching all tasks
				tasks = [];
			}

			this.setCache(cacheKey, tasks);
			return tasks;
		} catch (error) {
			throw new ServiceError(
				'Failed to fetch tasks',
				'GoogleTasksFacade',
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Fetch tasks for a single date.
	 */
	async fetchTasksForDate(date: string): Promise<Task[]> {
		return this.fetchTasks({
			startDate: date,
			endDate: date,
		});
	}

	/**
	 * Create a new task.
	 */
	async createTask(task: Partial<Task>, taskListId = '@default'): Promise<Task> {
		await this.ensureReady();

		try {
			// Transform facade task to Google API task
			const apiTask: any = {
				title: task.title,
				notes: task.notes,
				status: task.status,
				due: task.due,
			};

			const createdTask = await withRetry(
				async () => await this.api.createTask(apiTask, taskListId),
				this.retryConfig
			);

			// Clear cache since we created a new task
			this.clearCache();

			return this.transformTask(createdTask);
		} catch (error) {
			throw new ServiceError(
				'Failed to create task',
				'GoogleTasksFacade',
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Update an existing task.
	 */
	async updateTask(
		taskId: string,
		updates: Partial<Task>,
		taskListId = '@default'
	): Promise<Task> {
		await this.ensureReady();

		try {
			// Transform facade task to Google API task
			const apiTask: any = {
				title: updates.title,
				notes: updates.notes,
				status: updates.status,
				due: updates.due,
				completed: updates.completed,
			};

			const updatedTask = await withRetry(
				async () => await this.api.updateTask(taskId, apiTask, taskListId),
				this.retryConfig
			);

			// Clear cache since we updated a task
			this.clearCache();

			return this.transformTask(updatedTask);
		} catch (error) {
			throw new ServiceError(
				'Failed to update task',
				'GoogleTasksFacade',
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Delete a task.
	 */
	async deleteTask(taskId: string, taskListId = '@default'): Promise<void> {
		await this.ensureReady();

		try {
			await withRetry(
				async () => await this.api.deleteTask(taskId, taskListId),
				this.retryConfig
			);

			// Clear cache since we deleted a task
			this.clearCache();
		} catch (error) {
			throw new ServiceError(
				'Failed to delete task',
				'GoogleTasksFacade',
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Mark a task as completed.
	 */
	async completeTask(taskId: string): Promise<Task> {
		return this.updateTask(taskId, {
			status: 'completed',
			completed: new Date().toISOString(),
		});
	}

	/**
	 * Clear the cache.
	 */
	clearCache(): void {
		this.cache.clear();
	}

	// Private helper methods

	private getCacheKey(options: FetchTasksOptions): string {
		return `${options.startDate || 'all'}-${options.endDate || 'all'}-${options.taskListId || 'default'}`;
	}

	private getFromCache(key: string): Task[] | null {
		const cached = this.cache.get(key);

		if (!cached) {
			return null;
		}

		const isExpired = Date.now() - cached.timestamp > this.CACHE_TTL;

		if (isExpired) {
			this.cache.delete(key);
			return null;
		}

		return cached.data;
	}

	private setCache(key: string, data: Task[]): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
		});
	}

	private transformTasks(tasks: any[]): Task[] {
		return tasks.map((task) => this.transformTask(task));
	}

	private transformTask(task: any): Task {
		return {
			id: task.id || '',
			title: task.title || 'Untitled',
			notes: task.notes,
			status: task.status || 'needsAction',
			due: task.due,
			completed: task.completed,
			parent: task.parent,
			position: task.position,
			links: task.links,
		};
	}
}

