import { App, Modal, Notice, Setting, TFile, MarkdownView } from 'obsidian';
import { CalendarProvider, CreateTaskOptions } from '../providers/CalendarProvider';

export interface TaskCreationOptions {
	defaultDueDate?: string;
}

/**
 * Task Creation Modal
 *
 * Allows users to create new tasks with advanced features:
 * - Draggable modal
 * - Expandable/full-screen notes
 * - Open notes in separate editor
 */
export class TaskCreationModal extends Modal {
	private provider: CalendarProvider;
	private options: TaskCreationOptions;
	private onSuccess?: () => void;

	// Form fields
	private titleInput!: HTMLInputElement;
	private notesInput!: HTMLTextAreaElement;
	private dueDateInput!: HTMLInputElement;

	// Drag state
	private isDragging = false;
	private dragStartX = 0;
	private dragStartY = 0;
	private modalStartX = 0;
	private modalStartY = 0;

	// Temporary file for external editing
	private tempNoteFile: TFile | null = null;

	constructor(
		app: App,
		provider: CalendarProvider,
		options: TaskCreationOptions = {},
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
		contentEl.addClass('calendar-task-creation-modal');

		// Make modal draggable
		this.makeDraggable();

		// Header with drag handle
		const headerEl = contentEl.createDiv({ cls: 'calendar-modal__header draggable-header' });
		headerEl.createEl('h2', { text: '✋ Create New Task', attr: { title: 'Drag to move' } });
		
		// Title (required)
		new Setting(contentEl)
			.setName('Task title')
			.setDesc('Required')
			.addText(text => {
				this.titleInput = text.inputEl;
				text.setPlaceholder('Complete project proposal')
					.inputEl.focus();
			});
		
		// Due date
		new Setting(contentEl)
			.setName('Due date')
			.setDesc('Optional')
			.addText(text => {
				this.dueDateInput = text.inputEl;
				text.inputEl.type = 'date';
				text.inputEl.value = this.options.defaultDueDate || '';
			});
		
		// Notes section with expand and external editor buttons
		const notesSetting = new Setting(contentEl)
			.setName('Notes')
			.setDesc('Supports Markdown formatting');

		// Add full-screen toggle button
		notesSetting.addButton(button => {
			button
				.setButtonText('⛶ Full Screen')
				.setTooltip('Toggle full-screen mode')
				.onClick(() => {
					this.toggleNotesFullScreen();
				});
		});

		// Add external editor button
		notesSetting.addButton(button => {
			button
				.setButtonText('📝 Open in Editor')
				.setTooltip('Open notes in a separate tab. Edit there, then click "Sync & Close Tab" when done.')
				.onClick(async () => {
					await this.openNotesInEditor();
				});
		});

		// Add "Sync & Close Tab" button (only visible when editor is open)
		notesSetting.addButton(button => {
			button
				.setButtonText('💾 Sync & Close Tab')
				.setTooltip('Sync notes from editor and close the editor tab')
				.onClick(async () => {
					await this.syncAndCloseEditor();
				});
			button.buttonEl.style.display = 'none'; // Hidden by default
			button.buttonEl.addClass('sync-close-button');
		});

		// Add expand button
		notesSetting.addButton(button => {
			button
				.setButtonText('⛶ Expand')
				.setTooltip('Expand notes editor')
				.onClick(() => {
					this.toggleNotesExpanded();
				});
		});

		notesSetting.addTextArea(text => {
			this.notesInput = text.inputEl;
			text.setPlaceholder('Add task details, checklists, links...\n\nSupports:\n- **bold** and *italic*\n- [ ] checkboxes\n- bullet lists\n- links');
			text.inputEl.rows = 6;
			text.inputEl.style.minHeight = '150px';
			text.inputEl.style.resize = 'vertical';

			// Auto-resize as user types
			text.inputEl.addEventListener('input', () => {
				this.autoResizeTextarea(text.inputEl);
			});
		});
		
		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
		
		const createButton = buttonContainer.createEl('button', {
			cls: 'mod-cta',
			text: 'Create Task'
		});
		createButton.addEventListener('click', () => this.handleCreate());
		
		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelButton.addEventListener('click', () => this.close());
	}
	
	private isCreating = false;
	private isNotesExpanded = false;
	private isNotesFullScreen = false;

	/**
	 * Make the modal draggable by the header
	 */
	private makeDraggable() {
		const modalEl = this.modalEl;
		const headerEl = this.contentEl.querySelector('.draggable-header') as HTMLElement;

		if (!headerEl || !modalEl) return;

		const onMouseDown = (e: MouseEvent) => {
			// Only drag if clicking on the header (not buttons or inputs)
			if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'INPUT') {
				return;
			}

			this.isDragging = true;
			this.dragStartX = e.clientX;
			this.dragStartY = e.clientY;

			const rect = modalEl.getBoundingClientRect();
			this.modalStartX = rect.left;
			this.modalStartY = rect.top;

			modalEl.style.position = 'fixed';
			modalEl.style.left = this.modalStartX + 'px';
			modalEl.style.top = this.modalStartY + 'px';
			modalEl.style.margin = '0';

			headerEl.style.cursor = 'grabbing';
			e.preventDefault();
		};

		const onMouseMove = (e: MouseEvent) => {
			if (!this.isDragging) return;

			const deltaX = e.clientX - this.dragStartX;
			const deltaY = e.clientY - this.dragStartY;

			modalEl.style.left = (this.modalStartX + deltaX) + 'px';
			modalEl.style.top = (this.modalStartY + deltaY) + 'px';
		};

		const onMouseUp = () => {
			if (this.isDragging) {
				this.isDragging = false;
				if (headerEl) {
					headerEl.style.cursor = 'grab';
				}
			}
		};

		headerEl.addEventListener('mousedown', onMouseDown);
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);

		headerEl.style.cursor = 'grab';

		// Clean up on close
		this.onClose = async () => {
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);

			// Clean up temp file if it still exists
			if (this.tempNoteFile) {
				try {
					await this.app.vault.delete(this.tempNoteFile);
				} catch (error) {
					console.error('Failed to delete temp file on close:', error);
				}
			}

			this.contentEl.empty();
		};
	}

	/**
	 * Toggle expanded state (medium size)
	 */
	private toggleNotesExpanded() {
		this.isNotesExpanded = !this.isNotesExpanded;

		if (this.isNotesExpanded) {
			// Expand to larger height
			this.notesInput.style.minHeight = '500px';
			this.notesInput.rows = 25;
		} else {
			// Collapse back
			this.notesInput.style.minHeight = '150px';
			this.notesInput.rows = 6;
		}

		// Update button text
		const buttons = this.contentEl.querySelectorAll('.setting-item-control button');
		buttons.forEach(btn => {
			if (btn.textContent?.includes('Expand') || btn.textContent?.includes('Collapse')) {
				btn.textContent = this.isNotesExpanded ? '⛶ Collapse' : '⛶ Expand';
			}
		});
	}

	/**
	 * Toggle full-screen mode for notes
	 */
	private toggleNotesFullScreen() {
		this.isNotesFullScreen = !this.isNotesFullScreen;

		if (this.isNotesFullScreen) {
			// Full screen mode
			this.modalEl.addClass('modal-fullscreen');
			this.notesInput.style.minHeight = 'calc(100vh - 300px)';
			this.notesInput.style.height = 'calc(100vh - 300px)';
			this.notesInput.rows = 40;
		} else {
			// Exit full screen
			this.modalEl.removeClass('modal-fullscreen');
			this.notesInput.style.minHeight = '150px';
			this.notesInput.style.height = 'auto';
			this.notesInput.rows = 6;
		}

		// Update button text
		const buttons = this.contentEl.querySelectorAll('.setting-item-control button');
		buttons.forEach(btn => {
			if (btn.textContent?.includes('Full Screen') || btn.textContent?.includes('Exit')) {
				btn.textContent = this.isNotesFullScreen ? '⛶ Exit Full Screen' : '⛶ Full Screen';
			}
		});
	}

	/**
	 * Open notes in a separate Obsidian editor tab
	 */
	private async openNotesInEditor() {
		try {
			// If already open, just focus it
			if (this.tempNoteFile) {
				const leaves = this.app.workspace.getLeavesOfType('markdown');
				for (const leaf of leaves) {
					const file = (leaf.view as any).file;
					if (file && file.path === this.tempNoteFile.path) {
						this.app.workspace.setActiveLeaf(leaf, { focus: true });
						new Notice('📝 Editor already open - focused');
						return;
					}
				}
			}

			// Create a temporary file in the vault
			const tempFileName = `temp-task-notes-${Date.now()}.md`;
			const tempFilePath = tempFileName;

			// Save current notes content to temp file
			const currentContent = this.notesInput.value || '# Task Notes\n\nAdd your notes here...';
			this.tempNoteFile = await this.app.vault.create(tempFilePath, currentContent);

			// Open the file in a new tab
			const leaf = this.app.workspace.getLeaf('tab');
			await leaf.openFile(this.tempNoteFile);

			// Show the sync & close button
			const syncCloseButton = this.contentEl.querySelector('.sync-close-button') as HTMLButtonElement;
			if (syncCloseButton) {
				syncCloseButton.style.display = '';
			}

			// Disable auto-sync - user will manually sync when done
			// This prevents the modal from interfering while they edit

			new Notice('📝 Notes opened in editor.\n\nEdit your notes, then click "💾 Sync & Close Tab" when done.\nThen click "Create Task" to save.');
		} catch (error) {
			console.error('Failed to open notes in editor:', error);
			new Notice('❌ Failed to open notes in editor');
		}
	}

	/**
	 * Sync notes from editor and close the editor tab
	 */
	private async syncAndCloseEditor() {
		if (!this.tempNoteFile) {
			new Notice('❌ No editor tab open');
			return;
		}

		try {
			// Sync the content
			const content = await this.app.vault.read(this.tempNoteFile);
			this.notesInput.value = content;

			// Find and close the tab
			const leaves = this.app.workspace.getLeavesOfType('markdown');
			for (const leaf of leaves) {
				const file = (leaf.view as any).file;
				if (file && file.path === this.tempNoteFile.path) {
					leaf.detach();
					break;
				}
			}

			// Delete the temp file
			await this.app.vault.delete(this.tempNoteFile);
			this.tempNoteFile = null;

			// Hide the sync & close button
			const syncCloseButton = this.contentEl.querySelector('.sync-close-button') as HTMLButtonElement;
			if (syncCloseButton) {
				syncCloseButton.style.display = 'none';
			}

			new Notice('✅ Notes synced and editor tab closed!\n\nNow click "Create Task" to save.');
		} catch (error) {
			console.error('Failed to sync and close editor:', error);
			new Notice('❌ Failed to sync notes from editor');
		}
	}



	/**
	 * Auto-resize textarea as user types
	 */
	private autoResizeTextarea(textarea: HTMLTextAreaElement) {
		// Reset height to auto to get the correct scrollHeight
		textarea.style.height = 'auto';
		// Set height to scrollHeight to fit content
		textarea.style.height = Math.max(150, textarea.scrollHeight) + 'px';
	}

	private async handleCreate() {
		// Prevent double-click
		if (this.isCreating) {
			return;
		}

		// Validate
		if (!this.titleInput.value.trim()) {
			new Notice('Task title is required');
			this.titleInput.focus();
			return;
		}

		// Check if editor is still open
		if (this.tempNoteFile) {
			new Notice('⚠️ Please click "💾 Sync & Close Tab" first to save your notes from the editor.');
			return;
		}

		// Build task options
		const options: CreateTaskOptions = {
			title: this.titleInput.value.trim(),
			notes: this.notesInput.value.trim() || undefined,
		};

		// Add due date if provided
		if (this.dueDateInput.value) {
			// Validate date is not in the past (optional - you might want past tasks)
			const dueDate = new Date(this.dueDateInput.value);
			if (isNaN(dueDate.getTime())) {
				new Notice('❌ Invalid due date');
				return;
			}

			// Convert to RFC 3339 format with milliseconds (YYYY-MM-DDTHH:MM:SS.sssZ)
			// Google Tasks API requires this exact format
			options.due = `${this.dueDateInput.value}T00:00:00.000Z`;
		}

		// Create task with loading state
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

			new Notice('Creating task...');
			await this.provider.createTask(options);
			new Notice('✅ Task created successfully!');

			this.onSuccess?.();
			this.close();
		} catch (error) {
			console.error('Failed to create task:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`❌ Failed to create task: ${errorMessage}`);
		} finally {
			this.isCreating = false;
			const createButton = this.contentEl.querySelector('.mod-cta') as HTMLButtonElement;
			if (createButton) {
				createButton.disabled = false;
				createButton.textContent = 'Create Task';
			}
		}
	}
	
	// onClose is now defined in makeDraggable() to handle cleanup
}

