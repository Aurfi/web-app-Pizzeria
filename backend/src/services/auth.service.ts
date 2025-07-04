import axios from "axios";
import type Redis from "ioredis";
import jwt from "jsonwebtoken";
import type { Pool } from "pg";
import {
	type AuthConfig,
	loadAuthConfig,
	type SSOUser,
	type TokenPayload,
	validateAuthConfig,
} from "../config/auth";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

export class AuthService {
	private config: AuthConfig;
	private jwksCache: Map<string, any> = new Map();

	constructor(
		private db: Pool,
		private redis: Redis,
	) {
		this.config = loadAuthConfig();
		validateAuthConfig(this.config);
	}

	// Generate tokens
	async generateTokens(
		userId: string,
		email: string,
		roles?: string[],
		ssoProvider?: string,
	): Promise<{ accessToken: string; refreshToken: string }> {
		const sessionId = this.generateSessionId();

		const payload: any = {
			userId,
			email,
			roles,
			ssoProvider,
			sessionId,
			iss: this.config.jwt.issuer,
			aud: this.config.jwt.audience,
		};

		const accessToken = (jwt.sign as any)(payload, this.config.jwt.secret, {
			expiresIn: this.config.jwt.expiresIn,
			algorithm: this.config.jwt.algorithm,
		});

		const refreshToken = (jwt.sign as any)({ ...payload, type: "refresh" }, this.config.jwt.secret, {
			expiresIn: this.config.jwt.refreshExpiresIn,
			algorithm: this.config.jwt.algorithm,
		});

		// Store refresh token in Redis
		await this.redis.setex(
			`refresh_token:${sessionId}`,
			7 * 24 * 60 * 60, // 7 days
			JSON.stringify({ userId, email, refreshToken }),
		);

		logger.info("Tokens generated", { userId, sessionId, ssoProvider });

		return { accessToken, refreshToken };
	}

	// Verify token (supports both local and SSO tokens)
	async verifyToken(token: string): Promise<TokenPayload> {
		try {
			// If SSO is enabled and we have a JWKS URI, validate against it
			if (this.config.sso.enabled && this.config.sso.jwksUri) {
				return await this.verifyWithJWKS(token);
			}

			// Otherwise use local verification
			const decoded = jwt.verify(token, this.config.jwt.secret, {
				issuer: this.config.jwt.issuer,
				audience: this.config.jwt.audience,
				algorithms: [this.config.jwt.algorithm],
			}) as TokenPayload;

			return decoded;
		} catch (error) {
			logger.error("Token verification failed", { error });
			throw new AppError("Invalid or expired token", 401);
		}
	}

	// Verify token with JWKS (for SSO)
	private async verifyWithJWKS(token: string): Promise<TokenPayload> {
		try {
			// Get JWKS from cache or fetch
			let jwks = this.jwksCache.get("jwks");
			if (!jwks) {
				const response = await axios.get(this.config.sso.jwksUri!);
				jwks = response.data;
				this.jwksCache.set("jwks", jwks);

				// Cache for 1 hour
				setTimeout(() => this.jwksCache.delete("jwks"), 60 * 60 * 1000);
			}

			// Decode token header to get kid
			const decoded = jwt.decode(token, { complete: true });
			if (!decoded) {
				throw new Error("Invalid token");
			}

			const kid = decoded.header.kid;
			const key = jwks.keys.find((k: any) => k.kid === kid);

			if (!key) {
				throw new Error("Key not found in JWKS");
			}

			// Convert JWK to PEM
			const publicKey = this.jwkToPem(key);

			// Verify with public key
			return jwt.verify(token, publicKey, {
				algorithms: ["RS256"],
			}) as TokenPayload;
		} catch (error) {
			logger.error("JWKS verification failed", { error });
			throw new AppError("Token verification failed", 401);
		}
	}

	// Refresh access token
	async refreshAccessToken(
		refreshToken: string,
	): Promise<{ accessToken: string; refreshToken: string }> {
		try {
			const decoded = jwt.verify(refreshToken, this.config.jwt.secret) as TokenPayload;

			if (decoded.type !== "refresh") {
				throw new Error("Invalid refresh token");
			}

			// Check if refresh token exists in Redis
			const stored = await this.redis.get(`refresh_token:${decoded.sessionId}`);
			if (!stored) {
				throw new Error("Refresh token not found or expired");
			}

			const storedData = JSON.parse(stored);
			if (storedData.refreshToken !== refreshToken) {
				throw new Error("Invalid refresh token");
			}

			// Generate new tokens
			return this.generateTokens(decoded.userId, decoded.email, decoded.roles, decoded.ssoProvider);
		} catch (error) {
			logger.error("Token refresh failed", { error });
			throw new AppError("Invalid refresh token", 401);
		}
	}

	// SSO login flow
	async handleSSOCallback(code: string, _state: string): Promise<{ user: any; tokens: any }> {
		if (!this.config.sso.enabled) {
			throw new AppError("SSO is not enabled", 400);
		}

		try {
			// Exchange code for tokens
			const tokenResponse = await axios.post(this.config.sso.tokenEndpoint!, {
				grant_type: "authorization_code",
				client_id: this.config.sso.clientId,
				client_secret: this.config.sso.clientSecret,
				code,
				redirect_uri: this.config.sso.redirectUri,
			});

			const { access_token, id_token } = tokenResponse.data;

			// Get user info
			const userInfoResponse = await axios.get(this.config.sso.userInfoEndpoint!, {
				headers: {
					Authorization: `Bearer ${access_token}`,
				},
			});

			const ssoUser: SSOUser = userInfoResponse.data;

			// Create or update user in database
			const user = await this.findOrCreateSSOUser(ssoUser);

			// Generate our own tokens
			const tokens = await this.generateTokens(
				user.id,
				user.email,
				ssoUser.roles,
				this.config.sso.provider,
			);

			logger.info("SSO login successful", { userId: user.id, provider: this.config.sso.provider });

			return { user, tokens };
		} catch (error) {
			logger.error("SSO callback failed", { error });
			throw new AppError("SSO authentication failed", 401);
		}
	}

	// Find or create SSO user
	private async findOrCreateSSOUser(ssoUser: SSOUser): Promise<any> {
		const client = await this.db.connect();
		try {
			await client.query("BEGIN");

			// Check if user exists
			let result = await client.query("SELECT * FROM users WHERE email = $1", [ssoUser.email]);

			let user;
			if (result.rows.length === 0) {
				// Create new user
				result = await client.query(
					`INSERT INTO users (email, name, password_hash, email_verified, sso_provider, sso_id) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           RETURNING *`,
					[
						ssoUser.email,
						ssoUser.name || `${ssoUser.given_name} ${ssoUser.family_name}`.trim(),
						"SSO_USER", // Placeholder for SSO users
						ssoUser.email_verified || false,
						this.config.sso.provider,
						ssoUser.id,
					],
				);
				user = result.rows[0];
				logger.info("New SSO user created", { userId: user.id, email: user.email });
			} else {
				user = result.rows[0];

				// Update SSO info if needed
				await client.query(
					`UPDATE users 
           SET sso_provider = $1, sso_id = $2, email_verified = $3, updated_at = NOW() 
           WHERE id = $4`,
					[this.config.sso.provider, ssoUser.id, ssoUser.email_verified || false, user.id],
				);
			}

			await client.query("COMMIT");
			return user;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}

	// Get SSO authorization URL
	getSSOAuthorizationUrl(state: string): string {
		if (!this.config.sso.enabled) {
			throw new AppError("SSO is not enabled", 400);
		}

		const params = new URLSearchParams({
			response_type: "code",
			client_id: this.config.sso.clientId!,
			redirect_uri: this.config.sso.redirectUri!,
			scope: "openid email profile",
			state,
		});

		return `${this.config.sso.authorizationEndpoint}?${params.toString()}`;
	}

	// Logout (revoke tokens)
	async logout(sessionId: string): Promise<void> {
		await this.redis.del(`refresh_token:${sessionId}`);
		logger.info("User logged out", { sessionId });
	}

	// Helper: Generate session ID
	private generateSessionId(): string {
		return require("node:crypto").randomBytes(32).toString("hex");
	}

	// Helper: Convert JWK to PEM
	private jwkToPem(jwk: any): string {
		const forge = require("node-forge");
		const rsa = forge.pki.rsa;
		const BigInteger = forge.jsbn.BigInteger;

		const modulus = new BigInteger(Buffer.from(jwk.n, "base64").toString("hex"), 16);
		const exponent = new BigInteger(Buffer.from(jwk.e, "base64").toString("hex"), 16);

		const publicKey = rsa.setPublicKey(modulus, exponent);
		return forge.pki.publicKeyToPem(publicKey);
	}
}
