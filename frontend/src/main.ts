import "./styles/main.css";
import axios from "axios";
import { App } from "./app";
import { AuthService } from "./services/auth";
import { CartService } from "./services/cart";
import { initializeDB } from "./services/database";
import { i18n } from "./services/i18n";
import { brandingService } from "./services/branding";

async function initializeApp() {
	try {
    // Use same-origin relative /api requests so Vite proxy/CORS work correctly in dev
    delete (axios.defaults as any).baseURL;
		
		// Initialize branding first to set up CSS variables
		await brandingService.initialize();
		
		await i18n.initialize();
		await initializeDB();

		AuthService.initialize();
		CartService.initialize();

		// PWA functionality disabled for now to avoid admin conflicts

		const loadingScreen = document.getElementById("loading-screen");
		if (loadingScreen) {
			loadingScreen.style.display = "none";
		}

		const app = new App();
		await app.initialize();

		if ("serviceWorker" in navigator && "PushManager" in window) {
			console.log("Service Worker and Push are supported");
		}

		if (window.matchMedia("(display-mode: standalone)").matches) {
			console.log("App is running in standalone mode");
		}
	} catch (error) {
		console.error("Failed to initialize app:", error);
		document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
      <div class="error-screen">
        <h1>Failed to load app</h1>
        <p>Please refresh the page to try again</p>
        <button onclick="location.reload()">Refresh</button>
      </div>
    `;
	}
}

window.addEventListener("online", () => {
	console.log("Back online");
	document.body.classList.remove("offline");
});

window.addEventListener("offline", () => {
	console.log("Gone offline");
	document.body.classList.add("offline");
});

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initializeApp);
} else {
	initializeApp();
}
