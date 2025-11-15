<script lang="ts">
  interface Props {
    events?: any[];
    tasks?: any[];
    month: string; // YYYY-MM format
    highlightToday?: boolean;
    compact?: boolean;
    maxEvents?: number;
  }

  interface DayData {
    date: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    events: any[];
    tasks: any[];
  }

  let {
    events = [],
    tasks = [],
    month,
    highlightToday = true,
    compact = false,
    maxEvents = 5
  }: Props = $props();

  let calendarDays = $derived(generateCalendarDays(month));

  function generateCalendarDays(monthStr: string): DayData[] {
    const [year, monthNum] = monthStr.split('-').map(Number);
    const firstDay = new Date(year, monthNum - 1, 1);
    const lastDay = new Date(year, monthNum, 0);
    const today = new Date().toISOString().split('T')[0];
    
    const days: DayData[] = [];
    
    // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDay.getDay();
    
    // Add days from previous month to fill the first week
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, monthNum - 1, -i);
      days.push({
        date: date.toISOString().split('T')[0],
        dayNumber: date.getDate(),
        isCurrentMonth: false,
        isToday: false,
        events: [],
        tasks: []
      });
    }
    
    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, monthNum - 1, day);
      const dateStr = date.toISOString().split('T')[0];
      
      days.push({
        date: dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: highlightToday && dateStr === today,
        events: getEventsForDate(dateStr),
        tasks: getTasksForDate(dateStr)
      });
    }
    
    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, monthNum, day);
      days.push({
        date: date.toISOString().split('T')[0],
        dayNumber: day,
        isCurrentMonth: false,
        isToday: false,
        events: [],
        tasks: []
      });
    }
    
    return days;
  }

  function getEventsForDate(dateStr: string): any[] {
    return events.filter(event => {
      if (event.start?.date) {
        return event.start.date === dateStr;
      }
      if (event.start?.dateTime) {
        return event.start.dateTime.startsWith(dateStr);
      }
      return false;
    }).slice(0, maxEvents);
  }

  function getTasksForDate(dateStr: string): any[] {
    return tasks.filter(task => {
      if (!task.due) return false;
      return task.due.startsWith(dateStr);
    }).slice(0, maxEvents);
  }

  function formatTime(dateTimeString: string): string {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
</script>

<style>
  .month-view {
    width: 100%;
    background: var(--background-primary);
  }

  .weekday-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background: var(--background-modifier-border);
    border: 1px solid var(--background-modifier-border);
    border-bottom: none;
  }

  .weekday {
    background: var(--background-secondary);
    padding: 8px;
    text-align: center;
    font-weight: 600;
    color: var(--text-muted);
    font-size: 0.85em;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background: var(--background-modifier-border);
    border: 1px solid var(--background-modifier-border);
  }

  .day-cell {
    background: var(--background-primary);
    min-height: 100px;
    padding: 4px;
    position: relative;
    overflow: hidden;
  }

  .compact .day-cell {
    min-height: 60px;
  }

  .day-cell.other-month {
    background: var(--background-secondary);
    opacity: 0.5;
  }

  .day-cell.today {
    background: var(--interactive-accent);
    background-opacity: 0.1;
    border: 2px solid var(--interactive-accent);
  }

  .day-number {
    font-weight: 600;
    color: var(--text-normal);
    margin-bottom: 4px;
    font-size: 0.9em;
  }

  .day-cell.today .day-number {
    color: var(--interactive-accent);
    font-weight: 700;
  }

  .day-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .event-item, .task-item {
    font-size: 0.75em;
    padding: 2px 4px;
    border-radius: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
  }

  .event-item {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
  }

  .event-item:hover {
    background: var(--interactive-accent-hover);
  }

  .task-item {
    background: var(--background-modifier-success);
    color: var(--text-normal);
  }

  .event-time {
    font-weight: 600;
    margin-right: 4px;
  }

  .event-title {
    flex: 1;
  }

  .more-items {
    font-size: 0.7em;
    color: var(--text-muted);
    font-style: italic;
    padding: 2px 4px;
  }

  .compact .event-item,
  .compact .task-item {
    font-size: 0.65em;
    padding: 1px 2px;
  }

  .compact .day-number {
    font-size: 0.8em;
  }
</style>

<div class="month-view" class:compact>
  <div class="weekday-header">
    {#each weekDays as day}
      <div class="weekday">{day}</div>
    {/each}
  </div>
  
  <div class="calendar-grid">
    {#each calendarDays as day}
      <div 
        class="day-cell" 
        class:other-month={!day.isCurrentMonth}
        class:today={day.isToday}
      >
        <div class="day-number">{day.dayNumber}</div>
        
        {#if day.isCurrentMonth}
          <div class="day-content">
            {#each day.events as event}
              <div class="event-item" title={event.summary}>
                {#if !compact && event.start?.dateTime}
                  <span class="event-time">{formatTime(event.start.dateTime)}</span>
                {/if}
                <span class="event-title">{event.summary || 'Untitled'}</span>
              </div>
            {/each}
            
            {#each day.tasks as task}
              <div class="task-item" title={task.title}>
                ✓ {task.title || 'Untitled'}
              </div>
            {/each}
            
            {#if day.events.length + day.tasks.length > maxEvents}
              <div class="more-items">
                +{day.events.length + day.tasks.length - maxEvents} more
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>

