import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry, RetryConfig } from '../../src/services/base-service';

describe('withRetry', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should succeed on first attempt', async () => {
		const fn = vi.fn().mockResolvedValue('success');

		const result = await withRetry(fn);

		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should retry on retryable error', async () => {
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error('Network error'))
			.mockResolvedValueOnce('success');

		const promise = withRetry(fn, { maxRetries: 3, initialDelay: 100 });

		// Fast-forward time to trigger retry
		await vi.advanceTimersByTimeAsync(150);

		const result = await promise;

		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('should retry multiple times with exponential backoff', async () => {
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error('500 server error'))
			.mockRejectedValueOnce(new Error('503 service unavailable'))
			.mockResolvedValueOnce('success');

		const config: RetryConfig = {
			maxRetries: 3,
			initialDelay: 100,
			backoffMultiplier: 2,
			useJitter: false, // Disable jitter for predictable testing
		};

		const promise = withRetry(fn, config);

		// First retry after 100ms
		await vi.advanceTimersByTimeAsync(100);
		// Second retry after 200ms (100 * 2^1)
		await vi.advanceTimersByTimeAsync(200);

		const result = await promise;

		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it('should throw error after max retries', async () => {
		const error = new Error('Network timeout');
		const fn = vi.fn().mockRejectedValue(error);

		const config: RetryConfig = {
			maxRetries: 2,
			initialDelay: 100,
			useJitter: false,
		};

		const promise = withRetry(fn, config).catch((err) => err);

		// First retry
		await vi.advanceTimersByTimeAsync(100);
		// Second retry
		await vi.advanceTimersByTimeAsync(200);

		const result = await promise;
		expect(result).toBeInstanceOf(Error);
		expect(result.message).toBe('Network timeout');
		expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
	});

	it('should not retry on non-retryable error', async () => {
		const error = new Error('Invalid credentials');
		const fn = vi.fn().mockRejectedValue(error);

		await expect(withRetry(fn)).rejects.toThrow('Invalid credentials');
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should respect maxDelay', async () => {
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error('Network error'))
			.mockResolvedValueOnce('success');

		const config: RetryConfig = {
			maxRetries: 3,
			initialDelay: 10000,
			backoffMultiplier: 10,
			maxDelay: 5000,
			useJitter: false,
		};

		const promise = withRetry(fn, config);

		// Should wait maxDelay (5000ms) instead of 10000ms
		await vi.advanceTimersByTimeAsync(5000);

		const result = await promise;

		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('should use custom isRetryable function', async () => {
		const error = new Error('Custom error');
		const fn = vi.fn().mockRejectedValue(error);

		const config: RetryConfig = {
			maxRetries: 2,
			initialDelay: 100,
			isRetryable: (err) => err.message.includes('Custom'),
		};

		const promise = withRetry(fn, config).catch((err) => err);

		// First retry
		await vi.advanceTimersByTimeAsync(100);
		// Second retry
		await vi.advanceTimersByTimeAsync(200);

		const result = await promise;
		expect(result).toBeInstanceOf(Error);
		expect(result.message).toBe('Custom error');
		expect(fn).toHaveBeenCalledTimes(3); // Should retry because custom function returns true
	});

	it('should add jitter when enabled', async () => {
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error('Network error'))
			.mockResolvedValueOnce('success');

		const config: RetryConfig = {
			maxRetries: 3,
			initialDelay: 1000,
			useJitter: true,
		};

		const promise = withRetry(fn, config);

		// With jitter, delay should be between 500ms and 1000ms
		// Let's advance by 1000ms to ensure it triggers
		await vi.advanceTimersByTimeAsync(1000);

		const result = await promise;

		expect(result).toBe('success');
		expect(fn).toHaveBeenCalledTimes(2);
	});
});

