async function detectPII(text) {
  try {
    const response = await fetch("http://127.0.0.1:8000/detect_pii", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();
    console.log("Backend detection result:", data);
    
    let entities = data.entities || [];
    
    // If no PERSON entities found by backend, use local regex fallback for names
    const hasPersonEntity = entities.some(e => e.entity_group === 'PERSON');
    if (!hasPersonEntity && window.detectPIIWithRegex) {
      const localEntities = window.detectPIIWithRegex(text);
      const personEntities = localEntities.filter(e => e.entity_group === 'PERSON');
      entities = [...entities, ...personEntities];
      console.log("Added person entities from local detection:", personEntities);
    }
    
    // Return both anonymized text and entities for highlighting
    return {
      anonymized_text: data.anonymized_text,
      entities: entities,
      original_text: text
    };
  } catch (error) {
    console.error("Error calling PII API:", error);
    // Fallback to local regex detection if backend fails
    if (window.detectPIIWithRegex) {
      const localEntities = window.detectPIIWithRegex(text);
      return {
        anonymized_text: text,
        entities: localEntities,
        original_text: text
      };
    }
    return {
      anonymized_text: text,
      entities: [],
      original_text: text
    };
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

// Expose functions globally for Chrome extension compatibility
window.detectPII = detectPII;
window.debounce = debounce;
