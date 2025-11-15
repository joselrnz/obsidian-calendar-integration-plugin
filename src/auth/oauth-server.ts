import * as http from "http";
import * as url from "url";
import { requestUrl } from "obsidian";

export interface OAuthCredentials {
	clientId: string;
	clientSecret: string;
}

export interface OAuthTokens {
	access_token?: string;
	refresh_token?: string;
	expiry_date?: number;
	[key: string]: any;
}

export class OAuthServer {
	private server: http.Server | null = null;
	private port = 8080;

	private getAuthUrl(credentials: OAuthCredentials): string {
		const params = new URLSearchParams({
			client_id: credentials.clientId,
			redirect_uri: `http://localhost:${this.port}/callback`,
			response_type: 'code',
			scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks',
			access_type: 'offline',
			prompt: 'consent',
		});
		return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
	}

	async startOAuthFlow(credentials: OAuthCredentials): Promise<OAuthTokens> {
		return new Promise((resolve, reject) => {
			this.server = this.createServer(credentials, resolve, reject);
			this.startServer(credentials);
		});
	}

	private createServer(
		credentials: OAuthCredentials,
		resolve: (tokens: OAuthTokens) => void,
		reject: (reason?: Error) => void
	): http.Server {
		return http.createServer((req, res) => {
			req.url &&
				url.parse(req.url, true).pathname === "/callback" &&
				this.handleCallback(req, res, credentials, resolve, reject);
		});
	}

	private handleCallback(
		req: http.IncomingMessage,
		res: http.ServerResponse,
		credentials: OAuthCredentials,
		resolve: (tokens: OAuthTokens) => void,
		reject: (reason?: Error) => void
	): void {
		if (!req.url) return;
		const reqUrl = url.parse(req.url, true);
		const code = reqUrl.query.code as string;
		const error = reqUrl.query.error as string;

		if (error) {
			this.sendErrorResponse(res, `Authorization failed: ${error}`);
			this.closeServer();
			reject(new Error(`Authorization failed: ${error}`));
			return;
		}

		if (code) {
			this.sendSuccessResponse(res);
			this.closeServer();
			this.exchangeCodeForTokens(code, credentials)
				.then(resolve)
				.catch(reject);
		} else {
			this.sendErrorResponse(res, "No authorization code received");
			this.closeServer();
			reject(new Error("No authorization code received"));
		}
	}
	private sendSuccessResponse(res: http.ServerResponse): void {
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(`
			<html>
				<body>
					<h1>Authorization successful!</h1>
					<p>You can close this window and return to Obsidian.</p>
					<script>setTimeout(() => window.close(), 2000);</script>
				</body>
			</html>
		`);
	}
	private sendErrorResponse(res: http.ServerResponse, message: string): void {
		res.writeHead(400, { "Content-Type": "text/html" });
		res.end(`
			<html>
				<body>
					<h1>Authorization failed</h1>
					<p>${message}</p>
					<p>You can close this window and return to Obsidian.</p>
					<script>setTimeout(() => window.close(), 3000);</script>
				</body>
			</html>
		`);
	}

	private startServer(credentials: OAuthCredentials): void {
		this.server?.listen(this.port, () => {
			const authUrl = this.getAuthUrl(credentials);
			window.open(authUrl, "_blank");
		});

		this.server?.on("error", (err) => {
			this.closeServer();
			throw err;
		});
	}

	private async exchangeCodeForTokens(
		code: string,
		credentials: OAuthCredentials
	): Promise<OAuthTokens> {
		try {
			const response = await requestUrl({
				url: 'https://oauth2.googleapis.com/token',
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					code,
					client_id: credentials.clientId,
					client_secret: credentials.clientSecret,
					redirect_uri: `http://localhost:${this.port}/callback`,
					grant_type: 'authorization_code',
				}).toString(),
			});

			return response.json;
		} catch (error) {
			console.error('Error exchanging code for tokens:', error);
			throw error;
		}
	}

	private closeServer(): void {
		if (this.server) {
			this.server.close();
			this.server = null;
		}
	}

	cleanup(): void {
		this.closeServer();
	}
}
