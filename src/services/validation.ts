/**
 * Validation Functions for Calendar Integration Plugin
 * Provides input validation with user-friendly error messages
 */

import { ValidationError } from './errors';

// ============================================================================
// Email Validation
// ============================================================================

/**
 * Validates a single email address
 */
export function validateEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Validates multiple email addresses and returns invalid ones
 */
export function validateEmails(emails: string[]): string[] {
	return emails.filter(email => !validateEmail(email.trim()));
}

// ============================================================================
// Date/Time Validation
// ============================================================================

/**
 * Validates that a date range is valid (start before end)
 */
export function validateDateRange(start: Date, end: Date): void {
	if (!(start instanceof Date) || isNaN(start.getTime())) {
		throw new ValidationError('Start date is invalid', 'startDate', start);
	}
	
	if (!(end instanceof Date) || isNaN(end.getTime())) {
		throw new ValidationError('End date is invalid', 'endDate', end);
	}
	
	if (start >= end) {
		throw new ValidationError(
			'❌ End date/time must be after start date/time',
			'dateRange',
			{ start, end }
		);
	}
}

/**
 * Validates that a date is not in the past (optional)
 */
export function validateFutureDate(date: Date, allowPast: boolean = true): void {
	if (!(date instanceof Date) || isNaN(date.getTime())) {
		throw new ValidationError('Date is invalid', 'date', date);
	}
	
	if (!allowPast && date < new Date()) {
		throw new ValidationError(
			'❌ Date cannot be in the past',
			'date',
			date
		);
	}
}

// ============================================================================
// Event Data Validation
// ============================================================================

export interface CalendarEventData {
	summary: string;
	description?: string;
	location?: string;
	start: {
		dateTime?: string;
		date?: string;
		timeZone?: string;
	};
	end: {
		dateTime?: string;
		date?: string;
		timeZone?: string;
	};
	attendees?: Array<{ email: string }>;
	recurrence?: string[];
	reminders?: {
		useDefault: boolean;
		overrides?: Array<{ method: string; minutes: number }>;
	};
}

/**
 * Validates event data before creating/updating an event
 */
export function validateEventData(event: CalendarEventData): void {
	// Validate title
	if (!event.summary || event.summary.trim().length === 0) {
		throw new ValidationError('❌ Event title is required', 'summary', event.summary);
	}
	
	if (event.summary.length > 1000) {
		throw new ValidationError(
			'❌ Event title is too long (max 1000 characters)',
			'summary',
			event.summary
		);
	}
	
	// Validate start date/time
	if (!event.start || (!event.start.dateTime && !event.start.date)) {
		throw new ValidationError(
			'❌ Event start date/time is required',
			'start',
			event.start
		);
	}
	
	// Validate end date/time
	if (!event.end || (!event.end.dateTime && !event.end.date)) {
		throw new ValidationError(
			'❌ Event end date/time is required',
			'end',
			event.end
		);
	}
	
	// Validate date range (if both are dateTime)
	if (event.start.dateTime && event.end.dateTime) {
		const startDate = new Date(event.start.dateTime);
		const endDate = new Date(event.end.dateTime);
		validateDateRange(startDate, endDate);
	}
	
	// Validate attendees emails
	if (event.attendees && event.attendees.length > 0) {
		const invalidEmails = validateEmails(event.attendees.map(a => a.email));
		if (invalidEmails.length > 0) {
			throw new ValidationError(
				`❌ Invalid email(s): ${invalidEmails.join(', ')}`,
				'attendees',
				invalidEmails
			);
		}
	}
	
	// Validate description length
	if (event.description && event.description.length > 8192) {
		throw new ValidationError(
			'❌ Event description is too long (max 8192 characters)',
			'description',
			event.description
		);
	}
	
	// Validate location length
	if (event.location && event.location.length > 1024) {
		throw new ValidationError(
			'❌ Event location is too long (max 1024 characters)',
			'location',
			event.location
		);
	}
}

// ============================================================================
// Task Data Validation
// ============================================================================

export interface TaskData {
	title: string;
	notes?: string;
	due?: string;
	status?: 'needsAction' | 'completed';
}

/**
 * Validates task data before creating/updating a task
 */
export function validateTaskData(task: TaskData): void {
	// Validate title
	if (!task.title || task.title.trim().length === 0) {
		throw new ValidationError('❌ Task title is required', 'title', task.title);
	}
	
	if (task.title.length > 1024) {
		throw new ValidationError(
			'❌ Task title is too long (max 1024 characters)',
			'title',
			task.title
		);
	}
	
	// Validate notes length
	if (task.notes && task.notes.length > 8192) {
		throw new ValidationError(
			'❌ Task notes are too long (max 8192 characters)',
			'notes',
			task.notes
		);
	}
	
	// Validate due date
	if (task.due) {
		const dueDate = new Date(task.due);
		if (isNaN(dueDate.getTime())) {
			throw new ValidationError('❌ Task due date is invalid', 'due', task.due);
		}
	}
	
	// Validate status
	if (task.status && !['needsAction', 'completed'].includes(task.status)) {
		throw new ValidationError(
			'❌ Task status must be "needsAction" or "completed"',
			'status',
			task.status
		);
	}
}

