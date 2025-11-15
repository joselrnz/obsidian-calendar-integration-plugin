/**
 * Settings Slice Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import settingsReducer, {
	defaultSettings,
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
	type SettingsState,
} from '@/redux/settings-slice';

describe('Settings Slice', () => {
	let store: ReturnType<typeof configureStore>;

	beforeEach(() => {
		store = configureStore({
			reducer: {
				settings: settingsReducer,
			},
		});
	});

	describe('Initial State', () => {
		it('should have correct initial state', () => {
			const state = store.getState().settings;
			expect(state).toEqual(defaultSettings);
			expect(state.googleClientId).toBe('');
			expect(state.googleClientSecret).toBe('');
			expect(state.calendar.defaultCalendar).toBe('');
			expect(state.tasks.defaultTaskList).toBe('');
			expect(state.view.viewMode).toBe('week');
		});
	});

	describe('settingsLoaded', () => {
		it('should load settings from storage', () => {
			const loadedSettings: Partial<SettingsState> = {
				googleClientId: 'test-client-id',
				googleClientSecret: 'test-client-secret',
				googleAccessToken: 'test-access-token',
				googleRefreshToken: 'test-refresh-token',
			};

			store.dispatch(settingsLoaded(loadedSettings));

			const state = store.getState().settings;
			expect(state.googleClientId).toBe('test-client-id');
			expect(state.googleClientSecret).toBe('test-client-secret');
			expect(state.googleAccessToken).toBe('test-access-token');
			expect(state.googleRefreshToken).toBe('test-refresh-token');
		});

		it('should merge loaded settings with defaults', () => {
			const loadedSettings: Partial<SettingsState> = {
				googleClientId: 'test-client-id',
			};

			store.dispatch(settingsLoaded(loadedSettings));

			const state = store.getState().settings;
			expect(state.googleClientId).toBe('test-client-id');
			expect(state.calendar).toEqual(defaultSettings.calendar);
			expect(state.tasks).toEqual(defaultSettings.tasks);
		});
	});

	describe('settingsUpdated', () => {
		it('should update any settings', () => {
			const updates: Partial<SettingsState> = {
				enabledForDailyNotes: false,
				pluginVersion: '1.0.0',
			};

			store.dispatch(settingsUpdated(updates));

			const state = store.getState().settings;
			expect(state.enabledForDailyNotes).toBe(false);
			expect(state.pluginVersion).toBe('1.0.0');
		});
	});

	describe('calendarSettingsUpdated', () => {
		it('should update calendar settings', () => {
			store.dispatch(calendarSettingsUpdated({
				defaultCalendar: 'primary',
				refreshInterval: 5,
			}));

			const state = store.getState().settings;
			expect(state.calendar.defaultCalendar).toBe('primary');
			expect(state.calendar.refreshInterval).toBe(5);
			expect(state.calendar.importStartOffset).toBe(1); // unchanged
		});

		it('should update calendar blacklist', () => {
			store.dispatch(calendarSettingsUpdated({
				calendarBlackList: ['calendar1', 'calendar2'],
			}));

			const state = store.getState().settings;
			expect(state.calendar.calendarBlackList).toEqual(['calendar1', 'calendar2']);
		});
	});

	describe('taskSettingsUpdated', () => {
		it('should update task settings', () => {
			store.dispatch(taskSettingsUpdated({
				defaultTaskList: 'My Tasks',
				showCompletedTasks: false,
			}));

			const state = store.getState().settings;
			expect(state.tasks.defaultTaskList).toBe('My Tasks');
			expect(state.tasks.showCompletedTasks).toBe(false);
		});

		it('should update task list blacklist', () => {
			store.dispatch(taskSettingsUpdated({
				taskListBlackList: ['list1', 'list2'],
			}));

			const state = store.getState().settings;
			expect(state.tasks.taskListBlackList).toEqual(['list1', 'list2']);
		});
	});

	describe('viewSettingsUpdated', () => {
		it('should update view settings', () => {
			store.dispatch(viewSettingsUpdated({
				viewMode: 'day',
				zoomLevel: 3,
			}));

			const state = store.getState().settings;
			expect(state.view.viewMode).toBe('day');
			expect(state.view.zoomLevel).toBe(3);
		});

		it('should update time range settings', () => {
			store.dispatch(viewSettingsUpdated({
				startHour: 8,
				endHour: 20,
			}));

			const state = store.getState().settings;
			expect(state.view.startHour).toBe(8);
			expect(state.view.endHour).toBe(20);
		});

		it('should update first day of week', () => {
			store.dispatch(viewSettingsUpdated({
				firstDayOfWeek: 'sunday',
			}));

			const state = store.getState().settings;
			expect(state.view.firstDayOfWeek).toBe('sunday');
		});
	});

	describe('notificationSettingsUpdated', () => {
		it('should update notification settings', () => {
			store.dispatch(notificationSettingsUpdated({
				useNotification: true,
				notificationMinutesBefore: 30,
			}));

			const state = store.getState().settings;
			expect(state.notifications.useNotification).toBe(true);
			expect(state.notifications.notificationMinutesBefore).toBe(30);
		});

		it('should toggle show notice', () => {
			store.dispatch(notificationSettingsUpdated({
				showNotice: false,
			}));

			const state = store.getState().settings;
			expect(state.notifications.showNotice).toBe(false);
		});
	});

	describe('Selectors', () => {
		beforeEach(() => {
			// Set up some test data
			store.dispatch(settingsLoaded({
				googleClientId: 'test-client-id',
				googleAccessToken: 'test-access-token',
				googleRefreshToken: 'test-refresh-token',
				calendar: {
					defaultCalendar: 'primary',
					calendarBlackList: [],
					refreshInterval: 10,
					importStartOffset: 1,
					importEndOffset: 1,
				},
				tasks: {
					defaultTaskList: 'My Tasks',
					showCompletedTasks: true,
					taskListBlackList: [],
				},
				view: {
					viewMode: 'week',
					startHour: 6,
					endHour: 22,
					zoomLevel: 2,
					showWeekends: true,
					firstDayOfWeek: 'monday',
				},
			}));
		});

		it('should select all settings', () => {
			const settings = selectSettings(store.getState());
			expect(settings.googleClientId).toBe('test-client-id');
			expect(settings.calendar.defaultCalendar).toBe('primary');
		});

		it('should select calendar settings', () => {
			const calendarSettings = selectCalendarSettings(store.getState());
			expect(calendarSettings.defaultCalendar).toBe('primary');
			expect(calendarSettings.refreshInterval).toBe(10);
		});

		it('should select task settings', () => {
			const taskSettings = selectTaskSettings(store.getState());
			expect(taskSettings.defaultTaskList).toBe('My Tasks');
			expect(taskSettings.showCompletedTasks).toBe(true);
		});

		it('should select view settings', () => {
			const viewSettings = selectViewSettings(store.getState());
			expect(viewSettings.viewMode).toBe('week');
			expect(viewSettings.zoomLevel).toBe(2);
		});

		it('should select notification settings', () => {
			const notificationSettings = selectNotificationSettings(store.getState());
			expect(notificationSettings.useNotification).toBe(false);
			expect(notificationSettings.showNotice).toBe(true);
		});

		it('should select default calendar', () => {
			const defaultCalendar = selectDefaultCalendar(store.getState());
			expect(defaultCalendar).toBe('primary');
		});

		it('should select default task list', () => {
			const defaultTaskList = selectDefaultTaskList(store.getState());
			expect(defaultTaskList).toBe('My Tasks');
		});

		it('should select view mode', () => {
			const viewMode = selectViewMode(store.getState());
			expect(viewMode).toBe('week');
		});

		it('should select auth tokens', () => {
			const tokens = selectAuthTokens(store.getState());
			expect(tokens.accessToken).toBe('test-access-token');
			expect(tokens.refreshToken).toBe('test-refresh-token');
		});

		it('should select is authenticated', () => {
			const isAuthenticated = selectIsAuthenticated(store.getState());
			expect(isAuthenticated).toBe(true);
		});

		it('should return false for is authenticated when no tokens', () => {
			const newStore = configureStore({
				reducer: {
					settings: settingsReducer,
				},
			});

			const isAuthenticated = selectIsAuthenticated(newStore.getState());
			expect(isAuthenticated).toBe(false);
		});
	});
});

