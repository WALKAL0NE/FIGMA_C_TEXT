# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Figma plugin that exports selected text styles as SASS notation. The plugin extracts styling properties from selected text elements and generates SASS mixins with appropriate unit conversions.

## Commands

### Development
- `bun run build` - Compile TypeScript to JavaScript
- `bun run watch` - Watch mode for development (recompiles on changes)
- `bun install` - Install dependencies

### Build Process
The build compiles `code.ts` → `code.js` using TypeScript compiler. The output is a single file as required by Figma plugins.

## Architecture

### Key Files
- `code.ts` - Main plugin logic and embedded UI HTML
- `manifest.json` - Figma plugin configuration
- `ui.html` - Exists but unused (UI is embedded in code.ts)

### Plugin Architecture
1. **Main Thread** (`code.ts`): Handles Figma API calls, text style extraction
2. **UI Thread**: Embedded HTML/CSS/JS for user interface
3. **Communication**: Message passing between main and UI threads via `postMessage`

### Core Functionality
- Extracts text properties: font size, weight, family, letter spacing, line height
- Converts units: px to rem (font size), percentages to decimal (line height)
- Manages font family aliases (e.g., "Inter" → "$family-in")
- Generates SASS mixin notation with formatted output

### Message Types
- `update-text-styles`: Main → UI with extracted styles
- `copy-to-clipboard`: UI → Main to copy SASS code
- `update-font-alias`: UI → Main to update font family mappings
- `close`: UI → Main to close plugin

## Development Notes

- The UI is embedded as HTML string in `showUI()` call rather than using separate ui.html
- Font aliases are stored in memory during plugin session
- No testing framework currently implemented
- Uses Bun as runtime/package manager but npm commands also work
- Plugin now configured as widget with relaunch buttons instead of menu command
- Automatically opens UI when launched and responds to selection changes