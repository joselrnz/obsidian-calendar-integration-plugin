import { setIcon } from 'obsidian';

export interface EventCardOptions {
	title: string;
	startTime?: string;
	endTime?: string;
	location?: string;
	description?: string;
	color?: string;
	type: 'event' | 'task';
	allDay?: boolean;
	onClick?: () => void;
	onContextMenu?: (e: MouseEvent) => void;
}

/**
 * Create a beautiful event card similar to tasknotes ICSCard
 */
export function createEventCard(options: EventCardOptions): HTMLElement {
	const {
		title,
		startTime,
		endTime,
		location,
		description,
		color = 'var(--color-accent)',
		type,
		allDay = false,
		onClick,
		onContextMenu
	} = options;

	const card = document.createElement('div');
	card.className = 'google-calendar-event-card';

	// Main row
	const mainRow = card.createEl('div', { cls: 'event-card__main-row' });

	// Left icon
	const iconWrap = mainRow.createEl('span', { cls: 'event-card__icon' });
	const icon = iconWrap.createDiv();
	setIcon(icon, type === 'event' ? 'calendar' : 'check-square');
	
	// Style the icon wrapper
	iconWrap.style.display = 'inline-flex';
	iconWrap.style.width = '16px';
	iconWrap.style.height = '16px';
	iconWrap.style.marginRight = '8px';
	iconWrap.style.alignItems = 'center';
	iconWrap.style.justifyContent = 'center';
	iconWrap.style.flexShrink = '0';
	icon.style.width = '100%';
	icon.style.height = '100%';
	icon.style.color = color;

	// Content
	const content = mainRow.createEl('div', { cls: 'event-card__content' });
	content.createEl('div', {
		cls: 'event-card__title',
		text: title || (type === 'event' ? 'Untitled Event' : 'Untitled Task')
	});

	// Metadata line
	const metadata = content.createEl('div', { cls: 'event-card__metadata' });
	const parts: string[] = [];
	
	if (allDay) {
		parts.push('All day');
	} else if (startTime) {
		const timeText = endTime ? `${startTime} – ${endTime}` : startTime;
		parts.push(timeText);
	}
	
	if (location) {
		parts.push(location);
	}
	
	if (parts.length > 0) {
		metadata.textContent = parts.join(' • ');
	}

	// Description (if provided)
	if (description) {
		const descEl = content.createEl('div', {
			cls: 'event-card__description',
			text: description.length > 100 ? description.substring(0, 100) + '...' : description
		});
		descEl.style.fontSize = '0.85em';
		descEl.style.color = 'var(--text-muted)';
		descEl.style.marginTop = '4px';
	}

	// Click handler
	if (onClick) {
		card.addEventListener('click', onClick);
		card.style.cursor = 'pointer';
	}

	// Context menu handler
	if (onContextMenu) {
		card.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			e.stopPropagation();
			onContextMenu(e);
		});
	}

	// Apply color
	card.style.setProperty('--event-color', color);
	card.style.borderLeft = `3px solid ${color}`;

	return card;
}

/**
 * Format time for display
 */
export function formatTime(date: Date, use24Hour: boolean = true): string {
	const hours = date.getHours();
	const minutes = date.getMinutes();
	
	if (use24Hour) {
		return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
	} else {
		const period = hours >= 12 ? 'PM' : 'AM';
		const displayHours = hours % 12 || 12;
		return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
	}
}

/**
 * Format date range for display
 */
export function formatDateRange(start: Date, end?: Date, allDay: boolean = false): string {
	if (allDay) {
		return 'All day';
	}
	
	const startTime = formatTime(start);
	if (!end) {
		return startTime;
	}
	
	const endTime = formatTime(end);
	return `${startTime} – ${endTime}`;
}

