import { MarkdownRenderChild, MarkdownPostProcessorContext } from 'obsidian';
import type { CalendarProvider } from '../providers/CalendarProvider';
import { parseQuery } from '../parsers/event-parser';
import { CalendarView } from '../ui/CalendarView';

export function createCodeBlockProcessor(provider: CalendarProvider) {
  return (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
    const child = new CalendarCodeBlock(el, source, provider);
    ctx.addChild(child);
  };
}

class CalendarCodeBlock extends MarkdownRenderChild {
  private source: string;
  private provider: CalendarProvider;
  private calendarView: CalendarView | null = null;

  constructor(containerEl: HTMLElement, source: string, provider: CalendarProvider) {
    super(containerEl);
    this.source = source;
    this.provider = provider;
  }

  async onload() {
    try {
      const query = parseQuery(this.source);

      // Render loading state
      this.renderLoading();

      // Initialize FullCalendar view
      this.calendarView = new CalendarView({
        provider: this.provider,
        containerEl: this.containerEl,
        onEventClick: (event) => {
          // Handle event click
          console.log('Event clicked:', event);
        }
      });

      // Clear loading and initialize calendar
      this.containerEl.empty();
      await this.calendarView.initialize();

    } catch (error) {
      this.renderError(error);
    }
  }

  private renderLoading() {
    this.containerEl.empty();
    this.containerEl.createDiv({ cls: 'google-calendar-loading' }, (div) => {
      div.createDiv({ cls: 'loading-spinner' });
      div.createDiv({ cls: 'loading-text', text: 'Loading calendar...' });
    });
  }

  private renderError(error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.containerEl.empty();
    this.containerEl.createDiv({ cls: 'google-calendar-error' }, (div) => {
      div.createDiv({ cls: 'error-icon', text: '⚠️' });
      div.createDiv({ cls: 'error-content' }, (content) => {
        content.createEl('strong', { text: 'Error in google-calendar block:' });
        content.createDiv({ cls: 'error-message', text: errorMessage });
      });
    });
  }

  onunload() {
    if (this.calendarView) {
      this.calendarView.destroy();
      this.calendarView = null;
    }
  }
}