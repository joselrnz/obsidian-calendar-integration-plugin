/**
 * Base interface for all services in the application.
 * Provides common lifecycle methods and error handling.
 */
export interface IService {
	/**
	 * Initialize the service.
	 * Called when the service is first created.
	 */
	initialize(): Promise<void>;

	/**
	 * Cleanup the service.
	 * Called when the service is being destroyed.
	 */
	dispose(): Promise<void>;

	/**
	 * Check if the service is initialized and ready to use.
	 */
	isReady(): boolean;
}

/**
 * Base abstract class for services.
 * Provides common functionality for all services.
 */
export abstract class BaseService implements IService {
	protected _isReady = false;
	protected _isInitializing = false;

	async initialize(): Promise<void> {
		if (this._isReady) {
			return;
		}

		if (this._isInitializing) {
			// Wait for initialization to complete
			await this.waitForReady();
			return;
		}

		this._isInitializing = true;

		try {
			await this.onInitialize();
			this._isReady = true;
		} catch (error) {
			this._isReady = false;
			throw error;
		} finally {
			this._isInitializing = false;
		}
	}

	async dispose(): Promise<void> {
		if (!this._isReady) {
			return;
		}

		try {
			await this.onDispose();
		} finally {
			this._isReady = false;
		}
	}

	isReady(): boolean {
		return this._isReady;
	}

	/**
	 * Override this method to implement service-specific initialization logic.
	 */
	protected abstract onInitialize(): Promise<void>;

	/**
	 * Override this method to implement service-specific cleanup logic.
	 */
	protected abstract onDispose(): Promise<void>;

	/**
	 * Wait for the service to be ready.
	 */
	protected async waitForReady(timeout = 5000): Promise<void> {
		const startTime = Date.now();

		while (!this._isReady && Date.now() - startTime < timeout) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		if (!this._isReady) {
			throw new Error('Service initialization timeout');
		}
	}

	/**
	 * Ensure the service is ready before executing an operation.
	 */
	protected async ensureReady(): Promise<void> {
		if (!this._isReady) {
			await this.initialize();
		}
	}
}

/**
 * Service error class for better error handling.
 */
export class ServiceError extends Error {
	constructor(
		message: string,
		public readonly serviceName: string,
		public readonly originalError?: Error
	) {
		super(message);
		this.name = 'ServiceError';
	}
}

/**
 * Configuration for retry behavior.
 */
export interface RetryConfig {
	/** Maximum number of retry attempts (default: 3) */
	maxRetries?: number;
	/** Initial delay in milliseconds (default: 1000) */
	initialDelay?: number;
	/** Backoff multiplier (default: 2) */
	backoffMultiplier?: number;
	/** Maximum delay in milliseconds (default: 30000) */
	maxDelay?: number;
	/** Whether to add jitter to prevent thundering herd (default: true) */
	useJitter?: boolean;
	/** Custom function to determine if error is retryable */
	isRetryable?: (error: Error) => boolean;
}

/**
 * Default retry configuration.
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
	maxRetries: 3,
	initialDelay: 1000,
	backoffMultiplier: 2,
	maxDelay: 30000,
	useJitter: true,
	isRetryable: (error: Error) => {
		// Retry on network errors, rate limits, and server errors
		const message = error.message.toLowerCase();
		return (
			message.includes('network') ||
			message.includes('timeout') ||
			message.includes('econnreset') ||
			message.includes('enotfound') ||
			message.includes('rate limit') ||
			message.includes('429') ||
			message.includes('500') ||
			message.includes('502') ||
			message.includes('503') ||
			message.includes('504')
		);
	},
};

/**
 * Retry a function with exponential backoff.
 *
 * @param fn - The function to retry
 * @param config - Retry configuration
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	config: RetryConfig = {}
): Promise<T> {
	const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
	let lastError: Error | undefined;
	let attempt = 0;

	while (attempt <= finalConfig.maxRetries) {
		try {
			return await fn();
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Don't retry if this is the last attempt
			if (attempt >= finalConfig.maxRetries) {
				break;
			}

			// Check if error is retryable
			if (!finalConfig.isRetryable(lastError)) {
				throw lastError;
			}

			// Calculate delay with exponential backoff
			const baseDelay = Math.min(
				finalConfig.initialDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
				finalConfig.maxDelay
			);

			// Add jitter if enabled (random value between 0 and baseDelay)
			const delay = finalConfig.useJitter
				? baseDelay * (0.5 + Math.random() * 0.5)
				: baseDelay;

			console.warn(
				`Retry attempt ${attempt + 1}/${finalConfig.maxRetries} after ${Math.round(delay)}ms. Error: ${lastError.message}`
			);

			// Wait before retrying
			await new Promise((resolve) => setTimeout(resolve, delay));
			attempt++;
		}
	}

	// All retries failed
	throw lastError;
}

