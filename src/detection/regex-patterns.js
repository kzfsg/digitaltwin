// Simple PII detection patterns for fallback
function detectPIIWithRegex(text) {
  const entities = [];
  
  // Comprehensive regex patterns for various PII types
  const piiPatterns = {
    EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    
    // Singapore phone number patterns
    PHONE: [
      // Singapore mobile numbers (8-digit)
      /\b[89]\d{7}\b/g,
      // Singapore landline (8-digit starting with 6)
      /\b6\d{7}\b/g,
      // Singapore with country code (+65)
      /\+65\s*[689]\d{3}\s*\d{4}\b/g,
      // Singapore mobile with space formatting
      /\b[89]\d{3}\s*\d{4}\b/g,
      // Singapore landline with space formatting
      /\b6\d{3}\s*\d{4}\b/g
    ],
    
    // Singapore NRIC (National Registration Identity Card)
    NRIC: [
      /\b[STFG]\d{7}[A-Z]\b/g,  // Standard Singapore NRIC format
      /\b[stfg]\d{7}[a-z]\b/g,  // Lowercase version
      /\b[STFGstfg]\d{7}[A-Za-z]\b/g  // Mixed case
    ],
    
    // Credit Card Numbers
    CREDIT_CARD: [
      /\b4\d{3}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Visa
      /\b5[1-5]\d{2}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Mastercard
      /\b3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5}\b/g, // Amex
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g // Generic
    ],
    
    // Singapore Names (more flexible patterns)
    PERSON: [
      // Names after "I'm" or "I am" - captures only the name part
      /(?:I'm|I am)\s+([A-Z][a-z]{1,12}\s+[A-Z][a-z]{1,12}(?:\s+[A-Z][a-z]{1,12})?(?:\s+[A-Z][a-z]{1,12})?)/gi,
      // Names after "My name is" - captures only the name part
      /(?:my name is|name is)\s+([A-Z][a-z]{1,12}\s+[A-Z][a-z]{1,12}(?:\s+[A-Z][a-z]{1,12})?(?:\s+[A-Z][a-z]{1,12})?)/gi,
      // Names after greetings - captures only the name part
      /(?:Hi|Hello|Hey|Meet)\s+([A-Z][a-z]{1,12}\s+[A-Z][a-z]{1,12}(?:\s+[A-Z][a-z]{1,12})?(?:\s+[A-Z][a-z]{1,12})?)/gi,
      // Singapore surnames followed by given names (flexible)
      /\b(?:tan|lim|lee|ng|ong|wong|goh|teo|lau|sia|chan|chen|chong|chua|gan|ho|koh|low|neo|seah|soh|tay|toh|wee|yap|yeo|yeoh|yong|yu|chin|chew|foo|heng|hong|hoo|koo|lam|leong|loo|mok|sim|sng|soo|thong|tong|wang|woo|yak|yam|yang|ahmad|hassan|ibrahim|ismail|mohamed|mohammad|rahman|ali|omar|osman|salleh|abdullah|adam|hamid|hussain|rashid|singh|kumar|raj|rajan|krishnan|murugan|nathan|ravi|samy|devi|lakshmanan|suresh|prakash|menon|nair|pillai)\s+[A-Za-z]{2,12}(?:\s+[A-Za-z]{2,12})?\b/gi,
      // Traditional format: Given name + surname (more flexible)
      /\b[A-Z][a-z]{1,12}\s+[A-Z][a-z]{1,12}(?:\s+[A-Z][a-z]{1,12})?(?:\s+[A-Z][a-z]{1,12})?\b/g,
      // More flexible format for common names
      /\b[A-Za-z]{2,10}\s+[A-Za-z]{2,10}(?:\s+[A-Za-z]{2,10})?\b/g
    ],
    
    // Singapore addresses
    ADDRESS: [
      /\b\d{1,4}\s+[A-Za-z0-9\s]{2,40}\s+(Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Lane|Ln|Close|Crescent|Walk|Park|Gardens?|Heights?|View|Terrace|Place|Plaza)\b/g,
      /\b(?:Blk|Block)\s+\d{1,4}[A-Z]?\s+[A-Za-z0-9\s]{5,40}\b/g,
      /\b\d{1,4}\s+[A-Za-z0-9\s]{2,40}\s+(?:Road|Rd|Street|St|Avenue|Ave)\s*#\d{2}-\d{2,3}\b/g,
      /\bP\.?O\.?\s*Box\s+\d{1,6}\b/g
    ],
    
    // Singapore postal codes (6-digit format)
    POSTAL_CODE: [
      /\b\d{6}\b/g, // Singapore postal codes (098765)
      /\bSingapore\s+\d{6}\b/gi // "Singapore 098765" format
    ],
    
    // Comprehensive Date of Birth patterns
    DATE_OF_BIRTH: [
      // Numeric formats
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, // DD/MM/YYYY or MM/DD/YYYY
      /\b\d{1,2}-\d{1,2}-\d{4}\b/g, // DD-MM-YYYY or MM-DD-YYYY
      /\b\d{4}\/\d{1,2}\/\d{1,2}\b/g, // YYYY/MM/DD
      /\b\d{4}-\d{1,2}-\d{1,2}\b/g, // YYYY-MM-DD
      /\b\d{1,2}\.\d{1,2}\.\d{4}\b/g, // DD.MM.YYYY
      
      // Written month formats (full names)
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi, // January 15, 1990
      /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi, // 15 January 1990
      
      // Abbreviated month formats
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}\b/gi, // Jan 15, 1990
      /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{4}\b/gi, // 15 Jan 1990
      
      // Ordinal date formats
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th),?\s+\d{4}\b/gi, // January 1st, 1990
      /\b\d{1,2}(?:st|nd|rd|th)\s+(?:of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi, // 1st of January 1990
      
      // Casual date formats with context
      /\b(?:born\s+(?:on\s+)?)\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi, // born 1 January 1990
      /\b(?:birthday\s+(?:is\s+)?(?:on\s+)?)\d{1,2}\/\d{1,2}\/\d{4}\b/gi // birthday is 01/01/1990
    ],
    
    // Singapore Driver's License Numbers
    DRIVER_LICENSE: [
      /\b[A-Z]\d{7,8}[A-Z]?\b/g, // Singapore format similar to NRIC
      /\bSPDL\d{6,8}\b/g // Singapore Police Driving License format
    ],
    
    // Bank Account Numbers (Singapore banks)
    BANK_ACCOUNT: [
      /\b\d{8,17}\b/g, // 8-17 digit account numbers
      /\b\d{3}[-\s]\d{3}[-\s]\d{3,6}\b/g // Singapore bank account formatting
    ],
    
    // Singapore Work Pass Numbers
    WORK_PASS: [
      /\b[FGM]\d{7}[A-Z]\b/g, // Foreign ID in Singapore
      /\bWP\d{8}\b/g, // Work Permit numbers
      /\bEP\d{8}\b/g, // Employment Pass numbers
      /\bDP\d{8}\b/g  // Dependant Pass numbers
    ],
    
    // Tax Numbers
    TAX_NUMBER: [
      /\b\d{2}-\d{7}\b/g, // EIN format
      /\b\d{3}-\d{2}-\d{4}\b/g // SSN used as tax ID
    ],
    
    // Passwords (contextual)
    PASSWORD: [
      /(?:password|pwd|pass)\s*[:=]\s*([A-Za-z0-9@#$%^&*!]{6,})/gi,
      /(?:password|pwd|pass)\s+is\s+([A-Za-z0-9@#$%^&*!]{6,})/gi
    ]
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
        
        // Apply contextual validation for different PII types
        if (entityType === 'PERSON') {
          const lowerText = matchedText.toLowerCase();
          const comprehensiveFalsePositives = [
            // Common phrases
            'thank you', 'good morning', 'good afternoon', 'good evening', 'good night',
            'how are', 'nice to', 'see you', 'talk to', 'speak to', 'email me',
            'phone number', 'mobile number', 'contact number', 'telephone number',
            'user name', 'full name', 'first name', 'last name', 'display name',
            'company name', 'business name', 'file name', 'folder name',
            // Geographic locations
            'united states', 'new york', 'hong kong', 'kuala lumpur', 'penang',
            'johor bahru', 'singapore city', 'orchard road', 'marina bay',
            // Time and date related
            'today', 'tomorrow', 'yesterday', 'monday', 'tuesday', 'wednesday', 
            'thursday', 'friday', 'saturday', 'sunday', 'january', 'february',
            'march', 'april', 'june', 'july', 'august', 'september', 'october',
            'november', 'december', 'morning', 'afternoon', 'evening', 'night',
            // Common words and fillers
            'the', 'and', 'but', 'for', 'with', 'you', 'are', 'can', 'will', 'have',
            'this', 'that', 'what', 'when', 'where', 'why', 'how', 'who', 'which',
            'would', 'could', 'should', 'might', 'must', 'shall', 'may', 'need',
            'make', 'take', 'give', 'tell', 'ask', 'work', 'play', 'help', 'want',
            'about', 'from', 'they', 'them', 'were', 'been', 'said', 'each', 'she',
            'their', 'time', 'very', 'after', 'first', 'well', 'year', 'name',
            // Technology and business terms
            'email', 'password', 'account', 'login', 'logout', 'signin', 'signup',
            'website', 'internet', 'google', 'facebook', 'twitter', 'instagram',
            'whatsapp', 'telegram', 'linkedin', 'youtube', 'microsoft', 'apple',
            // Singapore context that aren't names
            'singapore', 'nric', 'passport', 'address', 'postal code', 'zip code',
            'street', 'road', 'avenue', 'lane', 'block', 'unit', 'floor'
          ];
          
          // Check if any false positive is contained in the matched text
          if (comprehensiveFalsePositives.some(fp => lowerText.includes(fp))) {
            continue;
          }
          
          // Require multi-part names (no single names)
          if (!matchedText.includes(' ')) {
            continue;
          }
          
          // More flexible validation for Singapore names
          const nameParts = matchedText.split(' ');
          if (nameParts.length < 2 || nameParts.length > 4) {
            continue; // Must be 2-4 parts
          }
          
          // Singapore surnames for enhanced validation
          const singaporeSurnames = ['tan', 'lim', 'lee', 'ng', 'ong', 'wong', 'goh', 'teo', 'lau', 'sia', 'chan', 'chen', 'chong', 'chua', 'gan', 'ho', 'koh', 'low', 'neo', 'seah', 'soh', 'tay', 'toh', 'wee', 'yap', 'yeo', 'yeoh', 'yong', 'yu', 'chin', 'chew', 'foo', 'heng', 'hong', 'hoo', 'koo', 'lam', 'leong', 'loo', 'mok', 'sim', 'sng', 'soo', 'thong', 'tong', 'wang', 'woo', 'yak', 'yam', 'yang', 'ahmad', 'hassan', 'ibrahim', 'ismail', 'mohamed', 'mohammad', 'rahman', 'ali', 'omar', 'osman', 'salleh', 'abdullah', 'adam', 'hamid', 'hussain', 'rashid', 'singh', 'kumar', 'raj', 'rajan', 'krishnan', 'murugan', 'nathan', 'ravi', 'samy', 'devi', 'lakshmanan', 'suresh', 'prakash', 'menon', 'nair', 'pillai'];
          
          // Check if it's likely a person name vs. common phrase
          const likely_name_indicators = [
            // Has common Singapore surnames
            singaporeSurnames.some(surname => lowerText.includes(surname)),
            // Not all parts are common English words
            !nameParts.every(part => ['the', 'and', 'of', 'to', 'a', 'in', 'for', 'is', 'on', 'that', 'by', 'this', 'with', 'you', 'it', 'not', 'or', 'be', 'are'].includes(part.toLowerCase()))
          ];
          
          // Each part validation (more flexible)
          let isValidName = true;
          for (const part of nameParts) {
            if (part.length < 1 || part.length > 15) {
              isValidName = false;
              break;
            }
            // Each part should be alphabetic only
            if (!part.match(/^[A-Za-z]+$/)) {
              isValidName = false;
              break;
            }
          }
          
          // If it doesn't have any indicators, be more strict about false positives
          if (!likely_name_indicators.some(indicator => indicator)) {
            const extended_false_positives = [
              'phone number', 'mobile number', 'email address', 'today tomorrow',
              'good morning', 'thank you', 'how are', 'see you', 'talk to'
            ];
            if (extended_false_positives.some(fp => lowerText.includes(fp))) {
              isValidName = false;
            }
          }
          
          if (!isValidName) {
            continue;
          }
        }
        
        // Contextual validation for other PII types
        else if (['DRIVER_LICENSE', 'BANK_ACCOUNT', 'WORK_PASS', 'TAX_NUMBER', 'POSTAL_CODE', 'DATE_OF_BIRTH'].includes(entityType)) {
          // Check surrounding context for these types
          const contextBefore = text.slice(Math.max(0, startPos - 30), startPos).toLowerCase();
          const contextAfter = text.slice(endPos, endPos + 30).toLowerCase();
          const fullContext = contextBefore + ' ' + contextAfter;
          
          const contextKeywords = {
            'DRIVER_LICENSE': ['license', 'licence', 'dl', 'driver', 'driving', 'singapore'],
            'BANK_ACCOUNT': ['account', 'bank', 'routing', 'iban', 'swift', 'dbs', 'ocbc', 'uob'],
            'WORK_PASS': ['work', 'permit', 'pass', 'employment', 'ep', 'wp', 'dp', 'singapore', 'foreign'],
            'TAX_NUMBER': ['tax', 'ein', 'itin', 'tin', 'singapore'],
            'POSTAL_CODE': ['postal', 'code', 'postcode', 'singapore', 'address'],
            'DATE_OF_BIRTH': ['birth', 'born', 'dob', 'birthday', 'age']
          };
          
          const keywords = contextKeywords[entityType];
          if (keywords && !keywords.some(keyword => fullContext.includes(keyword))) {
            continue; // Skip if no contextual keywords found
          }
        }
        
        // Special handling for passwords - extract only the password part
        else if (entityType === 'PASSWORD' && match[1]) {
          const passwordText = match[1];
          const passwordStart = match.index + match[0].indexOf(passwordText);
          const passwordEnd = passwordStart + passwordText.length;
          
          entities.push({
            start: passwordStart,
            end: passwordEnd,
            entity_group: entityType,
            confidence: 0.9
          });
          continue; // Skip the normal processing
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
