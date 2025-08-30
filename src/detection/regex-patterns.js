// Simple PII detection patterns for fallback
function detectPIIWithRegex(text) {
  const entities = [];
  
  // Enhanced regex patterns for various PII types (Singapore-focused)
  const piiPatterns = {
    EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    
    // Singapore phone number patterns
    PHONE: [
      // 8-digit Singapore mobile numbers (e.g., 92124222, 81234567)
      /\b[89]\d{7}\b/g,
      // Singapore landline with country code (e.g., +65 6123 4567)
      /\+65\s*[6]\d{3}\s*\d{4}\b/g,
      // Singapore mobile with country code (e.g., +65 9212 4222)
      /\+65\s*[89]\d{3}\s*\d{4}\b/g,
      // US format for compatibility
      /\b\d{3}-\d{3}-\d{4}\b/g,
      // General formats with spaces or dashes
      /\b\d{4}\s*\d{4}\b/g
    ],
    
    SSN: /\b\d{3}-\d{2}-\d{4}\b/g, // US SSN
    
    // Singapore-style name patterns (including Chinese names)
    PERSON: [
      // Direct multi-part names: "lim jun jie", "sally wong"
      /\b[A-Za-z]{2,8}\s+[A-Za-z]{2,8}(?:\s+[A-Za-z]{2,8})?\b/g,
      // Single capitalized names: "John", "Mary" (but be careful with common words)
      /\b[A-Z][a-z]{2,12}\b/g,
      // Name after "I'm" or "I am" - captures only the name part
      /(?:I'm|I am)\s+([A-Za-z]{2,8}(?:\s+[A-Za-z]{2,8}){0,2})/gi,
      // Name after "My name is" - captures only the name part
      /(?:my name is|name is)\s+([A-Za-z]{2,8}(?:\s+[A-Za-z]{2,8}){0,2})/gi,
      // Name after greetings - captures only the name part
      /(?:Hi|Hello|Hey)\s+([A-Za-z]{2,8}(?:\s+[A-Za-z]{2,8}){0,2})/gi
    ],
    
    CREDIT_CARD: /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g,
    ADDRESS: /\b\d{1,5}\s[A-Za-z0-9\s]{2,20}\s(St|Street|Rd|Road|Ave|Avenue|Blvd|Boulevard)\b/g
  };

  // Check each PII type
  for (const [entityType, patterns] of Object.entries(piiPatterns)) {
    const patternList = Array.isArray(patterns) ? patterns : [patterns];
    
    for (const pattern of patternList) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // Get the actual text (might be in capture group for name patterns)
        const matchedText = match[1] || match[0];
        const startPos = match[1] ? match.index + match[0].indexOf(match[1]) : match.index;
        const endPos = startPos + matchedText.length;
        
        // Avoid false positives for names
        if (entityType === 'PERSON') {
          const lowerText = matchedText.toLowerCase();
          const falsePositives = [
            // Places
            'united states', 'new york', 'los angeles', 'san francisco', 'hong kong', 
            // Common words and phrases
            'thank you', 'good morning', 'good afternoon', 'good evening', 'good night',
            'how are', 'nice to', 'see you', 'talk to', 'speak to', 'email me',
            // Tech terms
            'user name', 'full name', 'first name', 'last name', 'display name',
            // Common single words that aren't names
            'the', 'and', 'but', 'for', 'with', 'you', 'are', 'can', 'will', 'have',
            'this', 'that', 'what', 'when', 'where', 'why', 'how', 'who', 'which',
            'would', 'could', 'should', 'might', 'must', 'shall', 'may', 'need',
            'make', 'take', 'give', 'tell', 'ask', 'work', 'play', 'help', 'want'
          ];
          
          if (falsePositives.some(fp => lowerText.includes(fp)) || matchedText.length < 3) {
            continue;
          }
          
          // For single names, be more strict - must be capitalized and alphabetic only
          if (!matchedText.includes(' ')) {
            if (!matchedText[0].match(/[A-Z]/) || !matchedText.match(/^[A-Za-z]+$/)) {
              continue;
            }
          }
        }
        
        entities.push({
          start: startPos,
          end: endPos,
          entity_group: entityType,
          confidence: 0.8
        });
        
        // Reset regex lastIndex to avoid infinite loops
        if (!pattern.global) break;
      }
      
      // Reset regex for next iteration
      pattern.lastIndex = 0;
    }
  }
  
  return entities;
}

// Legacy function for backwards compatibility
export function detectPII(text, field) {
  // exit early (empty input edge case)
  if (!text || !field) return;

  const entities = detectPIIWithRegex(text);
  
  if (entities.length > 0) {
    console.warn("Potential PII detected in field:", field);
    entities.forEach((entity) => {
      const detectedText = text.substring(entity.start, entity.end);
      console.warn(`- ${entity.entity_group}: ${detectedText}`);
    });
  }
  
  return entities;
}

// Expose the regex detection function globally
window.detectPIIWithRegex = detectPIIWithRegex;

// Debounce function
// To improve perfomance, doesn’t run on every single keystroke,
// which can be expensive, especially when the text is long
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
