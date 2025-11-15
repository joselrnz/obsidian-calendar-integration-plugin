import { BaseService, ServiceError, withRetry, RetryConfig } from './base-service';
import type { GoogleCalendarAPI, CalendarEvent as APICalendarEvent } from '../api/google-calendar-api';

/**
 * Interface for calendar event data.
 */
export interface CalendarEvent {
	id: string;
	summary: string;
	description?: string;
	start: {
		dateTime?: string;
		date?: string;
		timeZone?: string;
	};
	end: {
		dateTime?: string;
		date?: string;
		timeZone?: string;
	};
	location?: string;
	attendees?: Array<{
		email: string;
		displayName?: string;
		responseStatus?: string;
	}>;
	recurrence?: string[];
	status?: string;
}

/**
 * Interface for fetching events.
 */
export interface FetchEventsOptions {
	startDate: string;
	endDate: string;
	maxResults?: number;
	calendarId?: string;
}

/**
 * Google Calendar Facade Service.
 * Provides a clean interface for interacting with Google Calendar API.
 */
export class GoogleCalendarFacade extends BaseService {
	private api: GoogleCalendarAPI;
	private cache: Map<string, { data: CalendarEvent[]; timestamp: number }> = new Map();
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
				'GoogleCalendarFacade'
			);
		}
	}

	protected async onDispose(): Promise<void> {
		// Clear cache
		this.cache.clear();
	}

	/**
	 * Fetch events for a date range.
	 */
	async fetchEvents(options: FetchEventsOptions): Promise<CalendarEvent[]> {
		await this.ensureReady();

		const cacheKey = this.getCacheKey(options);
		const cached = this.getFromCache(cacheKey);

		if (cached) {
			return cached;
		}

		try {
			const result = await withRetry(
				async () => {
					return await this.api.getEventsAndTasksForDateRange(
						options.startDate,
						options.endDate
					);
				},
				this.retryConfig
			);

			const events = this.transformEvents(result?.events?.items || []);
			this.setCache(cacheKey, events);

			return events;
		} catch (error) {
			throw new ServiceError(
				'Failed to fetch events',
				'GoogleCalendarFacade',
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Fetch events for a single date.
	 */
	async fetchEventsForDate(date: string): Promise<CalendarEvent[]> {
		return this.fetchEvents({
			startDate: date,
			endDate: date,
		});
	}

	/**
	 * Create a new event.
	 */
	async createEvent(event: Partial<CalendarEvent>, calendarId = 'primary'): Promise<CalendarEvent> {
		await this.ensureReady();

		try {
			// Transform facade event to Google API event
			const apiEvent: APICalendarEvent = {
				summary: event.summary,
				description: event.description,
				start: event.start,
				end: event.end,
				location: event.location,
				attendees: event.attendees,
				recurrence: event.recurrence,
			};

			const createdEvent = await withRetry(
				async () => await this.api.createEvent(apiEvent, calendarId),
				this.retryConfig
			);

			// Clear cache since we created a new event
			this.clearCache();

			return this.transformEvent(createdEvent);
		} catch (error) {
			throw new ServiceError(
				'Failed to create event',
				'GoogleCalendarFacade',
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Update an existing event.
	 */
	async updateEvent(
		eventId: string,
		updates: Partial<CalendarEvent>,
		calendarId = 'primary'
	): Promise<CalendarEvent> {
		await this.ensureReady();

		try {
			// Transform facade event to Google API event
			const apiEvent: APICalendarEvent = {
				summary: updates.summary,
				description: updates.description,
				start: updates.start,
				end: updates.end,
				location: updates.location,
				attendees: updates.attendees,
				recurrence: updates.recurrence,
				status: updates.status,
			};

			const updatedEvent = await withRetry(
				async () => await this.api.updateEvent(eventId, apiEvent, calendarId),
				this.retryConfig
			);

			// Clear cache since we updated an event
			this.clearCache();

			return this.transformEvent(updatedEvent);
		} catch (error) {
			throw new ServiceError(
				'Failed to update event',
				'GoogleCalendarFacade',
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Delete an event.
	 */
	async deleteEvent(eventId: string, calendarId = 'primary'): Promise<void> {
		await this.ensureReady();

		try {
			await withRetry(
				async () => await this.api.deleteEvent(eventId, calendarId),
				this.retryConfig
			);

			// Clear cache since we deleted an event
			this.clearCache();
		} catch (error) {
			throw new ServiceError(
				'Failed to delete event',
				'GoogleCalendarFacade',
				error instanceof Error ? error : undefined
			);
		}
	}

	/**
	 * Clear the cache.
	 */
	clearCache(): void {
		this.cache.clear();
	}

	// Private helper methods

	private getCacheKey(options: FetchEventsOptions): string {
		return `${options.startDate}-${options.endDate}-${options.calendarId || 'primary'}`;
	}

	private getFromCache(key: string): CalendarEvent[] | null {
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

	private setCache(key: string, data: CalendarEvent[]): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
		});
	}

	private transformEvents(events: any[]): CalendarEvent[] {
		return events.map((event) => this.transformEvent(event));
	}

	private transformEvent(event: any): CalendarEvent {
		return {
			id: event.id || '',
			summary: event.summary || 'Untitled',
			description: event.description,
			start: event.start || {},
			end: event.end || {},
			location: event.location,
			attendees: event.attendees,
			recurrence: event.recurrence,
			status: event.status,
		};
	}
}

