import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ErrorDisplay from '../../../src/ui/components/ErrorDisplay.svelte';

describe('ErrorDisplay', () => {
	it('renders error message from string', () => {
		const errorMessage = 'Test error message';
		render(ErrorDisplay, { props: { error: errorMessage } });
		
		expect(screen.getByText(errorMessage)).toBeInTheDocument();
	});

	it('renders error message from Error object', () => {
		const error = new Error('Test error from Error object');
		render(ErrorDisplay, { props: { error } });
		
		expect(screen.getByText('Test error from Error object')).toBeInTheDocument();
	});

	it('displays error icon', () => {
		render(ErrorDisplay, { props: { error: 'Test error' } });
		
		expect(screen.getByText('⚠️')).toBeInTheDocument();
	});

	it('displays error label', () => {
		render(ErrorDisplay, { props: { error: 'Test error' } });
		
		expect(screen.getByText('Error in google-calendar block:')).toBeInTheDocument();
	});
});

