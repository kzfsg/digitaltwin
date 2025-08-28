# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DigitalTwin is a Chrome extension for automatic PII protection using AI-generated personas. The system consists of a Chrome extension frontend and a FastAPI backend with ML-based PII detection using the Piiranha model.

## Development Commands

### Backend (FastAPI + Transformers)
- `cd backend && pip install -r requirements.txt` - Install Python dependencies
- `cd backend && uvicorn app:app --reload --host 127.0.0.1 --port 8000` - Start the PII detection API server
- Backend runs on `http://127.0.0.1:8000` with endpoints at `/detect_pii`

### Extension Development  
- `npm run build` - Build script placeholder (not implemented)
- `npm run test` - Test script placeholder (not implemented)
- `npm run lint` - Lint script placeholder (not implemented)

### Extension Loading
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" 
3. Click "Load unpacked" and select the project root directory
4. Reload extension and refresh test pages after code changes

## Architecture Overview

### Hybrid System Architecture
The project uses a **hybrid architecture** combining a Chrome extension frontend with a Python backend:

**Chrome Extension (Frontend)**
- Content scripts monitor AI chatbot inputs across web pages
- Popup interface for detection logs and controls  
- Background script handles cross-tab communication

**FastAPI Backend (PII Detection)**
- Uses Transformers library with `iiiorg/piiranha-v1-detect-personal-information` model
- Provides REST API at `POST /detect_pii` 
- Returns anonymized text with PII entities replaced by `[ENTITY_TYPE]` tags

### Critical Integration Points

**PII Detection Flow:**
1. Content script detects text input in AI chatbots
2. Makes HTTP POST to `http://127.0.0.1:8000/detect_pii` 
3. Backend processes text with Piiranha model
4. Returns anonymized version with PII masked
5. Extension displays both original and anonymized text in overlay

**Script Loading Architecture:**
- `pii-detector.js` loads first, exposes global functions via `window.detectPII`
- `content.js` loads second, calls global functions directly
- No ES6 imports/exports - uses global function pattern for Chrome extension compatibility

### Key Components

**Content Script (`src/content/content.js`)**
- AI chatbot selectors for ChatGPT, Claude, Gemini, Bing
- Creates overlay UI with detection results
- Debounced text detection to avoid performance issues
- Mutation observer for dynamic content

**PII Detector (`src/detection/pii-detector.js`)**
- Async function making HTTP requests to backend API
- Replaces previous regex-based detection
- Global function exposure: `window.detectPII = detectPII`

**Fallback Detection (`src/detection/regex-patterns.js`)**
- Contains export-based regex patterns as backup
- Includes phone, email, SSN, address detection patterns

**Backend API (`backend/app.py`)**
- FastAPI server with Piiranha transformer model
- Token classification pipeline with aggregation
- Processes entities in reverse order to maintain text positions

### Development Dependencies

**Backend Requirements:**
- `fastapi` - Web framework
- `uvicorn` - ASGI server  
- `transformers` - Hugging Face ML models
- `torch` - PyTorch backend

**Extension Dependencies:**
- Chrome extension APIs: `chrome.runtime`, `chrome.storage`, `chrome.tabs`
- No external JavaScript dependencies

### Team Structure (From DEVELOPMENT.md)
- Person 1: Extension framework + popup UI
- Person 2: Storage + encryption systems  
- Person 3: Content scripts + text interception
- Person 4: PII detection algorithms
- Person 5: Background scripts + persona generation

### Critical Development Notes

**Chrome Extension Limitations:**
- Content scripts cannot use ES6 imports - must use global functions
- Extension context invalidation requires error handling in `chrome.runtime.sendMessage`
- Manifest V3 requires specific permission declarations

**Backend Integration:**
- Backend must be running locally on port 8000 for PII detection to work
- API calls are made directly from content scripts (no CORS issues in extension context)
- Transformer model downloads automatically on first run (large initial download)

**Testing Setup:**
- `test.html` contains AI chatbot-style inputs for testing
- Overlay appears in top-right corner when typing
- Check browser console for PII detection logs and API responses