import React from 'react';
import ReactDOM from 'react-dom/client';
import iSpeakWidget from './iSpeakWidget';

// Make widget available globally
window.iSpeakWidget = {
  // React component for developers
  Component: iSpeakWidget,
  
  // Easy initialization
  init: function(options = {}) {
    const container = options.container ? 
      document.querySelector(options.container) : 
      this.createContainer();
    
    if (container) {
      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(iSpeakWidget, options));
    }
    return container;
  },
  
  // Inject floating widget anywhere
  inject: function(options = {}) {
    const container = this.createContainer();
    container.style.cssText = `
      position: fixed;
      top: ${options.position?.y || 20}px;
      left: ${options.position?.x || 20}px;
      z-index: 9999;
    `;
    
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(iSpeakWidget, {
      ...options,
      embeddedMode: false
    }));
    return container;
  },
  
  createContainer: function() {
    let container = document.getElementById('ispeak-widget-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ispeak-widget-container';
      document.body.appendChild(container);
    }
    return container;
  }
};

// Auto-inject if script has data attributes
document.addEventListener('DOMContentLoaded', function() {
  const script = document.querySelector('script[src*="ispeak-widget"]');
  if (script && script.dataset.autoInject === 'true') {
    window.iSpeakWidget.inject({
      theme: script.dataset.theme || 'consciousness',
      position: {
        x: parseInt(script.dataset.x) || 20,
        y: parseInt(script.dataset.y) || 20
      },
      apiKeys: {
        groq: script.dataset.groqKey,
        openai: script.dataset.openaiKey,
        anthropic: script.dataset.anthropicKey
      }
    });
  }
});

export default iSpeakWidget;
