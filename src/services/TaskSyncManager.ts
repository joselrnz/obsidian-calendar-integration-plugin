import { App, TFile, Notice } from 'obsidian';
import { MarkdownTaskParser, ParsedTask, ParsedFile } from './MarkdownTaskParser';
import { CalendarProvider } from '../providers/CalendarProvider';

/**
 * Task Sync Manager
 * 
 * Manages synchronization between markdown tasks and calendar provider
 */
export class TaskSyncManager {
	private app: App;
	private provider: CalendarProvider;
	private syncFolder: string;
	private enabled: boolean = false;
	
	// Cache of parsed files
	private parsedFiles: Map<string, ParsedFile> = new Map();
	
	// Map of sync IDs to file paths and line numbers
	private syncIdMap: Map<string, { path: string; lineNumber: number }> = new Map();

	constructor(app: App, provider: CalendarProvider, syncFolder: string = 'Tasks') {
		this.app = app;
		this.provider = provider;
		this.syncFolder = syncFolder;
	}

	/**
	 * Enable task sync
	 */
	async enable() {
		if (this.enabled) return;
		
		console.log('[Task Sync] Enabling markdown task sync...');
		this.enabled = true;

		// Initial scan of all markdown files
		await this.scanAllFiles();

		// Register file watcher
		this.registerFileWatcher();

		console.log('[Task Sync] Markdown task sync enabled');
		new Notice('📝 Markdown task sync enabled');
	}

	/**
	 * Disable task sync
	 */
	disable() {
		if (!this.enabled) return;
		
		console.log('[Task Sync] Disabling markdown task sync...');
		this.enabled = false;
		this.parsedFiles.clear();
		this.syncIdMap.clear();
		
		console.log('[Task Sync] Markdown task sync disabled');
		new Notice('📝 Markdown task sync disabled');
	}

	/**
	 * Scan all markdown files in vault
	 */
	private async scanAllFiles() {
		console.log('[Task Sync] Scanning all markdown files...');
		
		const files = this.app.vault.getMarkdownFiles();
		let taskCount = 0;

		for (const file of files) {
			// Skip files outside sync folder if specified
			if (this.syncFolder && !file.path.startsWith(this.syncFolder)) {
				continue;
			}

			const parsed = await this.parseFile(file);
			if (parsed && parsed.tasks.length > 0) {
				this.parsedFiles.set(file.path, parsed);
				taskCount += parsed.tasks.length;
				
				// Update sync ID map
				for (const task of parsed.tasks) {
					if (task.syncId) {
						this.syncIdMap.set(task.syncId, {
							path: file.path,
							lineNumber: task.lineNumber
						});
					}
				}
			}
		}

		console.log(`[Task Sync] Found ${taskCount} tasks in ${this.parsedFiles.size} files`);
	}

	/**
	 * Parse a single file
	 */
	private async parseFile(file: TFile): Promise<ParsedFile | null> {
		try {
			const content = await this.app.vault.read(file);
			const parsed = MarkdownTaskParser.parseContent(content, file.path);
			return parsed;
		} catch (error) {
			console.error(`[Task Sync] Error parsing file ${file.path}:`, error);
			return null;
		}
	}

	/**
	 * Register file watcher
	 */
	private registerFileWatcher() {
		// Watch for file modifications
		this.app.vault.on('modify', async (file) => {
			if (!this.enabled) return;
			if (!(file instanceof TFile)) return;
			if (file.extension !== 'md') return;
			
			// Skip files outside sync folder
			if (this.syncFolder && !file.path.startsWith(this.syncFolder)) {
				return;
			}

			console.log(`[Task Sync] File modified: ${file.path}`);
			await this.handleFileChange(file);
		});

		// Watch for file creation
		this.app.vault.on('create', async (file) => {
			if (!this.enabled) return;
			if (!(file instanceof TFile)) return;
			if (file.extension !== 'md') return;
			
			// Skip files outside sync folder
			if (this.syncFolder && !file.path.startsWith(this.syncFolder)) {
				return;
			}

			console.log(`[Task Sync] File created: ${file.path}`);
			await this.handleFileChange(file);
		});

		// Watch for file deletion
		this.app.vault.on('delete', (file) => {
			if (!this.enabled) return;
			if (!(file instanceof TFile)) return;
			
			console.log(`[Task Sync] File deleted: ${file.path}`);
			this.handleFileDelete(file);
		});
	}

	/**
	 * Handle file change (create or modify)
	 */
	private async handleFileChange(file: TFile) {
		const parsed = await this.parseFile(file);
		if (!parsed) return;

		const oldParsed = this.parsedFiles.get(file.path);
		this.parsedFiles.set(file.path, parsed);

		// TODO: In Phase 2, we'll sync changes to calendar provider
		console.log(`[Task Sync] Parsed ${parsed.tasks.length} tasks from ${file.path}`);
	}

	/**
	 * Handle file deletion
	 */
	private handleFileDelete(file: TFile) {
		this.parsedFiles.delete(file.path);
		
		// Remove sync IDs for this file
		for (const [syncId, location] of this.syncIdMap.entries()) {
			if (location.path === file.path) {
				this.syncIdMap.delete(syncId);
			}
		}
	}

	/**
	 * Get all parsed tasks
	 */
	getAllTasks(): ParsedTask[] {
		const allTasks: ParsedTask[] = [];
		for (const parsed of this.parsedFiles.values()) {
			allTasks.push(...parsed.tasks);
		}
		return allTasks;
	}

	/**
	 * Get tasks from a specific file
	 */
	getTasksFromFile(filePath: string): ParsedTask[] {
		const parsed = this.parsedFiles.get(filePath);
		return parsed ? parsed.tasks : [];
	}
}

