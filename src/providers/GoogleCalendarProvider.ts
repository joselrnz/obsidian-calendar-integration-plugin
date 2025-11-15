import { GoogleCalendarAPI, GoogleCalendarCredentials } from '../api/google-calendar-api';
import {
	CalendarProvider,
	CalendarEvent,
	CalendarTask,
	CalendarEventList,
	CalendarTaskList,
	CalendarData,
	CreateEventOptions,
	CreateTaskOptions,
	SearchOptions,
} from './CalendarProvider';
import { GOOGLE_CALENDAR_CONSTANTS, GOOGLE_TASKS_CONSTANTS } from '../services/constants';
import {
	GoogleCalendarError,
	RateLimitError,
	NetworkError,
	isRetriableError,
	getUserFriendlyMessage,
} from '../services/errors';
import { validateEventData, validateTaskData, CalendarEventData, TaskData } from '../services/validation';
import { Notice } from 'obsidian';

/**
 * Google Calendar Provider with retry logic, caching, and incremental sync
 *
 * Wraps GoogleCalendarAPI to implement the CalendarProvider interface
 */
export class GoogleCalendarProvider extends CalendarProvider {
	readonly name = 'Google Calendar';
	readonly type = 'google' as const;

	private api: GoogleCalendarAPI;

	// Event caching
	private eventCache = new Map<string, CalendarEvent[]>();
	private lastEventRefresh = new Map<string, number>();
	private syncTokens = new Map<string, string>();

	// Task caching
	private taskCache = new Map<string, CalendarTask[]>();
	private lastTaskRefresh = new Map<string, number>();

	// Rate limiting
	private lastManualRefresh = 0;
	
	constructor(
		credentials: GoogleCalendarCredentials,
		onTokensUpdated?: (tokens: { access_token?: string; refresh_token?: string }) => void
	) {
		super();
		this.api = new GoogleCalendarAPI(credentials, onTokensUpdated);
	}

	/**
	 * Retry logic with exponential backoff
	 */
	private async withRetry<T>(
		fn: () => Promise<T>,
		operation: string = 'API call'
	): Promise<T> {
		const { MAX_RETRIES, INITIAL_BACKOFF_MS, BACKOFF_MULTIPLIER } = GOOGLE_CALENDAR_CONSTANTS.RATE_LIMIT;
		let lastError: Error;

		for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
			try {
				return await fn();
			} catch (error: any) {
				lastError = error;

				// Convert to typed error if needed
				if (!(error instanceof GoogleCalendarError)) {
					if (error?.status === 429) {
						lastError = new RateLimitError(error?.retryAfter);
					} else if (error?.status >= 500) {
						lastError = new GoogleCalendarError(
							error?.message || 'Server error',
							error?.status
						);
					} else if (!error?.status) {
						lastError = new NetworkError(
							error?.message || 'Network error',
							error
						);
					}
				}

				// Don't retry if not retriable or last attempt
				if (!isRetriableError(lastError) || attempt === MAX_RETRIES) {
					console.error(`[Calendar Integration] ${operation} failed after ${attempt + 1} attempts:`, lastError);
					throw lastError;
				}

				// Calculate backoff
				const backoff = Math.min(
					INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, attempt),
					GOOGLE_CALENDAR_CONSTANTS.RATE_LIMIT.MAX_BACKOFF_MS
				);

				console.warn(
					`[Calendar Integration] ${operation} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), ` +
					`retrying in ${backoff}ms...`,
					lastError
				);

				// Wait before retry
				await new Promise(resolve => setTimeout(resolve, backoff));
			}
		}

		throw lastError!;
	}
	
	isConfigured(): boolean {
		return !!(this.api as any).credentials.clientId && !!(this.api as any).credentials.clientSecret;
	}
	
	async getEventsForDate(date: string): Promise<CalendarEventList | null> {
		const result = await this.api.getEventsForDate(date);
		if (!result) return null;
		return {
			items: result.items || [],
			nextPageToken: result.nextPageToken,
		};
	}
	
	async getTasksForDate(date: string): Promise<CalendarTaskList | null> {
		const result = await this.api.getTasksForDate(date);
		if (!result) return null;
		return {
			items: result.items || [],
			nextPageToken: result.nextPageToken,
		};
	}
	
	async getEventsAndTasksForDate(date: string): Promise<CalendarData | null> {
		return await this.api.getEventsAndTasksForDate(date);
	}
	
	async getEventsForDateRange(startDate: string, endDate: string): Promise<CalendarEventList | null> {
		const cacheKey = `${startDate}-${endDate}`;

		// Check cache freshness
		const lastRefresh = this.lastEventRefresh.get(cacheKey) || 0;
		const now = Date.now();
		const cacheAge = now - lastRefresh;

		if (cacheAge < GOOGLE_CALENDAR_CONSTANTS.CACHE.EVENT_CACHE_TTL_MS) {
			const cached = this.eventCache.get(cacheKey);
			if (cached) {
				console.log(`[Calendar Integration] Using cached events for ${cacheKey} (age: ${Math.round(cacheAge / 1000)}s)`);
				return { items: cached };
			}
		}

		// Fetch with retry logic
		const result = await this.withRetry(
			() => this.api.getEventsForDateRange(startDate, endDate),
			`getEventsForDateRange(${startDate}, ${endDate})`
		);

		if (!result) return null;

		// Update cache
		this.eventCache.set(cacheKey, result.items || []);
		this.lastEventRefresh.set(cacheKey, now);

		return {
			items: result.items || [],
			nextPageToken: result.nextPageToken,
		};
	}
	
	async getTasksForDateRange(startDate: string, endDate: string): Promise<CalendarTaskList | null> {
		const result = await this.api.getTasksForDateRange(startDate, endDate);
		if (!result) return null;
		return {
			items: result.items || [],
			nextPageToken: result.nextPageToken,
		};
	}

	async getTasks(): Promise<CalendarTaskList | null> {
		// Get all tasks (no date filter)
		const cacheKey = 'all-tasks';

		// Check cache freshness
		const lastRefresh = this.lastTaskRefresh.get(cacheKey) || 0;
		const now = Date.now();
		const cacheAge = now - lastRefresh;

		if (cacheAge < GOOGLE_CALENDAR_CONSTANTS.CACHE.EVENT_CACHE_TTL_MS) {
			const cached = this.taskCache.get(cacheKey);
			if (cached) {
				console.log(`[Calendar Integration] Using cached tasks (age: ${Math.round(cacheAge / 1000)}s)`);
				return { items: cached };
			}
		}

		// Fetch with retry logic
		const result = await this.withRetry(
			() => this.api.getTasks(),
			'getTasks()'
		);

		if (!result) return null;

		// Update cache
		this.taskCache.set(cacheKey, result.items || []);
		this.lastTaskRefresh.set(cacheKey, now);

		return {
			items: result.items || [],
			nextPageToken: result.nextPageToken,
		};
	}
	
	async getEventsAndTasksForDateRange(startDate: string, endDate: string): Promise<CalendarData | null> {
		return await this.api.getEventsAndTasksForDateRange(startDate, endDate);
	}
	
	async createEvent(options: CreateEventOptions): Promise<CalendarEvent> {
		const event: any = {
			summary: options.summary,
			description: options.description,
			start: options.start,
			end: options.end,
			location: options.location,
		};

		// Add attendees if provided
		if (options.attendees && options.attendees.length > 0) {
			event.attendees = options.attendees.map(email => ({ email }));
		}

		// Add conference data if requested
		if (options.conferenceData) {
			event.conferenceData = {
				createRequest: {
					requestId: `meet-${Date.now()}`,
					conferenceSolutionKey: { type: 'hangoutsMeet' },
				},
			};
		}

		// Validate event data
		try {
			validateEventData(event as CalendarEventData);
		} catch (error: any) {
			new Notice(getUserFriendlyMessage(error));
			throw error;
		}

		// Create with retry logic
		const createdEvent = await this.withRetry(
			() => this.api.createEvent(event),
			'createEvent'
		);

		// Invalidate cache
		this.invalidateEventCache();

		return createdEvent;
	}
	
	async createTask(options: CreateTaskOptions): Promise<CalendarTask> {
		const task: any = {
			title: options.title,
			notes: options.notes,
			due: options.due,
		};

		// Validate task data
		try {
			validateTaskData(task as TaskData);
		} catch (error: any) {
			new Notice(getUserFriendlyMessage(error));
			throw error;
		}

		// Create with retry logic
		const createdTask = await this.withRetry(
			() => this.api.createTask(task),
			'createTask'
		);

		// Invalidate cache
		this.invalidateTaskCache();

		return createdTask;
	}
	
	async updateEvent(eventId: string, options: Partial<CreateEventOptions>): Promise<CalendarEvent> {
		const event: any = {};
		if (options.summary) event.summary = options.summary;
		if (options.description !== undefined) event.description = options.description;
		if (options.start) event.start = options.start;
		if (options.end) event.end = options.end;
		if (options.location !== undefined) event.location = options.location;

		// Update with retry logic
		const updatedEvent = await this.withRetry(
			() => this.api.updateEvent(eventId, event),
			'updateEvent'
		);

		// Invalidate cache
		this.invalidateEventCache();

		return updatedEvent;
	}

	async updateTask(taskId: string, options: Partial<CreateTaskOptions>): Promise<CalendarTask> {
		const task: any = {};
		if (options.title) task.title = options.title;
		if (options.notes !== undefined) task.notes = options.notes;
		if (options.due !== undefined) task.due = options.due;

		// Update with retry logic
		const updatedTask = await this.withRetry(
			() => this.api.updateTask(taskId, task),
			'updateTask'
		);

		// Invalidate cache
		this.invalidateTaskCache();

		return updatedTask;
	}

	async completeTask(taskId: string): Promise<CalendarTask> {
		const task: any = {
			status: 'completed',
			completed: new Date().toISOString(),
		};

		// Update with retry logic
		const completedTask = await this.withRetry(
			() => this.api.updateTask(taskId, task),
			'completeTask'
		);

		// Invalidate cache
		this.invalidateTaskCache();

		return completedTask;
	}

	async deleteEvent(eventId: string): Promise<void> {
		// Delete with retry logic
		await this.withRetry(
			() => this.api.deleteEvent(eventId),
			'deleteEvent'
		);

		// Invalidate cache
		this.invalidateEventCache();
	}

	async deleteTask(taskId: string): Promise<void> {
		// Delete with retry logic
		await this.withRetry(
			() => this.api.deleteTask(taskId),
			'deleteTask'
		);

		// Invalidate cache
		this.invalidateTaskCache();
	}

	/**
	 * Invalidate event cache
	 */
	private invalidateEventCache(): void {
		this.eventCache.clear();
		this.lastEventRefresh.clear();
		console.log('[Calendar Integration] Event cache invalidated');
	}

	/**
	 * Invalidate task cache
	 */
	private invalidateTaskCache(): void {
		this.taskCache.clear();
		this.lastTaskRefresh.clear();
		console.log('[Calendar Integration] Task cache invalidated');
	}
	
	async search(options: SearchOptions): Promise<CalendarData | null> {
		// For now, implement basic search by fetching date range and filtering
		// Google Calendar API doesn't have a great search endpoint
		const startDate = options.startDate || new Date().toISOString().split('T')[0];
		const endDate = options.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		
		const data = await this.getEventsAndTasksForDateRange(startDate, endDate);
		if (!data) return null;
		
		// Filter by query
		const query = options.query.toLowerCase();
		const filteredEvents = data.events?.items?.filter(event =>
			event.summary?.toLowerCase().includes(query) ||
			event.description?.toLowerCase().includes(query) ||
			event.location?.toLowerCase().includes(query)
		) || [];

		const filteredTasks = data.tasks?.items?.filter(task =>
			task.title?.toLowerCase().includes(query) ||
			task.notes?.toLowerCase().includes(query)
		) || [];
		
		return {
			events: { items: filteredEvents },
			tasks: { items: filteredTasks },
		};
	}
	
	cleanup(): void {
		this.api.cleanup();
	}
	
	// Expose the underlying API for OAuth flow
	async startOAuthFlow(): Promise<{ access_token?: string; refresh_token?: string }> {
		return await this.api.startOAuthFlow();
	}
}

