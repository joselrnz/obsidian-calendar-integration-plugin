<script lang="ts">
  interface Props {
    events?: any[];
    tasks?: any[];
    startDate: string; // YYYY-MM-DD format
    highlightToday?: boolean;
  }

  interface DayColumn {
    date: string;
    dayName: string;
    dayNumber: number;
    isToday: boolean;
    allDayEvents: any[];
    timedEvents: any[];
    tasks: any[];
  }

  let {
    events = [],
    tasks = [],
    startDate,
    highlightToday = true
  }: Props = $props();

  const hours = Array.from({ length: 24 }, (_, i) => i);

  let weekDays = $derived(generateWeekDays(startDate));

  function generateWeekDays(start: string): DayColumn[] {
    const days: DayColumn[] = [];
    const startDateObj = new Date(start);
    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDateObj);
      date.setDate(startDateObj.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      days.push({
        date: dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        dayNumber: date.getDate(),
        isToday: highlightToday && dateStr === today,
        allDayEvents: getAllDayEventsForDate(dateStr),
        timedEvents: getTimedEventsForDate(dateStr),
        tasks: getTasksForDate(dateStr)
      });
    }

    return days;
  }

  function getAllDayEventsForDate(dateStr: string): any[] {
    return events.filter(event => {
      if (event.start?.date && event.start.date === dateStr) {
        return true;
      }
      return false;
    });
  }

  function getTimedEventsForDate(dateStr: string): any[] {
    return events.filter(event => {
      if (event.start?.dateTime && event.start.dateTime.startsWith(dateStr)) {
        return true;
      }
      return false;
    });
  }

  function getTasksForDate(dateStr: string): any[] {
    return tasks.filter(task => {
      if (!task.due) return false;
      return task.due.startsWith(dateStr);
    });
  }

  function getEventPosition(event: any): { top: number; height: number } {
    if (!event.start?.dateTime || !event.end?.dateTime) {
      return { top: 0, height: 60 };
    }

    const startTime = new Date(event.start.dateTime);
    const endTime = new Date(event.end.dateTime);

    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const endHour = endTime.getHours() + endTime.getMinutes() / 60;

    const top = startHour * 60; // 60px per hour
    const height = (endHour - startHour) * 60;

    return { top, height: Math.max(height, 30) };
  }

  function formatTime(dateTimeString: string): string {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  function formatHour(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  }
</script>

<div class="week-view">
  <!-- All-day events section -->
  {#if weekDays.some(day => day.allDayEvents.length > 0 || day.tasks.length > 0)}
    <div class="all-day-section">
      <div class="time-gutter">All Day</div>
      <div class="all-day-grid">
        {#each weekDays as day}
          <div class="all-day-cell" class:today={day.isToday}>
            {#each day.allDayEvents as event}
              <div class="all-day-event" title={event.summary}>
                {event.summary || 'Untitled'}
              </div>
            {/each}
            {#each day.tasks as task}
              <div class="all-day-task" title={task.title}>
                ✓ {task.title || 'Untitled'}
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Week header -->
  <div class="week-header">
    <div class="time-gutter"></div>
    <div class="days-header">
      {#each weekDays as day}
        <div class="day-header" class:today={day.isToday}>
          <div class="day-name">{day.dayName}</div>
          <div class="day-number" class:today-number={day.isToday}>{day.dayNumber}</div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Time grid -->
  <div class="time-grid-container">
    <div class="time-labels">
      {#each hours as hour}
        <div class="time-label">{formatHour(hour)}</div>
      {/each}
    </div>

    <div class="days-grid">
      {#each weekDays as day}
        <div class="day-column" class:today={day.isToday}>
          {#each hours as hour}
            <div class="hour-cell"></div>
          {/each}
          
          <!-- Timed events -->
          {#each day.timedEvents as event}
            {@const pos = getEventPosition(event)}
            <div 
              class="timed-event" 
              style="top: {pos.top}px; height: {pos.height}px;"
              title={event.summary}
            >
              <div class="event-time">{formatTime(event.start.dateTime)}</div>
              <div class="event-title">{event.summary || 'Untitled'}</div>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .week-view {
    width: 100%;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .all-day-section {
    display: flex;
    border-bottom: 2px solid var(--background-modifier-border);
    background: var(--background-secondary);
  }

  .time-gutter {
    width: 60px;
    flex-shrink: 0;
    padding: 8px;
    font-size: 0.75em;
    color: var(--text-muted);
    text-align: right;
    border-right: 1px solid var(--background-modifier-border);
  }

  .all-day-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    flex: 1;
    gap: 1px;
    background: var(--background-modifier-border);
  }

  .all-day-cell {
    background: var(--background-primary);
    padding: 4px;
    min-height: 30px;
  }

  .all-day-cell.today {
    background: var(--interactive-accent);
    background-opacity: 0.05;
  }

  .all-day-event, .all-day-task {
    font-size: 0.8em;
    padding: 4px 6px;
    margin-bottom: 2px;
    border-radius: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .all-day-event {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
  }

  .all-day-task {
    background: var(--background-modifier-success);
    color: var(--text-normal);
  }

  .week-header {
    display: flex;
    border-bottom: 1px solid var(--background-modifier-border);
    background: var(--background-secondary);
  }

  .days-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    flex: 1;
    gap: 1px;
    background: var(--background-modifier-border);
  }

  .day-header {
    background: var(--background-secondary);
    padding: 12px 8px;
    text-align: center;
  }

  .day-header.today {
    background: var(--interactive-accent);
    background-opacity: 0.1;
  }

  .day-name {
    font-size: 0.75em;
    color: var(--text-muted);
    font-weight: 600;
    margin-bottom: 4px;
  }

  .day-number {
    font-size: 1.5em;
    font-weight: 600;
    color: var(--text-normal);
  }

  .day-number.today-number {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .time-grid-container {
    display: flex;
    max-height: 600px;
    overflow-y: auto;
  }

  .time-labels {
    width: 60px;
    flex-shrink: 0;
    border-right: 1px solid var(--background-modifier-border);
  }

  .time-label {
    height: 60px;
    padding: 4px 8px;
    font-size: 0.7em;
    color: var(--text-muted);
    text-align: right;
    border-bottom: 1px solid var(--background-modifier-border);
  }

  .days-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    flex: 1;
    gap: 1px;
    background: var(--background-modifier-border);
    position: relative;
  }

  .day-column {
    background: var(--background-primary);
    position: relative;
  }

  .day-column.today {
    background: var(--interactive-accent);
    background-opacity: 0.02;
  }

  .hour-cell {
    height: 60px;
    border-bottom: 1px solid var(--background-modifier-border);
  }

  .timed-event {
    position: absolute;
    left: 2px;
    right: 2px;
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border-radius: 4px;
    padding: 4px 6px;
    overflow: hidden;
    cursor: pointer;
    z-index: 1;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  .timed-event:hover {
    background: var(--interactive-accent-hover);
    z-index: 2;
  }

  .event-time {
    font-size: 0.7em;
    font-weight: 600;
    margin-bottom: 2px;
  }

  .event-title {
    font-size: 0.8em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

