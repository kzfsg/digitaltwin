let isDetectionActive = true;
let detectionLog = [];
let detectionCount = 0;

const SETTINGS_KEY = "dt-settings";
const ENTITY_LABELS = [
  "ACCOUNTNUM","BUILDINGNUM","CITY","CREDITCARDNUMBER","DATEOFBIRTH","DRIVERLICENSENUM",
  "EMAIL","GIVENNAME","IDCARDNUM","PASSWORD","SOCIALNUM","STREET","SURNAME","TAXNUM",
  "TELEPHONENUM","USERNAME","ZIPCODE"
];

let enabledLabels = {};

const GROUPS = {
    btnName: ["GIVENNAME","SURNAME"],
    btnEmail: ["EMAIL"],
    btnAddress: ["STREET","BUILDINGNUM","CITY","ZIPCODE"],
    btnCC: ["CREDITCARDNUMBER"],
    btnDOB: ["DATEOFBIRTH"],
    btnUsername: ["USERNAME"],
};

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    wireQuickPills();
    wireMoreEntities();
    wireGlobalControls();
    updateUI();
    
    // Set up event listeners with null checks
    const clearLogBtn = document.getElementById('clearLog');
    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', clearLog);
    }
    
    const toggleBtn = document.getElementById('toggleDetection');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleDetection);
    }
    
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

// Load settings from storage
function loadSettings() {
    chrome.storage.local.get(['isDetectionActive', 'detectionLog', 'detectionCount'], (result) => {
        isDetectionActive = result.isDetectionActive !== false;
        detectionLog = result.detectionLog || [];
        detectionCount = result.detectionCount || 0;
        updateUI();
    });
    loadEnabledLabels();
}

async function loadEnabledLabels() { 
    const obj = await chrome.storage.sync.get(SETTINGS_KEY);
    const saved = obj[SETTINGS_KEY]?.enabledLabels;
    enabledLabels = {};
    for (const l of ENTITY_LABELS) enabledLabels[l] = saved?.[l] !== false;
}

async function saveEnabledLabels() { 
    await chrome.storage.sync.set({ [SETTINGS_KEY]: { enabledLabels } });

    const tabs = await chrome.tabs.query({}); 
    await Promise.all(
      tabs.map((t) =>
        t.id
          ? chrome.tabs.sendMessage(t.id, {
              type: "updateEnabledLabels",
              enabledLabels
            }).catch(() => {})
          : Promise.resolve()
      )
    );
    setStatus("Saved ✓"); // (uses your existing statusIndicator)
}

// Add new detection to log
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
    // Update toggle button
    const toggleBtn = document.getElementById('toggleDetection');
    toggleBtn.textContent = isDetectionActive ? 'Pause Detection' : 'Resume Detection';
    toggleBtn.style.background = isDetectionActive ? '#e33262' : '#4dd4da';
    reflectPillStates();
    reflectDropdownSelection();

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

function wireGlobalControls() {
    document.getElementById('toggleDetection')?.addEventListener('click', toggleDetection);

    document.getElementById("selectAll")?.addEventListener("click", () => {
      for (const l of ENTITY_LABELS) enabledLabels[l] = true;
      saveEnabledLabels().then(updateUI);
    });

    document.getElementById("selectNone")?.addEventListener("click", () => {
      for (const l of ENTITY_LABELS) enabledLabels[l] = false;
      saveEnabledLabels().then(updateUI);
    });
}

function wireQuickPills() { 
    Object.keys(GROUPS).forEach((btnId) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;

      btn.addEventListener("click", () => {
        const group = GROUPS[btnId];
        const next = !isGroupActive(group); 
        group.forEach((label) => (enabledLabels[label] = next));
        saveEnabledLabels().then(updateUI);
      });
    });

    reflectPillStates();
}

function isGroupActive(group) { 
    return group.every((label) => enabledLabels[label] !== false);
}

function reflectPillStates() { 
    Object.keys(GROUPS).forEach((btnId) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;
      const active = isGroupActive(GROUPS[btnId]);
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
}

function wireMoreEntities() { 
    const select = document.getElementById("otherEntities");
    const applyBtn = document.getElementById("applyOtherEntities");
    const clearBtn = document.getElementById("clearOtherEntities");

    applyBtn?.addEventListener("click", () => {
      const selected = getMultiSelectValues(select);
      selected.forEach((label) => (enabledLabels[label] = true));
      saveEnabledLabels().then(updateUI);
    });

    clearBtn?.addEventListener("click", () => {
      const selected = getMultiSelectValues(select);
      selected.forEach((label) => (enabledLabels[label] = false));
      if (select) Array.from(select.options).forEach((o) => (o.selected = false));
      saveEnabledLabels().then(updateUI);
    });

    reflectDropdownSelection();
}

function getMultiSelectValues(selectEl) { 
    if (!selectEl) return [];
    return Array.from(selectEl.selectedOptions || []).map((o) => o.value);
}

function reflectDropdownSelection() { 
    const select = document.getElementById("otherEntities");
    if (!select) return;
    Array.from(select.options).forEach((opt) => {
      opt.selected = enabledLabels[opt.value] !== false;
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setStatus(msg) {
    console.log("Status:", msg);
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