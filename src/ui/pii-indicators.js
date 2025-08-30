class PIIIndicators {
  constructor() {
    this.indicatorContainer = null;
    this.indicators = new Map();
    this.init();
  }

  init() {
    this.createIndicatorContainer();
    this.setupEventListeners();
  }

  createIndicatorContainer() {
    this.indicatorContainer = document.createElement('div');
    this.indicatorContainer.id = 'pii-indicators-container';
    this.indicatorContainer.className = 'pii-indicators-container';
    
    const indicatorsHTML = `
      <div class="pii-header">
        <div class="pii-status-icon"></div>
        <span class="pii-title">PII Protection Status</span>
      </div>
      <div class="pii-stats">
        <div class="pii-stat">
          <span class="stat-number" id="detected-count">0</span>
          <span class="stat-label">Detected</span>
        </div>
        <div class="pii-stat">
          <span class="stat-number" id="protected-count">0</span>
          <span class="stat-label">Protected</span>
        </div>
        <div class="pii-stat">
          <span class="stat-number" id="active-personas">0</span>
          <span class="stat-label">Active Personas</span>
        </div>
      </div>
      <div class="pii-types">
        <div class="pii-type-header">Detected PII Types:</div>
        <div class="pii-type-list" id="pii-type-list"></div>
      </div>
      <div class="pii-activity">
        <div class="activity-header">Recent Activity</div>
        <div class="activity-feed" id="activity-feed">
          <div class="activity-placeholder">No PII detected yet</div>
        </div>
      </div>
    `;
    
    this.indicatorContainer.innerHTML = indicatorsHTML;
    return this.indicatorContainer;
  }

  updateDetectedCount(count) {
    const detectedElement = document.getElementById('detected-count');
    if (detectedElement) {
      detectedElement.textContent = count;
      this.animateCounter(detectedElement);
    }
  }

  updateProtectedCount(count) {
    const protectedElement = document.getElementById('protected-count');
    if (protectedElement) {
      protectedElement.textContent = count;
      this.animateCounter(protectedElement);
    }
  }

  updateActivePersonas(count) {
    const personasElement = document.getElementById('active-personas');
    if (personasElement) {
      personasElement.textContent = count;
      this.animateCounter(personasElement);
    }
  }

  addPIIType(type, count = 1) {
    const typeList = document.getElementById('pii-type-list');
    if (!typeList) return;

    let typeElement = document.getElementById(`pii-type-${type}`);
    
    if (typeElement) {
      const countSpan = typeElement.querySelector('.type-count');
      const newCount = parseInt(countSpan.textContent) + count;
      countSpan.textContent = newCount;
    } else {
      typeElement = document.createElement('div');
      typeElement.id = `pii-type-${type}`;
      typeElement.className = 'pii-type-item';
      typeElement.innerHTML = `
        <span class="type-icon ${this.getTypeIcon(type)}"></span>
        <span class="type-name">${this.formatTypeName(type)}</span>
        <span class="type-count">${count}</span>
      `;
      typeList.appendChild(typeElement);
    }

    typeElement.classList.add('pulse-highlight');
    setTimeout(() => typeElement.classList.remove('pulse-highlight'), 1000);
  }

  addActivity(type, action, timestamp = new Date()) {
    const activityFeed = document.getElementById('activity-feed');
    if (!activityFeed) return;

    const placeholder = activityFeed.querySelector('.activity-placeholder');
    if (placeholder) {
      placeholder.remove();
    }

    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.innerHTML = `
      <div class="activity-time">${this.formatTime(timestamp)}</div>
      <div class="activity-content">
        <span class="activity-icon ${this.getActionIcon(action)}"></span>
        <span class="activity-text">${this.formatActivity(type, action)}</span>
      </div>
    `;

    activityFeed.insertBefore(activityItem, activityFeed.firstChild);

    if (activityFeed.children.length > 5) {
      activityFeed.removeChild(activityFeed.lastChild);
    }

    activityItem.classList.add('slide-in');
  }

  updateProtectionStatus(isActive) {
    const statusIcon = document.querySelector('.pii-status-icon');
    if (statusIcon) {
      statusIcon.className = `pii-status-icon ${isActive ? 'active' : 'inactive'}`;
    }
  }

  getTypeIcon(type) {
    const icons = {
      'email': 'icon-email',
      'phone': 'icon-phone',
      'ssn': 'icon-shield',
      'name': 'icon-user',
      'address': 'icon-location',
      'credit_card': 'icon-credit-card',
      'date_of_birth': 'icon-calendar'
    };
    return icons[type] || 'icon-info';
  }

  getActionIcon(action) {
    const icons = {
      'detected': 'icon-eye',
      'protected': 'icon-shield',
      'replaced': 'icon-swap'
    };
    return icons[action] || 'icon-info';
  }

  formatTypeName(type) {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatActivity(type, action) {
    const typeFormatted = this.formatTypeName(type);
    const actions = {
      'detected': `${typeFormatted} detected`,
      'protected': `${typeFormatted} protected with persona`,
      'replaced': `${typeFormatted} replaced`
    };
    return actions[action] || `${typeFormatted} ${action}`;
  }

  formatTime(timestamp) {
    return timestamp.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  animateCounter(element) {
    element.classList.add('counter-update');
    setTimeout(() => element.classList.remove('counter-update'), 500);
  }

  setupEventListeners() {
    chrome.runtime?.onMessage?.addListener((message, sender, sendResponse) => {
      if (message.type === 'PII_DETECTED') {
        this.addPIIType(message.piiType);
        this.addActivity(message.piiType, 'detected');
        this.updateDetectedCount(message.totalDetected);
      } else if (message.type === 'PII_PROTECTED') {
        this.addActivity(message.piiType, 'protected');
        this.updateProtectedCount(message.totalProtected);
        this.updateActivePersonas(message.activePersonas);
      }
    });
  }

  getContainer() {
    return this.indicatorContainer;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PIIIndicators;
}