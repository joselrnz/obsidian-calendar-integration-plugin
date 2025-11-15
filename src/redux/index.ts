/**
 * Redux state management exports.
 */

// Store
export { createStore } from './store';
export type { RootState, AppStore, AppDispatch } from './store';

// Hooks - removed Svelte store integration

// Calendar slice
export {
	fetchEvents,
	createEvent,
	updateEvent,
	deleteEvent,
	clearEvents,
	clearError as clearCalendarError,
	selectAllEvents,
	selectEventById,
	selectEventsLoading,
	selectEventsError,
	selectLastFetch as selectEventsLastFetch,
	selectDateRange as selectEventsDateRange,
} from './calendar-slice';
export type { CalendarState } from './calendar-slice';

// Tasks slice
export {
	fetchTasks,
	createTask,
	updateTask,
	deleteTask,
	completeTask,
	clearTasks,
	clearError as clearTasksError,
	selectAllTasks,
	selectTaskById,
	selectTasksLoading,
	selectTasksError,
	selectLastFetch as selectTasksLastFetch,
	selectDateRange as selectTasksDateRange,
	selectCompletedTasks,
	selectPendingTasks,
} from './tasks-slice';
export type { TasksState } from './tasks-slice';

// Settings slice
export {
	settingsLoaded,
	settingsUpdated,
	calendarSettingsUpdated,
	taskSettingsUpdated,
	viewSettingsUpdated,
	notificationSettingsUpdated,
	selectSettings,
	selectCalendarSettings,
	selectTaskSettings,
	selectViewSettings,
	selectNotificationSettings,
	selectDefaultCalendar,
	selectDefaultTaskList,
	selectViewMode,
	selectAuthTokens,
	selectIsAuthenticated,
	defaultSettings,
} from './settings-slice';
export type {
	SettingsState,
	CalendarSettings,
	TaskSettings,
	ViewSettings,
	NotificationSettings,
} from './settings-slice';

// Auth slice
export {
	authStarted,
	authSucceeded,
	authFailed,
	tokenRefreshed,
	loggedOut,
	clearError as clearAuthError,
	startAuthFlow,
	refreshAccessToken,
	logout,
	selectIsAuthenticated as selectAuthIsAuthenticated,
	selectAccessToken,
	selectRefreshToken,
	selectTokenExpiry,
	selectAuthError,
	selectAuthLoading,
	selectIsTokenExpired,
} from './auth-slice';
export type { AuthState } from './auth-slice';
