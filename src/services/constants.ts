/**
 * Constants for Calendar Integration Plugin
 * Centralized configuration values for API calls, rate limits, timeouts, etc.
 */

// ============================================================================
// Time Conversion Utilities
// ============================================================================

export const TIME = {
	SECOND_MS: 1000,
	MINUTE_MS: 60 * 1000,
	HOUR_MS: 60 * 60 * 1000,
	DAY_MS: 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// OAuth Constants
// ============================================================================

export const OAUTH_CONSTANTS = {
	// Token refresh buffer - refresh tokens this many ms before they expire
	TOKEN_REFRESH_BUFFER_MS: 5 * TIME.MINUTE_MS,
	
	// Loopback server ports to try for OAuth callback
	CALLBACK_PORTS: [8080, 8081, 8082, 8083, 8084],
	
	// Device code flow polling interval
	DEVICE_CODE_POLL_INTERVAL_MS: 5 * TIME.SECOND_MS,
	
	// OAuth timeout
	OAUTH_TIMEOUT_MS: 5 * TIME.MINUTE_MS,
} as const;

// ============================================================================
// Google Calendar Constants
// ============================================================================

export const GOOGLE_CALENDAR_CONSTANTS = {
	// API Base URL
	API_BASE_URL: 'https://www.googleapis.com/calendar/v3',
	
	// OAuth Scopes
	SCOPES: [
		'https://www.googleapis.com/auth/calendar',
		'https://www.googleapis.com/auth/tasks',
	],
	
	// Refresh Intervals
	REFRESH_INTERVAL_MS: 15 * TIME.MINUTE_MS, // Auto-refresh every 15 minutes
	MIN_MANUAL_REFRESH_INTERVAL_MS: 30 * TIME.SECOND_MS, // Prevent spam clicking
	
	// API Request Limits
	MAX_RESULTS_PER_REQUEST: 2500, // Google Calendar API max
	
	// View Range (how far back/forward to fetch events)
	VIEW_RANGE: {
		DAYS_BEFORE: 30,
		DAYS_AFTER: 90,
	},
	
	// Rate Limiting & Retry Configuration
	RATE_LIMIT: {
		MAX_RETRIES: 3,
		INITIAL_BACKOFF_MS: 1 * TIME.SECOND_MS,
		MAX_BACKOFF_MS: 16 * TIME.SECOND_MS,
		BACKOFF_MULTIPLIER: 2,
	},
	
	// Cache Configuration
	CACHE: {
		EVENT_CACHE_TTL_MS: 15 * TIME.MINUTE_MS, // How long to keep events in cache
		SYNC_TOKEN_TTL_MS: 7 * TIME.DAY_MS, // How long sync tokens are valid
	},
	
	// Default Event Settings
	DEFAULTS: {
		EVENT_DURATION_MINUTES: 60, // Default event duration (1 hour)
		REMINDER_MINUTES: 30, // Default reminder (30 minutes before)
	},
} as const;

// ============================================================================
// Google Tasks Constants
// ============================================================================

export const GOOGLE_TASKS_CONSTANTS = {
	// API Base URL
	API_BASE_URL: 'https://www.googleapis.com/tasks/v1',
	
	// Refresh Intervals
	REFRESH_INTERVAL_MS: 15 * TIME.MINUTE_MS,
	MIN_MANUAL_REFRESH_INTERVAL_MS: 30 * TIME.SECOND_MS,
	
	// API Request Limits
	MAX_RESULTS_PER_REQUEST: 100, // Google Tasks API max
	
	// Rate Limiting & Retry Configuration
	RATE_LIMIT: {
		MAX_RETRIES: 3,
		INITIAL_BACKOFF_MS: 1 * TIME.SECOND_MS,
		MAX_BACKOFF_MS: 16 * TIME.SECOND_MS,
		BACKOFF_MULTIPLIER: 2,
	},
	
	// Cache Configuration
	CACHE: {
		TASK_CACHE_TTL_MS: 15 * TIME.MINUTE_MS,
	},
} as const;

// ============================================================================
// Microsoft Calendar Constants (for future implementation)
// ============================================================================

export const MICROSOFT_CALENDAR_CONSTANTS = {
	// API Base URL
	API_BASE_URL: 'https://graph.microsoft.com/v1.0',
	
	// OAuth Scopes
	SCOPES: [
		'Calendars.ReadWrite',
		'Tasks.ReadWrite',
	],
	
	// Refresh Intervals
	REFRESH_INTERVAL_MS: 15 * TIME.MINUTE_MS,
	MIN_MANUAL_REFRESH_INTERVAL_MS: 30 * TIME.SECOND_MS,
	
	// API Request Limits
	MAX_RESULTS_PER_REQUEST: 1000, // Microsoft Graph API max
	
	// View Range
	VIEW_RANGE: {
		DAYS_BEFORE: 30,
		DAYS_AFTER: 90,
	},
	
	// Rate Limiting & Retry Configuration
	RATE_LIMIT: {
		MAX_RETRIES: 3,
		INITIAL_BACKOFF_MS: 1 * TIME.SECOND_MS,
		MAX_BACKOFF_MS: 16 * TIME.SECOND_MS,
		BACKOFF_MULTIPLIER: 2,
	},
	
	// Cache Configuration
	CACHE: {
		EVENT_CACHE_TTL_MS: 15 * TIME.MINUTE_MS,
		SYNC_TOKEN_TTL_MS: 7 * TIME.DAY_MS,
	},
} as const;

// ============================================================================
// UI Constants
// ============================================================================

export const UI_CONSTANTS = {
	// Debounce delays
	SEARCH_DEBOUNCE_MS: 300,
	RESIZE_DEBOUNCE_MS: 100,
	
	// Animation durations
	MODAL_ANIMATION_MS: 200,
	TOOLTIP_DELAY_MS: 500,
	
	// Notification durations
	SUCCESS_NOTICE_MS: 3 * TIME.SECOND_MS,
	ERROR_NOTICE_MS: 5 * TIME.SECOND_MS,
} as const;

