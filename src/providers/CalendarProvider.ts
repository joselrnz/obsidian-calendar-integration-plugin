/**
 * Calendar Provider Interface
 * 
 * This abstraction allows the plugin to support multiple calendar platforms:
 * - Google Calendar
 * - Microsoft Outlook / Office 365
 * - Apple iCloud Calendar
 * - CalDAV servers
 * - ICS feeds
 * 
 * Each provider implements this interface to provide a consistent API
 * for the calendar view and other components.
 */

export interface CalendarEvent {
	id?: string;
	summary?: string;
	description?: string;
	start?: { dateTime?: string; date?: string; timeZone?: string };
	end?: { dateTime?: string; date?: string; timeZone?: string };
	location?: string;
	status?: string;
	htmlLink?: string;
	colorId?: string;
	hangoutLink?: string;
	conferenceData?: any;
	attachments?: any[];
	attendees?: any[];
	organizer?: any;
	[key: string]: any;
}

export interface CalendarTask {
	id?: string;
	title?: string;
	notes?: string;
	status?: string;
	due?: string;
	completed?: string;
	[key: string]: any;
}

export interface CalendarEventList {
	items?: CalendarEvent[];
	nextPageToken?: string;
}

export interface CalendarTaskList {
	items?: CalendarTask[];
	nextPageToken?: string;
}

export interface CalendarData {
	events: CalendarEventList | null;
	tasks: CalendarTaskList | null;
}

export interface CreateEventOptions {
	summary: string;
	description?: string;
	start: { dateTime?: string; date?: string; timeZone?: string };
	end: { dateTime?: string; date?: string; timeZone?: string };
	location?: string;
	attendees?: string[]; // Email addresses
	conferenceData?: boolean; // Whether to create a video conference
}

export interface CreateTaskOptions {
	title: string;
	notes?: string;
	due?: string;
}

export interface SearchOptions {
	query: string;
	startDate?: string;
	endDate?: string;
	maxResults?: number;
}

/**
 * Abstract Calendar Provider
 * 
 * All calendar providers must implement this interface
 */
export abstract class CalendarProvider {
	abstract readonly name: string;
	abstract readonly type: 'google' | 'outlook' | 'icloud' | 'caldav' | 'ics';
	
	/**
	 * Check if the provider is properly configured and authenticated
	 */
	abstract isConfigured(): boolean;
	
	/**
	 * Get events for a specific date
	 */
	abstract getEventsForDate(date: string): Promise<CalendarEventList | null>;
	
	/**
	 * Get tasks for a specific date
	 */
	abstract getTasksForDate(date: string): Promise<CalendarTaskList | null>;
	
	/**
	 * Get events and tasks for a specific date
	 */
	abstract getEventsAndTasksForDate(date: string): Promise<CalendarData | null>;
	
	/**
	 * Get events for a date range
	 */
	abstract getEventsForDateRange(startDate: string, endDate: string): Promise<CalendarEventList | null>;
	
	/**
	 * Get tasks for a date range
	 */
	abstract getTasksForDateRange(startDate: string, endDate: string): Promise<CalendarTaskList | null>;

	/**
	 * Get all tasks (for task panel)
	 */
	abstract getTasks(): Promise<CalendarTaskList | null>;

	/**
	 * Get events and tasks for a date range
	 */
	abstract getEventsAndTasksForDateRange(startDate: string, endDate: string): Promise<CalendarData | null>;
	
	/**
	 * Create a new event
	 */
	abstract createEvent(options: CreateEventOptions): Promise<CalendarEvent>;
	
	/**
	 * Create a new task
	 */
	abstract createTask(options: CreateTaskOptions): Promise<CalendarTask>;
	
	/**
	 * Update an existing event
	 */
	abstract updateEvent(eventId: string, options: Partial<CreateEventOptions>): Promise<CalendarEvent>;
	
	/**
	 * Update an existing task
	 */
	abstract updateTask(taskId: string, options: Partial<CreateTaskOptions>): Promise<CalendarTask>;

	/**
	 * Mark a task as complete
	 */
	abstract completeTask(taskId: string): Promise<CalendarTask>;

	/**
	 * Delete an event
	 */
	abstract deleteEvent(eventId: string): Promise<void>;

	/**
	 * Delete a task
	 */
	abstract deleteTask(taskId: string): Promise<void>;
	
	/**
	 * Search events and tasks
	 */
	abstract search(options: SearchOptions): Promise<CalendarData | null>;
	
	/**
	 * Cleanup resources
	 */
	abstract cleanup(): void;
}

