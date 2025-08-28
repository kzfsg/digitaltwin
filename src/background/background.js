// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "piiDetected") {
        console.log(`PII detected in tab ${sender.tab.id}:`, message.data);
        // Optionally: store data or show a global notification
        sendResponse({ status: "received" });
    }
});
