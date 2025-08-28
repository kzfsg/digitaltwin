# Development Guide

## Team Assignment
- **Person 1**: Extension framework + popup UI (`src/popup/`, `manifest.json`)
- **Person 2**: Storage + encryption (`src/storage/`)
- **Person 3**: Content scripts + text interception (`src/content/`)
- **Person 4**: PII detection (`src/detection/`)
- **Person 5**: Background scripts + persona generation (`src/background/`, `src/persona/`)

## File Structure
```
src/
├── content/          # Content scripts (Person 3)
├── background/       # Background scripts (Person 5)  
├── popup/           # Extension popup (Person 1)
├── detection/       # PII detection logic (Person 4)
├── persona/         # Fake persona generation (Person 5)
├── storage/         # Data storage + encryption (Person 2)
└── ui/             # UI feedback components (Person 1)
```

## Development Rules
- Each person owns their assigned directories
- No cross-directory modifications without coordination
- Use placeholder comments for integration points
- Test individually before merging