import { App, Plugin, PluginSettingTab, Setting, TFile, MarkdownView, Menu, Notice, WorkspaceLeaf } from 'obsidian';
import moment from 'moment';
import { GoogleCalendarAPI, GoogleCalendarCredentials } from './api/google-calendar-api';
import { GoogleCalendarProvider } from './providers/GoogleCalendarProvider';
import { createCodeBlockProcessor } from './processors/calendar-code-block';
import { DateInputModal } from './modals/DateInputModal';
import { EventCreationModal } from './modals/EventCreationModal';
import { TaskCreationModal } from './modals/TaskCreationModal';
import { FullCalendarView, VIEW_TYPE_FULL_CALENDAR } from './views/FullCalendarView';
import { TaskSyncManager } from './services/TaskSyncManager';

interface GoogleCalendarPluginSettings {
	enabledForDailyNotes: boolean;
	googleClientId: string;
	googleClientSecret: string;
	googleAccessToken: string;
	googleRefreshToken: string;
	// Task sync settings
	enableMarkdownTaskSync: boolean;
	taskSyncFolder: string;
}

const DEFAULT_SETTINGS: GoogleCalendarPluginSettings = {
	enabledForDailyNotes: true,
	googleClientId: '',
	googleClientSecret: '',
	googleAccessToken: '',
	googleRefreshToken: '',
	// Task sync defaults
	enableMarkdownTaskSync: false,
	taskSyncFolder: ''
}

export default class GoogleCalendarPlugin extends Plugin {
	settings!: GoogleCalendarPluginSettings;
	googleCalendarAPI!: GoogleCalendarAPI;
	calendarProvider!: GoogleCalendarProvider;
	taskSyncManager?: TaskSyncManager;

	async onload() {
		console.log('[Calendar Integration] Loading plugin...');
		await this.loadSettings();

		// Register the calendar view
		this.registerView(
			VIEW_TYPE_FULL_CALENDAR,
			(leaf) => new FullCalendarView(leaf, this)
		);

		// Add ribbon icon with dropdown menu
		this.addRibbonIcon('calendar', 'Calendar Integration', (evt: MouseEvent) => {
			const menu = new Menu();

			menu.addItem((item) => {
				item
					.setTitle("Open Calendar View")
					.setIcon("calendar")
					.onClick(async () => {
						await this.activateCalendarView();
					});
			});

			menu.addItem((item) => {
				item
					.setTitle("Insert Calendar Block")
					.setIcon("code")
					.onClick(() => {
						const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
						if (activeView && activeView.file) {
							const file = activeView.file;
							new DateInputModal(this.app, (date: string) => {
								this.insertCalendarBlock(file, date, true);
							}).open();
						} else {
							new Notice('Please open a note first');
						}
					});
			});

			menu.addItem((item) => {
				item
					.setTitle("Create Event")
					.setIcon("plus-circle")
					.onClick(() => {
						if (!this.calendarProvider) {
							new Notice('Please configure Google Calendar credentials in settings first');
							return;
						}
						new EventCreationModal(
							this.app,
							this.calendarProvider,
							{},
							() => {
								// Refresh calendar view if open
								const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FULL_CALENDAR);
								leaves.forEach(leaf => {
									const view = leaf.view as FullCalendarView;
									view.refresh();
								});
							}
						).open();
					});
			});

			menu.addItem((item) => {
				item
					.setTitle("Create Task")
					.setIcon("check-square")
					.onClick(() => {
						if (!this.calendarProvider) {
							new Notice('Please configure Google Calendar credentials in settings first');
							return;
						}
						new TaskCreationModal(
							this.app,
							this.calendarProvider,
							{},
							() => {
								// Refresh calendar view if open
								const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FULL_CALENDAR);
								leaves.forEach(leaf => {
									const view = leaf.view as FullCalendarView;
									view.refresh();
								});
							}
						).open();
					});
			});

			menu.addItem((item) => {
				item
					.setTitle("Sync Calendars")
					.setIcon("refresh-cw")
					.onClick(async () => {
						if (!this.settings.googleAccessToken) {
							new Notice('Please configure Google Calendar credentials in settings first');
							return;
						}
						new Notice('Syncing calendars...');
						try {
							// Force refresh the API
							await this.initializeGoogleCalendarAPI();
							new Notice('Calendars synced successfully!');
						} catch (error) {
							console.error('Failed to sync calendars:', error);
							new Notice('Failed to sync calendars. Check console for details.');
						}
					});
			});

			menu.addSeparator();

			menu.addItem((item) => {
				item
					.setTitle("Settings")
					.setIcon("settings")
					.onClick(() => {
						// Open plugin settings
						const settingTab = (this.app as any).setting;
						settingTab.open();
						settingTab.openTabById(this.manifest.id);
					});
			});

			menu.showAtMouseEvent(evt);
		});

		this.registerEvent(
			this.app.workspace.on('file-open', async (file) => {
				if (file && this.settings.enabledForDailyNotes && this.isDailyNote(file)) {
					// Wait for the view to switch to the new file before inserting
					setTimeout(async () => {
						await this.insertCalendarBlock(file);
					}, 100);
				}
			})
		);

		this.addCommand({
			id: 'insert-calendar-block',
			name: 'Insert Calendar block',
			editorCheckCallback: (checking, editor, ctx) => {
				if (ctx instanceof MarkdownView && ctx.file) {
					if (!checking) {
						const file = ctx.file;
						new DateInputModal(this.app, (date: string) => {
							this.insertCalendarBlock(file, date, true);
						}).open();
					}
					return true;
				}
				return false;
			}
		});

		this.registerMarkdownCodeBlockProcessor(
			"google-calendar", // for already-exist check
			createCodeBlockProcessor(this.calendarProvider)
		);

		// Register keyboard shortcuts
		this.addCommand({
			id: 'create-event',
			name: 'Create Event',
			hotkeys: [{ modifiers: ['Ctrl'], key: 'e' }],
			callback: () => {
				if (!this.calendarProvider) {
					new Notice('❌ Please configure Calendar Integration in settings');
					return;
				}
				new EventCreationModal(
					this.app,
					this.calendarProvider,
					{},
					() => {
						// Refresh calendar view if open
						const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FULL_CALENDAR);
						leaves.forEach(leaf => {
							const view = leaf.view as FullCalendarView;
							view.refresh();
						});
					}
				).open();
			}
		});

		this.addCommand({
			id: 'create-task',
			name: 'Create Task',
			hotkeys: [{ modifiers: ['Ctrl'], key: 't' }],
			callback: () => {
				if (!this.calendarProvider) {
					new Notice('❌ Please configure Calendar Integration in settings');
					return;
				}
				new TaskCreationModal(
					this.app,
					this.calendarProvider,
					{},
					() => {
						// Refresh calendar view if open
						const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FULL_CALENDAR);
						leaves.forEach(leaf => {
							const view = leaf.view as FullCalendarView;
							view.refresh();
						});
					}
				).open();
			}
		});

		this.addCommand({
			id: 'open-calendar-view',
			name: 'Open Calendar View',
			callback: () => {
				this.activateCalendarView();
			}
		});

		this.addSettingTab(new GoogleCalendarSettingTab(this.app, this));
	}

	onunload() {
		if (this.googleCalendarAPI) {
			this.googleCalendarAPI.cleanup();
		}
	}

	async activateCalendarView() {
		const { workspace } = this.app;

		// Check if view is already open
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_FULL_CALENDAR)[0];

		if (!leaf) {
			// Create new leaf in right sidebar
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
				await leaf.setViewState({
					type: VIEW_TYPE_FULL_CALENDAR,
					active: true,
				});
			}
		}

		// Reveal the leaf (bring it to front)
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.initializeGoogleCalendarAPI(); // TODO: reload authenticate info real time rather than after loadSettings.
	}

	private initializeGoogleCalendarAPI() {
		console.log('[Calendar Integration] Initializing Google Calendar API...');

		const credentials: GoogleCalendarCredentials = {
			clientId: this.settings.googleClientId,
			clientSecret: this.settings.googleClientSecret,
			accessToken: this.settings.googleAccessToken,
			refreshToken: this.settings.googleRefreshToken
		};

		const onTokensUpdated = async (tokens: { access_token?: string; refresh_token?: string }) => {
			console.log('[Calendar Integration] Tokens updated, saving to settings...');
			if (tokens.access_token) {
				this.settings.googleAccessToken = tokens.access_token;
			}
			if (tokens.refresh_token) {
				this.settings.googleRefreshToken = tokens.refresh_token;
			}
			await this.saveSettings();
		};

		this.googleCalendarAPI = new GoogleCalendarAPI(credentials, onTokensUpdated);
		this.calendarProvider = new GoogleCalendarProvider(credentials, onTokensUpdated);
		console.log('[Calendar Integration] Google Calendar API and Provider initialized successfully');

		// Initialize task sync manager
		this.initializeTaskSync();
	}

	initializeTaskSync() {
		console.log('[Calendar Integration] Initializing task sync manager...');

		// Create task sync manager
		this.taskSyncManager = new TaskSyncManager(
			this.app,
			this.calendarProvider,
			this.settings.taskSyncFolder
		);

		// Enable if setting is on
		if (this.settings.enableMarkdownTaskSync) {
			this.taskSyncManager.enable();
		}

		console.log('[Calendar Integration] Task sync manager initialized');
	}

	async handleGoogleAuth() {
		if (!this.settings.googleClientId || !this.settings.googleClientSecret) {
			return;
		}

		try {
			const tokens = await this.googleCalendarAPI.startOAuthFlow();
			if (tokens.access_token && tokens.refresh_token) {
				this.settings.googleAccessToken = tokens.access_token;
				this.settings.googleRefreshToken = tokens.refresh_token || '';
				await this.saveSettings();
				this.initializeGoogleCalendarAPI();
				// Code block processor is already registered in onload()
			}
		} catch (error) {
			console.error('Error during OAuth flow:', error);
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	isDailyNote(file: TFile): boolean {
		const dailyNotesFormat = /\d{4}-\d{2}-\d{2}/;
		return dailyNotesFormat.test(file.basename);
	}

	private extractDateFromFilename(file: TFile): string {
		const dateMatch = file.basename.match(/\d{4}-\d{2}-\d{2}/);
		return dateMatch ? dateMatch[0] : '';
	}

	async insertCalendarBlock(file: TFile, customDate?: string, isFromCommand?: boolean) {
		const todayDate = moment().format('YYYY-MM-DD');

		const dateString = isFromCommand
			? (customDate || todayDate)
			: (customDate || this.extractDateFromFilename(file) || todayDate);
		const displayDate = dateString;

		// Calculate week start (Sunday) for the given date
		const date = moment(displayDate);
		const weekStart = date.clone().startOf('week'); // Sunday
		const weekEnd = date.clone().endOf('week'); // Saturday
		const weekStartStr = weekStart.format('YYYY-MM-DD');
		const weekEndStr = weekEnd.format('YYYY-MM-DD');

		const calendarBlock = `
\`\`\`google-calendar
{
  "view": "week",
  "startDate": "${weekStartStr}",
  "endDate": "${weekEndStr}",
  "refreshInterval": 60,
  "showEvents": true,
  "showTasks": true,
  "highlightToday": true,
  "title": "📅 Week of ${weekStartStr}"
}
\`\`\``;

		const leaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (leaf && leaf.editor && leaf.file === file) {
			const content = leaf.editor.getValue();

			// Check if google-calendar block already exists
			if (content.includes('```google-calendar') && !isFromCommand) {
				return; // Don't insert duplicate blocks
			}

			leaf.editor.setValue(content + calendarBlock);
			leaf.editor.setCursor(leaf.editor.lastLine(), 0);
		}
	}

}

class GoogleCalendarSettingTab extends PluginSettingTab {
	plugin: GoogleCalendarPlugin;

	constructor(app: App, plugin: GoogleCalendarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Enable for daily notes')
			.setDesc('Automatically insert calendar block when opening daily notes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enabledForDailyNotes)
				.onChange(async (value) => {
					this.plugin.settings.enabledForDailyNotes = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', {text: 'Google Calendar API'});

		new Setting(containerEl)
			.setName('Google client ID')
			.setDesc('OAuth 2.0 client ID from Google Cloud console')
			.addText(text => text
				.setPlaceholder('Enter your Google client ID')
				.setValue(this.plugin.settings.googleClientId)
				.onChange(async (value) => {
					this.plugin.settings.googleClientId = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Google client secret')
			.setDesc('OAuth 2.0 client secret from Google Cloud Console')
			.addText(text => text
				.setPlaceholder('Enter your Google client secret')
				.setValue(this.plugin.settings.googleClientSecret)
				.onChange(async (value) => {
					this.plugin.settings.googleClientSecret = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Google authorization')
			.setDesc('Click to authorize access to your Google Calendar')
			.addButton(button => button
				.setButtonText('Authorize Google Calendar')
				.onClick(async () => {
					await this.plugin.handleGoogleAuth();
				}));

		const authStatus = this.plugin.settings.googleAccessToken ? 'Authorized ✓' : 'Not authorized';
		new Setting(containerEl)
			.setName('Authorization status')
			.setDesc(`Current status: ${authStatus}`);

		// Task Sync Settings
		containerEl.createEl('h3', {text: 'Markdown Task Sync'});

		containerEl.createEl('p', {
			text: 'Automatically sync tasks from markdown files to your calendar. Use format: - [ ] Task name 📅 2025-11-15',
			cls: 'setting-item-description'
		});

		new Setting(containerEl)
			.setName('Enable markdown task sync')
			.setDesc('Parse tasks from markdown files and sync to calendar')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableMarkdownTaskSync)
				.onChange(async (value) => {
					this.plugin.settings.enableMarkdownTaskSync = value;
					await this.plugin.saveSettings();

					// Enable/disable task sync
					if (value) {
						this.plugin.taskSyncManager?.enable();
					} else {
						this.plugin.taskSyncManager?.disable();
					}
				}));

		new Setting(containerEl)
			.setName('Task sync folder')
			.setDesc('Folder to scan for tasks (leave empty to scan all files)')
			.addText(text => text
				.setPlaceholder('Tasks')
				.setValue(this.plugin.settings.taskSyncFolder)
				.onChange(async (value) => {
					this.plugin.settings.taskSyncFolder = value;
					await this.plugin.saveSettings();

					// Reinitialize task sync with new folder
					if (this.plugin.taskSyncManager) {
						this.plugin.taskSyncManager.disable();
						this.plugin.initializeTaskSync();
					}
				}));
	}
}
