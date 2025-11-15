/**
 * TaskEditModal - Modal for editing existing tasks
 * Features: Draggable, expandable notes, external editor
 */

import { App, Modal, Notice, TFile } from 'obsidian';
import { CalendarTask } from '../providers/CalendarProvider';
import { format, parseISO } from 'date-fns';

export interface TaskEditModalOptions {
	task: CalendarTask;
	onSave: (taskId: string, updates: Partial<CalendarTask>) => Promise<void>;
	onDelete?: (taskId: string) => Promise<void>;
}

export class TaskEditModal extends Modal {
	private task: CalendarTask;
	private onSave: (taskId: string, updates: Partial<CalendarTask>) => Promise<void>;
	private onDelete?: (taskId: string) => Promise<void>;

	private titleInput!: HTMLInputElement;
	private notesTextarea!: HTMLTextAreaElement;
	private dueDateInput!: HTMLInputElement;
	private statusSelect!: HTMLSelectElement;

	// Drag state
	private isDragging = false;
	private dragStartX = 0;
	private dragStartY = 0;
	private modalStartX = 0;
	private modalStartY = 0;

	// Notes state
	private isNotesExpanded = false;
	private isNotesFullScreen = false;
	private tempNoteFile: TFile | null = null;

	constructor(app: App, options: TaskEditModalOptions) {
		super(app);
		this.task = options.task;
		this.onSave = options.onSave;
		this.onDelete = options.onDelete;
	}
	
	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('task-edit-modal');

		// Make modal draggable
		this.makeDraggable();

		// Title with drag handle
		this.titleEl.setText('✋ Edit Task');
		this.titleEl.addClass('draggable-header');
		this.titleEl.style.cursor = 'grab';

		// Form
		const formEl = contentEl.createDiv({ cls: 'calendar-modal__form' });
		
		// Title field
		const titleFieldEl = formEl.createDiv({ cls: 'calendar-modal__field' });
		titleFieldEl.createEl('label', {
			cls: 'calendar-modal__label',
			text: 'Title'
		});
		this.titleInput = titleFieldEl.createEl('input', {
			cls: 'calendar-modal__input',
			type: 'text',
			placeholder: 'Task title',
			value: this.task.title || ''
		});
		
		// Notes field with controls
		const notesFieldEl = formEl.createDiv({ cls: 'calendar-modal__field' });
		const notesLabelContainer = notesFieldEl.createDiv({ cls: 'calendar-modal__label-container' });
		notesLabelContainer.createEl('label', {
			cls: 'calendar-modal__label',
			text: 'Notes'
		});

		// Notes control buttons
		const notesControls = notesLabelContainer.createDiv({ cls: 'calendar-modal__notes-controls' });

		const fullScreenBtn = notesControls.createEl('button', {
			cls: 'calendar-modal__control-btn',
			text: '⛶ Full Screen',
			attr: { type: 'button', title: 'Toggle full-screen mode' }
		});
		fullScreenBtn.addEventListener('click', () => this.toggleNotesFullScreen());

		const editorBtn = notesControls.createEl('button', {
			cls: 'calendar-modal__control-btn',
			text: '📝 Editor',
			attr: { type: 'button', title: 'Open notes in a separate tab. Edit there, then click "Sync & Close Tab" when done.' }
		});
		editorBtn.addEventListener('click', async () => await this.openNotesInEditor());

		const syncCloseBtn = notesControls.createEl('button', {
			cls: 'calendar-modal__control-btn sync-close-button',
			text: '💾 Sync & Close Tab',
			attr: { type: 'button', title: 'Sync notes from editor and close the editor tab' }
		});
		syncCloseBtn.addEventListener('click', async () => {
			await this.syncAndCloseEditor();
		});
		syncCloseBtn.style.display = 'none'; // Hidden by default

		const expandBtn = notesControls.createEl('button', {
			cls: 'calendar-modal__control-btn',
			text: '⛶ Expand',
			attr: { type: 'button', title: 'Expand notes area' }
		});
		expandBtn.addEventListener('click', () => this.toggleNotesExpanded());

		this.notesTextarea = notesFieldEl.createEl('textarea', {
			cls: 'calendar-modal__textarea',
			placeholder: 'Task notes (optional)\n\nSupports Markdown:\n- **bold** and *italic*\n- [ ] checkboxes\n- bullet lists',
			value: this.task.notes || ''
		});
		this.notesTextarea.style.minHeight = '150px';
		this.notesTextarea.style.resize = 'vertical';

		// Auto-resize
		this.notesTextarea.addEventListener('input', () => {
			this.autoResizeTextarea(this.notesTextarea);
		});
		
		// Due date field
		const dueDateFieldEl = formEl.createDiv({ cls: 'calendar-modal__field' });
		dueDateFieldEl.createEl('label', {
			cls: 'calendar-modal__label',
			text: 'Due Date'
		});
		this.dueDateInput = dueDateFieldEl.createEl('input', {
			cls: 'calendar-modal__input',
			type: 'date',
			value: this.task.due ? format(parseISO(this.task.due), 'yyyy-MM-dd') : ''
		});
		
		// Status field
		const statusFieldEl = formEl.createDiv({ cls: 'calendar-modal__field' });
		statusFieldEl.createEl('label', {
			cls: 'calendar-modal__label',
			text: 'Status'
		});
		this.statusSelect = statusFieldEl.createEl('select', {
			cls: 'calendar-modal__select'
		});
		
		const statuses = [
			{ value: 'needsAction', label: '📋 Needs Action' },
			{ value: 'completed', label: '✅ Completed' }
		];
		
		statuses.forEach(status => {
			const optionEl = this.statusSelect.createEl('option', {
				value: status.value,
				text: status.label
			});
			if (status.value === this.task.status) {
				optionEl.selected = true;
			}
		});
		
		// Actions
		const actionsEl = formEl.createDiv({ cls: 'calendar-modal__actions' });
		
		// Delete button (if onDelete is provided)
		if (this.onDelete) {
			const deleteBtn = actionsEl.createEl('button', {
				cls: 'calendar-button calendar-button--danger',
				text: 'Delete'
			});
			deleteBtn.addEventListener('click', () => this.handleDelete());
		}
		
		// Cancel button
		const cancelBtn = actionsEl.createEl('button', {
			cls: 'calendar-button',
			text: 'Cancel'
		});
		cancelBtn.addEventListener('click', () => this.close());
		
		// Save button
		const saveBtn = actionsEl.createEl('button', {
			cls: 'calendar-button calendar-button--primary',
			text: 'Save'
		});
		saveBtn.addEventListener('click', () => this.handleSave());
		
		// Focus title input
		this.titleInput.focus();
		this.titleInput.select();
	}
	
	private async handleSave(): Promise<void> {
		const title = this.titleInput.value.trim();

		if (!title) {
			new Notice('❌ Task title is required');
			this.titleInput.focus();
			return;
		}

		// Check if editor is still open
		if (this.tempNoteFile) {
			new Notice('⚠️ Please click "💾 Sync & Close Tab" first to save your notes from the editor.');
			return;
		}

		const updates: Partial<CalendarTask> = {
			title,
			notes: this.notesTextarea.value.trim() || undefined,
			status: this.statusSelect.value
		};

		// Handle due date
		if (this.dueDateInput.value) {
			const dueDate = new Date(this.dueDateInput.value);
			updates.due = dueDate.toISOString();
		} else {
			updates.due = undefined;
		}

		try {
			await this.onSave(this.task.id!, updates);
			new Notice('✅ Task updated successfully');

			this.close();
		} catch (error: any) {
			new Notice(`❌ Failed to update task: ${error.message}`);
		}
	}
	
	private async handleDelete(): Promise<void> {
		if (!this.onDelete) return;
		
		// Confirm deletion
		const confirmed = confirm(`Are you sure you want to delete "${this.task.title}"?`);
		if (!confirmed) return;
		
		try {
			await this.onDelete(this.task.id!);
			new Notice('✅ Task deleted successfully');
			this.close();
		} catch (error: any) {
			new Notice(`❌ Failed to delete task: ${error.message}`);
		}
	}
	
	/**
	 * Make the modal draggable
	 */
	private makeDraggable() {
		const modalEl = this.modalEl;
		const headerEl = this.titleEl;

		if (!headerEl || !modalEl) return;

		const onMouseDown = (e: MouseEvent) => {
			if ((e.target as HTMLElement).classList.contains('modal-close-button')) {
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
				headerEl.style.cursor = 'grab';
			}
		};

		headerEl.addEventListener('mousedown', onMouseDown);
		document.addEventListener('mousemove', onMouseMove);
		document.addEventListener('mouseup', onMouseUp);

		// Clean up on close
		const originalOnClose = this.onClose.bind(this);
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

			originalOnClose();
		};
	}

	private toggleNotesExpanded() {
		this.isNotesExpanded = !this.isNotesExpanded;

		if (this.isNotesExpanded) {
			this.notesTextarea.style.minHeight = '500px';
			this.notesTextarea.rows = 25;
		} else {
			this.notesTextarea.style.minHeight = '150px';
			this.notesTextarea.rows = 6;
		}

		const expandBtn = this.contentEl.querySelector('.calendar-modal__control-btn:nth-child(3)') as HTMLButtonElement;
		if (expandBtn) {
			expandBtn.textContent = this.isNotesExpanded ? '⛶ Collapse' : '⛶ Expand';
		}
	}

	private toggleNotesFullScreen() {
		this.isNotesFullScreen = !this.isNotesFullScreen;

		if (this.isNotesFullScreen) {
			this.modalEl.addClass('modal-fullscreen');
			this.notesTextarea.style.minHeight = 'calc(100vh - 300px)';
			this.notesTextarea.style.height = 'calc(100vh - 300px)';
			this.notesTextarea.rows = 40;
		} else {
			this.modalEl.removeClass('modal-fullscreen');
			this.notesTextarea.style.minHeight = '150px';
			this.notesTextarea.style.height = 'auto';
			this.notesTextarea.rows = 6;
		}

		const fullScreenBtn = this.contentEl.querySelector('.calendar-modal__control-btn:nth-child(1)') as HTMLButtonElement;
		if (fullScreenBtn) {
			fullScreenBtn.textContent = this.isNotesFullScreen ? '⛶ Exit Full Screen' : '⛶ Full Screen';
		}
	}

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

			const tempFileName = `temp-task-edit-notes-${Date.now()}.md`;
			const currentContent = this.notesTextarea.value || '# Task Notes\n\nAdd your notes here...';
			this.tempNoteFile = await this.app.vault.create(tempFileName, currentContent);

			const leaf = this.app.workspace.getLeaf('tab');
			await leaf.openFile(this.tempNoteFile);

			// Show the sync & close button
			const syncCloseButton = this.contentEl.querySelector('.sync-close-button') as HTMLButtonElement;
			if (syncCloseButton) {
				syncCloseButton.style.display = '';
			}

			new Notice('📝 Notes opened in editor.\n\nEdit your notes, then click "💾 Sync & Close Tab" when done.\nThen click "Save" to update task.');
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
			this.notesTextarea.value = content;

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

			new Notice('✅ Notes synced and editor tab closed!\n\nNow click "Save" to update task.');
		} catch (error) {
			console.error('Failed to sync and close editor:', error);
			new Notice('❌ Failed to sync notes from editor');
		}
	}



	private autoResizeTextarea(textarea: HTMLTextAreaElement) {
		textarea.style.height = 'auto';
		textarea.style.height = Math.max(150, textarea.scrollHeight) + 'px';
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

