let isDetectionActive = true;

const SETTINGS_KEY = "dt-settings";
const ENTITY_LABELS = [
  "ACCOUNTNUM","BUILDINGNUM","CITY","CREDITCARDNUMBER","DATEOFBIRTH","DRIVERLICENSENUM",
  "EMAIL","GIVENNAME","IDCARDNUM","PASSWORD","SOCIALNUM","STREET","SURNAME","TAXNUM",
  "TELEPHONENUM","USERNAME","ZIPCODE"
];

let enabledLabels = {};

// Utility function to log enabled settings
function logEnabledSettings() {
    console.log("=🔒 DigitalTwin Settings:", {
        isDetectionActive,
        enabledLabels: { ...enabledLabels }
    });
}

const GROUPS = {
    btnName: ["GIVENNAME","SURNAME"],
    btnEmail: ["EMAIL"],
    btnAddress: ["STREET","BUILDINGNUM","CITY","ZIPCODE"],
    btnCC: ["CREDITCARDNUMBER"],
    btnDOB: ["DATEOFBIRTH"],
    btnUsername: ["USERNAME"],
};

// Initialize popup
document.addEventListener('DOMContentLoaded', async function() {
    await loadSettings();
    wireQuickPills();
    wireMoreEntities();
    wireGlobalControls();
    updateUI();
    
    console.log("=� DigitalTwin popup loaded");
    logEnabledSettings();
});

// Log settings when popup closes
window.addEventListener('beforeunload', function() {
    console.log("=� DigitalTwin popup closing");
    logEnabledSettings();
});

// Load settings from storage
async function loadSettings() {
    chrome.storage.local.get(['isDetectionActive'], (result) => {
        isDetectionActive = result.isDetectionActive !== false;
        updateUI();
    });
    await loadEnabledLabels();
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
    setStatus("Saved ✓");
    logEnabledSettings();
}

// Update UI elements
function updateUI() {
    // Update toggle button
    const toggleBtn = document.getElementById('toggleDetection');
    toggleBtn.textContent = isDetectionActive ? 'Pause Detection' : 'Resume Detection';
    toggleBtn.style.background = isDetectionActive ? '#e33262' : '#4dd4da';

    // Update overlay button state
    chrome.storage.local.get(['isOverlayActive'], (result) => {
        const isOverlayActive = result.isOverlayActive !== false; // Default to true
        const overlayBtn = document.getElementById('toggleOverlay');
        if (overlayBtn) {
            overlayBtn.textContent = isOverlayActive ? 'Hide Overlay' : 'Show Overlay';
            overlayBtn.style.background = isOverlayActive ? '#e33262' : '#4dd4da';
        }
    });

    reflectPillStates();
    reflectDropdownSelection();
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
    logEnabledSettings();
    console.log("hello");
}

function wireGlobalControls() {
    document.getElementById('toggleDetection')?.addEventListener('click', toggleDetection);
    
    // Simple overlay toggle - just stores a flag
    document.getElementById('toggleOverlay')?.addEventListener('click', () => {
        chrome.storage.local.get(['isOverlayActive'], (result) => {
            const currentState = result.isOverlayActive !== false; // Default to true
            const newState = !currentState;
            
            chrome.storage.local.set({ isOverlayActive: newState });
            
            // If disabling overlay, send message to content script to hide it immediately
            if (!newState) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: "hideOverlay"
                    });
                });
            }
            
            // Update button styling
            const overlayBtn = document.getElementById('toggleOverlay');
            overlayBtn.textContent = newState ? 'Hide Overlay' : 'Show Overlay';
            overlayBtn.style.background = newState ? '#e33262' : '#4dd4da';
        });
    });

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