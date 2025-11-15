import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/svelte';

// Cleanup after each test
afterEach(() => {
	cleanup();
});

// Mock Obsidian API
if (typeof window !== 'undefined') {
	// @ts-ignore
	window.app = {};
}

// Mock CSS variables for Obsidian
if (typeof document !== 'undefined') {
	document.documentElement.style.setProperty('--background-primary', '#ffffff');
	document.documentElement.style.setProperty('--background-secondary', '#f5f5f5');
	document.documentElement.style.setProperty('--background-modifier-border', '#e0e0e0');
	document.documentElement.style.setProperty('--text-normal', '#000000');
	document.documentElement.style.setProperty('--text-muted', '#666666');
	document.documentElement.style.setProperty('--text-error', '#ff0000');
	document.documentElement.style.setProperty('--text-on-accent', '#ffffff');
	document.documentElement.style.setProperty('--interactive-accent', '#7f6df2');
	document.documentElement.style.setProperty('--interactive-accent-hover', '#6c5ce7');
	document.documentElement.style.setProperty('--background-modifier-error', '#ffe0e0');
	document.documentElement.style.setProperty('--background-modifier-success', '#e0ffe0');
}

// Add custom matchers if needed
expect.extend({
	// Custom matchers can be added here
});

