// UI utility functions - Single Responsibility: UI components only
(function() {
  'use strict';
  
  if (typeof LinkedInExtension === 'undefined') {
    window.LinkedInExtension = {};
  }
  
  const C = LinkedInExtension.Constants;
  
  function getSnackbarColor(type) {
    const colors = {
      error: "#d32f2f",
      success: "#2e7d32",
      info: "#1976d2",
      warning: "#f57c00"
    };
    return colors[type] || colors.info;
  }

  function injectSnackbarStyles() {
    if (document.getElementById('snackbar-styles')) return;
    
    const style = document.createElement("style");
    style.id = 'snackbar-styles';
    style.textContent = `
      @keyframes slideUp {
        from { transform: translateX(-50%) translateY(100px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  LinkedInExtension.UI = {
    showSnackbar: function(message, type, duration) {
      type = type || "info";
      duration = duration || 4000;
      
      const existing = document.getElementById(C.BUTTON_IDS.SNACKBAR);
      if (existing) existing.remove();

      const snackbar = document.createElement("div");
      snackbar.id = C.BUTTON_IDS.SNACKBAR;
      snackbar.textContent = message;
      snackbar.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: ${getSnackbarColor(type)};
        color: #fff; padding: 12px 24px; border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 2147483647;
        font-family: system-ui, -apple-system, sans-serif; font-size: 14px;
        max-width: 90vw; word-wrap: break-word; text-align: center;
        animation: slideUp 0.3s ease-out;
      `;

      injectSnackbarStyles();
      document.body.appendChild(snackbar);

      setTimeout(function() {
        snackbar.style.opacity = "0";
        snackbar.style.transition = "opacity 0.3s ease-out";
        setTimeout(function() { snackbar.remove(); }, 300);
      }, duration);
    },

    createModal: function(title, content, buttons) {
      buttons = buttons || [];
      
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.5); z-index: 2147483647;
        display: flex; align-items: center; justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
      `;

      const modal = document.createElement("div");
      modal.style.cssText = `
        background: #fff; border-radius: 8px; padding: 24px; width: 500px;
        max-width: 90vw; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      `;

      if (title) {
        const titleEl = document.createElement("h2");
        titleEl.textContent = title;
        titleEl.style.cssText = "margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #000;";
        modal.appendChild(titleEl);
      }

      if (content) {
        if (typeof content === 'string') {
          modal.innerHTML += content;
        } else {
          modal.appendChild(content);
        }
      }

      if (buttons.length > 0) {
        const buttonsContainer = document.createElement("div");
        buttonsContainer.style.cssText = `
          display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px;
        `;
        buttons.forEach(function(btn) { buttonsContainer.appendChild(btn); });
        modal.appendChild(buttonsContainer);
      }

      overlay.appendChild(modal);
      overlay.onclick = function(e) {
        if (e.target === overlay) overlay.remove();
      };

      document.body.appendChild(overlay);
      return { overlay: overlay, modal: modal };
    },

    createButton: function(text, onClick, styles) {
      styles = styles || {};
      
      const btn = document.createElement("button");
      btn.textContent = text;
      btn.onclick = onClick;
      
      const defaultStyles = {
        padding: "8px 16px",
        border: "none",
        borderRadius: "4px",
        background: "#0a66c2",
        color: "#fff",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: "600"
      };
      
      const mergedStyles = {};
      Object.keys(defaultStyles).forEach(function(key) {
        mergedStyles[key] = defaultStyles[key];
      });
      Object.keys(styles).forEach(function(key) {
        mergedStyles[key] = styles[key];
      });
      
      btn.style.cssText = Object.keys(mergedStyles)
        .map(function(key) {
          const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          return cssKey + ': ' + mergedStyles[key];
        })
        .join('; ');
      
      return btn;
    }
  };
})();
