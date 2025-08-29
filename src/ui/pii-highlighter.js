class PIIHighlighter {
  constructor() {
    this.highlightedFields = new WeakMap();
    this.overlays = new WeakMap();
    this.init();
  }

  init() {
    // Inject CSS styles
    this.injectStyles();
    
    // Create page indicator
    this.createPageIndicator();
  }

  injectStyles() {
    if (document.getElementById('digitaltwin-highlighter-styles')) return;

    // CSS is already injected via manifest.json, but let's add a fallback
    const style = document.createElement('style');
    style.id = 'digitaltwin-highlighter-styles';
    style.textContent = `
      .digitaltwin-highlight {
        background: linear-gradient(135deg, rgba(255, 107, 107, 0.3) 0%, rgba(255, 159, 67, 0.3) 100%) !important;
        border-bottom: 2px solid #ff6b6b !important;
        border-radius: 3px !important;
        padding: 1px 2px !important;
        animation: piiPulse 2s infinite !important;
      }
      @keyframes piiPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }
    `;
    document.head.appendChild(style);
  }

  createPageIndicator() {
    // Don't create indicator on page load - only when PII is detected
    return;
  }

  // Highlight PII in regular textarea/input fields with non-intrusive indicators
  highlightInTextField(field, piiEntities) {
    if (!field || !piiEntities || piiEntities.length === 0) {
      this.clearHighlights(field);
      return;
    }

    // Add visual indicators without modifying the field's content
    this.addPIIIndicators(field, piiEntities);
    this.updatePageIndicator('warning');
  }

  // Highlight PII in contenteditable divs using non-intrusive indicators
  highlightInContentEditable(field, piiEntities) {
    if (!field || !piiEntities || piiEntities.length === 0) {
      this.clearContentEditableHighlights(field);
      return;
    }

    // Use the same non-intrusive approach for contenteditable
    this.addPIIIndicators(field, piiEntities);
    this.updatePageIndicator('warning');
  }

  // Add PII indicators with precise text highlighting
  addPIIIndicators(field, piiEntities) {
    console.log('🎯 Adding PII indicators:', piiEntities);
    
    // Remove existing indicators
    this.clearIndicators(field);

    // Create highlight overlays for each PII entity
    this.createTextHighlights(field, piiEntities);
    
    // Add floating indicator showing summary
    const indicator = document.createElement('div');
    indicator.className = 'digitaltwin-field-indicator';
    indicator.innerHTML = `
      <div class="digitaltwin-pii-count">${piiEntities.length}</div>
      <div class="digitaltwin-pii-types">${this.getPIITypesList(piiEntities)}</div>
    `;
    
    // Position the indicator relative to the field
    const rect = field.getBoundingClientRect();
    indicator.style.position = 'fixed';
    indicator.style.top = (rect.top - 35) + 'px';
    indicator.style.right = '20px';
    indicator.style.zIndex = '9999';
    
    document.body.appendChild(indicator);
    
    // Store reference for cleanup
    if (!this.fieldIndicators) this.fieldIndicators = new WeakMap();
    this.fieldIndicators.set(field, indicator);
    
    // Send detailed detection info to popup
    this.sendDetectionToPopup(field, piiEntities);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.remove();
      }
    }, 5000);
  }

  // Create precise text highlights using positioned overlays that highlight only the specific PII text
  createTextHighlights(field, entities) {
    const fieldRect = field.getBoundingClientRect();
    const fieldStyle = window.getComputedStyle(field);
    const text = field.value || field.textContent || '';
    
    // Create a measuring element to calculate text positions
    const measuringDiv = document.createElement('div');
    measuringDiv.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: pre;
      font-family: ${fieldStyle.fontFamily};
      font-size: ${fieldStyle.fontSize};
      font-weight: ${fieldStyle.fontWeight};
      line-height: ${fieldStyle.lineHeight};
      letter-spacing: ${fieldStyle.letterSpacing};
      word-spacing: ${fieldStyle.wordSpacing};
    `;
    document.body.appendChild(measuringDiv);
    
    entities.forEach((entity, index) => {
      const entityText = text.substring(entity.start, entity.end);
      const beforeText = text.substring(0, entity.start);
      
      // Measure text positions
      measuringDiv.textContent = beforeText;
      const beforeWidth = measuringDiv.offsetWidth;
      
      measuringDiv.textContent = entityText;
      const entityWidth = measuringDiv.offsetWidth;
      const entityHeight = measuringDiv.offsetHeight;
      
      // Create highlight overlay for the specific PII text
      const highlight = document.createElement('div');
      highlight.className = `digitaltwin-text-highlight ${entity.entity_group.toLowerCase()}`;
      highlight.title = `${entity.entity_group}: ${entityText}`;
      
      const paddingLeft = parseFloat(fieldStyle.paddingLeft) || 0;
      const paddingTop = parseFloat(fieldStyle.paddingTop) || 0;
      const borderLeft = parseFloat(fieldStyle.borderLeftWidth) || 0;
      const borderTop = parseFloat(fieldStyle.borderTopWidth) || 0;
      
      highlight.style.position = 'fixed';
      highlight.style.left = (fieldRect.left + paddingLeft + borderLeft + beforeWidth) + 'px';
      highlight.style.top = (fieldRect.top + paddingTop + borderTop) + 'px';
      highlight.style.width = entityWidth + 'px';
      highlight.style.height = entityHeight + 'px';
      highlight.style.zIndex = '1000';
      highlight.style.pointerEvents = 'none';
      highlight.style.borderRadius = '3px';
      
      document.body.appendChild(highlight);
      
      // Store for cleanup
      if (!this.textHighlights) this.textHighlights = new WeakMap();
      if (!this.textHighlights.get(field)) this.textHighlights.set(field, []);
      this.textHighlights.get(field).push(highlight);
      
      // Also create a small badge indicator
      const badge = document.createElement('div');
      badge.className = `digitaltwin-pii-mini-badge ${entity.entity_group.toLowerCase()}`;
      badge.textContent = this.getEmojiForType(entity.entity_group);
      badge.title = `${entity.entity_group}: ${entityText}`;
      
      badge.style.position = 'fixed';
      badge.style.left = (fieldRect.left + paddingLeft + borderLeft + beforeWidth + entityWidth + 5) + 'px';
      badge.style.top = (fieldRect.top + paddingTop + borderTop - 5) + 'px';
      badge.style.zIndex = '1001';
      badge.style.pointerEvents = 'none';
      
      document.body.appendChild(badge);
      this.textHighlights.get(field).push(badge);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (highlight.parentNode) highlight.remove();
        if (badge.parentNode) badge.remove();
      }, 5000);
    });
    
    // Clean up measuring element
    document.body.removeChild(measuringDiv);
    
    // Only add field border if we actually created highlights
    if (entities.length > 0) {
      field.style.boxShadow = '0 0 0 1px rgba(255, 107, 107, 0.3)';
    }
  }

  // Send detection info to extension popup
  sendDetectionToPopup(field, entities) {
    const detectionData = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      field: this.getFieldDescription(field),
      entities: entities.map(e => ({
        type: e.entity_group,
        text: (field.value || field.textContent || '').substring(e.start, e.end),
        confidence: e.confidence,
        start: e.start,
        end: e.end
      })),
      totalCount: entities.length
    };
    
    // Send to background script which will store for popup
    try {
      chrome.runtime.sendMessage({
        type: "piiDetected",
        data: detectionData
      });
    } catch (error) {
      console.warn('Could not send detection to popup:', error);
    }
  }

  getFieldDescription(field) {
    return {
      tagName: field.tagName.toLowerCase(),
      id: field.id || '',
      placeholder: field.placeholder || field.getAttribute('aria-label') || '',
      url: window.location.hostname
    };
  }

  getPIITypesList(entities) {
    const types = [...new Set(entities.map(e => e.entity_group))];
    return types.map(type => {
      const emoji = this.getEmojiForType(type);
      return `${emoji} ${type}`;
    }).join(' ');
  }

  getEmojiForType(type) {
    const emojiMap = {
      'EMAIL': '📧',
      'PHONE': '📞', 
      'PERSON': '👤',
      'SSN': '🆔',
      'ADDRESS': '📍',
      'CREDIT_CARD': '💳'
    };
    return emojiMap[type] || '🔒';
  }

  clearIndicators(field) {
    // Remove text highlights
    if (this.textHighlights && this.textHighlights.has(field)) {
      const highlights = this.textHighlights.get(field);
      highlights.forEach(highlight => {
        if (highlight.parentNode) {
          highlight.remove();
        }
      });
      this.textHighlights.delete(field);
    }
    
    // Remove floating indicator
    if (this.fieldIndicators && this.fieldIndicators.has(field)) {
      const indicator = this.fieldIndicators.get(field);
      if (indicator && indicator.parentNode) {
        indicator.remove();
      }
      this.fieldIndicators.delete(field);
    }
    
    // Clear field styling
    field.style.boxShadow = '';
    field.style.borderColor = '';
  }

  createOverlay(field) {
    // Wrap the field in a container
    if (!field.parentNode.classList.contains('digitaltwin-input-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'digitaltwin-input-wrapper';
      field.parentNode.insertBefore(wrapper, field);
      wrapper.appendChild(field);
    }

    const overlay = document.createElement('div');
    overlay.className = 'digitaltwin-highlight-overlay';
    
    // Copy styles from original field
    const computedStyle = window.getComputedStyle(field);
    const stylesToCopy = [
      'font-family', 'font-size', 'font-weight', 'line-height',
      'padding', 'border', 'width', 'height', 'box-sizing',
      'word-wrap', 'white-space', 'overflow-wrap'
    ];
    
    stylesToCopy.forEach(prop => {
      overlay.style[prop] = computedStyle[prop];
    });

    // Position overlay behind the input
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.zIndex = '5';
    overlay.style.pointerEvents = 'none';
    overlay.style.color = 'transparent';
    overlay.style.background = 'transparent';

    field.parentNode.appendChild(overlay);
    return overlay;
  }

  generateHighlightedHTML(text, entities) {
    if (!entities || entities.length === 0) return text;

    let html = '';
    let lastIndex = 0;

    // Sort entities by start position
    const sortedEntities = [...entities].sort((a, b) => a.start - b.start);

    sortedEntities.forEach(entity => {
      // Add text before the entity
      html += this.escapeHtml(text.slice(lastIndex, entity.start));
      
      // Add highlighted entity
      const entityText = text.slice(entity.start, entity.end);
      const piiType = this.normalizeEntityType(entity.entity_group || entity.type);
      html += `<span class="digitaltwin-highlight" data-pii-type="${piiType}" data-pii-info="🔒 ${piiType.toUpperCase()} detected">${this.escapeHtml(entityText)}</span>`;
      
      lastIndex = entity.end;
    });

    // Add remaining text
    html += this.escapeHtml(text.slice(lastIndex));
    return html;
  }

  generateContentEditableHTML(text, entities) {
    if (!entities || entities.length === 0) return this.escapeHtml(text);

    let html = '';
    let lastIndex = 0;

    const sortedEntities = [...entities].sort((a, b) => a.start - b.start);

    sortedEntities.forEach(entity => {
      html += this.escapeHtml(text.slice(lastIndex, entity.start));
      
      const entityText = text.slice(entity.start, entity.end);
      const piiType = this.normalizeEntityType(entity.entity_group || entity.type);
      html += `<span class="digitaltwin-contenteditable-highlight" data-pii-type="${piiType}">${this.escapeHtml(entityText)}</span>`;
      
      lastIndex = entity.end;
    });

    html += this.escapeHtml(text.slice(lastIndex));
    return html;
  }

  normalizeEntityType(type) {
    if (!type) return 'unknown';
    
    const typeMap = {
      'PERSON': 'name',
      'PER': 'name',
      'EMAIL': 'email',
      'PHONE': 'phone',
      'PHONE_NUMBER': 'phone',
      'ADDRESS': 'address',
      'LOC': 'address',
      'LOCATION': 'address',
      'SSN': 'ssn',
      'CREDIT_CARD': 'credit_card',
      'DATE_TIME': 'date',
      'ORG': 'organization'
    };

    return typeMap[type.toUpperCase()] || type.toLowerCase();
  }

  clearHighlights(field) {
    this.clearIndicators(field);
  }

  clearContentEditableHighlights(field) {
    this.clearIndicators(field);
  }

  restoreCursorPosition(element, position) {
    try {
      const range = document.createRange();
      const sel = window.getSelection();
      
      let charIndex = 0;
      let nodeStack = [element];
      let foundNode = null;
      let foundOffset = 0;

      while (nodeStack.length > 0) {
        const node = nodeStack.pop();
        
        if (node.nodeType === Node.TEXT_NODE) {
          const nextCharIndex = charIndex + node.textContent.length;
          if (position <= nextCharIndex) {
            foundNode = node;
            foundOffset = position - charIndex;
            break;
          }
          charIndex = nextCharIndex;
        } else {
          for (let i = node.childNodes.length - 1; i >= 0; i--) {
            nodeStack.push(node.childNodes[i]);
          }
        }
      }

      if (foundNode) {
        range.setStart(foundNode, foundOffset);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (e) {
      console.warn('Could not restore cursor position:', e);
    }
  }

  updatePageIndicator(status) {
    // Only create and show indicator when PII is actually detected
    if (status === 'warning') {
      let indicator = document.getElementById('digitaltwin-page-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'digitaltwin-page-indicator';
        document.body.appendChild(indicator);
      }
      
      indicator.className = 'digitaltwin-page-indicator';
      indicator.textContent = '⚠️ PII Detected';
      indicator.style.display = 'block';
      
      // Auto-hide after 4 seconds
      setTimeout(() => {
        if (indicator && indicator.parentNode) {
          indicator.style.opacity = '0';
          setTimeout(() => {
            if (indicator.parentNode) {
              indicator.parentNode.removeChild(indicator);
            }
          }, 300);
        }
      }, 4000);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Global instance
window.piiHighlighter = new PIIHighlighter();

// Legacy functions for backward compatibility (now redirect to new system)
window.highlightPII = function(field, entities) {
  if (window.piiHighlighter) {
    window.piiHighlighter.addPIIIndicators(field, entities);
  }
};

window.clearPIIHighlights = function(field) {
  if (window.piiHighlighter) {
    window.piiHighlighter.clearIndicators(field);
  }
};