import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import calendarReducer, {
	fetchEvents,
	createEvent,
	updateEvent,
	deleteEvent,
	clearEvents,
	clearError,
	selectAllEvents,
	selectEventById,
	selectEventsLoading,
	selectEventsError,
} from '../../src/redux/calendar-slice';
import type { CalendarState } from '../../src/redux/calendar-slice';
import { createMockGoogleCalendarAPI, createTestEvent } from '../mocks/google-api-mock';
import { GoogleCalendarFacade } from '../../src/services/google-calendar-facade';

describe('Calendar Slice', () => {
	let store: ReturnType<typeof configureStore>;
	let mockAPI: ReturnType<typeof createMockGoogleCalendarAPI>;
	let facade: GoogleCalendarFacade;

	beforeEach(() => {
		mockAPI = createMockGoogleCalendarAPI();
		facade = new GoogleCalendarFacade(mockAPI as any);

		store = configureStore({
			reducer: {
				calendar: calendarReducer,
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
			const state = store.getState().calendar;
			expect(state.events).toEqual({});
			expect(state.eventIds).toEqual([]);
			expect(state.loading).toBe(false);
			expect(state.error).toBe(null);
			expect(state.lastFetch).toBe(null);
			expect(state.dateRange).toBe(null);
		});
	});

	describe('Reducers', () => {
		it('should clear events', () => {
			// Add some events first
			store.dispatch({
				type: fetchEvents.fulfilled.type,
				payload: [createTestEvent({ id: 'event-1' })],
				meta: { arg: { startDate: '2024-01-15', endDate: '2024-01-16' } },
			});

			// Clear events
			store.dispatch(clearEvents());

			const state = store.getState().calendar;
			expect(state.events).toEqual({});
			expect(state.eventIds).toEqual([]);
			expect(state.error).toBe(null);
		});

		it('should clear error', () => {
			// Set an error first
			store.dispatch({
				type: fetchEvents.rejected.type,
				payload: 'Test error',
			});

			// Clear error
			store.dispatch(clearError());

			const state = store.getState().calendar;
			expect(state.error).toBe(null);
		});
	});

	describe('fetchEvents', () => {
		it('should set loading to true when pending', () => {
			store.dispatch({
				type: fetchEvents.pending.type,
			});

			const state = store.getState().calendar;
			expect(state.loading).toBe(true);
			expect(state.error).toBe(null);
		});

		it('should store events when fulfilled', () => {
			const events = [
				createTestEvent({ id: 'event-1', summary: 'Event 1' }),
				createTestEvent({ id: 'event-2', summary: 'Event 2' }),
			];

			store.dispatch({
				type: fetchEvents.fulfilled.type,
				payload: events,
				meta: { arg: { startDate: '2024-01-15', endDate: '2024-01-16' } },
			});

			const state = store.getState().calendar;
			expect(state.loading).toBe(false);
			expect(state.eventIds).toEqual(['event-1', 'event-2']);
			expect(state.events['event-1'].summary).toBe('Event 1');
			expect(state.events['event-2'].summary).toBe('Event 2');
			expect(state.lastFetch).toBeGreaterThan(0);
			expect(state.dateRange).toEqual({
				start: '2024-01-15',
				end: '2024-01-16',
			});
		});

		it('should set error when rejected', () => {
			store.dispatch({
				type: fetchEvents.rejected.type,
				payload: 'Failed to fetch events',
			});

			const state = store.getState().calendar;
			expect(state.loading).toBe(false);
			expect(state.error).toBe('Failed to fetch events');
		});

		it('should fetch events via thunk', async () => {
			await facade.initialize();

			const result = await store.dispatch(
				fetchEvents({
					startDate: '2024-01-15',
					endDate: '2024-01-16',
					facade,
				})
			);

			expect(result.type).toBe(fetchEvents.fulfilled.type);
			const state = store.getState().calendar;
			expect(state.eventIds.length).toBeGreaterThan(0);
		});
	});

	describe('createEvent', () => {
		it('should add event when fulfilled', () => {
			const newEvent = createTestEvent({ id: 'new-event', summary: 'New Event' });

			store.dispatch({
				type: createEvent.fulfilled.type,
				payload: newEvent,
			});

			const state = store.getState().calendar;
			expect(state.events['new-event']).toBeDefined();
			expect(state.events['new-event'].summary).toBe('New Event');
			expect(state.eventIds).toContain('new-event');
		});
	});

	describe('updateEvent', () => {
		it('should update event when fulfilled', () => {
			// Add event first
			const event = createTestEvent({ id: 'event-1', summary: 'Original' });
			store.dispatch({
				type: createEvent.fulfilled.type,
				payload: event,
			});

			// Update event
			const updatedEvent = createTestEvent({ id: 'event-1', summary: 'Updated' });
			store.dispatch({
				type: updateEvent.fulfilled.type,
				payload: updatedEvent,
			});

			const state = store.getState().calendar;
			expect(state.events['event-1'].summary).toBe('Updated');
		});
	});

	describe('deleteEvent', () => {
		it('should remove event when fulfilled', () => {
			// Add event first
			const event = createTestEvent({ id: 'event-1', summary: 'To Delete' });
			store.dispatch({
				type: createEvent.fulfilled.type,
				payload: event,
			});

			// Delete event
			store.dispatch({
				type: deleteEvent.fulfilled.type,
				payload: 'event-1',
			});

			const state = store.getState().calendar;
			expect(state.events['event-1']).toBeUndefined();
			expect(state.eventIds).not.toContain('event-1');
		});
	});

	describe('Selectors', () => {
		beforeEach(() => {
			const events = [
				createTestEvent({ id: 'event-1', summary: 'Event 1' }),
				createTestEvent({ id: 'event-2', summary: 'Event 2' }),
			];

			store.dispatch({
				type: fetchEvents.fulfilled.type,
				payload: events,
				meta: { arg: { startDate: '2024-01-15', endDate: '2024-01-16' } },
			});
		});

		it('should select all events', () => {
			const state = store.getState();
			const events = selectAllEvents(state);
			expect(events).toHaveLength(2);
			expect(events[0].id).toBe('event-1');
			expect(events[1].id).toBe('event-2');
		});

		it('should select event by id', () => {
			const state = store.getState();
			const event = selectEventById(state, 'event-1');
			expect(event).toBeDefined();
			expect(event.summary).toBe('Event 1');
		});

		it('should select loading state', () => {
			store.dispatch({
				type: fetchEvents.pending.type,
			});

			const state = store.getState();
			expect(selectEventsLoading(state)).toBe(true);
		});

		it('should select error state', () => {
			store.dispatch({
				type: fetchEvents.rejected.type,
				payload: 'Test error',
			});

			const state = store.getState();
			expect(selectEventsError(state)).toBe('Test error');
		});
	});
});

