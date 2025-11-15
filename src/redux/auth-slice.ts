/**
 * Auth Slice
 * 
 * Manages authentication state including:
 * - OAuth flow
 * - Token management
 * - Token refresh
 * - Logout
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { OAuthServer, type OAuthCredentials, type OAuthTokens } from '@/auth/oauth-server';

/**
 * Authentication state interface
 */
export interface AuthState {
	isAuthenticated: boolean;
	accessToken: string | null;
	refreshToken: string | null;
	expiresAt: number | null;
	error: string | null;
	loading: boolean;
}

/**
 * Initial state
 */
const initialState: AuthState = {
	isAuthenticated: false,
	accessToken: null,
	refreshToken: null,
	expiresAt: null,
	error: null,
	loading: false,
};

/**
 * Async thunk to start OAuth flow
 */
export const startAuthFlow = createAsyncThunk<
	OAuthTokens,
	{ credentials: OAuthCredentials },
	{ rejectValue: string }
>(
	'auth/startAuthFlow',
	async ({ credentials }, thunkAPI) => {
		try {
			const oauthServer = new OAuthServer();
			const tokens = await oauthServer.startOAuthFlow(credentials);
			oauthServer.cleanup();
			return tokens;
		} catch (error) {
			return thunkAPI.rejectWithValue(
				error instanceof Error ? error.message : 'Failed to start auth flow'
			);
		}
	}
);

/**
 * Async thunk to refresh access token
 */
export const refreshAccessToken = createAsyncThunk<
	{ accessToken: string; expiresAt: number },
	{ refreshToken: string; credentials: OAuthCredentials },
	{ rejectValue: string }
>(
	'auth/refreshAccessToken',
	async ({ refreshToken, credentials }, thunkAPI) => {
		try {
			const { requestUrl } = await import('obsidian');

			const response = await requestUrl({
				url: 'https://oauth2.googleapis.com/token',
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					client_id: credentials.clientId,
					client_secret: credentials.clientSecret,
					refresh_token: refreshToken,
					grant_type: 'refresh_token',
				}).toString(),
			});

			const tokens = response.json;

			if (!tokens.access_token) {
				return thunkAPI.rejectWithValue('No access token received');
			}

			const expiresAt = tokens.expiry_date || Date.now() + 3600000;

			return {
				accessToken: tokens.access_token,
				expiresAt,
			};
		} catch (error) {
			return thunkAPI.rejectWithValue(
				error instanceof Error ? error.message : 'Failed to refresh access token'
			);
		}
	}
);

/**
 * Async thunk to logout
 */
export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
	'auth/logout',
	async (_, thunkAPI) => {
		try {
			// Clear any stored tokens
			// This is a placeholder - actual implementation would clear from storage
			return;
		} catch (error) {
			return thunkAPI.rejectWithValue(
				error instanceof Error ? error.message : 'Failed to logout'
			);
		}
	}
);

/**
 * Auth slice
 */
const authSlice = createSlice({
	name: 'auth',
	initialState,
	reducers: {
		/**
		 * Auth started
		 */
		authStarted: (state) => {
			state.loading = true;
			state.error = null;
		},
		
		/**
		 * Auth succeeded
		 */
		authSucceeded: (state, action: PayloadAction<{
			accessToken: string;
			refreshToken: string;
			expiresAt: number;
		}>) => {
			state.isAuthenticated = true;
			state.accessToken = action.payload.accessToken;
			state.refreshToken = action.payload.refreshToken;
			state.expiresAt = action.payload.expiresAt;
			state.loading = false;
			state.error = null;
		},

		/**
		 * Auth failed
		 */
		authFailed: (state, action: PayloadAction<string>) => {
			state.isAuthenticated = false;
			state.loading = false;
			state.error = action.payload;
		},

		/**
		 * Token refreshed
		 */
		tokenRefreshed: (state, action: PayloadAction<{
			accessToken: string;
			expiresAt: number;
		}>) => {
			state.accessToken = action.payload.accessToken;
			state.expiresAt = action.payload.expiresAt;
			state.error = null;
		},

		/**
		 * Logged out
		 */
		loggedOut: (state) => {
			state.isAuthenticated = false;
			state.accessToken = null;
			state.refreshToken = null;
			state.expiresAt = null;
			state.error = null;
			state.loading = false;
		},

		/**
		 * Clear error
		 */
		clearError: (state) => {
			state.error = null;
		},
	},
	extraReducers: (builder) => {
		// startAuthFlow
		builder.addCase(startAuthFlow.pending, (state) => {
			state.loading = true;
			state.error = null;
		});
		builder.addCase(startAuthFlow.fulfilled, (state, action) => {
			const tokens = action.payload;
			state.isAuthenticated = true;
			state.accessToken = tokens.access_token || null;
			state.refreshToken = tokens.refresh_token || null;
			state.expiresAt = tokens.expiry_date || null;
			state.loading = false;
			state.error = null;
		});
		builder.addCase(startAuthFlow.rejected, (state, action) => {
			state.isAuthenticated = false;
			state.loading = false;
			state.error = action.payload || 'Failed to authenticate';
		});

		// refreshAccessToken
		builder.addCase(refreshAccessToken.pending, (state) => {
			state.loading = true;
			state.error = null;
		});
		builder.addCase(refreshAccessToken.fulfilled, (state, action) => {
			state.accessToken = action.payload.accessToken;
			state.expiresAt = action.payload.expiresAt;
			state.loading = false;
			state.error = null;
		});
		builder.addCase(refreshAccessToken.rejected, (state, action) => {
			state.loading = false;
			state.error = action.payload || 'Failed to refresh token';
		});

		// logout
		builder.addCase(logout.pending, (state) => {
			state.loading = true;
		});
		builder.addCase(logout.fulfilled, (state) => {
			state.isAuthenticated = false;
			state.accessToken = null;
			state.refreshToken = null;
			state.expiresAt = null;
			state.error = null;
			state.loading = false;
		});
		builder.addCase(logout.rejected, (state, action) => {
			state.loading = false;
			state.error = action.payload || 'Failed to logout';
		});
	},
});

/**
 * Actions
 */
export const {
	authStarted,
	authSucceeded,
	authFailed,
	tokenRefreshed,
	loggedOut,
	clearError,
} = authSlice.actions;

/**
 * Selectors
 */

/**
 * Select is authenticated
 */
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;

/**
 * Select access token
 */
export const selectAccessToken = (state: { auth: AuthState }) => state.auth.accessToken;

/**
 * Select refresh token
 */
export const selectRefreshToken = (state: { auth: AuthState }) => state.auth.refreshToken;

/**
 * Select token expiry
 */
export const selectTokenExpiry = (state: { auth: AuthState }) => state.auth.expiresAt;

/**
 * Select auth error
 */
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

/**
 * Select auth loading
 */
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;

/**
 * Select if token is expired
 */
export const selectIsTokenExpired = (state: { auth: AuthState }) => {
	if (!state.auth.expiresAt) return true;
	return Date.now() >= state.auth.expiresAt;
};

/**
 * Reducer
 */
export default authSlice.reducer;

