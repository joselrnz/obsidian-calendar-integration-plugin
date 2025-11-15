/**
 * Auth Slice Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
	authStarted,
	authSucceeded,
	authFailed,
	tokenRefreshed,
	loggedOut,
	clearError,
	startAuthFlow,
	refreshAccessToken,
	logout,
	selectIsAuthenticated,
	selectAccessToken,
	selectRefreshToken,
	selectTokenExpiry,
	selectAuthError,
	selectAuthLoading,
	selectIsTokenExpired,
	type AuthState,
} from '@/redux/auth-slice';

describe('Auth Slice', () => {
	let store: ReturnType<typeof configureStore>;

	beforeEach(() => {
		store = configureStore({
			reducer: {
				auth: authReducer,
			},
		});
	});

	describe('Initial State', () => {
		it('should have correct initial state', () => {
			const state = store.getState().auth;
			expect(state.isAuthenticated).toBe(false);
			expect(state.accessToken).toBeNull();
			expect(state.refreshToken).toBeNull();
			expect(state.expiresAt).toBeNull();
			expect(state.error).toBeNull();
			expect(state.loading).toBe(false);
		});
	});

	describe('authStarted', () => {
		it('should set loading to true and clear error', () => {
			// Set initial error
			store.dispatch(authFailed('Test error'));
			
			store.dispatch(authStarted());

			const state = store.getState().auth;
			expect(state.loading).toBe(true);
			expect(state.error).toBeNull();
		});
	});

	describe('authSucceeded', () => {
		it('should set authentication state with tokens', () => {
			const tokens = {
				accessToken: 'test-access-token',
				refreshToken: 'test-refresh-token',
				expiresAt: Date.now() + 3600000,
			};

			store.dispatch(authSucceeded(tokens));

			const state = store.getState().auth;
			expect(state.isAuthenticated).toBe(true);
			expect(state.accessToken).toBe('test-access-token');
			expect(state.refreshToken).toBe('test-refresh-token');
			expect(state.expiresAt).toBe(tokens.expiresAt);
			expect(state.loading).toBe(false);
			expect(state.error).toBeNull();
		});
	});

	describe('authFailed', () => {
		it('should set error and clear authentication', () => {
			// First authenticate
			store.dispatch(authSucceeded({
				accessToken: 'test-token',
				refreshToken: 'test-refresh',
				expiresAt: Date.now() + 3600000,
			}));

			store.dispatch(authFailed('Authentication failed'));

			const state = store.getState().auth;
			expect(state.isAuthenticated).toBe(false);
			expect(state.loading).toBe(false);
			expect(state.error).toBe('Authentication failed');
		});
	});

	describe('tokenRefreshed', () => {
		it('should update access token and expiry', () => {
			// First authenticate
			store.dispatch(authSucceeded({
				accessToken: 'old-token',
				refreshToken: 'test-refresh',
				expiresAt: Date.now() + 1000,
			}));

			const newExpiry = Date.now() + 3600000;
			store.dispatch(tokenRefreshed({
				accessToken: 'new-token',
				expiresAt: newExpiry,
			}));

			const state = store.getState().auth;
			expect(state.accessToken).toBe('new-token');
			expect(state.expiresAt).toBe(newExpiry);
			expect(state.refreshToken).toBe('test-refresh'); // unchanged
			expect(state.error).toBeNull();
		});
	});

	describe('loggedOut', () => {
		it('should clear all authentication state', () => {
			// First authenticate
			store.dispatch(authSucceeded({
				accessToken: 'test-token',
				refreshToken: 'test-refresh',
				expiresAt: Date.now() + 3600000,
			}));

			store.dispatch(loggedOut());

			const state = store.getState().auth;
			expect(state.isAuthenticated).toBe(false);
			expect(state.accessToken).toBeNull();
			expect(state.refreshToken).toBeNull();
			expect(state.expiresAt).toBeNull();
			expect(state.error).toBeNull();
			expect(state.loading).toBe(false);
		});
	});

	describe('clearError', () => {
		it('should clear error state', () => {
			store.dispatch(authFailed('Test error'));

			store.dispatch(clearError());

			const state = store.getState().auth;
			expect(state.error).toBeNull();
		});
	});

	describe('startAuthFlow async thunk', () => {
		it('should set loading to true when pending', () => {
			store.dispatch({
				type: startAuthFlow.pending.type,
			});

			const state = store.getState().auth;
			expect(state.loading).toBe(true);
			expect(state.error).toBeNull();
		});

		it('should set authentication state when fulfilled', () => {
			const tokens = {
				access_token: 'test-access-token',
				refresh_token: 'test-refresh-token',
				expiry_date: Date.now() + 3600000,
			};

			store.dispatch({
				type: startAuthFlow.fulfilled.type,
				payload: tokens,
			});

			const state = store.getState().auth;
			expect(state.isAuthenticated).toBe(true);
			expect(state.accessToken).toBe('test-access-token');
			expect(state.refreshToken).toBe('test-refresh-token');
			expect(state.expiresAt).toBe(tokens.expiry_date);
			expect(state.loading).toBe(false);
			expect(state.error).toBeNull();
		});

		it('should set error when rejected', () => {
			store.dispatch({
				type: startAuthFlow.rejected.type,
				payload: 'Auth flow failed',
			});

			const state = store.getState().auth;
			expect(state.isAuthenticated).toBe(false);
			expect(state.loading).toBe(false);
			expect(state.error).toBe('Auth flow failed');
		});

		it('should use default error message when no payload', () => {
			store.dispatch({
				type: startAuthFlow.rejected.type,
			});

			const state = store.getState().auth;
			expect(state.error).toBe('Failed to authenticate');
		});
	});

	describe('refreshAccessToken async thunk', () => {
		it('should set loading to true when pending', () => {
			store.dispatch({
				type: refreshAccessToken.pending.type,
			});

			const state = store.getState().auth;
			expect(state.loading).toBe(true);
			expect(state.error).toBeNull();
		});

		it('should update access token when fulfilled', () => {
			const newExpiry = Date.now() + 3600000;

			store.dispatch({
				type: refreshAccessToken.fulfilled.type,
				payload: {
					accessToken: 'new-access-token',
					expiresAt: newExpiry,
				},
			});

			const state = store.getState().auth;
			expect(state.accessToken).toBe('new-access-token');
			expect(state.expiresAt).toBe(newExpiry);
			expect(state.loading).toBe(false);
			expect(state.error).toBeNull();
		});

		it('should set error when rejected', () => {
			store.dispatch({
				type: refreshAccessToken.rejected.type,
				payload: 'Token refresh failed',
			});

			const state = store.getState().auth;
			expect(state.loading).toBe(false);
			expect(state.error).toBe('Token refresh failed');
		});
	});

	describe('logout async thunk', () => {
		it('should set loading to true when pending', () => {
			store.dispatch({
				type: logout.pending.type,
			});

			const state = store.getState().auth;
			expect(state.loading).toBe(true);
		});

		it('should clear all state when fulfilled', () => {
			// First authenticate
			store.dispatch(authSucceeded({
				accessToken: 'test-token',
				refreshToken: 'test-refresh',
				expiresAt: Date.now() + 3600000,
			}));

			store.dispatch({
				type: logout.fulfilled.type,
			});

			const state = store.getState().auth;
			expect(state.isAuthenticated).toBe(false);
			expect(state.accessToken).toBeNull();
			expect(state.refreshToken).toBeNull();
			expect(state.expiresAt).toBeNull();
			expect(state.error).toBeNull();
			expect(state.loading).toBe(false);
		});

		it('should set error when rejected', () => {
			store.dispatch({
				type: logout.rejected.type,
				payload: 'Logout failed',
			});

			const state = store.getState().auth;
			expect(state.loading).toBe(false);
			expect(state.error).toBe('Logout failed');
		});
	});

	describe('Selectors', () => {
		beforeEach(() => {
			// Set up authenticated state
			store.dispatch(authSucceeded({
				accessToken: 'test-access-token',
				refreshToken: 'test-refresh-token',
				expiresAt: Date.now() + 3600000,
			}));
		});

		it('should select is authenticated', () => {
			const isAuthenticated = selectIsAuthenticated(store.getState());
			expect(isAuthenticated).toBe(true);
		});

		it('should select access token', () => {
			const accessToken = selectAccessToken(store.getState());
			expect(accessToken).toBe('test-access-token');
		});

		it('should select refresh token', () => {
			const refreshToken = selectRefreshToken(store.getState());
			expect(refreshToken).toBe('test-refresh-token');
		});

		it('should select token expiry', () => {
			const expiry = selectTokenExpiry(store.getState());
			expect(expiry).toBeGreaterThan(Date.now());
		});

		it('should select auth error', () => {
			store.dispatch(authFailed('Test error'));
			const error = selectAuthError(store.getState());
			expect(error).toBe('Test error');
		});

		it('should select auth loading', () => {
			store.dispatch(authStarted());
			const loading = selectAuthLoading(store.getState());
			expect(loading).toBe(true);
		});

		it('should select is token expired (false)', () => {
			const isExpired = selectIsTokenExpired(store.getState());
			expect(isExpired).toBe(false);
		});

		it('should select is token expired (true)', () => {
			// Set expired token
			store.dispatch(authSucceeded({
				accessToken: 'test-token',
				refreshToken: 'test-refresh',
				expiresAt: Date.now() - 1000, // expired
			}));

			const isExpired = selectIsTokenExpired(store.getState());
			expect(isExpired).toBe(true);
		});

		it('should select is token expired (true when no expiry)', () => {
			const newStore = configureStore({
				reducer: {
					auth: authReducer,
				},
			});

			const isExpired = selectIsTokenExpired(newStore.getState());
			expect(isExpired).toBe(true);
		});
	});
});

