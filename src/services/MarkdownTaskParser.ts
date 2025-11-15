/**
 * Markdown Task Parser
 * 
 * Parses tasks from markdown files using emoji date syntax
 * Supports formats like:
 * - [ ] Task name 📅 2025-11-15
 * - [ ] Task with time 📅 2025-11-15 ⏰ 14:00
 * - [x] Completed task ✅ 2025-11-14
 */

export interface ParsedTask {
	/** Original line text */
	originalLine: string;
	/** Line number in file (0-based) */
	lineNumber: number;
	/** Task title/description */
	title: string;
	/** Task status */
	status: 'incomplete' | 'completed';
	/** Due date (YYYY-MM-DD format) */
	dueDate?: string;
	/** Due time (HH:MM format) */
	dueTime?: string;
	/** Tags extracted from task */
	tags: string[];
	/** Sync ID (from HTML comment) */
	syncId?: string;
}

export interface ParsedFile {
	/** File path */
	path: string;
	/** Parsed tasks */
	tasks: ParsedTask[];
	/** Last modified time */
	lastModified: number;
}

export class MarkdownTaskParser {
	// Regex patterns
	private static readonly TASK_PATTERN = /^(\s*)-\s+\[([ xX])\]\s+(.+)$/;
	private static readonly DATE_PATTERN = /📅\s*(\d{4}-\d{2}-\d{2})/;
	private static readonly TIME_PATTERN = /⏰\s*(\d{1,2}:\d{2})/;
	private static readonly TAG_PATTERN = /#([\w-]+)/g;
	private static readonly SYNC_ID_PATTERN = /<!--\s*task-sync:\s*([^\s]+)\s*-->/;

	/**
	 * Parse tasks from markdown content
	 */
	static parseContent(content: string, filePath: string): ParsedFile {
		const lines = content.split('\n');
		const tasks: ParsedTask[] = [];
		let currentSyncId: string | undefined;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Check for sync ID comment (appears before task)
			const syncMatch = line.match(this.SYNC_ID_PATTERN);
			if (syncMatch) {
				currentSyncId = syncMatch[1];
				continue;
			}

			// Check if line is a task
			const taskMatch = line.match(this.TASK_PATTERN);
			if (!taskMatch) {
				currentSyncId = undefined; // Reset sync ID if not followed by task
				continue;
			}

			const [, indent, statusChar, taskText] = taskMatch;
			
			// Parse task components
			const task = this.parseTaskLine(taskText, line, i);
			task.status = (statusChar.toLowerCase() === 'x') ? 'completed' : 'incomplete';
			
			// Add sync ID if present
			if (currentSyncId) {
				task.syncId = currentSyncId;
				currentSyncId = undefined; // Reset after use
			}

			tasks.push(task);
		}

		return {
			path: filePath,
			tasks,
			lastModified: Date.now()
		};
	}

	/**
	 * Parse individual task line
	 */
	private static parseTaskLine(taskText: string, originalLine: string, lineNumber: number): ParsedTask {
		let title = taskText;
		let dueDate: string | undefined;
		let dueTime: string | undefined;
		const tags: string[] = [];

		// Extract due date
		const dateMatch = taskText.match(this.DATE_PATTERN);
		if (dateMatch) {
			dueDate = dateMatch[1];
			title = title.replace(this.DATE_PATTERN, '').trim();
		}

		// Extract due time
		const timeMatch = taskText.match(this.TIME_PATTERN);
		if (timeMatch) {
			dueTime = timeMatch[1];
			title = title.replace(this.TIME_PATTERN, '').trim();
		}

		// Extract tags
		let tagMatch;
		while ((tagMatch = this.TAG_PATTERN.exec(taskText)) !== null) {
			tags.push(tagMatch[1]);
		}
		// Remove tags from title
		title = title.replace(this.TAG_PATTERN, '').trim();

		// Remove completed emoji if present
		title = title.replace(/✅/g, '').trim();

		return {
			originalLine,
			lineNumber,
			title,
			status: 'incomplete', // Will be set by caller
			dueDate,
			dueTime,
			tags
		};
	}

	/**
	 * Check if a line is a task
	 */
	static isTaskLine(line: string): boolean {
		return this.TASK_PATTERN.test(line);
	}

	/**
	 * Generate markdown task line from task data
	 */
	static generateTaskLine(task: Partial<ParsedTask>): string {
		const checkbox = task.status === 'completed' ? '[x]' : '[ ]';
		let line = `- ${checkbox} ${task.title}`;

		// Add due date
		if (task.dueDate) {
			line += ` 📅 ${task.dueDate}`;
		}

		// Add due time
		if (task.dueTime) {
			line += ` ⏰ ${task.dueTime}`;
		}

		// Add tags
		if (task.tags && task.tags.length > 0) {
			line += ' ' + task.tags.map(tag => `#${tag}`).join(' ');
		}

		// Add completed emoji for completed tasks
		if (task.status === 'completed') {
			line += ' ✅';
		}

		return line;
	}

	/**
	 * Generate sync ID comment
	 */
	static generateSyncComment(syncId: string): string {
		return `<!-- task-sync: ${syncId} -->`;
	}
}

