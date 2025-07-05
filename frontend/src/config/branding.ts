// Active Brand Configuration
// Import the brand you want to use
import { marioPizzeriaConfig } from './brands/mario-pizzeria';
// import { burgerJunctionConfig } from './brands/burger-junction';

// Set the active brand configuration here
// Change this import to switch brands during development
export const activeBrandConfig = marioPizzeriaConfig;

// Type for brand configurations
export type BrandConfig = typeof marioPizzeriaConfig;