import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import type { CalendarProvider, CalendarTask } from '../providers/CalendarProvider';
import { formatTime, formatDateRange } from './EventCard';
import { Notice, Modal, App, Menu } from 'obsidian';
import { EventCreationModal } from '../modals/EventCreationModal';
import { TaskCreationModal } from '../modals/TaskCreationModal';
import { TaskListPanel } from './TaskListPanel';
import { TaskEditModal } from '../modals/TaskEditModal';

export interface CalendarViewOptions {
	provider: CalendarProvider;
	containerEl: HTMLElement;
	onEventClick?: (event: any) => void;
	app?: App;
}

export class CalendarView {
	private calendar: Calendar | null = null;
	private provider: CalendarProvider;
	private containerEl: HTMLElement;
	private calendarEl: HTMLElement;
	private loadingEl: HTMLElement;
	private searchEl: HTMLElement;
	private searchInput: HTMLInputElement | null = null;
	private taskPanel: TaskListPanel | null = null;
	private taskPanelContainer: HTMLElement | null = null;
	private onEventClick?: (event: any) => void;
	private app?: App;

	constructor(options: CalendarViewOptions) {
		this.provider = options.provider;
		this.containerEl = options.containerEl;
		this.onEventClick = options.onEventClick;
		this.app = options.app;

		// Create search bar
		this.searchEl = this.containerEl.createDiv({ cls: 'calendar-search-container' });
		this.createSearchBar();

		// Create loading indicator
		this.loadingEl = this.containerEl.createDiv({ cls: 'calendar-loading' });
		this.loadingEl.innerHTML = `
			<div class="calendar-loading-spinner"></div>
			<div class="calendar-loading-text">Loading calendar...</div>
		`;
		this.loadingEl.style.display = 'none';

		// Create calendar container
		this.calendarEl = this.containerEl.createDiv({ cls: 'google-calendar-fullcalendar' });

		// Create task panel container
		this.taskPanelContainer = this.containerEl.createDiv({ cls: 'task-panel-container' });
		// Task panel will be initialized after calendar is initialized
	}

	private createSearchBar() {
		this.searchInput = this.searchEl.createEl('input', {
			cls: 'calendar-search-input',
			type: 'text',
			placeholder: 'Search events and tasks...',
		});

		const searchButton = this.searchEl.createEl('button', {
			cls: 'calendar-search-button',
			text: '🔍 Search',
		});

		const clearButton = this.searchEl.createEl('button', {
			cls: 'calendar-search-clear',
			text: '✕',
		});
		clearButton.style.display = 'none';

		// Search on Enter key
		this.searchInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				this.performSearch();
			}
		});

		// Search on button click
		searchButton.addEventListener('click', () => {
			this.performSearch();
		});

		// Clear search
		clearButton.addEventListener('click', () => {
			if (this.searchInput) {
				this.searchInput.value = '';
			}
			clearButton.style.display = 'none';
			this.searchResults = null; // Clear search results
			this.refresh();
		});

		// Show clear button when typing
		this.searchInput.addEventListener('input', () => {
			if (this.searchInput && this.searchInput.value.trim()) {
				clearButton.style.display = 'block';
			} else {
				clearButton.style.display = 'none';
			}
		});
	}

	private searchResults: any = null;

	private async performSearch() {
		if (!this.searchInput || !this.searchInput.value.trim()) {
			new Notice('Please enter a search query');
			return;
		}

		const query = this.searchInput.value.trim();
		new Notice(`Searching for: ${query}`);

		try {
			const results = await this.provider.search({
				query,
				maxResults: 100,
			});

			if (!results || (!results.events?.items?.length && !results.tasks?.items?.length)) {
				new Notice('No results found');
				this.searchResults = null;
				this.refresh();
				return;
			}

			// Display results count
			const eventCount = results.events?.items?.length || 0;
			const taskCount = results.tasks?.items?.length || 0;
			new Notice(`Found ${eventCount} event(s) and ${taskCount} task(s)`);

			// Store search results and refresh calendar to show only these
			this.searchResults = results;
			this.refresh();
		} catch (error) {
			console.error('Search failed:', error);
			new Notice('Search failed');
		}
	}

	async initialize() {
		console.log('[Calendar Integration] CalendarView.initialize() called');

		// Initialize FullCalendar
		this.calendar = new Calendar(this.calendarEl, {
			plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
			initialView: 'dayGridMonth',
			headerToolbar: {
				left: 'prev,next today refreshButton',
				center: 'title',
				right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
			},
			customButtons: {
				refreshButton: {
					text: '🔄 Refresh',
					hint: 'Refresh calendar and tasks',
					click: () => {
						this.refresh();
						if (this.taskPanel) {
							this.taskPanel.refresh();
						}
						new Notice('🔄 Refreshing calendar...');
					}
				}
			},
			editable: true, // Enable drag & drop and resizing
			selectable: true,
			selectMirror: true,
			dayMaxEvents: true,
			weekends: true,
			events: this.fetchEvents.bind(this),
			eventClick: this.handleEventClick.bind(this),
			eventDidMount: this.handleEventDidMount.bind(this),
			select: this.handleDateSelect.bind(this),
			datesSet: this.handleDatesSet.bind(this),
			loading: this.handleLoading.bind(this),
			eventDrop: this.handleEventDrop.bind(this), // Handle drag & drop
			eventResize: this.handleEventResize.bind(this), // Handle resizing
			dateClick: this.handleDateClick.bind(this), // Handle right-click on dates
			height: 'auto',
			eventDisplay: 'block',
			displayEventTime: true,
			displayEventEnd: true,
			eventTimeFormat: {
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			},
			slotLabelFormat: {
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			},
			nowIndicator: true,
			eventContent: this.renderEventContent.bind(this),
			windowResize: this.handleWindowResize.bind(this),
		});

		this.calendar.render();
		console.log('[Calendar Integration] Calendar rendered');

		// Set up resize observer for responsive behavior
		this.setupResizeObserver();
		console.log('[Calendar Integration] Resize observer set up');

		// Set up right-click context menu
		this.setupContextMenu();
		console.log('[Calendar Integration] Context menu set up');

		// Initialize task panel
		console.log('[Calendar Integration] About to initialize task panel...');
		this.initializeTaskPanel();
		console.log('[Calendar Integration] Task panel initialization complete');
	}

	/**
	 * Set up right-click context menu for calendar
	 */
	private setupContextMenu() {
		if (!this.calendarEl) return;

		// Add right-click event listener to calendar
		this.calendarEl.addEventListener('contextmenu', (e: MouseEvent) => {
			// Check if right-click is on a calendar cell
			const target = e.target as HTMLElement;
			const dayCell = target.closest('.fc-daygrid-day, .fc-timegrid-slot');

			if (dayCell) {
				e.preventDefault();
				this.showContextMenu(e);
			}
		});
	}

	/**
	 * Show context menu at mouse position
	 */
	private showContextMenu(e: MouseEvent) {
		if (!this.app) return;

		// Get the date from the clicked element
		const target = e.target as HTMLElement;
		const dayCell = target.closest('.fc-daygrid-day, .fc-timegrid-slot') as HTMLElement;

		if (!dayCell) return;

		// Extract date from data attribute
		let clickedDate = dayCell.getAttribute('data-date');

		// If no data-date, try to get from parent
		if (!clickedDate) {
			const parent = dayCell.closest('[data-date]') as HTMLElement;
			if (parent) {
				clickedDate = parent.getAttribute('data-date');
			}
		}

		// Create context menu
		const menu = new Menu();

		menu.addItem((item) => {
			item
				.setTitle('Create Event')
				.setIcon('calendar-plus')
				.onClick(() => {
					this.openEventCreationModal(clickedDate || undefined);
				});
		});

		menu.addItem((item) => {
			item
				.setTitle('Create Task')
				.setIcon('check-square')
				.onClick(() => {
					this.openTaskCreationModal(clickedDate || undefined);
				});
		});

		menu.showAtMouseEvent(e);
	}

	/**
	 * Open event creation modal
	 */
	private openEventCreationModal(date?: string) {
		if (!this.app) return;

		const modal = new EventCreationModal(
			this.app,
			this.provider,
			{
				defaultDate: date || new Date().toISOString().split('T')[0],
				defaultStartTime: '09:00',
				defaultEndTime: '10:00'
			},
			() => {
				// Refresh calendar after event creation
				this.calendar?.refetchEvents();
			}
		);
		modal.open();
	}

	/**
	 * Open task creation modal
	 */
	private openTaskCreationModal(date?: string) {
		if (!this.app) return;

		const modal = new TaskCreationModal(
			this.app,
			this.provider,
			{
				defaultDueDate: date || new Date().toISOString().split('T')[0]
			},
			() => {
				// Refresh task panel after task creation
				if (this.taskPanel) {
					this.taskPanel.refresh();
				}
			}
		);
		modal.open();
	}

	/**
	 * Handle date click (for left-click)
	 */
	private handleDateClick(info: any) {
		// This is called on left-click, we can use it for quick event creation
		// Right-click will show the context menu
		console.log('[Calendar Integration] Date clicked:', info.dateStr);
	}

	/**
	 * Set up resize observer to handle panel resizing
	 */
	private setupResizeObserver() {
		if (!this.containerEl) return;

		const resizeObserver = new ResizeObserver(() => {
			if (this.calendar) {
				this.calendar.updateSize();
			}
		});

		resizeObserver.observe(this.containerEl);
	}

	/**
	 * Handle window resize
	 */
	private handleWindowResize() {
		if (this.calendar) {
			this.calendar.updateSize();
		}
	}

	/**
	 * Handle date/time selection - open event creation modal
	 */
	private handleDateSelect(selectInfo: any) {
		if (!this.app) {
			new Notice('Cannot create event: App not available');
			return;
		}

		const startDate = selectInfo.startStr.split('T')[0];
		const endDate = selectInfo.endStr.split('T')[0];
		const allDay = selectInfo.allDay;

		// Extract time if not all-day
		let startTime = '09:00';
		let endTime = '10:00';

		if (!allDay && selectInfo.startStr.includes('T')) {
			const startDateTime = new Date(selectInfo.start);
			const endDateTime = new Date(selectInfo.end);
			startTime = `${startDateTime.getHours().toString().padStart(2, '0')}:${startDateTime.getMinutes().toString().padStart(2, '0')}`;
			endTime = `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`;
		}

		// Open event creation modal
		new EventCreationModal(
			this.app,
			this.provider,
			{
				defaultDate: startDate,
				defaultStartTime: startTime,
				defaultEndTime: endTime,
			},
			() => this.refresh()
		).open();

		// Unselect the date range
		if (this.calendar) {
			this.calendar.unselect();
		}
	}

	/**
	 * Refresh calendar events
	 */
	refresh() {
		if (this.calendar) {
			this.calendar.refetchEvents();
		}
	}

	private async fetchEvents(fetchInfo: any, successCallback: any, failureCallback: any) {
		try {
			const startDate = fetchInfo.startStr.split('T')[0];
			const endDate = fetchInfo.endStr.split('T')[0];

			// Use search results if available, otherwise fetch from provider
			let data;
			if (this.searchResults) {
				data = this.searchResults;
			} else {
				data = await this.provider.getEventsAndTasksForDateRange(startDate, endDate);
			}

			if (!data) {
				failureCallback(new Error('Failed to fetch calendar data'));
				return;
			}

			const events: any[] = [];

			// Add Google Calendar events
			if (data.events?.items) {
				data.events.items.forEach((event: any) => {
					// Determine event color (use calendar color if available, otherwise default)
					const eventColor = event.colorId ? this.getGoogleCalendarColor(event.colorId) : '#4285f4';

					// Check for special event types
					const hasVideoCall = event.hangoutLink || event.conferenceData;
					const hasAttachments = event.attachments && event.attachments.length > 0;

					events.push({
						id: event.id,
						title: event.summary || 'Untitled Event',
						start: event.start?.dateTime || event.start?.date,
						end: event.end?.dateTime || event.end?.date,
						allDay: !event.start?.dateTime,
						backgroundColor: eventColor,
						borderColor: eventColor,
						extendedProps: {
							type: 'event',
							description: event.description,
							location: event.location,
							htmlLink: event.htmlLink,
							hangoutLink: event.hangoutLink,
							conferenceData: event.conferenceData,
							hasVideoCall,
							hasAttachments,
							attachments: event.attachments,
							organizer: event.organizer,
							attendees: event.attendees,
							originalEvent: event
						}
					});
				});
			}

			// Add Google Tasks
			if (data.tasks?.items) {
				data.tasks.items.forEach((task: any) => {
					if (task.due) {
						events.push({
							id: task.id,
							title: task.title || 'Untitled Task',
							start: task.due,
							allDay: true,
							backgroundColor: '#ea4335',
							borderColor: '#ea4335',
							extendedProps: {
								type: 'task',
								notes: task.notes,
								status: task.status,
								completed: task.status === 'completed',
								originalTask: task
							}
						});
					}
				});
			}

			successCallback(events);
		} catch (error) {
			console.error('Error fetching calendar events:', error);
			failureCallback(error);
			new Notice('Failed to load calendar events');
		}
	}

	/**
	 * Get Google Calendar color by color ID
	 */
	private getGoogleCalendarColor(colorId: string): string {
		const colors: Record<string, string> = {
			'1': '#a4bdfc', // Lavender
			'2': '#7ae7bf', // Sage
			'3': '#dbadff', // Grape
			'4': '#ff887c', // Flamingo
			'5': '#fbd75b', // Banana
			'6': '#ffb878', // Tangerine
			'7': '#46d6db', // Peacock
			'8': '#e1e1e1', // Graphite
			'9': '#5484ed', // Blueberry
			'10': '#51b749', // Basil
			'11': '#dc2127', // Tomato
		};
		return colors[colorId] || '#4285f4';
	}

	/**
	 * Custom event content renderer
	 */
	private renderEventContent(arg: any) {
		const props = arg.event.extendedProps;
		const container = document.createElement('div');
		container.className = 'fc-event-main-custom';

		if (props.type === 'task') {
			// Task rendering
			const icon = container.createSpan({ cls: 'fc-event-icon' });
			icon.innerHTML = props.completed ? '✅' : '📋';

			const title = container.createSpan({ cls: 'fc-event-title-custom' });
			title.textContent = arg.event.title;
			if (props.completed) {
				title.style.textDecoration = 'line-through';
				title.style.opacity = '0.6';
			}
		} else {
			// Event rendering
			const timeText = container.createSpan({ cls: 'fc-event-time-custom' });
			if (!arg.event.allDay && arg.timeText) {
				timeText.textContent = arg.timeText;
			}

			const title = container.createSpan({ cls: 'fc-event-title-custom' });
			title.textContent = arg.event.title;

			// Add badges for special features
			if (props.hasVideoCall) {
				const badge = container.createSpan({ cls: 'fc-event-badge' });
				badge.innerHTML = '📹';
				badge.title = 'Video call';
			}

			if (props.location) {
				const badge = container.createSpan({ cls: 'fc-event-badge' });
				badge.innerHTML = '📍';
				badge.title = props.location;
			}

			if (props.hasAttachments) {
				const badge = container.createSpan({ cls: 'fc-event-badge' });
				badge.innerHTML = '📎';
				badge.title = `${props.attachments.length} attachment(s)`;
			}
		}

		return { domNodes: [container] };
	}

	/**
	 * Add tooltips to events
	 */
	private handleEventDidMount(info: any) {
		const props = info.event.extendedProps;
		const el = info.el;

		// Build tooltip content
		let tooltip = '';

		if (props.type === 'event') {
			const event = props.originalEvent;
			tooltip = `<strong>${event.summary || 'Untitled Event'}</strong>`;

			// Time
			if (!info.event.allDay) {
				const start = new Date(info.event.start);
				const end = info.event.end ? new Date(info.event.end) : null;
				tooltip += `<br>🕐 ${formatDateRange(start, end || undefined, false)}`;
			} else {
				tooltip += `<br>🕐 All day`;
			}

			// Location
			if (event.location) {
				tooltip += `<br>📍 ${event.location}`;
			}

			// Video call
			if (props.hasVideoCall) {
				tooltip += `<br>📹 Video call available`;
			}

			// Attendees
			if (event.attendees && event.attendees.length > 0) {
				tooltip += `<br>👥 ${event.attendees.length} attendee(s)`;
			}

			// Description preview
			if (event.description) {
				const preview = event.description.length > 100
					? event.description.substring(0, 100) + '...'
					: event.description;
				tooltip += `<br><br><em>${preview}</em>`;
			}
		} else if (props.type === 'task') {
			const task = props.originalTask;
			tooltip = `<strong>📋 ${task.title || 'Untitled Task'}</strong>`;
			tooltip += `<br>Status: ${props.completed ? '✅ Completed' : '⏳ Pending'}`;

			if (task.notes) {
				const preview = task.notes.length > 100
					? task.notes.substring(0, 100) + '...'
					: task.notes;
				tooltip += `<br><br><em>${preview}</em>`;
			}
		}

		// Set tooltip
		el.setAttribute('title', '');
		el.setAttribute('data-tooltip', tooltip);

		// Add hover effect
		el.addEventListener('mouseenter', () => {
			this.showTooltip(el, tooltip);
		});

		el.addEventListener('mouseleave', () => {
			this.hideTooltip();
		});
	}

	private tooltipEl: HTMLElement | null = null;

	private showTooltip(targetEl: HTMLElement, html: string) {
		this.hideTooltip();

		this.tooltipEl = document.body.createDiv({ cls: 'calendar-event-tooltip' });
		this.tooltipEl.innerHTML = html;

		const rect = targetEl.getBoundingClientRect();
		this.tooltipEl.style.position = 'fixed';
		this.tooltipEl.style.left = `${rect.left}px`;
		this.tooltipEl.style.top = `${rect.bottom + 5}px`;
		this.tooltipEl.style.zIndex = '1000';
	}

	private hideTooltip() {
		if (this.tooltipEl) {
			this.tooltipEl.remove();
			this.tooltipEl = null;
		}
	}

	/**
	 * Handle event click - show detailed modal
	 */
	private handleEventClick(info: any) {
		this.hideTooltip(); // Hide any open tooltip

		if (this.onEventClick) {
			this.onEventClick(info.event);
			return;
		}

		const props = info.event.extendedProps;

		if (props.type === 'event' && this.app) {
			new EventDetailsModal(this.app, info.event, props.originalEvent).open();
		} else if (props.type === 'task' && this.app) {
			new TaskDetailsModal(this.app, info.event, props.originalTask).open();
		} else {
			// Fallback if no app provided
			if (props.htmlLink) {
				window.open(props.htmlLink, '_blank');
			} else {
				new Notice(info.event.title);
			}
		}
	}

	/**
	 * Handle loading state
	 */
	private handleLoading(isLoading: boolean) {
		if (isLoading) {
			this.loadingEl.style.display = 'flex';
			this.calendarEl.style.opacity = '0.5';
		} else {
			this.loadingEl.style.display = 'none';
			this.calendarEl.style.opacity = '1';
		}
	}

	private handleDatesSet(dateInfo: any) {
		// Called when the calendar view changes (month/week/day)
		// Can be used for additional logic
	}

	/**
	 * Handle event drag & drop
	 */
	private async handleEventDrop(info: any) {
		console.log('[Calendar Integration] Event dropped:', info);

		const event = info.event;
		const props = event.extendedProps;

		// Only handle calendar events (not tasks)
		if (props.type !== 'event') {
			console.log('[Calendar Integration] Skipping non-event drop');
			return;
		}

		// Show loading indicator
		const originalBgColor = event.backgroundColor;
		event.setProp('backgroundColor', '#999');
		event.setProp('borderColor', '#999');

		try {
			// Extract event ID and calendar ID from the original event
			const originalEvent = props.originalEvent;
			const eventId = originalEvent.id;
			const calendarId = originalEvent.calendarId || 'primary';

			// Build update payload
			const updates: any = {};

			// Update start time
			if (event.start) {
				if (event.allDay) {
					updates.start = {
						date: this.formatDate(event.start)
					};
				} else {
					updates.start = {
						dateTime: event.start.toISOString(),
						timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
					};
				}
			}

			// Update end time
			if (event.end) {
				if (event.allDay) {
					updates.end = {
						date: this.formatDate(event.end)
					};
				} else {
					updates.end = {
						dateTime: event.end.toISOString(),
						timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
					};
				}
			}

			console.log('[Calendar Integration] Updating event:', eventId, updates);

			// Update via provider
			if (this.provider) {
				await this.provider.updateEvent(eventId, updates);
				new Notice('Event updated successfully');

				// Restore original color
				event.setProp('backgroundColor', originalBgColor);
				event.setProp('borderColor', originalBgColor);
			} else {
				throw new Error('Calendar provider not available');
			}
		} catch (error) {
			console.error('[Calendar Integration] Failed to update event:', error);
			new Notice('Failed to update event. Reverting changes.');

			// Revert the event to its original position
			info.revert();
		}
	}

	/**
	 * Handle event resize
	 */
	private async handleEventResize(info: any) {
		console.log('[Calendar Integration] Event resized:', info);

		const event = info.event;
		const props = event.extendedProps;

		// Only handle calendar events (not tasks)
		if (props.type !== 'event') {
			console.log('[Calendar Integration] Skipping non-event resize');
			return;
		}

		// Show loading indicator
		const originalBgColor = event.backgroundColor;
		event.setProp('backgroundColor', '#999');
		event.setProp('borderColor', '#999');

		try {
			// Extract event ID and calendar ID from the original event
			const originalEvent = props.originalEvent;
			const eventId = originalEvent.id;
			const calendarId = originalEvent.calendarId || 'primary';

			// Build update payload
			const updates: any = {};

			// Update end time (start time doesn't change during resize)
			if (event.end) {
				if (event.allDay) {
					updates.end = {
						date: this.formatDate(event.end)
					};
				} else {
					updates.end = {
						dateTime: event.end.toISOString(),
						timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
					};
				}
			}

			console.log('[Calendar Integration] Updating event duration:', eventId, updates);

			// Update via provider
			if (this.provider) {
				await this.provider.updateEvent(eventId, updates);
				new Notice('Event duration updated successfully');

				// Restore original color
				event.setProp('backgroundColor', originalBgColor);
				event.setProp('borderColor', originalBgColor);
			} else {
				throw new Error('Calendar provider not available');
			}
		} catch (error) {
			console.error('[Calendar Integration] Failed to update event duration:', error);
			new Notice('Failed to update event duration. Reverting changes.');

			// Revert the event to its original size
			info.revert();
		}
	}

	/**
	 * Format date to YYYY-MM-DD
	 */
	private formatDate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	/**
	 * Initialize task panel
	 */
	private initializeTaskPanel() {
		console.log('[Calendar Integration] Initializing task panel...');
		console.log('[Calendar Integration] taskPanelContainer:', this.taskPanelContainer);

		if (!this.taskPanelContainer) {
			console.error('[Calendar Integration] Task panel container not found!');
			return;
		}

		console.log('[Calendar Integration] Creating TaskListPanel...');
		this.taskPanel = new TaskListPanel({
			container: this.taskPanelContainer,
			onTaskClick: (task) => this.handleTaskClick(task),
			onTaskComplete: (task) => this.handleTaskComplete(task),
			onTaskEdit: (task) => this.handleTaskEdit(task),
			onTaskDelete: (task) => this.handleTaskDelete(task)
		});
		console.log('[Calendar Integration] TaskListPanel created:', this.taskPanel);

		// Load tasks
		console.log('[Calendar Integration] Loading tasks for panel...');
		this.loadTasksForPanel();
	}

	/**
	 * Load tasks for the task panel
	 */
	private async loadTasksForPanel() {
		try {
			console.log('[Calendar Integration] Fetching tasks from provider...');
			const tasks = await this.provider.getTasks();
			console.log('[Calendar Integration] Tasks fetched:', tasks);

			if (tasks && tasks.items) {
				console.log('[Calendar Integration] Setting tasks on panel:', tasks.items.length, 'tasks');
				this.taskPanel?.setTasks(tasks.items);
			} else {
				console.log('[Calendar Integration] No tasks found');
			}
		} catch (error: any) {
			console.error('[Calendar Integration] Failed to load tasks for panel:', error);
			new Notice(`❌ Failed to load tasks: ${error.message}`);
		}
	}

	/**
	 * Handle task click - show task edit modal
	 */
	private handleTaskClick(task: CalendarTask) {
		// Show task details modal (simplified - just show edit modal)
		this.handleTaskEdit(task);
	}

	/**
	 * Handle task complete - mark task as complete
	 */
	private async handleTaskComplete(task: CalendarTask) {
		try {
			await this.provider.completeTask(task.id!);
			new Notice('✅ Task marked as complete');

			// Reload tasks
			await this.loadTasksForPanel();
		} catch (error: any) {
			console.error('[Calendar Integration] Failed to complete task:', error);
			new Notice(`❌ Failed to complete task: ${error.message}`);
		}
	}

	/**
	 * Handle task edit - open edit modal
	 */
	private handleTaskEdit(task: CalendarTask) {
		if (!this.app) {
			new Notice('❌ Cannot edit task: App not available');
			console.error('[Calendar Integration] App not available for task edit');
			return;
		}

		const modal = new TaskEditModal(this.app, {
			task,
			onSave: async (taskId, updates) => {
				await this.provider.updateTask(taskId, updates);
				await this.loadTasksForPanel();
			},
			onDelete: async (taskId) => {
				await this.provider.deleteTask(taskId);
				await this.loadTasksForPanel();
			}
		});
		modal.open();
	}

	/**
	 * Handle task delete - delete task with confirmation
	 */
	private async handleTaskDelete(task: CalendarTask) {
		const confirmed = confirm(`Are you sure you want to delete "${task.title}"?`);
		if (!confirmed) return;

		try {
			await this.provider.deleteTask(task.id!);
			new Notice('✅ Task deleted successfully');

			// Reload tasks
			await this.loadTasksForPanel();
		} catch (error: any) {
			console.error('[Calendar Integration] Failed to delete task:', error);
			new Notice(`❌ Failed to delete task: ${error.message}`);
		}
	}

	destroy() {
		this.hideTooltip();
		if (this.calendar) {
			this.calendar.destroy();
			this.calendar = null;
		}
		if (this.taskPanel) {
			this.taskPanel.destroy();
			this.taskPanel = null;
		}
	}
}

/**
 * Event Details Modal
 */
class EventDetailsModal extends Modal {
	private event: any;
	private googleEvent: any;

	constructor(app: App, event: any, googleEvent: any) {
		super(app);
		this.event = event;
		this.googleEvent = googleEvent;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('calendar-event-details-modal');

		// Header
		const header = contentEl.createDiv({ cls: 'modal-header' });
		header.createEl('h2', { text: this.googleEvent.summary || 'Untitled Event' });

		// Content
		const content = contentEl.createDiv({ cls: 'modal-content' });

		// Time
		const timeSection = content.createDiv({ cls: 'detail-section' });
		const timeIcon = timeSection.createSpan({ cls: 'detail-icon' });
		timeIcon.innerHTML = '🕐';

		const timeText = timeSection.createSpan({ cls: 'detail-text' });
		if (this.event.allDay) {
			timeText.textContent = 'All day';
		} else {
			const start = new Date(this.event.start);
			const end = this.event.end ? new Date(this.event.end) : null;
			timeText.textContent = formatDateRange(start, end || undefined, false);
		}

		// Location
		if (this.googleEvent.location) {
			const locationSection = content.createDiv({ cls: 'detail-section' });
			const locationIcon = locationSection.createSpan({ cls: 'detail-icon' });
			locationIcon.innerHTML = '📍';
			locationSection.createSpan({
				cls: 'detail-text',
				text: this.googleEvent.location
			});
		}

		// Video call
		const videoLink = this.googleEvent.hangoutLink || this.googleEvent.conferenceData?.entryPoints?.[0]?.uri;
		if (videoLink) {
			const videoSection = content.createDiv({ cls: 'detail-section' });
			const videoIcon = videoSection.createSpan({ cls: 'detail-icon' });
			videoIcon.innerHTML = '📹';

			const videoButton = videoSection.createEl('a', {
				cls: 'detail-link',
				text: 'Join video call',
				href: videoLink
			});
			videoButton.setAttribute('target', '_blank');
		}

		// Attendees
		if (this.googleEvent.attendees && this.googleEvent.attendees.length > 0) {
			const attendeesSection = content.createDiv({ cls: 'detail-section' });
			const attendeesIcon = attendeesSection.createSpan({ cls: 'detail-icon' });
			attendeesIcon.innerHTML = '👥';

			const attendeesList = attendeesSection.createDiv({ cls: 'detail-text' });
			attendeesList.createEl('strong', { text: 'Attendees:' });
			const ul = attendeesList.createEl('ul');
			this.googleEvent.attendees.forEach((attendee: any) => {
				const li = ul.createEl('li');
				li.textContent = attendee.email;
				if (attendee.organizer) li.textContent += ' (Organizer)';
				if (attendee.responseStatus === 'accepted') li.textContent += ' ✅';
				else if (attendee.responseStatus === 'declined') li.textContent += ' ❌';
				else if (attendee.responseStatus === 'tentative') li.textContent += ' ❓';
			});
		}

		// Description
		if (this.googleEvent.description) {
			const descSection = content.createDiv({ cls: 'detail-section' });
			descSection.createEl('strong', { text: 'Description:' });
			const descText = descSection.createDiv({ cls: 'detail-description' });
			descText.textContent = this.googleEvent.description;
		}

		// Attachments
		if (this.googleEvent.attachments && this.googleEvent.attachments.length > 0) {
			const attachSection = content.createDiv({ cls: 'detail-section' });
			const attachIcon = attachSection.createSpan({ cls: 'detail-icon' });
			attachIcon.innerHTML = '📎';

			const attachList = attachSection.createDiv({ cls: 'detail-text' });
			attachList.createEl('strong', { text: 'Attachments:' });
			const ul = attachList.createEl('ul');
			this.googleEvent.attachments.forEach((attachment: any) => {
				const li = ul.createEl('li');
				const link = li.createEl('a', {
					text: attachment.title,
					href: attachment.fileUrl
				});
				link.setAttribute('target', '_blank');
			});
		}

		// Footer with actions
		const footer = contentEl.createDiv({ cls: 'modal-footer' });

		if (this.googleEvent.htmlLink) {
			const openButton = footer.createEl('button', {
				cls: 'mod-cta',
				text: 'Open in Google Calendar'
			});
			openButton.addEventListener('click', () => {
				window.open(this.googleEvent.htmlLink, '_blank');
				this.close();
			});
		}

		const closeButton = footer.createEl('button', { text: 'Close' });
		closeButton.addEventListener('click', () => this.close());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

/**
 * Task Details Modal
 */
class TaskDetailsModal extends Modal {
	private event: any;
	private googleTask: any;

	constructor(app: App, event: any, googleTask: any) {
		super(app);
		this.event = event;
		this.googleTask = googleTask;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('calendar-task-details-modal');

		// Header
		const header = contentEl.createDiv({ cls: 'modal-header' });
		const title = header.createEl('h2', { text: this.googleTask.title || 'Untitled Task' });
		if (this.googleTask.status === 'completed') {
			title.style.textDecoration = 'line-through';
			title.style.opacity = '0.6';
		}

		// Content
		const content = contentEl.createDiv({ cls: 'modal-content' });

		// Status
		const statusSection = content.createDiv({ cls: 'detail-section' });
		const statusIcon = statusSection.createSpan({ cls: 'detail-icon' });
		statusIcon.innerHTML = this.googleTask.status === 'completed' ? '✅' : '📋';
		statusSection.createSpan({
			cls: 'detail-text',
			text: this.googleTask.status === 'completed' ? 'Completed' : 'Pending'
		});

		// Due date
		if (this.googleTask.due) {
			const dueSection = content.createDiv({ cls: 'detail-section' });
			const dueIcon = dueSection.createSpan({ cls: 'detail-icon' });
			dueIcon.innerHTML = '📅';
			const dueDate = new Date(this.googleTask.due);
			dueSection.createSpan({
				cls: 'detail-text',
				text: `Due: ${dueDate.toLocaleDateString()}`
			});
		}

		// Notes
		if (this.googleTask.notes) {
			const notesSection = content.createDiv({ cls: 'detail-section' });
			notesSection.createEl('strong', { text: 'Notes:' });
			const notesText = notesSection.createDiv({ cls: 'detail-description' });
			notesText.textContent = this.googleTask.notes;
		}

		// Footer
		const footer = contentEl.createDiv({ cls: 'modal-footer' });
		const closeButton = footer.createEl('button', { text: 'Close' });
		closeButton.addEventListener('click', () => this.close());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
