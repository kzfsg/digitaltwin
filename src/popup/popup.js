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
        }
    });
    
    console.log("=á DigitalTwin popup loaded");
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

// Add new detection to log
function addDetection(data) {
    if (!isDetectionActive) return;
    
    detectionCount++;
    const detection = {
        timestamp: new Date().toISOString(),
        text: data.text,
        field: data.field,
        url: data.url
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
        logContainer.innerHTML = '<div class="no-detections">No text detected yet. Start typing in AI chatbots!</div>';
        return;
    }
    
    const logHTML = detectionLog.map(detection => {
        const time = new Date(detection.timestamp).toLocaleTimeString();
        const shortText = detection.text.length > 80 ? 
            detection.text.substring(0, 80) + '...' : 
            detection.text;
        
        return `
            <div class="log-entry">
                <div class="log-timestamp">${time} - ${detection.url}</div>
                <div class="log-text">${escapeHtml(shortText)}</div>
            </div>
        `;
    }).join('');
    
    logContainer.innerHTML = logHTML;
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