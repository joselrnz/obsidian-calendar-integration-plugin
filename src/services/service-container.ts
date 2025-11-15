import type { IService } from './base-service';

/**
 * Service container for dependency injection.
 * Manages service lifecycle and dependencies.
 */
export class ServiceContainer {
	private services: Map<string, IService> = new Map();
	private factories: Map<string, () => IService> = new Map();

	/**
	 * Register a service factory.
	 */
	register<T extends IService>(name: string, factory: () => T): void {
		this.factories.set(name, factory);
	}

	/**
	 * Register a singleton service instance.
	 */
	registerSingleton<T extends IService>(name: string, instance: T): void {
		this.services.set(name, instance);
	}

	/**
	 * Get a service by name.
	 * Creates the service if it doesn't exist.
	 */
	async get<T extends IService>(name: string): Promise<T> {
		// Check if service already exists
		let service = this.services.get(name);

		if (service) {
			return service as T;
		}

		// Create service from factory
		const factory = this.factories.get(name);

		if (!factory) {
			throw new Error(`Service '${name}' not registered`);
		}

		service = factory();
		await service.initialize();
		this.services.set(name, service);

		return service as T;
	}

	/**
	 * Check if a service is registered.
	 */
	has(name: string): boolean {
		return this.services.has(name) || this.factories.has(name);
	}

	/**
	 * Dispose all services.
	 */
	async disposeAll(): Promise<void> {
		const disposePromises = Array.from(this.services.values()).map((service) =>
			service.dispose()
		);

		await Promise.all(disposePromises);
		this.services.clear();
	}

	/**
	 * Dispose a specific service.
	 */
	async dispose(name: string): Promise<void> {
		const service = this.services.get(name);

		if (service) {
			await service.dispose();
			this.services.delete(name);
		}
	}

	/**
	 * Clear all registrations.
	 */
	clear(): void {
		this.services.clear();
		this.factories.clear();
	}
}

/**
 * Global service container instance.
 */
export const serviceContainer = new ServiceContainer();

