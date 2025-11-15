import { configureStore, combineReducers } from '@reduxjs/toolkit';
import calendarReducer from './calendar-slice';
import tasksReducer from './tasks-slice';
import settingsReducer from './settings-slice';
import authReducer from './auth-slice';

/**
 * Root reducer combining all slices.
 */
const rootReducer = combineReducers({
	calendar: calendarReducer,
	tasks: tasksReducer,
	settings: settingsReducer,
	auth: authReducer,
});

/**
 * Create the Redux store.
 *
 * @returns Configured Redux store
 */
export function createStore() {
	const store = configureStore({
		reducer: rootReducer,
		middleware: (getDefaultMiddleware) =>
			getDefaultMiddleware({
				// Disable serializable check for functions in actions
				// (we pass facade instances in thunk arguments)
				serializableCheck: {
					ignoredActionPaths: ['meta.arg.facade', 'payload.facade'],
				},
			}),
		devTools: process.env.NODE_ENV !== 'production',
	});

	return store;
}

/**
 * Infer the `RootState` and `AppDispatch` types from the store itself
 */
export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof createStore>;
export type AppDispatch = AppStore['dispatch'];

