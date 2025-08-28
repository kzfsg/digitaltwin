// Simple PII detection (replace with DistilBERT model later)
function detectPII(text, field) {
    
    console.log("Detecting PII in text...",);
    // exit early (empty input edge case)
    if (!text || !field) return;

    // Regex patterns for various PII types
    // harcoded lol 
    // Use named entities in an NLP model later to improve accuracy 
    // instead of regex for complex types e.g. addresses or names
    const piiPatterns = {
        "Phone number": /\b\d{3}-\d{3}-\d{4}\b/g,
        "Email": /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        "ID number": /\b\d{6,9}\b/g,                 // Example ID numbers
        "Birthday": /\b\d{2}[\/-]\d{2}[\/-]\d{4}\b/g, // e.g., 12/31/1990 or 12-31-1990
        "Credit card": /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, // e.g., 1234-5678-9012-3456
        "Passport number": /\b[A-Z]{1,2}\d{6,9}\b/g, // e.g., P1234567
        "Social security number": /\b\d{3}-\d{2}-\d{4}\b/g, // US SSN
        "Address": /\b\d{1,5}\s[A-Za-z0-9\s]{2,20}\s(St|Street|Rd|Road|Ave|Avenue|Blvd|Boulevard)\b/g
    };

    let warnings = [];

    // Check each PII type
    for (const [type, pattern] of Object.entries(piiPatterns)) {
        const matches = text.match(pattern);
        if (matches) {
            warnings.push({ type, matches: [...new Set(matches)] }); // remove duplicates
        }
    }

    // Print user-friendly warning if any PII is found
    if (warnings.length > 0) {
        console.warn("Potential PII detected in field:", field);
        warnings.forEach(item => {
            console.warn(`- ${item.type}: ${item.matches.join(", ")}`);
        });
         // TODO: Optionally show a UI warning to the user 
    }
}

// Debounce function 
// To improve perfomance, doesn't run on every single keystroke, 
// which can be expensive, especially when the text is long
function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

// Make functions globally available for content script
window.detectPII = detectPII;
window.debounce = debounce;
