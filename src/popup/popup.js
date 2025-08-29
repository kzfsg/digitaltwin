let detectionCount = 0;
let isDetectionActive = true;
let detectionLog = [];

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
    loadDetectionLog();
    updateUI();
    
    // Set up event listeners
    document.getElementById('clearLog').addEventListener('click', clearLog);
    document.getElementById('toggleDetection').addEventListener('click', toggleDetection);
    
    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "textDetected") {
            addDetection(message.data);
            sendResponse({ status: "received" });
        } else if (message.type === "piiDetected") {
            addPIIDetection(message.data);
            sendResponse({ status: "received" });
        }
    });
    
    console.log("=� DigitalTwin popup loaded");
});

// Load detection log from storage
function loadDetectionLog() {
    chrome.storage.local.get(['detectionLog', 'detectionCount', 'isDetectionActive'], (result) => {
        detectionLog = result.detectionLog || [];
        detectionCount = result.detectionCount || 0;
        isDetectionActive = result.isDetectionActive !== false;
        updateUI();
    });
}

// Add new PII detection to log
function addPIIDetection(data) {
    if (!isDetectionActive) return;
    
    detectionCount++;
    const detection = {
        timestamp: data.timestamp,
        url: data.url,
        field: data.field,
        entities: data.entities,
        totalCount: data.totalCount,
        type: 'pii'
    };
    
    detectionLog.unshift(detection); // Add to beginning
    
    // Keep only last 50 detections
    if (detectionLog.length > 50) {
        detectionLog = detectionLog.slice(0, 50);
    }
    
    // Save to storage
    chrome.storage.local.set({
        detectionLog: detectionLog,
        detectionCount: detectionCount
    });
    
    updateUI();
}

// Legacy text detection handler
function addDetection(data) {
    if (!isDetectionActive) return;
    
    detectionCount++;
    const detection = {
        timestamp: new Date().toISOString(),
        text: data.text,
        field: data.field,
        url: data.url,
        type: 'text'
    };
    
    detectionLog.unshift(detection); // Add to beginning
    
    // Keep only last 50 detections
    if (detectionLog.length > 50) {
        detectionLog = detectionLog.slice(0, 50);
    }
    
    // Save to storage
    chrome.storage.local.set({
        detectionLog: detectionLog,
        detectionCount: detectionCount
    });
    
    updateUI();
}

// Update UI elements
function updateUI() {
    // Update counters
    document.getElementById('detectionCount').textContent = detectionCount;
    document.getElementById('statusIndicator').textContent = isDetectionActive ? '' : 'L';
    
    // Update toggle button
    const toggleBtn = document.getElementById('toggleDetection');
    toggleBtn.textContent = isDetectionActive ? 'Pause Detection' : 'Resume Detection';
    toggleBtn.style.background = isDetectionActive ? '#007cba' : '#28a745';
    
    // Update log display
    updateLogDisplay();
}

// Update log display
function updateLogDisplay() {
    const logContainer = document.getElementById('detectionLog');
    
    if (detectionLog.length === 0) {
        logContainer.innerHTML = '<div class="no-detections">No PII detected yet. Start typing personal information!</div>';
        return;
    }
    
    const logHTML = detectionLog.map(detection => {
        const time = new Date(detection.timestamp).toLocaleTimeString();
        
        if (detection.type === 'pii') {
            const fieldDesc = `${detection.field.tagName} on ${detection.field.url}`;
            const entitiesHTML = detection.entities.map(entity => 
                `<span class="entity-item entity-${entity.type.toLowerCase()}" title="${entity.text} (${Math.round(entity.confidence * 100)}%)">${getEntityEmoji(entity.type)} ${entity.type}</span>`
            ).join('');
            
            return `
                <div class="log-entry">
                    <div class="log-timestamp">${time} - <span class="pii-count">${detection.totalCount} PII items</span></div>
                    <div class="log-field">${fieldDesc}</div>
                    <div class="log-entities">${entitiesHTML}</div>
                </div>
            `;
        } else {
            // Legacy text detection format
            const shortText = detection.text.length > 80 ? 
                detection.text.substring(0, 80) + '...' : 
                detection.text;
            
            return `
                <div class="log-entry">
                    <div class="log-timestamp">${time} - ${detection.url}</div>
                    <div class="log-text">${escapeHtml(shortText)}</div>
                </div>
            `;
        }
    }).join('');
    
    logContainer.innerHTML = logHTML;
}

// Get emoji for entity type
function getEntityEmoji(type) {
    const emojiMap = {
        'EMAIL': '📧',
        'PHONE': '📞',
        'PERSON': '👤',
        'SSN': '🆔',
        'ADDRESS': '📍',
        'CREDIT_CARD': '💳'
    };
    return emojiMap[type] || '🔒';
}

// Clear detection log
function clearLog() {
    detectionLog = [];
    detectionCount = 0;
    
    chrome.storage.local.set({
        detectionLog: [],
        detectionCount: 0
    });
    
    updateUI();
}

// Toggle detection on/off
function toggleDetection() {
    isDetectionActive = !isDetectionActive;
    
    chrome.storage.local.set({
        isDetectionActive: isDetectionActive
    });
    
    // Send message to content scripts to toggle detection
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            type: "toggleDetection",
            active: isDetectionActive
        });
    });
    
    updateUI();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}