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

// Display detected text in overlay
function showInOverlay(text, field) {
  // Check if overlay is enabled before showing
  chrome.storage.local.get(['isOverlayActive'], (result) => {
    const isOverlayEnabled = result.isOverlayActive !== false; // Default to true
    
    // Always send detection to popup regardless of overlay state
    sendDetectionToPopup(text, field);
    
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

        // Show in overlay
        showInOverlay(overlayText, field);

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
