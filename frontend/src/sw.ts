/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = "foodflow-v1";
const OFFLINE_URL = "/offline.html";

// Assets to cache on install
const urlsToCache = ["/", "/offline.html", "/index.html", "/src/main.ts", "/src/styles/main.css"];

// Install event - cache assets
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.addAll(urlsToCache);
		}),
	);
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((cacheName) => cacheName !== CACHE_NAME)
					.map((cacheName) => caches.delete(cacheName)),
			);
		}),
	);
	self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
	// Skip cross-origin requests
	if (!event.request.url.startsWith(self.location.origin)) {
		return;
	}

	// Navigation requests
	if (event.request.mode === "navigate") {
		event.respondWith(
			fetch(event.request).catch(() => {
				return caches.match(OFFLINE_URL) as Promise<Response>;
			}),
		);
		return;
	}

	// API requests - network first
	if (event.request.url.includes("/api/")) {
		event.respondWith(
			fetch(event.request)
				.then((response) => {
					// Clone the response before caching
					const responseToCache = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, responseToCache);
					});
					return response;
				})
				.catch(() => {
					return caches.match(event.request) as Promise<Response>;
				}),
		);
		return;
	}

	// Static assets - cache first
	event.respondWith(
		caches.match(event.request).then((response) => {
			return (
				response ||
				fetch(event.request).then((response) => {
					// Don't cache non-successful responses
					if (!response || response.status !== 200 || response.type !== "basic") {
						return response;
					}

					const responseToCache = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(event.request, responseToCache);
					});

					return response;
				})
			);
		}),
	);
});

// Push notification handling
self.addEventListener("push", (event) => {
	if (!event.data) return;

	const data = event.data.json();
	const options: NotificationOptions = {
		body: data.body || "",
		icon: data.icon || "/icons/icon-192x192.png",
		badge: data.badge || "/icons/icon-72x72.png",
		data: data.data || {},
		tag: data.tag || "foodflow-notification",
		requireInteraction: data.requireInteraction || false,
	};

	event.waitUntil(self.registration.showNotification(data.title || "FoodFlow", options));
});

// Notification click handling
self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	const urlToOpen = event.notification.data?.url || "/";

	event.waitUntil(
		self.clients.matchAll({ type: "window" }).then((clientList) => {
			for (const client of clientList) {
				if (client.url === urlToOpen && "focus" in client) {
					client.focus();
					return;
				}
			}
			if (self.clients.openWindow) {
				self.clients.openWindow(urlToOpen);
			}
		})
	);
});

// Background sync
self.addEventListener("sync", (event: any) => {
	if (event.tag === "sync-orders") {
		event.waitUntil(syncPendingOrders());
	}
});

async function syncPendingOrders() {
	// Get pending orders from cache and sync them
	const cache = await caches.open("pending-orders");
	const requests = await cache.keys();

	for (const request of requests) {
		try {
			const response = await fetch(request);
			if (response.ok) {
				await cache.delete(request);
			}
		} catch (error) {
			console.error("Failed to sync order:", error);
		}
	}
}

// Message handling
self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "SKIP_WAITING") {
		self.skipWaiting();
	}
});
