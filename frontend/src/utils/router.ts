type RouteHandler = () => void | Promise<void>;

export class Router {
	private routes: Map<string, RouteHandler> = new Map();
	private notFoundHandler?: RouteHandler;

	addRoute(path: string, handler: RouteHandler) {
		this.routes.set(path, handler);
	}

	setNotFoundHandler(handler: RouteHandler) {
		this.notFoundHandler = handler;
	}

	async navigate(path: string) {
		const cleanPath = path.split('?')[0];
		const handler = this.routes.get(cleanPath);

		if (handler) {
			window.history.pushState({}, "", path);
			await handler();
		} else if (this.notFoundHandler) {
			await this.notFoundHandler();
		}

		this.updateActiveNavItem(cleanPath);
	}

	// Handle the current browser location without pushing state
	async handleCurrent() {
		const cleanPath = window.location.pathname;
		const handler = this.routes.get(cleanPath);
		if (handler) {
			await handler();
		} else if (this.notFoundHandler) {
			await this.notFoundHandler();
		}
		this.updateActiveNavItem(cleanPath);
	}

	private updateActiveNavItem(path: string) {
		document.querySelectorAll(".nav-item").forEach((item) => {
			item.classList.remove("active");
			if (item.getAttribute("data-path") === path) {
				item.classList.add("active");
			}
		});
	}
}
