/**
 * Custom Error Classes for Calendar Integration Plugin
 * Provides typed errors with user-friendly messages
 */

// ============================================================================
// Base Error Class
// ============================================================================

export class CalendarIntegrationError extends Error {
	constructor(
		message: string,
		public readonly code?: string,
		public readonly context?: Record<string, any>
	) {
		super(message);
		this.name = 'CalendarIntegrationError';
		
		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}

// ============================================================================
// OAuth Errors
// ============================================================================

export class OAuthError extends CalendarIntegrationError {
	constructor(
		message: string,
		public readonly provider: string,
		code?: string,
		context?: Record<string, any>
	) {
		super(message, code, context);
		this.name = 'OAuthError';
	}
}

export class TokenExpiredError extends OAuthError {
	constructor(provider: string) {
		super(
			`Your ${provider} authentication has expired. Please reconnect in settings.`,
			provider,
			'TOKEN_EXPIRED'
		);
		this.name = 'TokenExpiredError';
	}
}

export class OAuthNotConfiguredError extends OAuthError {
	constructor(provider: string) {
		super(
			`${provider} is not configured. Please set up authentication in settings.`,
			provider,
			'OAUTH_NOT_CONFIGURED'
		);
		this.name = 'OAuthNotConfiguredError';
	}
}

// ============================================================================
// Google Calendar Errors
// ============================================================================

export class GoogleCalendarError extends CalendarIntegrationError {
	constructor(
		message: string,
		public readonly statusCode?: number,
		code?: string,
		context?: Record<string, any>
	) {
		super(message, code, context);
		this.name = 'GoogleCalendarError';
	}
}

export class EventNotFoundError extends GoogleCalendarError {
	constructor(eventId: string, calendarId?: string) {
		super(
			`Event not found: ${eventId}`,
			404,
			'EVENT_NOT_FOUND',
			{ eventId, calendarId }
		);
		this.name = 'EventNotFoundError';
	}
}

export class CalendarNotFoundError extends GoogleCalendarError {
	constructor(calendarId: string) {
		super(
			`Calendar not found: ${calendarId}`,
			404,
			'CALENDAR_NOT_FOUND',
			{ calendarId }
		);
		this.name = 'CalendarNotFoundError';
	}
}

export class RateLimitError extends GoogleCalendarError {
	constructor(
		public readonly retryAfter?: number,
		provider: string = 'Google Calendar'
	) {
		const message = retryAfter
			? `Rate limit exceeded for ${provider}. Please try again in ${retryAfter} seconds.`
			: `Rate limit exceeded for ${provider}. Please wait a moment and try again.`;
		
		super(message, 429, 'RATE_LIMIT', { retryAfter, provider });
		this.name = 'RateLimitError';
	}
}

// ============================================================================
// Network Errors
// ============================================================================

export class NetworkError extends CalendarIntegrationError {
	constructor(
		message: string,
		public readonly originalError?: Error,
		context?: Record<string, any>
	) {
		super(message, 'NETWORK_ERROR', context);
		this.name = 'NetworkError';
	}
}

// ============================================================================
// Validation Errors
// ============================================================================

export class ValidationError extends CalendarIntegrationError {
	constructor(
		message: string,
		public readonly field?: string,
		public readonly value?: any
	) {
		super(message, 'VALIDATION_ERROR', { field, value });
		this.name = 'ValidationError';
	}
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determines if an error is retriable (e.g., network errors, 5xx errors)
 */
export function isRetriableError(error: Error): boolean {
	// Network errors are retriable
	if (error instanceof NetworkError) {
		return true;
	}
	
	// Google Calendar errors with 5xx status codes are retriable
	if (error instanceof GoogleCalendarError) {
		return error.statusCode ? error.statusCode >= 500 : false;
	}
	
	// Rate limit errors are retriable (with backoff)
	if (error instanceof RateLimitError) {
		return true;
	}
	
	return false;
}

/**
 * Converts any error into a user-friendly message
 */
export function getUserFriendlyMessage(error: Error): string {
	// Token expired
	if (error instanceof TokenExpiredError) {
		return `Your ${error.provider} connection has expired. Please reconnect in settings.`;
	}
	
	// OAuth not configured
	if (error instanceof OAuthNotConfiguredError) {
		return `Please configure ${error.provider} in settings to use this feature.`;
	}
	
	// Rate limit
	if (error instanceof RateLimitError) {
		return error.retryAfter
			? `Too many requests. Please try again in ${error.retryAfter} seconds.`
			: 'Too many requests. Please wait a moment and try again.';
	}
	
	// Event not found
	if (error instanceof EventNotFoundError) {
		return 'Event not found. It may have been deleted.';
	}
	
	// Calendar not found
	if (error instanceof CalendarNotFoundError) {
		return 'Calendar not found. Please check your calendar settings.';
	}
	
	// Network error
	if (error instanceof NetworkError) {
		return 'Network error. Please check your internet connection and try again.';
	}
	
	// Validation error
	if (error instanceof ValidationError) {
		return error.message; // Validation errors already have user-friendly messages
	}
	
	// Generic Google Calendar error
	if (error instanceof GoogleCalendarError) {
		return error.message || 'An error occurred with Google Calendar. Please try again.';
	}
	
	// Generic OAuth error
	if (error instanceof OAuthError) {
		return error.message || 'Authentication error. Please reconnect in settings.';
	}
	
	// Unknown error
	return error.message || 'An unexpected error occurred. Please try again.';
}

