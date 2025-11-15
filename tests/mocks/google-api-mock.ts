import { vi } from 'vitest';
import type { GoogleCalendarAPI } from '../../src/api/google-calendar-api';

/**
 * Create a mock Google Calendar API instance.
 */
export function createMockGoogleCalendarAPI(): GoogleCalendarAPI {
	return {
		getEventsAndTasksForDate: vi.fn().mockResolvedValue({
			events: {
				items: [
					{
						id: 'event-1',
						summary: 'Test Event 1',
						start: { dateTime: '2024-01-15T10:00:00Z' },
						end: { dateTime: '2024-01-15T11:00:00Z' },
					},
					{
						id: 'event-2',
						summary: 'Test Event 2',
						start: { date: '2024-01-15' },
						end: { date: '2024-01-15' },
					},
				],
			},
			tasks: {
				items: [
					{
						id: 'task-1',
						title: 'Test Task 1',
						status: 'needsAction',
						due: '2024-01-15T00:00:00Z',
					},
					{
						id: 'task-2',
						title: 'Test Task 2',
						status: 'completed',
						due: '2024-01-15T00:00:00Z',
						completed: '2024-01-14T12:00:00Z',
					},
				],
			},
		}),

		getEventsAndTasksForDateRange: vi.fn().mockResolvedValue({
			events: {
				items: [
					{
						id: 'event-1',
						summary: 'Test Event 1',
						start: { dateTime: '2024-01-15T10:00:00Z' },
						end: { dateTime: '2024-01-15T11:00:00Z' },
					},
					{
						id: 'event-2',
						summary: 'Test Event 2',
						start: { dateTime: '2024-01-16T14:00:00Z' },
						end: { dateTime: '2024-01-16T15:00:00Z' },
					},
				],
			},
			tasks: {
				items: [
					{
						id: 'task-1',
						title: 'Test Task 1',
						status: 'needsAction',
						due: '2024-01-15T00:00:00Z',
					},
				],
			},
		}),

		authenticate: vi.fn().mockResolvedValue(undefined),
		isAuthenticated: vi.fn().mockReturnValue(true),
		getAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth'),
		handleAuthCallback: vi.fn().mockResolvedValue(undefined),

		// Event CRUD operations
		createEvent: vi.fn().mockImplementation((event: any) =>
			Promise.resolve({
				id: 'new-event-id',
				...event,
			})
		),
		updateEvent: vi.fn().mockImplementation((eventId: string, event: any) =>
			Promise.resolve({
				id: eventId,
				...event,
			})
		),
		deleteEvent: vi.fn().mockResolvedValue(undefined),

		// Task CRUD operations
		createTask: vi.fn().mockImplementation((task: any) =>
			Promise.resolve({
				id: 'new-task-id',
				...task,
			})
		),
		updateTask: vi.fn().mockImplementation((taskId: string, task: any) =>
			Promise.resolve({
				id: taskId,
				...task,
			})
		),
		deleteTask: vi.fn().mockResolvedValue(undefined),
	} as unknown as GoogleCalendarAPI;
}

/**
 * Factory for creating test events.
 */
export function createTestEvent(overrides: any = {}) {
	return {
		id: 'test-event-id',
		summary: 'Test Event',
		description: 'Test event description',
		start: { dateTime: '2024-01-15T10:00:00Z' },
		end: { dateTime: '2024-01-15T11:00:00Z' },
		location: 'Test Location',
		status: 'confirmed',
		...overrides,
	};
}

/**
 * Factory for creating test tasks.
 */
export function createTestTask(overrides: any = {}) {
	return {
		id: 'test-task-id',
		title: 'Test Task',
		notes: 'Test task notes',
		status: 'needsAction',
		due: '2024-01-15T00:00:00Z',
		...overrides,
	};
}

/**
 * Factory for creating all-day test events.
 */
export function createAllDayEvent(overrides: any = {}) {
	return {
		id: 'test-allday-event-id',
		summary: 'All Day Event',
		start: { date: '2024-01-15' },
		end: { date: '2024-01-15' },
		status: 'confirmed',
		...overrides,
	};
}

/**
 * Factory for creating completed test tasks.
 */
export function createCompletedTask(overrides: any = {}) {
	return {
		id: 'test-completed-task-id',
		title: 'Completed Task',
		status: 'completed',
		due: '2024-01-15T00:00:00Z',
		completed: '2024-01-14T12:00:00Z',
		...overrides,
	};
}

