import type { JwtPayload } from "jsonwebtoken";

export interface AuthConfig {
	// JWT Configuration
	jwt: {
		secret: string;
		publicKey?: string;
		algorithm: "HS256" | "RS256";
		expiresIn: string;
		refreshExpiresIn: string;
		issuer: string;
		audience: string;
	};

	// SSO Configuration (Authentik compatible)
	sso: {
		enabled: boolean;
		provider: "authentik" | "keycloak" | "auth0" | "none";
		baseUrl?: string;
		realm?: string;
		clientId?: string;
		clientSecret?: string;
		redirectUri?: string;
		jwksUri?: string;
		userInfoEndpoint?: string;
		tokenEndpoint?: string;
		authorizationEndpoint?: string;
		introspectionEndpoint?: string;
	};

	// Session Configuration
	session: {
		cookieName: string;
		secure: boolean;
		httpOnly: boolean;
		sameSite: "strict" | "lax" | "none";
		maxAge: number;
	};
}

export interface SSOUser {
	id: string;
	email: string;
	name?: string;
	given_name?: string;
	family_name?: string;
	picture?: string;
	email_verified?: boolean;
	groups?: string[];
	roles?: string[];
	[key: string]: string | string[] | boolean | undefined;
}

export interface TokenPayload extends JwtPayload {
	userId: string;
	email: string;
	roles?: string[];
	groups?: string[];
	ssoProvider?: string;
	sessionId?: string;
	type?: string;
}

// Load configuration from environment
export function loadAuthConfig(): AuthConfig {
	const isProduction = process.env.NODE_ENV === "production";

	return {
		jwt: {
			secret: process.env.JWT_SECRET || generateSecureSecret(),
			publicKey: process.env.JWT_PUBLIC_KEY,
			algorithm: (process.env.JWT_ALGORITHM as "HS256" | "RS256") || "HS256",
			expiresIn: process.env.JWT_EXPIRES_IN || "1h",
			refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
			issuer: process.env.JWT_ISSUER || "foodflow-api",
			audience: process.env.JWT_AUDIENCE || "foodflow-app",
		},
		sso: {
			enabled: process.env.SSO_ENABLED === "true",
			provider: (process.env.SSO_PROVIDER as "authentik" | "keycloak" | "auth0" | "none") || "none",
			baseUrl: process.env.SSO_BASE_URL,
			realm: process.env.SSO_REALM,
			clientId: process.env.SSO_CLIENT_ID,
			clientSecret: process.env.SSO_CLIENT_SECRET,
			redirectUri: process.env.SSO_REDIRECT_URI,
			jwksUri: process.env.SSO_JWKS_URI,
			userInfoEndpoint: process.env.SSO_USERINFO_ENDPOINT,
			tokenEndpoint: process.env.SSO_TOKEN_ENDPOINT,
			authorizationEndpoint: process.env.SSO_AUTHORIZATION_ENDPOINT,
			introspectionEndpoint: process.env.SSO_INTROSPECTION_ENDPOINT,
		},
		session: {
			cookieName: process.env.SESSION_COOKIE_NAME || "foodflow_session",
			secure: isProduction,
			httpOnly: true,
			sameSite: isProduction ? "strict" : "lax",
			maxAge: 60 * 60 * 24 * 7, // 7 days
		},
	};
}

// Generate secure secret for development
function generateSecureSecret(): string {
	if (process.env.NODE_ENV === "production") {
		throw new Error("JWT_SECRET must be set in production environment");
	}

	// For development only - generate a random secret
	const crypto = require("node:crypto");
	const secret = crypto.randomBytes(64).toString("hex");
	console.warn("⚠️  Using auto-generated JWT secret for development. Set JWT_SECRET in production!");
	return secret;
}

// Validate configuration
export function validateAuthConfig(config: AuthConfig): void {
	if (config.sso.enabled) {
		if (!config.sso.baseUrl) {
			throw new Error("SSO_BASE_URL is required when SSO is enabled");
		}
		if (!config.sso.clientId) {
			throw new Error("SSO_CLIENT_ID is required when SSO is enabled");
		}

		// Authentik specific validation
		if (config.sso.provider === "authentik") {
			if (!config.sso.jwksUri && !config.jwt.publicKey) {
				console.warn(
					"Neither JWKS URI nor public key configured for Authentik. Token validation may fail.",
				);
			}
		}
	}

	if (config.jwt.algorithm === "RS256" && !config.jwt.publicKey && !config.sso.jwksUri) {
		throw new Error("RS256 algorithm requires either JWT_PUBLIC_KEY or SSO_JWKS_URI");
	}
}
