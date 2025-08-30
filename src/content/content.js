// Functions imported from pii-detector.js loaded before this script

// AI Chatbot selectors for popular services
const AI_CHATBOT_SELECTORS = [
  // ChatGPT
  "#prompt-textarea",
  'textarea[placeholder*="Message"]',
  'textarea[data-id="root"]',

  // Claude
  'div[contenteditable="true"]',
  'textarea[placeholder*="Talk to Claude"]',

  // Gemini/Bard
  'textarea[aria-label*="Enter a prompt"]',
  "div.ql-editor",

  // Bing Chat
  'textarea[aria-label*="Ask me anything"]',

  // Generic chatbot patterns
  'textarea[placeholder*="chat"]',
  'textarea[placeholder*="ask"]',
  'textarea[placeholder*="message"]',
  'div[contenteditable="true"][data-placeholder*="message"]',
  'input[type="text"][placeholder*="chat"]',
];

// Create overlay for displaying detected text
function createOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "digitaltwin-overlay";
  overlay.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 300px;
        max-height: 200px;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 10000;
        font-family: monospace;
        font-size: 12px;
        overflow-y: auto;
        display: none;
        border: 2px solid #ff6b6b;
    `;

  const title = document.createElement("div");
  title.textContent = "🛡️ DigitalTwin - Text Detected";
  title.style.cssText = `
        font-weight: bold;
        margin-bottom: 10px;
        color: #ff6b6b;
    `;

  const content = document.createElement("div");
  content.id = "digitaltwin-content";

  overlay.appendChild(title);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  return overlay;
}

let overlay = null;
let persistentReplaceBtn = null;
let currentAnonymizedText = null;
let currentField = null;

// Create persistent replace button at bottom right
function createPersistentReplaceButton() {
  if (persistentReplaceBtn) return persistentReplaceBtn;

  const button = document.createElement("button");
  button.id = "digitaltwin-persistent-replace";
  button.textContent = "Replace PII";
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
    display: none;
  `;

  // Hover effects
  button.addEventListener('mouseenter', () => {
    button.style.background = '#45a049';
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.background = '#4CAF50';
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  });

  // Click handler
  button.addEventListener('click', () => {
    if (currentField && currentAnonymizedText) {
      if (typeof currentField.value !== 'undefined') {
        currentField.value = currentAnonymizedText;
        currentField.dispatchEvent(new Event('input', { bubbles: true }));
        currentField.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (currentField.contentEditable === 'true') {
        currentField.textContent = currentAnonymizedText;
        currentField.dispatchEvent(new Event('input', { bubbles: true }));
      }
      console.log('🎯 Text replaced with anonymized version');
      hidePersistentReplaceButton();
    }
  });

  document.body.appendChild(button);
  persistentReplaceBtn = button;
  return button;
}

// Show persistent replace button
function showPersistentReplaceButton(field, anonymizedText) {
  currentField = field;
  currentAnonymizedText = anonymizedText;
  
  const button = createPersistentReplaceButton();
  button.style.display = 'block';
  
  // Auto-hide after 15 seconds
  setTimeout(() => {
    hidePersistentReplaceButton();
  }, 15000);
}

// Hide persistent replace button
function hidePersistentReplaceButton() {
  if (persistentReplaceBtn) {
    persistentReplaceBtn.style.display = 'none';
    currentField = null;
    currentAnonymizedText = null;
  }
}

// Display detected text in overlay
function showInOverlay(text, field, anonymizedText = null) {
  // Check if overlay is enabled before showing
  chrome.storage.local.get(['isOverlayActive'], (result) => {
    const isOverlayEnabled = result.isOverlayActive !== false; // Default to true
    
    // Always send detection to popup regardless of overlay state
    sendDetectionToPopup(text, field);
    
    // Show persistent replace button if anonymized text is available
    if (anonymizedText) {
      showPersistentReplaceButton(field, anonymizedText);
    }
    
    // Only show overlay if enabled
    if (!isOverlayEnabled) {
      return;
    }
    
    if (!overlay) {
      overlay = createOverlay();
    }

    const content = overlay.querySelector("#digitaltwin-content");
    const timestamp = new Date().toLocaleTimeString();

    content.innerHTML = `
          <div style="margin-bottom: 8px;">
              <strong>Time:</strong> ${timestamp}<br>
              <strong>Field:</strong> ${getFieldDescription(field)}<br>
              <strong>Text:</strong> ${text.substring(0, 100)}${
      text.length > 100 ? "..." : ""
    }
          </div>
      `;

    overlay.style.display = "block";

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (overlay) overlay.style.display = "none";
    }, 10000);
  });
}

// Send detection data to popup
function sendDetectionToPopup(text, field) {
  const detectionData = {
    text: text,
    field: getFieldDescription(field),
    url: window.location.hostname,
    timestamp: new Date().toISOString(),
  };

  chrome.runtime.sendMessage({
    type: "textDetected",
    data: detectionData,
  });
}

// Get descriptive field information
function getFieldDescription(field) {
  const url = window.location.hostname;
  const placeholder =
    field.placeholder || field.getAttribute("aria-label") || "";
  const tagName = field.tagName.toLowerCase();
  const id = field.id || "no-id";

  return `${tagName}#${id} on ${url} (${placeholder})`;
}

// Enhanced input listener for AI chatbots
function attachChatbotListener(field) {
  if (field._chatbotListenerAttached) return;
  field._chatbotListenerAttached = true;

  // Debounced text detection with highlighting
  const debouncedDetect = (
    window.debounce ||
    function (fn, delay) {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
      };
    }
  )(async (text) => {
    if (text.trim().length > 0) {
      try {
        const result = await detectPII(text);
        const resultFake = await detectPIIWithFake(text);

        const overlayText = `${resultFake.original_text}\n\nDetected: ${resultFake.anonymized_text}`;

        // Store anonymized text in Chrome storage
        try {
          const storageKey = `anonymized_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await chrome.storage.local.set({
            [storageKey]: {
              original_text: resultFake.original_text,
              anonymized_text: resultFake.anonymized_text,
              timestamp: new Date().toISOString(),
              entities: result.entities || []
            }
          });
          console.log('🎯 Stored anonymized text with key:', storageKey);
        } catch (error) {
          console.error('❌ Failed to store anonymized text:', error);
        }

        // Show in overlay with replace button
        showInOverlay(overlayText, field, resultFake.anonymized_text);

        // Highlight individual PII entities with badges
        if (
          window.piiHighlighter &&
          result &&
          result.entities &&
          result.entities.length > 0
        ) {
          console.log("🎯 Calling addPIIIndicators with:", result.entities);
          window.piiHighlighter.addPIIIndicators(field, result.entities);
        } else {
          console.log("🎯 No highlighting:", {
            hasHighlighter: !!window.piiHighlighter,
            hasResult: !!result,
            hasEntities: !!(result && result.entities),
            entitiesLength:
              result && result.entities ? result.entities.length : 0,
          });
        }
      } catch (error) {
        console.warn("PII detection failed:", error);
      }
    } else {
      // Clear highlights when field is empty
      if (window.piiHighlighter) {
        window.piiHighlighter.clearIndicators(field);
      }
    }
  }, 300);

  // Listen for input events
  field.addEventListener("input", (event) => {
    const text = event.target.value || event.target.textContent || "";
    debouncedDetect(text);
  });

  // For contenteditable divs
  if (field.contentEditable === "true") {
    field.addEventListener("input", (event) => {
      const text = event.target.textContent || "";
      debouncedDetect(text);
    });
  }

  // Listen for form submissions or send button clicks
  const form = field.closest("form");
  if (form) {
    form.addEventListener("submit", (event) => {
      const text = field.value || field.textContent || "";
      if (text.trim().length > 0) {
        console.log("🚨 Text about to be sent to AI chatbot:", text);
        showInOverlay(`[SENDING] ${text}`, field);
      }
    });
  }

  // Look for send buttons near the input
  const sendButtons = document.querySelectorAll(
    'button[type="submit"], button[aria-label*="Send"], button[title*="Send"], [data-testid*="send"]'
  );
  sendButtons.forEach((button) => {
    if (!button._sendListenerAttached) {
      button._sendListenerAttached = true;
      button.addEventListener("click", () => {
        const text = field.value || field.textContent || "";
        if (text.trim().length > 0) {
          console.log(
            "🚨 Text about to be sent to AI chatbot via button:",
            text
          );
          showInOverlay(`[SENDING] ${text}`, field);
        }
      });
    }
  });
}

// Scan for AI chatbot inputs
function scanChatbotInputs(root = document) {
  AI_CHATBOT_SELECTORS.forEach((selector) => {
    const elements = root.querySelectorAll(selector);
    elements.forEach(attachChatbotListener);
  });

  // Also scan general inputs as fallback
  const generalInputs = root.querySelectorAll(
    'input[type="text"], textarea, div[contenteditable="true"]'
  );
  generalInputs.forEach((field) => {
    // Only attach if not already handled by chatbot selectors
    if (!field._chatbotListenerAttached) {
      attachChatbotListener(field);
    }
  });
}

// Enhanced mutation observer
const observer = new MutationObserver((mutationsList) => {
  for (const mutation of mutationsList) {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Check if the node itself matches our selectors
        AI_CHATBOT_SELECTORS.forEach((selector) => {
          if (node.matches && node.matches(selector)) {
            attachChatbotListener(node);
          }
        });

        // Scan within the added node
        scanChatbotInputs(node);
      }
    });
  }
});

// Initialize
observer.observe(document.body, { childList: true, subtree: true });
scanChatbotInputs();

console.log("🛡️ DigitalTwin: AI chatbot detection active");
console.log(
  "🛡️ Found inputs:",
  document.querySelectorAll(
    'input[type="text"], textarea, div[contenteditable="true"]'
  ).length
);
console.log("🛡️ Backend API available:", typeof detectPII !== "undefined");
console.log(
  "🛡️ PII Highlighter available:",
  typeof window.piiHighlighter !== "undefined"
);
console.log(
  "🛡️ Global debounce available:",
  typeof window.debounce !== "undefined"
);

// Simple message listener to hide overlay immediately
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "hideOverlay" && overlay) {
    overlay.style.display = "none";
    console.log("🛡️ Overlay hidden immediately");
    sendResponse({ success: true });
  } else if (message.type === "updateEnabledLabels") {
    console.log("🔍 Received updated enabled labels:", message.enabledLabels);
    sendResponse({ success: true });
  }
});

// Test PII detection after a short delay
setTimeout(async () => {
  try {
    console.log("🛡️ Testing PII detection...");
    const testResult = await detectPII("My email is test@example.com");
    console.log("🛡️ Test result:", testResult);
  } catch (error) {
    console.log("🛡️ Test failed:", error);
  }
}, 2000);
