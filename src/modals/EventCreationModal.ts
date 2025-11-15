import { App, Modal, Notice, Setting } from 'obsidian';
import { CalendarProvider, CreateEventOptions } from '../providers/CalendarProvider';

export interface EventCreationOptions {
	defaultDate?: string;
	defaultStartTime?: string;
	defaultEndTime?: string;
}

/**
 * Event Creation Modal
 * 
 * Allows users to create new calendar events
 */
export class EventCreationModal extends Modal {
	private provider: CalendarProvider;
	private options: EventCreationOptions;
	private onSuccess?: () => void;
	
	// Form fields
	private titleInput!: HTMLInputElement;
	private descriptionInput!: HTMLTextAreaElement;
	private locationInput!: HTMLInputElement;
	private startDateInput!: HTMLInputElement;
	private startTimeInput!: HTMLInputElement;
	private endDateInput!: HTMLInputElement;
	private endTimeInput!: HTMLInputElement;
	private allDayToggle!: HTMLElement;
	private videoCallToggle!: HTMLElement;
	private attendeesInput!: HTMLInputElement;
	
	constructor(
		app: App,
		provider: CalendarProvider,
		options: EventCreationOptions = {},
		onSuccess?: () => void
	) {
		super(app);
		this.provider = provider;
		this.options = options;
		this.onSuccess = onSuccess;
	}
	
	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('calendar-event-creation-modal');
		
		// Header
		contentEl.createEl('h2', { text: 'Create New Event' });
		
		// Title (required)
		new Setting(contentEl)
			.setName('Event title')
			.setDesc('Required')
			.addText(text => {
				this.titleInput = text.inputEl;
				text.setPlaceholder('Team meeting')
					.inputEl.focus();
			});
		
		// All-day toggle
		new Setting(contentEl)
			.setName('All-day event')
			.addToggle(toggle => {
				this.allDayToggle = toggle.toggleEl;
				toggle.setValue(false)
					.onChange(value => {
						this.startTimeInput.disabled = value;
						this.endTimeInput.disabled = value;
						if (value) {
							this.startTimeInput.value = '';
							this.endTimeInput.value = '';
						}
					});
			});
		
		// Start date and time
		const startSetting = new Setting(contentEl)
			.setName('Start');
		
		startSetting.controlEl.createDiv({ cls: 'datetime-input-group' }, div => {
			this.startDateInput = div.createEl('input', {
				type: 'date',
				value: this.options.defaultDate || new Date().toISOString().split('T')[0]
			});
			
			this.startTimeInput = div.createEl('input', {
				type: 'time',
				value: this.options.defaultStartTime || '09:00'
			});
		});
		
		// End date and time
		const endSetting = new Setting(contentEl)
			.setName('End');
		
		endSetting.controlEl.createDiv({ cls: 'datetime-input-group' }, div => {
			this.endDateInput = div.createEl('input', {
				type: 'date',
				value: this.options.defaultDate || new Date().toISOString().split('T')[0]
			});
			
			this.endTimeInput = div.createEl('input', {
				type: 'time',
				value: this.options.defaultEndTime || '10:00'
			});
		});
		
		// Location
		new Setting(contentEl)
			.setName('Location')
			.setDesc('Optional')
			.addText(text => {
				this.locationInput = text.inputEl;
				text.setPlaceholder('Conference Room A');
			});
		
		// Description
		new Setting(contentEl)
			.setName('Description')
			.setDesc('Optional')
			.addTextArea(text => {
				this.descriptionInput = text.inputEl;
				text.setPlaceholder('Meeting agenda...');
				text.inputEl.rows = 4;
			});
		
		// Video call toggle (Google Meet)
		if (this.provider.type === 'google') {
			new Setting(contentEl)
				.setName('Add video call')
				.setDesc('Create a Google Meet link')
				.addToggle(toggle => {
					this.videoCallToggle = toggle.toggleEl;
					toggle.setValue(false);
				});
		}
		
		// Attendees
		new Setting(contentEl)
			.setName('Attendees')
			.setDesc('Comma-separated email addresses')
			.addText(text => {
				this.attendeesInput = text.inputEl;
				text.setPlaceholder('john@example.com, jane@example.com');
			});
		
		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
		
		const createButton = buttonContainer.createEl('button', {
			cls: 'mod-cta',
			text: 'Create Event'
		});
		createButton.addEventListener('click', () => this.handleCreate());
		
		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelButton.addEventListener('click', () => this.close());
	}
	
	private isCreating = false;

	private async handleCreate() {
		// Prevent double-click
		if (this.isCreating) {
			return;
		}

		// Validate title
		if (!this.titleInput.value.trim()) {
			new Notice('Event title is required');
			this.titleInput.focus();
			return;
		}

		// Validate dates
		if (!this.startDateInput.value || !this.endDateInput.value) {
			new Notice('❌ Start and end dates are required');
			return;
		}

		const isAllDay = (this.allDayToggle as any).checked;

		// Validate times for non-all-day events
		if (!isAllDay && (!this.startTimeInput.value || !this.endTimeInput.value)) {
			new Notice('❌ Start and end times are required');
			return;
		}

		// Build date/time objects for validation
		const startDateTime = isAllDay
			? new Date(this.startDateInput.value)
			: new Date(`${this.startDateInput.value}T${this.startTimeInput.value}`);

		const endDateTime = isAllDay
			? new Date(this.endDateInput.value)
			: new Date(`${this.endDateInput.value}T${this.endTimeInput.value}`);

		// Validate that end is after start
		if (endDateTime <= startDateTime) {
			new Notice('❌ End date/time must be after start date/time');
			return;
		}

		// Get user's timezone
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

		// Build event options
		const startDate = this.startDateInput.value;
		const endDate = this.endDateInput.value;

		const options: CreateEventOptions = {
			summary: this.titleInput.value.trim(),
			description: this.descriptionInput.value.trim() || undefined,
			location: this.locationInput.value.trim() || undefined,
			start: isAllDay
				? { date: startDate }
				: {
					dateTime: `${startDate}T${this.startTimeInput.value}:00`,
					timeZone: timezone
				},
			end: isAllDay
				? { date: endDate }
				: {
					dateTime: `${endDate}T${this.endTimeInput.value}:00`,
					timeZone: timezone
				},
		};
		
		// Add attendees if provided (with validation)
		if (this.attendeesInput.value.trim()) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			const emails = this.attendeesInput.value
				.split(',')
				.map(email => email.trim())
				.filter(email => email.length > 0);

			// Validate all emails
			const invalidEmails = emails.filter(email => !emailRegex.test(email));
			if (invalidEmails.length > 0) {
				new Notice(`❌ Invalid email(s): ${invalidEmails.join(', ')}`);
				this.attendeesInput.focus();
				return;
			}

			options.attendees = emails;
		}

		// Add video call if requested
		if ((this.videoCallToggle as any)?.checked) {
			options.conferenceData = true;
		}

		// Create event with loading state
		try {
			this.isCreating = true;
			const createButton = this.contentEl.querySelector('.mod-cta') as HTMLButtonElement;
			if (createButton) {
				createButton.disabled = true;
				// Add spinner
				const spinner = createEl('span', { cls: 'calendar-loading-spinner' });
				createButton.textContent = '';
				createButton.appendChild(spinner);
				createButton.appendText('Creating...');
			}

			new Notice('Creating event...');
			await this.provider.createEvent(options);
			new Notice('✅ Event created successfully!');
			this.onSuccess?.();
			this.close();
		} catch (error) {
			console.error('Failed to create event:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`❌ Failed to create event: ${errorMessage}`);
		} finally {
			this.isCreating = false;
			const createButton = this.contentEl.querySelector('.mod-cta') as HTMLButtonElement;
			if (createButton) {
				createButton.disabled = false;
				createButton.textContent = 'Create Event';
			}
		}
	}
	
	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

