type TranslationKey = string;
type TranslationValues = Record<string, string | number>;
type Translations = Record<string, any>;

interface Language {
	code: string;
	name: string;
	direction: "ltr" | "rtl";
}

class I18nService {
	private currentLanguage: string = "fr";
	private translations: Map<string, Translations> = new Map();
	private listeners: Set<() => void> = new Set();
	private fallbackLanguage: string = "en";

	constructor() {
		this.loadSavedLanguage();
	}

	private loadSavedLanguage() {
		const savedLang = localStorage.getItem("language") || "fr";

		if (this.isLanguageSupported(savedLang)) {
			this.currentLanguage = savedLang;
		}
	}

	async initialize() {
		await this.loadLanguage(this.currentLanguage);
		this.updateDocumentLanguage();
	}

	async loadLanguage(languageCode: string) {
		if (this.translations.has(languageCode)) {
			return;
		}

		try {
			const translations = await this.fetchTranslations(languageCode);
			this.translations.set(languageCode, translations);
		} catch (error) {
			console.error(`Failed to load language ${languageCode}:`, error);
			if (languageCode !== this.fallbackLanguage) {
				await this.loadLanguage(this.fallbackLanguage);
			}
		}
	}

	private async fetchTranslations(languageCode: string): Promise<Translations> {
		if (languageCode === "en") {
			return englishTranslations;
		}

		try {
			const response = await fetch(`/locales/${languageCode}.json`);
			if (!response.ok) {
				throw new Error(`Failed to fetch translations for ${languageCode}`);
			}
			return await response.json();
		} catch (error) {
			console.error(`Error loading translations for ${languageCode}:`, error);
			return englishTranslations;
		}
	}

	async setLanguage(languageCode: string) {
		if (!this.isLanguageSupported(languageCode)) {
			console.warn(`Language ${languageCode} is not supported`);
			return;
		}

		await this.loadLanguage(languageCode);
		this.currentLanguage = languageCode;
		localStorage.setItem("language", languageCode);
		this.updateDocumentLanguage();
		this.notifyListeners();
	}

	private updateDocumentLanguage() {
		document.documentElement.lang = this.currentLanguage;
		document.documentElement.dir = this.getLanguageDirection();
	}

	getLanguage(): string {
		return this.currentLanguage;
	}

	getLanguageDirection(): "ltr" | "rtl" {
		const rtlLanguages = ["ar", "he", "fa", "ur"];
		return rtlLanguages.includes(this.currentLanguage) ? "rtl" : "ltr";
	}

	getSupportedLanguages(): Language[] {
		return [
			{ code: "en", name: "English", direction: "ltr" },
			{ code: "es", name: "Español", direction: "ltr" },
			{ code: "fr", name: "Français", direction: "ltr" },
			{ code: "de", name: "Deutsch", direction: "ltr" },
			{ code: "it", name: "Italiano", direction: "ltr" },
			{ code: "pt", name: "Português", direction: "ltr" },
			{ code: "zh", name: "中文", direction: "ltr" },
			{ code: "ja", name: "日本語", direction: "ltr" },
			{ code: "ko", name: "한국어", direction: "ltr" },
			{ code: "ar", name: "العربية", direction: "rtl" },
			{ code: "he", name: "עברית", direction: "rtl" },
			{ code: "hi", name: "हिन्दी", direction: "ltr" },
			{ code: "ru", name: "Русский", direction: "ltr" },
		];
	}

	isLanguageSupported(languageCode: string): boolean {
		return this.getSupportedLanguages().some((lang) => lang.code === languageCode);
	}

	t(key: TranslationKey, values?: TranslationValues): string {
		const translations =
			this.translations.get(this.currentLanguage) ||
			this.translations.get(this.fallbackLanguage) ||
			{};

		let translation = this.getNestedTranslation(translations, key);

		if (!translation) {
			console.warn(`Translation missing for key: ${key}`);
			return key;
		}

		if (values && translation) {
			Object.entries(values).forEach(([placeholder, value]) => {
				translation = translation?.replace(new RegExp(`{{${placeholder}}}`, "g"), String(value));
			});
		}

		return translation || key;
	}

	private getNestedTranslation(obj: any, path: string): string | undefined {
		const keys = path.split(".");
		let current = obj;

		for (const key of keys) {
			if (current[key] === undefined) {
				return undefined;
			}
			current = current[key];
		}

		return typeof current === "string" ? current : undefined;
	}

	formatNumber(number: number): string {
		return new Intl.NumberFormat(this.currentLanguage).format(number);
	}

	formatCurrency(amount: number, currency: string = "USD"): string {
		return new Intl.NumberFormat(this.currentLanguage, {
			style: "currency",
			currency,
		}).format(amount);
	}

	formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
		const dateObj = typeof date === "string" ? new Date(date) : date;
		return new Intl.DateTimeFormat(this.currentLanguage, options).format(dateObj);
	}

	formatRelativeTime(date: Date | string): string {
		const dateObj = typeof date === "string" ? new Date(date) : date;
		const now = new Date();
		const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

		const rtf = new Intl.RelativeTimeFormat(this.currentLanguage, {
			numeric: "auto",
		});

		if (diffInSeconds < 60) {
			return rtf.format(-diffInSeconds, "second");
		} else if (diffInSeconds < 3600) {
			return rtf.format(-Math.floor(diffInSeconds / 60), "minute");
		} else if (diffInSeconds < 86400) {
			return rtf.format(-Math.floor(diffInSeconds / 3600), "hour");
		} else if (diffInSeconds < 2592000) {
			return rtf.format(-Math.floor(diffInSeconds / 86400), "day");
		} else if (diffInSeconds < 31536000) {
			return rtf.format(-Math.floor(diffInSeconds / 2592000), "month");
		} else {
			return rtf.format(-Math.floor(diffInSeconds / 31536000), "year");
		}
	}

	onChange(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notifyListeners() {
		this.listeners.forEach((listener) => listener());
	}
}

const englishTranslations: Translations = {
	common: {
		appName: "Mario's Pizzeria",
		loading: "Loading...",
		error: "Error",
		retry: "Retry",
		cancel: "Cancel",
		confirm: "Confirm",
		save: "Save",
		delete: "Delete",
		edit: "Edit",
		close: "Close",
		back: "Back",
		next: "Next",
		submit: "Submit",
		search: "Search",
		filter: "Filter",
		sort: "Sort",
		refresh: "Refresh",
		yes: "Yes",
		no: "No",
		ok: "OK",
	},

	navigation: {
		home: "Home",
		menu: "Menu",
		cart: "Cart",
		orders: "Orders",
		profile: "Profile",
		settings: "Settings",
		help: "Help",
		signOut: "Sign Out",
		owner: "Owner",
	},

	auth: {
		signIn: "Sign In",
		signUp: "Sign Up",
		email: "Email",
		password: "Password",
		confirmPassword: "Confirm Password",
		firstName: "First Name",
		lastName: "Last Name",
		phone: "Phone Number",
		forgotPassword: "Forgot Password?",
		rememberMe: "Remember Me",
		welcomeBack: "Welcome Back",
		createAccount: "Create Account",
		alreadyHaveAccount: "Already have an account?",
		dontHaveAccount: "Don't have an account?",
		signInPrompt: "Please sign in to continue",
		signUpPrompt: "Create an account to get started",
		invalidCredentials: "Invalid email or password",
		emailAlreadyExists: "Email already exists",
		passwordMismatch: "Passwords do not match",
		passwordTooShort: "Password must be at least 8 characters",
	},

	home: {
		hero: {
			title: "Delicious Food, Delivered Fast",
			subtitle: "Order from your favorite restaurants",
			cta: "Browse Menu",
			alt: "Delicious food",
		},
		promo: {
			newUser: "New User Offer",
			discount: "{{percent}}% Off First Order",
			useCode: "Use code: {{code}}",
		},
		sections: {
			categories: "Browse by Category",
			featured: "Popular Items",
			whyChoose: "Why Choose {{appName}}?",
		},
		features: {
			fastDelivery: {
				title: "Fast Delivery",
            description: "Get your food delivered in 45 minutes or less",
			},
			easyOrdering: {
				title: "Easy Ordering",
				description: "Simple and intuitive mobile-first interface",
			},
			securePayment: {
				title: "Secure Payment",
				description: "Multiple payment options with secure checkout",
			},
			liveTracking: {
				title: "Live Tracking",
				description: "Track your order in real-time",
			},
		},
	},

	menu: {
		allCategories: "All",
		filters: "Filters",
		dietaryPreferences: "Dietary Preferences",
		vegetarian: "Vegetarian",
		vegan: "Vegan",
		glutenFree: "Gluten Free",
		badges: {
			vegetarian: "Veg",
			vegan: "Vegan",
			glutenFree: "GF",
		},
		customize: "Customize",
		addToCart: "Add to Cart",
		added: "Added!",
		calories: "{{count}} cal",
		noItems: "No items found",
		loadingCategories: "Loading categories...",
		loadingItems: "Loading menu items...",
		offlineNotice: "Showing cached menu items. Some items may not be up to date.",
	},

	cart: {
		title: "Your Cart",
		empty: {
			title: "Your cart is empty",
			subtitle: "Add some delicious items from our menu",
			cta: "Browse Menu",
		},
		clearCart: "Clear Cart",
		clearCartConfirm: "Are you sure you want to clear your cart?",
		specialInstructions: "Special Instructions",
		promoCode: "Enter promo code",
		apply: "Apply",
		promoApplied: 'Promo code "{{code}}" applied!',
		summary: {
			subtotal: "Subtotal",
			deliveryFee: "Delivery Fee",
			tax: "Tax",
			total: "Total",
		},
		checkout: {
			proceedToCheckout: "Proceed to Checkout",
			signInRequired: "Please sign in to place your order",
		},
	},

	checkout: {
		title: "Checkout",
		steps: {
			delivery: "Delivery",
			payment: "Payment",
			confirm: "Confirm",
		},
		delivery: {
			title: "Delivery Address",
			streetAddress: "Street Address",
			city: "City",
			state: "State",
			zipCode: "ZIP Code",
			country: "Country",
			phone: "Phone Number",
			instructions: "Delivery Instructions (optional)",
			continueToPayment: "Continue to Payment",
		},
		payment: {
			title: "Payment Method",
			card: "Credit/Debit Card",
			paypal: "PayPal",
			cash: "Cash on Delivery",
			cardNumber: "Card Number",
			expiryDate: "MM/YY",
			cvv: "CVV",
			cardholderName: "Cardholder Name",
			reviewOrder: "Review Order",
		},
		confirm: {
			title: "Order Summary",
			items: "Items ({{count}})",
			deliveryAddress: "Delivery Address",
			paymentMethod: "Payment Method",
			placeOrder: "Place Order",
			orderPlaced: "Order placed successfully! Order ID: {{orderId}}",
		},
	},

	orders: {
		title: "My Orders",
		filters: {
			all: "All",
			pending: "Pending",
			active: "Active",
			completed: "Completed",
		},
		empty: {
			title: "No orders yet",
			subtitle: "Your order history will appear here",
			cta: "Start Ordering",
		},
		orderNumber: "Order #{{id}}",
		moreItems: "+{{count}} more items",
		total: "Total: {{amount}}",
		actions: {
			reorder: "Reorder",
			track: "Track Order",
			viewDetails: "View Details",
		},
		tracking: {
			title: "Track Order #{{id}}",
			timeline: {
				placed: "Order Placed",
				confirmed: "Order Confirmed",
				confirmedDesc: "Restaurant has accepted your order",
				preparing: "Preparing",
				preparingDesc: "Your food is being prepared",
				outForDelivery: "Out for Delivery",
				outForDeliveryDesc: "Your order is on the way",
				delivered: "Delivered",
				estimated: "Estimated: {{time}}",
			},
		},
		details: {
			title: "Order Details",
			placedOn: "Placed on {{date}}",
			status: "Status",
			items: "Items",
			paymentSummary: "Payment Summary",
		},
		status: {
			pending: "Pending",
			confirmed: "Confirmed",
			preparing: "Preparing",
			ready: "Ready",
			outForDelivery: "Out for Delivery",
			delivered: "Delivered",
			cancelled: "Cancelled",
		},
		reorderSuccess: "Items added to cart!",
		loadingOrders: "Loading orders...",
		offlineNotice: "Showing cached orders. Some information may not be up to date.",
	},

	profile: {
		title: "Profile",
		notLoggedIn: {
			title: "You're not signed in",
			subtitle: "Sign in to access your profile and order history",
			cta: "Sign In",
		},
		sections: {
			personalInfo: "Personal Information",
			addresses: "Delivery Addresses",
			security: "Security",
			preferences: "Preferences",
		},
		form: {
			firstName: "First Name",
			lastName: "Last Name",
			email: "Email",
			phone: "Phone",
			saveChanges: "Save Changes",
			saved: "Saved!",
		},
		addresses: {
			addNew: "Add New Address",
			edit: "Edit",
			delete: "Delete",
			deleteConfirm: "Are you sure you want to delete this address?",
			setAsDefault: "Set as default address",
			default: "Default",
			label: "Label (Optional)",
			labelPlaceholder: "Home, Work, etc.",
			noAddresses: "No addresses saved",
			saveAddress: "Save Address",
			updateAddress: "Update Address",
		},
		password: {
			change: "Change Password",
			current: "Current Password",
			new: "New Password",
			confirm: "Confirm New Password",
			mismatch: "Passwords do not match",
			success: "Password changed successfully",
		},
		preferences: {
			emailNotifications: "Email notifications",
			pushNotifications: "Push notifications",
			smsNotifications: "SMS notifications",
		},
		signOutConfirm: "Are you sure you want to sign out?",
	},

	errors: {
		generic: "Something went wrong. Please try again.",
		network: "Network error. Please check your connection.",
		notFound: "Page not found",
		unauthorized: "You are not authorized to access this resource",
		forbidden: "Access forbidden",
		serverError: "Server error. Please try again later.",
		validationError: "Please check your input and try again",
		loadFailed: "Failed to load {{resource}}",
		saveFailed: "Failed to save {{resource}}",
		deleteFailed: "Failed to delete {{resource}}",
	},

	offline: {
		indicator: "Offline",
		notice: "You are currently offline",
		willSync: "Changes will be synced when you are back online",
	},

	customization: {
		title: "Customize {{itemName}}",
		required: "Required",
		optional: "Optional",
		specialInstructions: "Special Instructions",
		instructionsPlaceholder: "Add any special requests...",
		quantity: "Quantity",
		total: "Total",
	},

	time: {
		minutes: "{{count}} min",
		hours: "{{count}} hr",
		days: "{{count}} day",
		justNow: "Just now",
		minutesAgo: "{{count}} minutes ago",
		hoursAgo: "{{count}} hours ago",
		daysAgo: "{{count}} days ago",
	},
};

export const i18n = new I18nService();

export function t(key: string, values?: TranslationValues): string {
	return i18n.t(key, values);
}

export function formatCurrency(amount: number, currency?: string): string {
	return i18n.formatCurrency(amount, currency);
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
	return i18n.formatDate(date, options);
}

export function formatNumber(number: number): string {
	return i18n.formatNumber(number);
}

export function formatRelativeTime(date: Date | string): string {
	return i18n.formatRelativeTime(date);
}
