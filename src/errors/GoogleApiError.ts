/**
 * Custom error class for Google API errors
 * Provides detailed information about failed API requests
 */
export class GoogleApiError extends Error {
	public readonly request: {
		method: string;
		url: string;
		body?: any;
	};
	public readonly status: number;
	public readonly response: any;

	constructor(
		message: string,
		request: { method: string; url: string; body?: any },
		status: number,
		response: any
	) {
		super(message);

		// Set the prototype explicitly for proper instanceof checks
		Object.setPrototypeOf(this, GoogleApiError.prototype);

		this.name = 'GoogleApiError';
		this.request = request;
		this.status = status;
		this.response = response;
	}

	/**
	 * Get a user-friendly error message
	 */
	getUserMessage(): string {
		if (this.status === 401) {
			return 'Authentication failed. Please re-authenticate with Google.';
		}
		if (this.status === 403) {
			return 'Access denied. Please check your Google Calendar permissions.';
		}
		if (this.status === 404) {
			return 'Resource not found. The calendar or event may have been deleted.';
		}
		if (this.status === 429) {
			return 'Too many requests. Please wait a moment and try again.';
		}
		if (this.status >= 500) {
			return 'Google Calendar service is temporarily unavailable. Please try again later.';
		}

		// Try to extract error message from response
		if (this.response?.error?.message) {
			return this.response.error.message;
		}
		if (this.response?.error_description) {
			return this.response.error_description;
		}

		return this.message || 'An unknown error occurred';
	}

	/**
	 * Get detailed error information for debugging
	 */
	getDebugInfo(): string {
		return JSON.stringify(
			{
				message: this.message,
				status: this.status,
				request: {
					method: this.request.method,
					url: this.request.url,
					// Don't include body in debug info for security
				},
				response: this.response,
			},
			null,
			2
		);
	}

	/**
	 * Check if this error is retryable
	 */
	isRetryable(): boolean {
		// Retry on server errors (5xx) and rate limiting (429)
		return this.status >= 500 || this.status === 429;
	}

	/**
	 * Check if this error requires re-authentication
	 */
	requiresAuth(): boolean {
		return this.status === 401;
	}
}

/**
 * Error for OAuth-related failures
 */
export class OAuthError extends Error {
	public readonly code?: string;
	public readonly description?: string;

	constructor(message: string, code?: string, description?: string) {
		super(message);
		Object.setPrototypeOf(this, OAuthError.prototype);

		this.name = 'OAuthError';
		this.code = code;
		this.description = description;
	}

	getUserMessage(): string {
		if (this.code === 'access_denied') {
			return 'Authorization was denied. Please try again and grant the necessary permissions.';
		}
		if (this.code === 'invalid_grant') {
			return 'Your authorization has expired. Please re-authenticate.';
		}
		return this.description || this.message || 'Authentication failed';
	}
}

/**
 * Error for network-related failures
 */
export class NetworkError extends Error {
	public readonly originalError?: Error;

	constructor(message: string, originalError?: Error) {
		super(message);
		Object.setPrototypeOf(this, NetworkError.prototype);

		this.name = 'NetworkError';
		this.originalError = originalError;
	}

	getUserMessage(): string {
		return 'Network error. Please check your internet connection and try again.';
	}
}

/**
 * Error for configuration issues
 */
export class ConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		Object.setPrototypeOf(this, ConfigurationError.prototype);
		this.name = 'ConfigurationError';
	}

	getUserMessage(): string {
		return this.message;
	}
}

