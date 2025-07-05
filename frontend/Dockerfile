FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx vite build --config vite.config.ts

FROM caddy:2-alpine

COPY --from=builder /app/dist /usr/share/caddy

COPY <<EOF /etc/caddy/Caddyfile
:80 {
    root * /usr/share/caddy
    encode gzip zstd
    
    handle /api/* {
        reverse_proxy backend:3001
    }
    
    handle {
        try_files {path} /index.html
        file_server
    }
    
    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' ws: wss: https: http://localhost:3003;"
    }
}
EOF

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]