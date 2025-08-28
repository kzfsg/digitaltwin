import { detectPII } from '../detection/pii-detector.js';
import { debounce } from '../detection/pii-detector.js';

// Attach listener to all inputs and textareas
function attachInputListener(field) {
    if (field._piiListenerAttached) return;
    field._piiListenerAttached = true;

    // Wrap detectPII with debounce
    const debouncedDetectPII = debounce((text) => detectPII(text, field), 300);

    field.addEventListener('input', (event) => {
        const text = event.target.value;
        debouncedDetectPII(text, field);
    });
}

// Scan existing and new inputs
function scanInputs(root = document) {
    const inputs = root.querySelectorAll('input[type="text"], textarea'); // configure this to include other input types
    inputs.forEach(attachInputListener);
}

// Observe new elements being added dynamically
const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.matches('input[type="text"], textarea')) attachInputListener(node);
                scanInputs(node);
            }
        });
    }
});

observer.observe(document.body, { childList: true, subtree: true });
scanInputs();

