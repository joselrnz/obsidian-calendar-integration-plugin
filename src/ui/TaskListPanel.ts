/**
 * TaskListPanel - Card-board inspired task list panel
 * Displays tasks for a selected date range with filtering
 */

import { CalendarTask } from '../providers/CalendarProvider';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';

export type TaskFilter = 'all' | 'today' | 'week' | 'upcoming' | 'completed';

export interface TaskListPanelOptions {
	container: HTMLElement;
	onTaskClick?: (task: CalendarTask) => void;
	onTaskComplete?: (task: CalendarTask) => void;
	onTaskEdit?: (task: CalendarTask) => void;
	onTaskDelete?: (task: CalendarTask) => void;
}

export class TaskListPanel {
	private container: HTMLElement;
	private panelEl!: HTMLElement;
	private headerEl!: HTMLElement;
	private filterEl!: HTMLElement;
	private bodyEl!: HTMLElement;
	private listEl!: HTMLElement;
	
	private tasks: CalendarTask[] = [];
	private filter: TaskFilter = 'today';
	private isExpanded: boolean = true;
	
	private onTaskClick?: (task: CalendarTask) => void;
	private onTaskComplete?: (task: CalendarTask) => void;
	private onTaskEdit?: (task: CalendarTask) => void;
	private onTaskDelete?: (task: CalendarTask) => void;
	
	constructor(options: TaskListPanelOptions) {
		this.container = options.container;
		this.onTaskClick = options.onTaskClick;
		this.onTaskComplete = options.onTaskComplete;
		this.onTaskEdit = options.onTaskEdit;
		this.onTaskDelete = options.onTaskDelete;
		
		this.render();
	}
	
	private render(): void {
		// Create panel container
		this.panelEl = this.container.createDiv({
			cls: `task-panel ${this.isExpanded ? 'task-panel--expanded' : 'task-panel--collapsed'}`
		});
		
		// Create header
		this.renderHeader();
		
		// Create filter (only visible when expanded)
		if (this.isExpanded) {
			this.renderFilter();
		}
		
		// Create body
		this.renderBody();
	}
	
	private renderHeader(): void {
		this.headerEl = this.panelEl.createDiv({ cls: 'task-panel__header' });
		
		// Title
		const titleEl = this.headerEl.createDiv({ cls: 'task-panel__title' });
		titleEl.createSpan({ cls: 'task-panel__title-icon', text: '✓' });
		titleEl.createSpan({ text: 'Tasks' });
		
		// Actions
		const actionsEl = this.headerEl.createDiv({ cls: 'task-panel__actions' });
		
		// Toggle button
		const toggleEl = actionsEl.createSpan({
			cls: `task-panel__toggle ${!this.isExpanded ? 'task-panel__toggle--collapsed' : ''}`,
			text: '▼'
		});
		toggleEl.addEventListener('click', () => this.toggleExpanded());
	}
	
	private renderFilter(): void {
		this.filterEl = this.panelEl.createDiv({ cls: 'task-panel__filter' });
		
		const selectEl = this.filterEl.createEl('select', { cls: 'task-panel__filter-select' });
		
		const filters: { value: TaskFilter; label: string }[] = [
			{ value: 'today', label: 'Today' },
			{ value: 'week', label: 'This Week' },
			{ value: 'upcoming', label: 'Upcoming' },
			{ value: 'completed', label: 'Completed' },
			{ value: 'all', label: 'All Tasks' },
		];
		
		filters.forEach(filter => {
			const optionEl = selectEl.createEl('option', {
				value: filter.value,
				text: filter.label
			});
			if (filter.value === this.filter) {
				optionEl.selected = true;
			}
		});
		
		selectEl.addEventListener('change', (e) => {
			this.filter = (e.target as HTMLSelectElement).value as TaskFilter;
			this.renderTaskList();
		});
	}
	
	private renderBody(): void {
		this.bodyEl = this.panelEl.createDiv({ cls: 'task-panel__body' });
		this.listEl = this.bodyEl.createDiv({ cls: 'task-panel__list' });
		
		this.renderTaskList();
	}
	
	private renderTaskList(): void {
		this.listEl.empty();
		
		const filteredTasks = this.getFilteredTasks();
		
		if (filteredTasks.length === 0) {
			this.renderEmptyState();
			return;
		}
		
		filteredTasks.forEach(task => {
			this.renderTaskCard(task);
		});
	}
	
	private renderTaskCard(task: CalendarTask): void {
		const status = this.getTaskStatus(task);
		const cardEl = this.listEl.createDiv({
			cls: `task-card task-card--${status}`
		});
		
		// Header
		const headerEl = cardEl.createDiv({ cls: 'task-card__header' });
		
		// Title
		const titleEl = headerEl.createDiv({
			cls: 'task-card__title',
			text: task.title || 'Untitled Task'
		});
		
		// Actions (visible on hover)
		const actionsEl = headerEl.createDiv({ cls: 'task-card__actions' });
		
		if (task.status !== 'completed') {
			const completeBtn = actionsEl.createSpan({
				cls: 'task-card__action-btn task-card__action-btn--success',
				text: '✓',
				attr: { 'aria-label': 'Mark as complete' }
			});
			completeBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.onTaskComplete?.(task);
			});
		}
		
		const editBtn = actionsEl.createSpan({
			cls: 'task-card__action-btn',
			text: '✎',
			attr: { 'aria-label': 'Edit task' }
		});
		editBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.onTaskEdit?.(task);
		});
		
		const deleteBtn = actionsEl.createSpan({
			cls: 'task-card__action-btn task-card__action-btn--danger',
			text: '✕',
			attr: { 'aria-label': 'Delete task' }
		});
		deleteBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.onTaskDelete?.(task);
		});
		
		// Body
		if (task.notes || task.due) {
			const bodyEl = cardEl.createDiv({ cls: 'task-card__body' });
			
			// Notes
			if (task.notes) {
				bodyEl.createDiv({
					cls: 'task-card__notes',
					text: task.notes
				});
			}
			
			// Meta (due date)
			if (task.due) {
				const metaEl = bodyEl.createDiv({ cls: 'task-card__meta' });
				const dueDate = parseISO(task.due);
				const dueStatus = this.getDueStatus(dueDate);
				
				const dueEl = metaEl.createDiv({
					cls: `task-card__due ${dueStatus ? `task-card__due--${dueStatus}` : ''}`
				});
				dueEl.createSpan({ text: '📅 ' });
				dueEl.createSpan({ text: this.formatDueDate(dueDate) });
			}
		}
		
		// Click handler
		cardEl.addEventListener('click', () => {
			this.onTaskClick?.(task);
		});
	}

	private renderEmptyState(): void {
		const emptyEl = this.listEl.createDiv({ cls: 'task-panel__empty' });

		emptyEl.createDiv({ cls: 'task-panel__empty-icon', text: '📝' });
		emptyEl.createDiv({ cls: 'task-panel__empty-text', text: 'No tasks found' });
		emptyEl.createDiv({
			cls: 'task-panel__empty-hint',
			text: 'Press Ctrl+T to create a new task'
		});
	}

	private getFilteredTasks(): CalendarTask[] {
		const now = new Date();
		const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

		return this.tasks.filter(task => {
			switch (this.filter) {
				case 'today':
					if (!task.due) return false;
					return isToday(parseISO(task.due));

				case 'week':
					if (!task.due) return false;
					const dueDate = parseISO(task.due);
					return dueDate >= now && dueDate <= weekFromNow;

				case 'upcoming':
					if (!task.due) return false;
					return parseISO(task.due) > now && task.status !== 'completed';

				case 'completed':
					return task.status === 'completed';

				case 'all':
				default:
					return true;
			}
		});
	}

	private getTaskStatus(task: CalendarTask): 'overdue' | 'today' | 'upcoming' | 'completed' {
		if (task.status === 'completed') {
			return 'completed';
		}

		if (!task.due) {
			return 'upcoming';
		}

		const dueDate = parseISO(task.due);

		if (isPast(dueDate) && !isToday(dueDate)) {
			return 'overdue';
		}

		if (isToday(dueDate)) {
			return 'today';
		}

		return 'upcoming';
	}

	private getDueStatus(dueDate: Date): 'overdue' | 'today' | null {
		if (isPast(dueDate) && !isToday(dueDate)) {
			return 'overdue';
		}

		if (isToday(dueDate)) {
			return 'today';
		}

		return null;
	}

	private formatDueDate(date: Date): string {
		if (isToday(date)) {
			return 'Today';
		}

		if (isTomorrow(date)) {
			return 'Tomorrow';
		}

		return format(date, 'MMM d, yyyy');
	}

	private toggleExpanded(): void {
		this.isExpanded = !this.isExpanded;

		// Re-render the panel
		this.panelEl.remove();
		this.render();
	}

	// Public API

	public setTasks(tasks: CalendarTask[]): void {
		this.tasks = tasks;
		this.renderTaskList();
	}

	public setFilter(filter: TaskFilter): void {
		this.filter = filter;
		this.renderTaskList();
	}

	public refresh(): void {
		this.renderTaskList();
	}

	public destroy(): void {
		this.panelEl.remove();
	}
}

