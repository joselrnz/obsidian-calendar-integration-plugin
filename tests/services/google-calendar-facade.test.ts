import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoogleCalendarFacade } from '../../src/services/google-calendar-facade';
import { createMockGoogleCalendarAPI } from '../mocks/google-api-mock';

describe('GoogleCalendarFacade', () => {
	let facade: GoogleCalendarFacade;
	let mockAPI: any;

	beforeEach(() => {
		mockAPI = createMockGoogleCalendarAPI();
		facade = new GoogleCalendarFacade(mockAPI);
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
			const invalidFacade = new GoogleCalendarFacade(null as any);
			await expect(invalidFacade.initialize()).rejects.toThrow('Google Calendar API not provided');
		});
	});

	describe('fetchEvents', () => {
		beforeEach(async () => {
			await facade.initialize();
		});

		it('should fetch events for a date range', async () => {
			const events = await facade.fetchEvents({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			expect(events).toHaveLength(2);
			expect(events[0].summary).toBe('Test Event 1');
			expect(events[1].summary).toBe('Test Event 2');
			expect(mockAPI.getEventsAndTasksForDateRange).toHaveBeenCalledWith('2024-01-15', '2024-01-16');
		});

		it('should cache events', async () => {
			// First call
			await facade.fetchEvents({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// Second call (should use cache)
			await facade.fetchEvents({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// API should only be called once
			expect(mockAPI.getEventsAndTasksForDateRange).toHaveBeenCalledTimes(1);
		});

		it('should clear cache when requested', async () => {
			// First call
			await facade.fetchEvents({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// Clear cache
			facade.clearCache();

			// Second call (should not use cache)
			await facade.fetchEvents({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// API should be called twice
			expect(mockAPI.getEventsAndTasksForDateRange).toHaveBeenCalledTimes(2);
		});

		it('should handle API errors', async () => {
			mockAPI.getEventsAndTasksForDateRange.mockRejectedValue(new Error('API Error'));

			await expect(
				facade.fetchEvents({
					startDate: '2024-01-15',
					endDate: '2024-01-16',
				})
			).rejects.toThrow('Failed to fetch events');
		});
	});

	describe('fetchEventsForDate', () => {
		beforeEach(async () => {
			await facade.initialize();
		});

		it('should fetch events for a single date', async () => {
			const events = await facade.fetchEventsForDate('2024-01-15');

			expect(events).toHaveLength(2);
			expect(mockAPI.getEventsAndTasksForDateRange).toHaveBeenCalledWith('2024-01-15', '2024-01-15');
		});
	});

	describe('createEvent', () => {
		beforeEach(async () => {
			await facade.initialize();
		});

		it('should create a new event', async () => {
			const newEvent = {
				summary: 'New Event',
				start: { dateTime: '2024-01-15T10:00:00Z' },
				end: { dateTime: '2024-01-15T11:00:00Z' },
			};

			const createdEvent = await facade.createEvent(newEvent);

			expect(createdEvent.id).toBe('new-event-id');
			expect(createdEvent.summary).toBe('New Event');
			expect(mockAPI.createEvent).toHaveBeenCalledWith(
				expect.objectContaining({
					summary: 'New Event',
					start: { dateTime: '2024-01-15T10:00:00Z' },
					end: { dateTime: '2024-01-15T11:00:00Z' },
				}),
				'primary'
			);
		});

		it('should clear cache after creating event', async () => {
			// Populate cache
			await facade.fetchEvents({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// Create event
			await facade.createEvent({
				summary: 'New Event',
				start: { dateTime: '2024-01-15T10:00:00Z' },
				end: { dateTime: '2024-01-15T11:00:00Z' },
			});

			// Fetch again (should not use cache)
			await facade.fetchEvents({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// API should be called twice (once before create, once after)
			expect(mockAPI.getEventsAndTasksForDateRange).toHaveBeenCalledTimes(2);
		});
	});

	describe('updateEvent', () => {
		beforeEach(async () => {
			await facade.initialize();
		});

		it('should update an existing event', async () => {
			const updates = {
				summary: 'Updated Event',
			};

			const updatedEvent = await facade.updateEvent('event-1', updates);

			expect(updatedEvent.id).toBe('event-1');
			expect(updatedEvent.summary).toBe('Updated Event');
			expect(mockAPI.updateEvent).toHaveBeenCalledWith(
				'event-1',
				expect.objectContaining({
					summary: 'Updated Event',
				}),
				'primary'
			);
		});

		it('should clear cache after updating event', async () => {
			// Populate cache
			await facade.fetchEvents({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// Update event
			await facade.updateEvent('event-1', {
				summary: 'Updated Event',
			});

			// Fetch again (should not use cache)
			await facade.fetchEvents({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// API should be called twice
			expect(mockAPI.getEventsAndTasksForDateRange).toHaveBeenCalledTimes(2);
		});
	});

	describe('deleteEvent', () => {
		beforeEach(async () => {
			await facade.initialize();
		});

		it('should delete an event', async () => {
			await facade.deleteEvent('event-1');

			expect(mockAPI.deleteEvent).toHaveBeenCalledWith('event-1', 'primary');
		});

		it('should clear cache after deleting event', async () => {
			// Populate cache
			await facade.fetchEvents({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// Delete event
			await facade.deleteEvent('event-1');

			// Fetch again (should not use cache)
			await facade.fetchEvents({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			// API should be called twice
			expect(mockAPI.getEventsAndTasksForDateRange).toHaveBeenCalledTimes(2);
		});
	});

	describe('dispose', () => {
		it('should clear cache on dispose', async () => {
			await facade.initialize();

			await facade.fetchEvents({
				startDate: '2024-01-15',
				endDate: '2024-01-16',
			});

			await facade.dispose();

			expect(facade.isReady()).toBe(false);
		});
	});
});

