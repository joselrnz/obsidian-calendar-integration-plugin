/**
 * CSS Build Script
 * Concatenates modular CSS files into a single styles.css file
 * 
 * Based on TaskNotes BEM CSS architecture
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CSS files in order (order matters for cascading)
const CSS_FILES = [
	'variables.css',      // CSS custom properties
	'utilities.css',      // Utility classes
	'base.css',          // Base styles and animations
	'calendar-view.css', // Calendar view styles
	'task-panel.css',    // Task panel styles
	'modals.css',        // Modal styles
	'components.css',    // Reusable components
];

const STYLES_DIR = path.join(__dirname, 'styles');
const OUTPUT_FILE = path.join(__dirname, 'styles.css');

console.log('[CSS Build] Starting CSS build...');

// Check if styles directory exists
if (!fs.existsSync(STYLES_DIR)) {
	console.error(`[CSS Build] Error: styles/ directory not found at ${STYLES_DIR}`);
	process.exit(1);
}

let combinedCSS = '';
let filesProcessed = 0;

// Process each CSS file
for (const file of CSS_FILES) {
	const filePath = path.join(STYLES_DIR, file);
	
	// Check if file exists
	if (!fs.existsSync(filePath)) {
		console.warn(`[CSS Build] Warning: ${file} not found, skipping...`);
		continue;
	}
	
	// Read file content
	const content = fs.readFileSync(filePath, 'utf-8');
	
	// Add file header comment
	combinedCSS += `/* ============================================================================\n`;
	combinedCSS += `   ${file}\n`;
	combinedCSS += `   ============================================================================ */\n\n`;
	combinedCSS += content;
	combinedCSS += '\n\n';
	
	filesProcessed++;
	console.log(`[CSS Build] ✓ Processed ${file} (${content.length} bytes)`);
}

// Write combined CSS to output file
fs.writeFileSync(OUTPUT_FILE, combinedCSS);

console.log(`[CSS Build] ✅ Built ${OUTPUT_FILE} from ${filesProcessed} source files`);
console.log(`[CSS Build] Total size: ${combinedCSS.length} bytes (${(combinedCSS.length / 1024).toFixed(2)} KB)`);

