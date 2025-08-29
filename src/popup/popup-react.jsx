import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './popup-react.css';

const DigitalTwinPopup = () => {
  const [detectionCount, setDetectionCount] = useState(0);
  const [isDetectionActive, setIsDetectionActive] = useState(true);
  const [detectionLog, setDetectionLog] = useState([]);

  useEffect(() => {
    loadDetectionLog();
    
    const messageListener = (message, sender, sendResponse) => {
      if (message.type === "textDetected") {
        addDetection(message.data);
        sendResponse({ status: "received" });
      }
    };
    
    chrome.runtime.onMessage.addListener(messageListener);
    
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const loadDetectionLog = () => {
    chrome.storage.local.get(['detectionLog', 'detectionCount', 'isDetectionActive'], (result) => {
      setDetectionLog(result.detectionLog || []);
      setDetectionCount(result.detectionCount || 0);
      setIsDetectionActive(result.isDetectionActive !== false);
    });
  };

  const addDetection = (data) => {
    if (!isDetectionActive) return;
    
    const newCount = detectionCount + 1;
    const detection = {
      timestamp: new Date().toISOString(),
      text: data.text,
      field: data.field,
      url: data.url
    };
    
    const newLog = [detection, ...detectionLog].slice(0, 50);
    
    setDetectionCount(newCount);
    setDetectionLog(newLog);
    
    chrome.storage.local.set({
      detectionLog: newLog,
      detectionCount: newCount
    });
  };

  const clearLog = () => {
    setDetectionLog([]);
    setDetectionCount(0);
    
    chrome.storage.local.set({
      detectionLog: [],
      detectionCount: 0
    });
  };

  const toggleDetection = () => {
    const newState = !isDetectionActive;
    setIsDetectionActive(newState);
    
    chrome.storage.local.set({
      isDetectionActive: newState
    });
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: "toggleDetection",
        active: newState
      });
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const truncateText = (text, maxLength = 80) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="container">
      <div className="header">
        <h2>🛡️ DigitalTwin</h2>
        <div className="subtitle">AI Input Monitor</div>
      </div>
      
      <div className="status-section">
        <div className="status-title">Detection Status</div>
        <div className="stats">
          <span>Detected: <span className="count">{detectionCount}</span></span>
          <span>Active: <span className="indicator">{isDetectionActive ? '✅' : '⏸️'}</span></span>
        </div>
      </div>
      
      <div className="status-section">
        <div className="status-title">Recent Detections</div>
        <div className="detection-log">
          {detectionLog.length === 0 ? (
            <div className="no-detections">
              No text detected yet. Start typing in AI chatbots!
            </div>
          ) : (
            detectionLog.map((detection, index) => (
              <div key={index} className="log-entry">
                <div className="log-timestamp">
                  {formatTime(detection.timestamp)} - {detection.url}
                </div>
                <div className="log-text">
                  {truncateText(detection.text)}
                </div>
              </div>
            ))
          )}
        </div>
        <button className="clear-btn" onClick={clearLog}>
          Clear Log
        </button>
      </div>
      
      <button 
        className="toggle-btn" 
        onClick={toggleDetection}
        style={{ 
          background: isDetectionActive ? '#007cba' : '#28a745' 
        }}
      >
        {isDetectionActive ? 'Pause Detection' : 'Resume Detection'}
      </button>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<DigitalTwinPopup />);

console.log('🛡️ DigitalTwin React popup loaded');