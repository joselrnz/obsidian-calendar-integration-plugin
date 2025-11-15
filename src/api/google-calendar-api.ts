import { requestUrl } from "obsidian";
import { OAuthServer, OAuthCredentials } from "../auth/oauth-server";

export interface GoogleCalendarCredentials {
	clientId: string;
	clientSecret: string;
	accessToken?: string;
	refreshToken?: string;
}

export interface CalendarEvent {
	id?: string;
	summary?: string;
	description?: string;
	start?: { dateTime?: string; date?: string; timeZone?: string };
	end?: { dateTime?: string; date?: string; timeZone?: string };
	location?: string;
	status?: string;
	htmlLink?: string;
	[key: string]: any;
}

export interface CalendarEvents {
	items?: CalendarEvent[];
	nextPageToken?: string;
	[key: string]: any;
}

export interface TaskItem {
	id?: string;
	title?: string;
	notes?: string;
	status?: string;
	due?: string;
	completed?: string;
	[key: string]: any;
}

export interface TaskList {
	items?: TaskItem[];
	nextPageToken?: string;
	[key: string]: any;
}

export interface CalendarData {
	events: CalendarEvents | null;
	tasks: TaskList | null;
}

export class GoogleCalendarAPI {
	private credentials: GoogleCalendarCredentials;
	private oauthServer: OAuthServer;
	private onTokensUpdated?: (tokens: { access_token?: string; refresh_token?: string }) => void;
	private readonly CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
	private readonly TASKS_API_BASE = "https://www.googleapis.com/tasks/v1";

	constructor(
		credentials: GoogleCalendarCredentials,
		onTokensUpdated?: (tokens: { access_token?: string; refresh_token?: string }) => void
	) {
		this.credentials = credentials;
		this.oauthServer = new OAuthServer();
		this.onTokensUpdated = onTokensUpdated;
		console.log('[Calendar Integration] Google Calendar API initialized with REST client');
	}

	private async makeRequest(url: string, method: string = 'GET', body?: any): Promise<any> {
		if (!this.credentials.accessToken) {
			throw new Error('No access token available');
		}

		try {
			const response = await requestUrl({
				url,
				method,
				headers: {
					'Authorization': `Bearer ${this.credentials.accessToken}`,
					'Content-Type': 'application/json',
				},
				body: body ? JSON.stringify(body) : undefined,
			});

			return response.json;
		} catch (error: any) {
			// Log detailed error information
			console.error('[Google API] Request failed:', {
				url,
				method,
				status: error?.status,
				message: error?.message,
				errorText: error?.text,
				errorJson: error?.json,
				requestBody: body
			});

			// Try to parse error response
			if (error?.json) {
				console.error('[Google API] Error response body:', JSON.stringify(error.json, null, 2));
			}

			if (error?.status === 401) {
				console.error("[Google Calendar] 401 Unauthorized - Token expired, attempting refresh...");
				await this.refreshAccessToken();
				// Retry the request with new token
				const response = await requestUrl({
					url,
					method,
					headers: {
						'Authorization': `Bearer ${this.credentials.accessToken}`,
						'Content-Type': 'application/json',
					},
					body: body ? JSON.stringify(body) : undefined,
				});
				return response.json;
			}
			throw error;
		}
	}

	private async refreshAccessToken(): Promise<void> {
		if (!this.credentials.refreshToken) {
			throw new Error('No refresh token available');
		}

		try {
			const response = await requestUrl({
				url: 'https://oauth2.googleapis.com/token',
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					client_id: this.credentials.clientId,
					client_secret: this.credentials.clientSecret,
					refresh_token: this.credentials.refreshToken,
					grant_type: 'refresh_token',
				}).toString(),
			});

			const tokens = response.json;
			if (tokens.access_token) {
				this.credentials.accessToken = tokens.access_token;
				console.log('[Calendar Integration] Google Calendar access token refreshed successfully');
				this.onTokensUpdated?.(tokens);
			}
		} catch (error: any) {
			console.error('[Google Calendar] Failed to refresh access token:', error);
			if (error?.json) {
				console.error('[Google Calendar] Token refresh error response:', JSON.stringify(error.json, null, 2));
			}
			throw error;
		}
	}

	async getEventsForDate(date: string): Promise<CalendarEvents | null> {
		try {
			if (!this.credentials.clientId || !this.credentials.clientSecret) {
				throw new Error("Google Calendar API credentials not configured");
			}

			const startOfDay = new Date(date);
			startOfDay.setHours(0, 0, 0, 0);

			const endOfDay = new Date(date);
			endOfDay.setHours(23, 59, 59, 999);

			const params = new URLSearchParams({
				timeMin: startOfDay.toISOString(),
				timeMax: endOfDay.toISOString(),
				singleEvents: 'true',
				orderBy: 'startTime',
			});

			const url = `${this.CALENDAR_API_BASE}/calendars/primary/events?${params}`;
			return await this.makeRequest(url);
		} catch (error: any) {
			if (error?.status === 401) {
				console.error("[Google Calendar] 401 Unauthorized - Token expired");
			} else {
				console.error("Error fetching calendar events:", error);
			}
			return null;
		}
	}

	async getTasksForDate(date: string): Promise<TaskList | null> {
		try {
			if (!this.credentials.clientId || !this.credentials.clientSecret) {
				throw new Error("Google Calendar API credentials not configured");
			}

			// Get all task lists
			const taskListsUrl = `${this.TASKS_API_BASE}/users/@me/lists`;
			const taskListsResponse = await this.makeRequest(taskListsUrl);
			const taskLists = taskListsResponse.items || [];

			const targetDate = new Date(date);
			targetDate.setHours(23, 59, 59, 999);

			const oneYearAgo = new Date(targetDate);
			oneYearAgo.setDate(oneYearAgo.getDate() - 365);

			const taskPromises = taskLists.map(async (taskList: any) => {
				if (!taskList.id) return [];
				try {
					const params = new URLSearchParams({
						showCompleted: 'false',
						maxResults: '100',
					});
					const tasksUrl = `${this.TASKS_API_BASE}/lists/${taskList.id}/tasks?${params}`;
					const response = await this.makeRequest(tasksUrl);
					const tasks = response.items || [];

					const filteredTasks = tasks.filter((task: TaskItem) => {
						if (!task.due) return true;
						const taskDueDate = new Date(task.due);
						return taskDueDate >= oneYearAgo && taskDueDate <= targetDate;
					});
					return filteredTasks;
				} catch (error) {
					console.error(`Error fetching tasks from list ${taskList.title}:`, error);
					return [];
				}
			});

			const taskResults = await Promise.all(taskPromises);
			const allTasks = taskResults.flat();

			return {
				items: allTasks,
			};
		} catch (error) {
			console.error("Error fetching tasks:", error);
			return null;
		}
	}

	async getEventsAndTasksForDate(date: string): Promise<CalendarData | null> {
		try {
			const [events, tasks] = await Promise.all([
				this.getEventsForDate(date),
				this.getTasksForDate(date),
			]);

			return {
				events: events,
				tasks: tasks,
			};
		} catch (error) {
			return null;
		}
	}

	async getEventsForDateRange(startDate: string, endDate: string): Promise<CalendarEvents | null> {
		try {
			if (!this.credentials.clientId || !this.credentials.clientSecret) {
				throw new Error("Google Calendar API credentials not configured");
			}

			const start = new Date(startDate);
			start.setHours(0, 0, 0, 0);

			const end = new Date(endDate);
			end.setHours(23, 59, 59, 999);

			const params = new URLSearchParams({
				timeMin: start.toISOString(),
				timeMax: end.toISOString(),
				singleEvents: 'true',
				orderBy: 'startTime',
			});

			const url = `${this.CALENDAR_API_BASE}/calendars/primary/events?${params}`;
			return await this.makeRequest(url);
		} catch (error) {
			console.error("Error fetching calendar events for range:", error);
			return null;
		}
	}

	async getTasks(): Promise<TaskList | null> {
		try {
			if (!this.credentials.clientId || !this.credentials.clientSecret) {
				throw new Error("Google Calendar API credentials not configured");
			}

			const url = `${this.TASKS_API_BASE}/lists/@default/tasks?maxResults=100`;
			return await this.makeRequest(url);
		} catch (error) {
			console.error("Error fetching tasks:", error);
			return null;
		}
	}

	async getTasksForDateRange(startDate: string, endDate: string): Promise<TaskList | null> {
		try {
			if (!this.credentials.clientId || !this.credentials.clientSecret) {
				throw new Error("Google Calendar API credentials not configured");
			}

			// Get all task lists
			const taskListsUrl = `${this.TASKS_API_BASE}/users/@me/lists`;
			const taskListsResponse = await this.makeRequest(taskListsUrl);
			const taskLists = taskListsResponse.items || [];

			const endDateTime = new Date(endDate);
			endDateTime.setHours(23, 59, 59, 999);

			const startDateTime = new Date(startDate);
			startDateTime.setHours(0, 0, 0, 0);

			const taskPromises = taskLists.map(async (taskList: any) => {
				if (!taskList.id) return [];
				try {
					const params = new URLSearchParams({
						showCompleted: 'false',
						maxResults: '100',
					});
					const tasksUrl = `${this.TASKS_API_BASE}/lists/${taskList.id}/tasks?${params}`;
					const response = await this.makeRequest(tasksUrl);
					const tasks = response.items || [];

					const filteredTasks = tasks.filter((task: TaskItem) => {
						if (!task.due) return true;
						const taskDueDate = new Date(task.due);
						return taskDueDate >= startDateTime && taskDueDate <= endDateTime;
					});
					return filteredTasks;
				} catch (error) {
					console.error(`Error fetching tasks from list ${taskList.title}:`, error);
					return [];
				}
			});

			const taskResults = await Promise.all(taskPromises);
			const allTasks = taskResults.flat();

			return {
				items: allTasks,
			};
		} catch (error) {
			console.error("Error fetching tasks for range:", error);
			return null;
		}
	}

	async getEventsAndTasksForDateRange(
		startDate: string,
		endDate: string
	): Promise<CalendarData | null> {
		try {
			const [events, tasks] = await Promise.all([
				this.getEventsForDateRange(startDate, endDate),
				this.getTasksForDateRange(startDate, endDate),
			]);

			return {
				events: events,
				tasks: tasks,
			};
		} catch (error) {
			return null;
		}
	}

	// ========== Event CRUD Operations ==========

	/**
	 * Create a new calendar event.
	 */
	async createEvent(event: CalendarEvent, calendarId = 'primary'): Promise<CalendarEvent> {
		try {
			if (!this.credentials.clientId || !this.credentials.clientSecret) {
				throw new Error('Google Calendar API credentials not configured');
			}

			const url = `${this.CALENDAR_API_BASE}/calendars/${calendarId}/events`;
			return await this.makeRequest(url, 'POST', event);
		} catch (error) {
			console.error('Error creating calendar event:', error);
			throw error;
		}
	}

	/**
	 * Update an existing calendar event.
	 */
	async updateEvent(eventId: string, event: CalendarEvent, calendarId = 'primary'): Promise<CalendarEvent> {
		try {
			if (!this.credentials.clientId || !this.credentials.clientSecret) {
				throw new Error('Google Calendar API credentials not configured');
			}

			const url = `${this.CALENDAR_API_BASE}/calendars/${calendarId}/events/${eventId}`;
			return await this.makeRequest(url, 'PUT', event);
		} catch (error) {
			console.error('Error updating calendar event:', error);
			throw error;
		}
	}

	/**
	 * Delete a calendar event.
	 */
	async deleteEvent(eventId: string, calendarId = 'primary'): Promise<void> {
		try {
			if (!this.credentials.clientId || !this.credentials.clientSecret) {
				throw new Error('Google Calendar API credentials not configured');
			}

			const url = `${this.CALENDAR_API_BASE}/calendars/${calendarId}/events/${eventId}`;
			await this.makeRequest(url, 'DELETE');
		} catch (error) {
			console.error('Error deleting calendar event:', error);
			throw error;
		}
	}

	// ========== Task CRUD Operations ==========

	/**
	 * Create a new task.
	 */
	async createTask(task: TaskItem, taskListId = '@default'): Promise<TaskItem> {
		try {
			if (!this.credentials.clientId || !this.credentials.clientSecret) {
				throw new Error('Google Calendar API credentials not configured');
			}

			console.log('[Google Tasks API] Creating task with data:', JSON.stringify(task, null, 2));
			const url = `${this.TASKS_API_BASE}/lists/${taskListId}/tasks`;
			const result = await this.makeRequest(url, 'POST', task);
			console.log('[Google Tasks API] Task created successfully:', result);
			return result;
		} catch (error) {
			console.error('[Google Tasks API] Error creating task:', error);
			console.error('[Google Tasks API] Task data that failed:', JSON.stringify(task, null, 2));
			throw error;
		}
	}

	/**
	 * Update an existing task.
	 */
	async updateTask(taskId: string, task: TaskItem, taskListId = '@default'): Promise<TaskItem> {
		try {
			if (!this.credentials.clientId || !this.credentials.clientSecret) {
				throw new Error('Google Calendar API credentials not configured');
			}

			const url = `${this.TASKS_API_BASE}/lists/${taskListId}/tasks/${taskId}`;
			return await this.makeRequest(url, 'PUT', task);
		} catch (error) {
			console.error('Error updating task:', error);
			throw error;
		}
	}

	/**
	 * Delete a task.
	 */
	async deleteTask(taskId: string, taskListId = '@default'): Promise<void> {
		try {
			if (!this.credentials.clientId || !this.credentials.clientSecret) {
				throw new Error('Google Calendar API credentials not configured');
			}

			const url = `${this.TASKS_API_BASE}/lists/${taskListId}/tasks/${taskId}`;
			await this.makeRequest(url, 'DELETE');
		} catch (error) {
			console.error('Error deleting task:', error);
			throw error;
		}
	}

	// ========== OAuth Operations ==========

	async startOAuthFlow(): Promise<{ access_token?: string; refresh_token?: string }> {
		try {
			const oauthCredentials: OAuthCredentials = {
				clientId: this.credentials.clientId,
				clientSecret: this.credentials.clientSecret,
			};

			const tokens = await this.oauthServer.startOAuthFlow(oauthCredentials);
			return tokens;
		} catch (error) {
			console.error("OAuth flow error:", error);
			throw error;
		}
	}

	cleanup(): void {
		this.oauthServer.cleanup();
	}
}
