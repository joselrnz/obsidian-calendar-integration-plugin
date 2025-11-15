import { ItemView, WorkspaceLeaf } from 'obsidian';
import { CalendarView } from '../ui/CalendarView';
import type GoogleCalendarPlugin from '../main';

export const VIEW_TYPE_FULL_CALENDAR = 'calendar-integration-full-calendar';

export class FullCalendarView extends ItemView {
	private calendarView: CalendarView | null = null;
	private plugin: GoogleCalendarPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: GoogleCalendarPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_FULL_CALENDAR;
	}

	getDisplayText(): string {
		return 'Calendar';
	}

	getIcon(): string {
		return 'calendar';
	}

	async onOpen() {
		console.log('[Calendar Integration] Opening calendar view...');
		
		// Clear any existing content
		this.contentEl.empty();
		
		// Add container class for styling
		this.contentEl.addClass('calendar-integration-view');
		
		// Check if provider is initialized
		if (!this.plugin.calendarProvider) {
			this.contentEl.createDiv({
				cls: 'calendar-error',
				text: '⚠️ Please configure Google Calendar credentials in settings first.'
			});
			return;
		}

		try {
			// Create and initialize the calendar view
			this.calendarView = new CalendarView({
				provider: this.plugin.calendarProvider,
				containerEl: this.contentEl,
				app: this.app,
			});

			await this.calendarView.initialize();
			console.log('[Calendar Integration] Calendar view initialized successfully');
		} catch (error) {
			console.error('[Calendar Integration] Failed to initialize calendar view:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			this.contentEl.createDiv({
				cls: 'calendar-error',
				text: `❌ Failed to load calendar: ${errorMessage}`
			});
		}
	}

	/**
	 * Refresh the calendar view
	 */
	refresh() {
		if (this.calendarView) {
			this.calendarView.refresh();
		}
	}

	async onClose() {
		console.log('[Calendar Integration] Closing calendar view...');

		// Clean up the calendar view
		if (this.calendarView) {
			this.calendarView.destroy();
			this.calendarView = null;
		}
	}
}

