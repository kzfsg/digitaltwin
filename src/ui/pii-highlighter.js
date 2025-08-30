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
    console.log('🎯 Field details:', {
      tagName: field.tagName,
      value: field.value?.substring(0, 50),
      textContent: field.textContent?.substring(0, 50),
      rect: field.getBoundingClientRect()
    });
    
    // Remove existing indicators
    this.clearIndicators(field);

    // Create highlight overlays for each PII entity
    try {
      this.createTextHighlights(field, piiEntities);
    } catch (error) {
      console.warn('🎯 Precise highlighting failed, using simple approach:', error);
      this.createSimpleHighlights(field, piiEntities);
    }
    
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

  // Create precise text highlights using positioned overlays that support multi-line text
  createTextHighlights(field, entities) {
    console.log('🎯 Creating multi-line text highlights for:', entities.length, 'entities');
    
    const fieldRect = field.getBoundingClientRect();
    const fieldStyle = window.getComputedStyle(field);
    const text = field.value || field.textContent || '';
    
    console.log('🎯 Text to highlight:', text.substring(0, 100));
    console.log('🎯 Field rect:', fieldRect);
    
    entities.forEach((entity, index) => {
      const entityText = text.substring(entity.start, entity.end);
      
      try {
        // Use a more robust approach that handles multi-line text
        const highlights = this.createMultiLineHighlight(field, entity, entityText, text);
        
        // Store all highlight elements for cleanup
        if (!this.textHighlights) this.textHighlights = new WeakMap();
        if (!this.textHighlights.get(field)) this.textHighlights.set(field, []);
        
        highlights.forEach(highlight => {
          document.body.appendChild(highlight);
          this.textHighlights.get(field).push(highlight);
          
          // Auto-remove after 5 seconds
          setTimeout(() => {
            if (highlight.parentNode) highlight.remove();
          }, 5000);
        });
        
      } catch (error) {
        console.warn('🎯 Multi-line highlighting failed for entity:', entityText, error);
        // Fall back to simple badge approach
        this.createSimpleBadge(field, entity, entityText, index);
      }
    });
    
    // Add field border if we have highlights
    if (entities.length > 0) {
      field.style.boxShadow = '0 0 0 1px rgba(255, 107, 107, 0.3)';
    }
  }

  // Create multi-line capable highlights using Range API
  createMultiLineHighlight(field, entity, entityText, fullText) {
    const highlights = [];
    
    // For textarea and input fields, use a simpler approach
    if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
      return this.createTextareaHighlight(field, entity, entityText);
    }
    
    // For contenteditable divs, use Range API for precise positioning
    if (field.contentEditable === 'true') {
      return this.createContentEditableHighlight(field, entity, entityText, fullText);
    }
    
    // Fallback to simple positioning
    return this.createFallbackHighlight(field, entity, entityText);
  }

  // Highlight for textarea/input fields
  createTextareaHighlight(field, entity, entityText) {
    const fieldRect = field.getBoundingClientRect();
    const fieldStyle = window.getComputedStyle(field);
    
    // Calculate approximate text position (single line assumption for fallback)
    const averageCharWidth = 8; // Approximate character width
    const lineHeight = parseFloat(fieldStyle.lineHeight) || 20;
    
    const charsBeforeEntity = entity.start;
    const linesBeforeEntity = Math.floor(charsBeforeEntity / 50); // Rough estimate
    const charPositionInLine = charsBeforeEntity % 50;
    
    const paddingLeft = parseFloat(fieldStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(fieldStyle.paddingTop) || 0;
    const borderLeft = parseFloat(fieldStyle.borderLeftWidth) || 0;
    const borderTop = parseFloat(fieldStyle.borderTopWidth) || 0;
    
    const highlight = document.createElement('div');
    highlight.className = `digitaltwin-text-highlight ${entity.entity_group.toLowerCase()}`;
    highlight.title = `${entity.entity_group}: ${entityText}`;
    
    highlight.style.position = 'fixed';
    highlight.style.left = (fieldRect.left + paddingLeft + borderLeft + (charPositionInLine * averageCharWidth)) + 'px';
    highlight.style.top = (fieldRect.top + paddingTop + borderTop + (linesBeforeEntity * lineHeight)) + 'px';
    highlight.style.width = Math.max(entityText.length * averageCharWidth, 20) + 'px';
    highlight.style.height = lineHeight + 'px';
    highlight.style.zIndex = '10000';
    highlight.style.pointerEvents = 'none';
    highlight.style.borderRadius = '3px';
    highlight.style.background = this.getPIIBackgroundColor(entity.entity_group);
    highlight.style.border = `2px solid ${this.getPIIBorderColor(entity.entity_group)}`;
    
    console.log('🎯 Created textarea highlight:', {
      entityText,
      position: { left: highlight.style.left, top: highlight.style.top },
      size: { width: highlight.style.width, height: highlight.style.height }
    });
    
    return [highlight];
  }

  // Highlight for contenteditable divs using Range API
  createContentEditableHighlight(field, entity, entityText, fullText) {
    const highlights = [];
    
    try {
      // Find text nodes and create ranges
      const textNodes = this.getTextNodes(field);
      let currentOffset = 0;
      
      for (const textNode of textNodes) {
        const nodeLength = textNode.textContent.length;
        const nodeEnd = currentOffset + nodeLength;
        
        // Check if entity overlaps with this text node
        if (entity.start < nodeEnd && entity.end > currentOffset) {
          const startInNode = Math.max(0, entity.start - currentOffset);
          const endInNode = Math.min(nodeLength, entity.end - currentOffset);
          
          if (startInNode < endInNode) {
            const range = document.createRange();
            range.setStart(textNode, startInNode);
            range.setEnd(textNode, endInNode);
            
            const rects = range.getClientRects();
            
            // Create highlight for each rectangle (handles line breaks)
            for (let i = 0; i < rects.length; i++) {
              const rect = rects[i];
              if (rect.width > 0 && rect.height > 0) {
                const highlight = document.createElement('div');
                highlight.className = `digitaltwin-text-highlight ${entity.entity_group.toLowerCase()}`;
                highlight.title = `${entity.entity_group}: ${entityText}`;
                
                highlight.style.position = 'fixed';
                highlight.style.left = rect.left + 'px';
                highlight.style.top = rect.top + 'px';
                highlight.style.width = rect.width + 'px';
                highlight.style.height = rect.height + 'px';
                highlight.style.zIndex = '10000';
                highlight.style.pointerEvents = 'none';
                highlight.style.borderRadius = '3px';
                highlight.style.background = this.getPIIBackgroundColor(entity.entity_group);
                highlight.style.border = `1px solid ${this.getPIIBorderColor(entity.entity_group)}`;
                
                highlights.push(highlight);
              }
            }
          }
        }
        
        currentOffset = nodeEnd;
        if (currentOffset >= entity.end) break;
      }
      
      console.log('🎯 Created contenteditable highlights:', highlights.length, 'rectangles for', entityText);
      
    } catch (error) {
      console.warn('🎯 Range-based highlighting failed:', error);
      return this.createFallbackHighlight(field, entity, entityText);
    }
    
    return highlights;
  }

  // Fallback simple highlight
  createFallbackHighlight(field, entity, entityText) {
    const fieldRect = field.getBoundingClientRect();
    
    const highlight = document.createElement('div');
    highlight.className = `digitaltwin-text-highlight ${entity.entity_group.toLowerCase()}`;
    highlight.title = `${entity.entity_group}: ${entityText}`;
    
    highlight.style.position = 'fixed';
    highlight.style.left = fieldRect.left + 'px';
    highlight.style.top = (fieldRect.top - 25) + 'px';
    highlight.style.padding = '4px 8px';
    highlight.style.zIndex = '10000';
    highlight.style.pointerEvents = 'none';
    highlight.style.borderRadius = '12px';
    highlight.style.background = this.getPIIBackgroundColor(entity.entity_group);
    highlight.style.color = 'white';
    highlight.style.fontSize = '11px';
    highlight.style.fontWeight = 'bold';
    highlight.style.whiteSpace = 'nowrap';
    highlight.textContent = `${this.getEmojiForType(entity.entity_group)} ${entityText}`;
    
    return [highlight];
  }

  // Create a simple badge for failed highlighting
  createSimpleBadge(field, entity, entityText, index) {
    const fieldRect = field.getBoundingClientRect();
    
    const badge = document.createElement('div');
    badge.className = `digitaltwin-simple-badge ${entity.entity_group.toLowerCase()}`;
    badge.innerHTML = `${this.getEmojiForType(entity.entity_group)} ${entityText}`;
    badge.title = `${entity.entity_group}: ${entityText}`;
    
    badge.style.position = 'fixed';
    badge.style.left = (fieldRect.right + 10) + 'px';
    badge.style.top = (fieldRect.top + (index * 25)) + 'px';
    badge.style.zIndex = '10000';
    badge.style.background = this.getPIIBackgroundColor(entity.entity_group);
    badge.style.color = 'white';
    badge.style.padding = '4px 8px';
    badge.style.borderRadius = '12px';
    badge.style.fontSize = '11px';
    badge.style.fontWeight = 'bold';
    badge.style.whiteSpace = 'nowrap';
    badge.style.pointerEvents = 'none';
    badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    
    document.body.appendChild(badge);
    
    if (!this.textHighlights) this.textHighlights = new WeakMap();
    if (!this.textHighlights.get(field)) this.textHighlights.set(field, []);
    this.textHighlights.get(field).push(badge);
    
    setTimeout(() => {
      if (badge.parentNode) badge.remove();
    }, 5000);
  }

  // Helper function to get all text nodes in an element
  getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    return textNodes;
  }

  // Get background color for PII type
  getPIIBackgroundColor(entityGroup) {
    const colorMap = {
      'EMAIL': 'rgba(74, 144, 226, 0.3)',
      'PHONE': 'rgba(46, 204, 113, 0.3)',
      'PERSON': 'rgba(155, 89, 182, 0.3)',
      'NRIC': 'rgba(231, 76, 60, 0.3)',
      'SSN': 'rgba(231, 76, 60, 0.3)', // Fallback
      'CREDIT_CARD': 'rgba(241, 196, 15, 0.3)',
      'ADDRESS': 'rgba(230, 126, 34, 0.3)',
      'POSTAL_CODE': 'rgba(52, 152, 219, 0.3)',
      'DATE_OF_BIRTH': 'rgba(231, 76, 60, 0.3)',
      'DRIVER_LICENSE': 'rgba(142, 68, 173, 0.3)',
      'BANK_ACCOUNT': 'rgba(39, 174, 96, 0.3)',
      'WORK_PASS': 'rgba(0, 123, 255, 0.3)',
      'ID_CARD': 'rgba(230, 126, 34, 0.3)',
      'TAX_NUMBER': 'rgba(192, 57, 43, 0.3)',
      'PASSWORD': 'rgba(231, 76, 60, 0.4)'
    };
    return colorMap[entityGroup] || 'rgba(255, 107, 107, 0.3)';
  }

  // Get border color for PII type
  getPIIBorderColor(entityGroup) {
    const colorMap = {
      'EMAIL': '#4a90e2',
      'PHONE': '#2ecc71',
      'PERSON': '#9b59b6',
      'NRIC': '#e74c3c',
      'SSN': '#e74c3c', // Fallback
      'CREDIT_CARD': '#f1c40f',
      'ADDRESS': '#e67e22',
      'POSTAL_CODE': '#3498db',
      'DATE_OF_BIRTH': '#e74c3c',
      'DRIVER_LICENSE': '#8e44ad',
      'BANK_ACCOUNT': '#27ae60',
      'WORK_PASS': '#007bff',
      'ID_CARD': '#e67e22',
      'TAX_NUMBER': '#c0392b',
      'PASSWORD': '#e74c3c'
    };
    return colorMap[entityGroup] || '#ff6b6b';
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
      'NRIC': '🆔',
      'SSN': '🆔', // Fallback for old SSN references
      'ADDRESS': '📍',
      'CREDIT_CARD': '💳',
      'POSTAL_CODE': '📮',
      'DATE_OF_BIRTH': '🎂',
      'DRIVER_LICENSE': '🚗',
      'BANK_ACCOUNT': '🏦',
      'WORK_PASS': '🛂',
      'ID_CARD': '🪪',
      'TAX_NUMBER': '💰',
      'PASSWORD': '🔐'
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