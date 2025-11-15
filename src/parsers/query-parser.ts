export interface Query {
  // Date options
  date?: string;              // Single date (YYYY-MM-DD)
  startDate?: string;         // Start of date range (YYYY-MM-DD)
  endDate?: string;           // End of date range (YYYY-MM-DD)
  month?: string;             // Month view (YYYY-MM)

  // Display options
  view?: 'list' | 'week' | 'month';    // Display mode: list, week, or month calendar grid
  refreshInterval?: number;   // Auto-refresh interval in seconds
  showEvents?: boolean;       // Show calendar events
  showTasks?: boolean;        // Show tasks
  title?: string;             // Custom title

  // Customization options
  groupBy?: 'none' | 'day' | 'type';  // How to group items
  showTime?: boolean;         // Show event times (default: true)
  showDescription?: boolean;  // Show event descriptions
  maxEvents?: number;         // Max events to display per day
  compact?: boolean;          // Compact view mode
  highlightToday?: boolean;   // Highlight today's date (default: true)
}