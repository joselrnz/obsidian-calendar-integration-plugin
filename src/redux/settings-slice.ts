/**
 * Settings Slice
 * 
 * Manages plugin settings state including:
 * - Authentication settings
 * - Calendar settings
 * - Task settings
 * - View settings
 * - Notification settings
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Calendar-specific settings
 */
export interface CalendarSettings {
	defaultCalendar: string;
	calendarBlackList: string[];
	refreshInterval: number;
	importStartOffset: number;
	importEndOffset: number;
}

/**
 * Task-specific settings
 */
export interface TaskSettings {
	defaultTaskList: string;
	showCompletedTasks: boolean;
	taskListBlackList: string[];
}

/**
 * View-specific settings
 */
export interface ViewSettings {
	viewMode: 'day' | 'week' | 'month';
	startHour: number;
	endHour: number;
	zoomLevel: number;
	showWeekends: boolean;
	firstDayOfWeek: 'sunday' | 'monday' | 'saturday';
}

/**
 * Notification settings
 */
export interface NotificationSettings {
	useNotification: boolean;
	showNotice: boolean;
	notificationMinutesBefore: number;
}

/**
 * Complete settings state
 */
export interface SettingsState {
	// Authentication
	googleClientId: string;
	googleClientSecret: string;
	googleAccessToken: string;
	googleRefreshToken: string;
	
	// Calendar settings
	calendar: CalendarSettings;
	
	// Task settings
	tasks: TaskSettings;
	
	// View settings
	view: ViewSettings;
	
	// Notification settings
	notifications: NotificationSettings;
	
	// Daily notes integration
	enabledForDailyNotes: boolean;
	
	// Plugin version
	pluginVersion: string;
}

/**
 * Default settings
 */
export const defaultSettings: SettingsState = {
	// Authentication
	googleClientId: '',
	googleClientSecret: '',
	googleAccessToken: '',
	googleRefreshToken: '',
	
	// Calendar settings
	calendar: {
		defaultCalendar: '',
		calendarBlackList: [],
		refreshInterval: 10,
		importStartOffset: 1,
		importEndOffset: 1,
	},
	
	// Task settings
	tasks: {
		defaultTaskList: '',
		showCompletedTasks: true,
		taskListBlackList: [],
	},
	
	// View settings
	view: {
		viewMode: 'week',
		startHour: 6,
		endHour: 22,
		zoomLevel: 2,
		showWeekends: true,
		firstDayOfWeek: 'monday',
	},
	
	// Notification settings
	notifications: {
		useNotification: false,
		showNotice: true,
		notificationMinutesBefore: 15,
	},
	
	// Daily notes integration
	enabledForDailyNotes: true,
	
	// Plugin version
	pluginVersion: '',
};

/**
 * Initial state
 */
const initialState: SettingsState = defaultSettings;

/**
 * Settings slice
 */
export const settingsSlice = createSlice({
	name: 'settings',
	initialState,
	reducers: {
		/**
		 * Load settings from storage
		 */
		settingsLoaded: (state, action: PayloadAction<Partial<SettingsState>>) => {
			return { ...state, ...action.payload };
		},
		
		/**
		 * Update any settings
		 */
		settingsUpdated: (state, action: PayloadAction<Partial<SettingsState>>) => {
			return { ...state, ...action.payload };
		},

		/**
		 * Update calendar settings
		 */
		calendarSettingsUpdated: (state, action: PayloadAction<Partial<CalendarSettings>>) => {
			state.calendar = { ...state.calendar, ...action.payload };
		},

		/**
		 * Update task settings
		 */
		taskSettingsUpdated: (state, action: PayloadAction<Partial<TaskSettings>>) => {
			state.tasks = { ...state.tasks, ...action.payload };
		},

		/**
		 * Update view settings
		 */
		viewSettingsUpdated: (state, action: PayloadAction<Partial<ViewSettings>>) => {
			state.view = { ...state.view, ...action.payload };
		},

		/**
		 * Update notification settings
		 */
		notificationSettingsUpdated: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
			state.notifications = { ...state.notifications, ...action.payload };
		},
	},
});

/**
 * Actions
 */
export const {
	settingsLoaded,
	settingsUpdated,
	calendarSettingsUpdated,
	taskSettingsUpdated,
	viewSettingsUpdated,
	notificationSettingsUpdated,
} = settingsSlice.actions;

/**
 * Selectors
 */

/**
 * Select all settings
 */
export const selectSettings = (state: { settings: SettingsState }) => state.settings;

/**
 * Select calendar settings
 */
export const selectCalendarSettings = (state: { settings: SettingsState }) => state.settings.calendar;

/**
 * Select task settings
 */
export const selectTaskSettings = (state: { settings: SettingsState }) => state.settings.tasks;

/**
 * Select view settings
 */
export const selectViewSettings = (state: { settings: SettingsState }) => state.settings.view;

/**
 * Select notification settings
 */
export const selectNotificationSettings = (state: { settings: SettingsState }) => state.settings.notifications;

/**
 * Select default calendar
 */
export const selectDefaultCalendar = (state: { settings: SettingsState }) => state.settings.calendar.defaultCalendar;

/**
 * Select default task list
 */
export const selectDefaultTaskList = (state: { settings: SettingsState }) => state.settings.tasks.defaultTaskList;

/**
 * Select view mode
 */
export const selectViewMode = (state: { settings: SettingsState }) => state.settings.view.viewMode;

/**
 * Select authentication tokens
 */
export const selectAuthTokens = (state: { settings: SettingsState }) => ({
	accessToken: state.settings.googleAccessToken,
	refreshToken: state.settings.googleRefreshToken,
});

/**
 * Select if authenticated
 */
export const selectIsAuthenticated = (state: { settings: SettingsState }) =>
	!!state.settings.googleAccessToken && !!state.settings.googleRefreshToken;

/**
 * Reducer
 */
export default settingsSlice.reducer;

