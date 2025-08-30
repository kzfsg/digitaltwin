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
    const hasPersonEntity = entities.some((e) => e.entity_group === "PERSON");
    if (!hasPersonEntity && window.detectPIIWithRegex) {
      const localEntities = window.detectPIIWithRegex(text);
      const personEntities = localEntities.filter(
        (e) => e.entity_group === "PERSON"
      );
      entities = [...entities, ...personEntities];
      console.log(
        "Added person entities from local detection:",
        personEntities
      );
    }

    // Return both anonymized text and entities for highlighting
    return {
      anonymized_text: data.anonymized_text,
      entities: entities,
      original_text: text,
    };
  } catch (error) {
    console.error("Error calling PII API:", error);
    // Fallback to local regex detection if backend fails
    if (window.detectPIIWithRegex) {
      const localEntities = window.detectPIIWithRegex(text);
      return {
        anonymized_text: text,
        entities: localEntities,
        original_text: text,
      };
    }
    return {
      anonymized_text: text,
      entities: [],
      original_text: text,
    };
  }
}

async function detectPIIWithFake(text) {
  try {
    // Define constants (should match popup.js)
    const SETTINGS_KEY = "dt-settings";
    const ENTITY_LABELS = [
      "ACCOUNTNUM","BUILDINGNUM","CITY","CREDITCARDNUMBER","DATEOFBIRTH","DRIVERLICENSENUM",
      "EMAIL","GIVENNAME","IDCARDNUM","PASSWORD","SOCIALNUM","STREET","SURNAME","TAXNUM",
      "TELEPHONENUM","USERNAME","ZIPCODE"
    ];

    console.log("🔍 Getting settings from Chrome storage with key:", SETTINGS_KEY);
    
    // Get labels from Chrome storage
    const obj = await chrome.storage.sync.get(SETTINGS_KEY);
    console.log("🔍 Raw storage object:", obj);
    
    const saved = obj[SETTINGS_KEY]?.enabledLabels;
    console.log("🔍 Saved enabled labels:", saved);
    
    const enabledLabels = {};
    for (const l of ENTITY_LABELS) enabledLabels[l] = saved?.[l] !== false;
    
    console.log("🔍 Final enabled labels to send to backend:", enabledLabels);

    const response = await fetch("http://127.0.0.1:8000/replace_with_fake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, enabled_labels: enabledLabels }),
    });

    const data = await response.json();
    console.log("Fake PII result:", data);

    return {
      anonymized_text: data.anonymized_text,
      entities: data.entities,
      original_text: data.original_text,
    };
  } catch (error) {
    console.error("Error calling /replace_with_fake:", error);
    return { anonymized_text: text, entities: [], original_text: text };
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
