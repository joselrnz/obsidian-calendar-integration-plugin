/**
 * Service layer exports.
 * Provides a clean facade for all services.
 */

// Base service
export { BaseService, ServiceError } from './base-service';
export type { IService } from './base-service';

// Google Calendar Facade
export { GoogleCalendarFacade } from './google-calendar-facade';
export type { CalendarEvent, FetchEventsOptions } from './google-calendar-facade';

// Google Tasks Facade
export { GoogleTasksFacade } from './google-tasks-facade';
export type { Task, FetchTasksOptions } from './google-tasks-facade';

// Service Container
export { ServiceContainer, serviceContainer } from './service-container';

