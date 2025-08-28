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
    console.log("Anonymized Text:", data.anonymized_text);

    return data.anonymized_text;
  } catch (error) {
    console.error("Error calling PII API:", error);
  }
}

// Debounce function
// To improve perfomance, doesn’t run on every single keystroke,
// which can be expensive, especially when the text is long
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
