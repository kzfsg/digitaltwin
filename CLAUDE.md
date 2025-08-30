# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DigitalTwin is a Chrome extension for automatic PII detection and highlighting with a configurable censoring system. The system consists of a Chrome extension frontend and a FastAPI backend using regex-based PII detection optimized for Singapore patterns.

## Development Commands

### Backend (FastAPI + Regex Detection)
- `cd backend && pip install -r requirements.txt` - Install Python dependencies (fastapi, uvicorn)
- `cd backend && uvicorn app:app --reload --host 127.0.0.1 --port 8000` - Start the PII detection API server
- Backend runs on `http://127.0.0.1:8000` with main endpoint `/detect_pii`

### Extension Development  
- No build process required - direct JavaScript files
- Extension loading: Chrome → `chrome://extensions/` → Enable "Developer mode" → "Load unpacked" → select project root
- Reload extension after code changes and refresh test pages

### Testing
- Open `test-debug.html` or `test.html` for manual testing
- Monitor browser console for debug messages starting with 🛡️ and 🎯
- Use extension popup to view detection logs and configure settings

## Architecture Overview

### Hybrid Detection System
The project uses a **dual-layer PII detection approach**:

**Primary: Backend API** (`backend/app.py`)
- Regex-based detection optimized for Singapore PII patterns
- Handles emails, phones (8-digit Singapore mobiles), SSNs, names
- Returns both anonymized text and entity arrays for frontend highlighting

**Fallback: Frontend Regex** (`src/detection/regex-patterns.js`) 
- Local backup detection when backend is unavailable
- Same patterns as backend for consistency

### Script Loading Architecture (Critical)
Chrome extension compatibility requires specific loading order in `manifest.json`:
```json
"js": ["src/ui/pii-highlighter.js", "src/detection/regex-patterns.js", "src/detection/pii-detector.js", "src/content/content.js"]
```

**Global Function Pattern:**
- `pii-highlighter.js`: Exposes `window.piiHighlighter = new PIIHighlighter()`
- `pii-detector.js`: Exposes `window.detectPII = detectPII` and `window.debounce = debounce`
- `content.js`: Calls global functions directly (no ES6 imports due to Chrome extension limitations)

### Key Components

**Content Script** (`src/content/content.js`)
- Monitors AI chatbot inputs using selectors for ChatGPT, Claude, Gemini, Bing
- Debounced PII detection (300ms delay) to avoid performance issues
- Creates overlay UI showing anonymized text
- Mutation observer for dynamically loaded content

**PII Highlighter** (`src/ui/pii-highlighter.js`) 
- Class-based highlighting system with precise text positioning
- Creates visual overlays that highlight only specific PII words (not entire sentences)
- Type-specific colors: purple for names, blue for emails, green for phones
- Non-intrusive indicators and floating badges

**Popup Interface** (`src/popup/popup.js`, `src/popup/popup.html`)
- Censor settings with pill-based entity selection (Name, Email, Address, etc.)
- Detection log showing PII items found with timestamps
- Toggle detection on/off functionality
- Chrome storage integration for persistent settings

**Backend API** (`backend/app.py`)
- FastAPI server with `detect_basic_pii()` function
- Singapore-focused patterns: names like "lim jun jie", "sally wong", phones like "92124222"
- Case-insensitive detection with comprehensive false positive filtering
- Entity deduplication and overlap handling

### Singapore PII Patterns
The system is specifically tuned for Singapore context:
- **Names**: Multi-part Chinese names, case-insensitive detection with context patterns ("I am X", "my name is X")
- **Phone Numbers**: 8-digit mobile patterns (8XXXXXXX, 9XXXXXXX), +65 country code formats
- **False Positive Filtering**: Extensive filtering for common English words that might match name patterns

### PII Detection Flow
1. User types in AI chatbot input field
2. Content script detects input via debounced event listener
3. `detectPII()` calls backend API at `http://127.0.0.1:8000/detect_pii`
4. Backend returns entities array with start/end positions
5. `addPIIIndicators()` creates precise text overlays highlighting only PII words
6. Detection sent to popup for logging via `chrome.runtime.sendMessage`

### Critical Development Notes

**Chrome Extension Constraints:**
- Cannot use ES6 imports/exports in content scripts - must use global window functions
- Extension context can be invalidated - wrap `chrome.runtime.sendMessage` in try/catch
- Manifest V3 permissions required: `["activeTab", "scripting", "tabs", "notifications", "storage"]`

**Backend Integration:**
- Backend must be running on localhost:8000 for detection to work
- Content scripts make direct HTTP calls (no CORS issues in extension context) 
- Fallback to local regex if backend unavailable

**Highlighting System:**
- Uses positioned overlays instead of DOM text manipulation to avoid disrupting user input
- Precise text measurement with temporary measuring div to calculate PII word positions
- Auto-cleanup of highlights after 5 seconds to prevent visual clutter

**Testing Setup:**
- `test-debug.html` includes console logging for debugging detection flow
- Watch for console messages: "🛡️ PII Highlighter available", "🎯 Calling addPIIIndicators"
- Extension popup shows real-time detection log with entity breakdown

### Storage and Settings
- Uses `chrome.storage.local` for detection logs and active state
- Uses `chrome.storage.sync` for cross-device settings synchronization
- Entity selection stored as boolean flags for each PII type (EMAIL, PERSON, PHONE, etc.)