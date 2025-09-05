#!/usr/bin/env node

/**
 * Script to generate secure JWT secrets for production use
 * Run with: node generate-secrets.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate cryptographically secure random strings
function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('base64');
}

// Generate VAPID keys for push notifications
function generateVapidKeys() {
  // This is a simplified version - in production, use web-push library
  return {
    publicKey: generateSecret(32),
    privateKey: generateSecret(32),
  };
}

const secrets = {
  JWT_SECRET: generateSecret(64),
  JWT_REFRESH_SECRET: generateSecret(64),
  SESSION_SECRET: generateSecret(32),
  CSRF_SECRET: generateSecret(32),
  ENCRYPTION_KEY: generateSecret(32),
};

const vapidKeys = generateVapidKeys();

console.log('🔐 Generated Secure Secrets:\n');
console.log('Copy these to your .env file:\n');
console.log('=' .repeat(60));

// JWT Secrets
console.log('# JWT Configuration (Generated - Keep Secret!)');
console.log(`JWT_SECRET=${secrets.JWT_SECRET}`);
console.log(`JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}`);
console.log('JWT_EXPIRES_IN=15m');
console.log('JWT_REFRESH_EXPIRES_IN=7d');
console.log('');

// Session Secret
console.log('# Session Configuration');
console.log(`SESSION_SECRET=${secrets.SESSION_SECRET}`);
console.log('');

// CSRF Secret
console.log('# CSRF Protection');
console.log(`CSRF_SECRET=${secrets.CSRF_SECRET}`);
console.log('');

// Encryption Key
console.log('# Data Encryption');
console.log(`ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}`);
console.log('');

// VAPID Keys for Push Notifications
console.log('# Push Notification Keys (VAPID)');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('VAPID_EMAIL=mailto:admin@yourapp.com');
console.log('');

console.log('=' .repeat(60));
console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
console.log('1. Never commit these secrets to version control');
console.log('2. Use different secrets for each environment (dev, staging, prod)');
console.log('3. Rotate secrets regularly (recommended: every 90 days)');
console.log('4. Store production secrets in a secure secret management system');
console.log('5. Use environment variables or secret management services in production');
console.log('');

// Create or update .env.production.example
const envExamplePath = path.join(__dirname, 'backend', '.env.production.example');
const envContent = `# Production Environment Variables
# NEVER commit actual values to version control!

# Server Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com

# Database Configuration
DATABASE_URL=postgresql://user:password@host:5432/dbname
REDIS_URL=redis://host:6379

# JWT Configuration (Generate with: node generate-secrets.js)
JWT_SECRET=<generated-secret>
JWT_REFRESH_SECRET=<generated-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ALGORITHM=HS256
JWT_ISSUER=foodflow-api
JWT_AUDIENCE=foodflow-app

# Session Configuration
SESSION_SECRET=<generated-secret>
SESSION_COOKIE_NAME=foodflow_session
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=strict

# Security
CSRF_SECRET=<generated-secret>
ENCRYPTION_KEY=<generated-secret>
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Push Notifications
VAPID_PUBLIC_KEY=<generated-key>
VAPID_PRIVATE_KEY=<generated-key>
VAPID_EMAIL=mailto:admin@yourdomain.com

# External Services (Optional)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
GOOGLE_MAPS_API_KEY=...
SENTRY_DSN=...

# Monitoring
LOG_LEVEL=info
LOG_FORMAT=json
METRICS_ENABLED=true
HEALTH_CHECK_ENABLED=true
`;

fs.writeFileSync(envExamplePath, envContent);
console.log(`✅ Created ${envExamplePath} with production template`);
console.log('');
console.log('📝 Next Steps:');
console.log('1. Copy the generated secrets to your .env file');
console.log('2. Update .env.production with actual production values');
console.log('3. Ensure .env files are in .gitignore');
console.log('4. Set up secret rotation schedule');
console.log('5. Configure your deployment pipeline to inject secrets');