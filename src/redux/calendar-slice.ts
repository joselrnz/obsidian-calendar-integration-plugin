import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { CalendarEvent } from '@services/google-calendar-facade';
import type { GoogleCalendarFacade } from '@services/google-calendar-facade';

/**
 * Calendar state interface.
 */
export interface CalendarState {
	/** All events indexed by ID */
	events: Record<string, CalendarEvent>;
	/** Event IDs for the current date range */
	eventIds: string[];
	/** Loading state */
	loading: boolean;
	/** Error message if any */
	error: string | null;
	/** Last fetch timestamp */
	lastFetch: number | null;
	/** Current date range */
	dateRange: {
		start: string;
		end: string;
	} | null;
}

/**
 * Initial state.
 */
const initialState: CalendarState = {
	events: {},
	eventIds: [],
	loading: false,
	error: null,
	lastFetch: null,
	dateRange: null,
};

/**
 * Async thunk to fetch events.
 */
export const fetchEvents = createAsyncThunk<
	CalendarEvent[],
	{ startDate: string; endDate: string; facade: GoogleCalendarFacade },
	{ rejectValue: string }
>(
	'calendar/fetchEvents',
	async ({ startDate, endDate, facade }, thunkAPI) => {
		try {
			const events = await facade.fetchEvents({ startDate, endDate });
			return events;
		} catch (error) {
			return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch events');
		}
	}
);

/**
 * Async thunk to create an event.
 */
export const createEvent = createAsyncThunk<
	CalendarEvent,
	{ event: Partial<CalendarEvent>; facade: GoogleCalendarFacade },
	{ rejectValue: string }
>(
	'calendar/createEvent',
	async ({ event, facade }, thunkAPI) => {
		try {
			const createdEvent = await facade.createEvent(event);
			return createdEvent;
		} catch (error) {
			return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Failed to create event');
		}
	}
);

/**
 * Async thunk to update an event.
 */
export const updateEvent = createAsyncThunk<
	CalendarEvent,
	{ eventId: string; updates: Partial<CalendarEvent>; facade: GoogleCalendarFacade },
	{ rejectValue: string }
>(
	'calendar/updateEvent',
	async ({ eventId, updates, facade }, thunkAPI) => {
		try {
			const updatedEvent = await facade.updateEvent(eventId, updates);
			return updatedEvent;
		} catch (error) {
			return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Failed to update event');
		}
	}
);

/**
 * Async thunk to delete an event.
 */
export const deleteEvent = createAsyncThunk<
	string,
	{ eventId: string; facade: GoogleCalendarFacade },
	{ rejectValue: string }
>(
	'calendar/deleteEvent',
	async ({ eventId, facade }, thunkAPI) => {
		try {
			await facade.deleteEvent(eventId);
			return eventId;
		} catch (error) {
			return thunkAPI.rejectWithValue(error instanceof Error ? error.message : 'Failed to delete event');
		}
	}
);

/**
 * Calendar slice.
 */
const calendarSlice = createSlice({
	name: 'calendar',
	initialState,
	reducers: {
		/**
		 * Clear all events.
		 */
		clearEvents: (state) => {
			state.events = {};
			state.eventIds = [];
			state.error = null;
		},
		/**
		 * Clear error.
		 */
		clearError: (state) => {
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		// Fetch events
		builder.addCase(fetchEvents.pending, (state) => {
			state.loading = true;
			state.error = null;
		});
		builder.addCase(fetchEvents.fulfilled, (state, action) => {
			state.loading = false;
			state.lastFetch = Date.now();
			state.dateRange = {
				start: action.meta.arg.startDate,
				end: action.meta.arg.endDate,
			};
			// Index events by ID
			const events: Record<string, CalendarEvent> = {};
			const eventIds: string[] = [];
			action.payload.forEach((event) => {
				events[event.id] = event;
				eventIds.push(event.id);
			});
			state.events = events;
			state.eventIds = eventIds;
		});
		builder.addCase(fetchEvents.rejected, (state, action) => {
			state.loading = false;
			state.error = action.payload || 'Failed to fetch events';
		});

		// Create event
		builder.addCase(createEvent.pending, (state) => {
			state.loading = true;
			state.error = null;
		});
		builder.addCase(createEvent.fulfilled, (state, action) => {
			state.loading = false;
			const event = action.payload;
			state.events[event.id] = event;
			state.eventIds.push(event.id);
		});
		builder.addCase(createEvent.rejected, (state, action) => {
			state.loading = false;
			state.error = action.payload || 'Failed to create event';
		});

		// Update event
		builder.addCase(updateEvent.pending, (state) => {
			state.loading = true;
			state.error = null;
		});
		builder.addCase(updateEvent.fulfilled, (state, action) => {
			state.loading = false;
			const event = action.payload;
			state.events[event.id] = event;
		});
		builder.addCase(updateEvent.rejected, (state, action) => {
			state.loading = false;
			state.error = action.payload || 'Failed to update event';
		});

		// Delete event
		builder.addCase(deleteEvent.pending, (state) => {
			state.loading = true;
			state.error = null;
		});
		builder.addCase(deleteEvent.fulfilled, (state, action) => {
			state.loading = false;
			const eventId = action.payload;
			delete state.events[eventId];
			state.eventIds = state.eventIds.filter((id) => id !== eventId);
		});
		builder.addCase(deleteEvent.rejected, (state, action) => {
			state.loading = false;
			state.error = action.payload || 'Failed to delete event';
		});
	},
});

export const { clearEvents, clearError } = calendarSlice.actions;
export default calendarSlice.reducer;

/**
 * Selectors
 */
export const selectAllEvents = (state: { calendar: CalendarState }) =>
	state.calendar.eventIds.map((id) => state.calendar.events[id]);

export const selectEventById = (state: { calendar: CalendarState }, eventId: string) =>
	state.calendar.events[eventId];

export const selectEventsLoading = (state: { calendar: CalendarState }) =>
	state.calendar.loading;

export const selectEventsError = (state: { calendar: CalendarState }) =>
	state.calendar.error;

export const selectLastFetch = (state: { calendar: CalendarState }) =>
	state.calendar.lastFetch;

export const selectDateRange = (state: { calendar: CalendarState }) =>
	state.calendar.dateRange;

