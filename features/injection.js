// Button injection feature - Single Responsibility: Inject floating buttons into LinkedIn pages
(function() {
  'use strict';
  
  if (typeof LinkedInExtension === 'undefined') {
    window.LinkedInExtension = {};
  }
  if (!LinkedInExtension.Features) {
    LinkedInExtension.Features = {};
  }
  
  const C = LinkedInExtension.Constants;
  const UI = LinkedInExtension.UI;
  const Note = LinkedInExtension.Features.Note;
  const Message = LinkedInExtension.Features.Message;

  let lastUrl = location.href;

  function createNoteButton() {
    const btn = UI.createButton("Generate LinkedIn Note", function() {
      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        UI.showSnackbar("Extension context invalid. Please refresh the page.", "error", 6000);
        return;
      }
      
      Note.createJobDescriptionPopup(function(inputs) {
        Note.handleNoteGeneration(btn, inputs);
      });
    }, {
      padding: "10px 16px",
      borderRadius: "16px",
      border: "1px solid #0a66c2",
      background: "#0a66c2",
      margin: "0",
      width: "220px"
    });
    btn.id = C.BUTTON_IDS.NOTE;
    return btn;
  }

  function createMessageButton() {
    const btn = UI.createButton("Generate LinkedIn Message", function() {
      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        UI.showSnackbar("Extension context invalid. Please refresh the page.", "error", 6000);
        return;
      }
      
      Message.createJobDescriptionPopup(function(inputs) {
        Message.handleMessageGeneration(btn, inputs);
      });
    }, {
      padding: "10px 16px",
      borderRadius: "16px",
      border: "1px solid #28a745",
      background: "#28a745",
      margin: "0",
      width: "220px"
    });
    btn.id = C.BUTTON_IDS.MESSAGE;
    return btn;
  }

  function createFloatingPanel() {
    const existing = document.getElementById(C.BUTTON_IDS.PANEL);
    if (existing) existing.remove();

    const isMinimized = localStorage.getItem("linkedin_ai_panel_minimized") === "true";

    const panel = document.createElement("div");
    panel.id = C.BUTTON_IDS.PANEL;
    panel.style.cssText = `
      position: fixed; right: 24px; bottom: 24px;
      display: flex; flex-direction: column; gap: 8px;
      z-index: 2147483647; padding: 10px 12px;
      background: rgba(255, 255, 255, 0.98);
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      transition: all 0.2s ease-in-out;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    // Header container with title & toggle button
    const header = document.createElement("div");
    header.style.cssText = "display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; user-select: none;";

    const title = document.createElement("div");
    title.textContent = "✨ AI Assistant";
    title.style.cssText = "font-size: 12px; font-weight: 700; color: #0a66c2;";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.innerHTML = isMinimized ? "➕" : "➖";
    toggleBtn.title = isMinimized ? "Expand AI Panel" : "Minimize AI Panel";
    toggleBtn.style.cssText = `
      background: none; border: none; cursor: pointer;
      font-size: 11px; padding: 2px 4px; border-radius: 4px;
      color: #666; line-height: 1; display: flex; align-items: center;
    `;

    header.appendChild(title);
    header.appendChild(toggleBtn);

    // Body content container (buttons)
    const content = document.createElement("div");
    content.id = "linkedin-ai-panel-content";
    content.style.cssText = `
      display: ${isMinimized ? "none" : "flex"};
      flex-direction: column; gap: 8px; margin-top: 4px;
    `;
    content.appendChild(createNoteButton());
    content.appendChild(createMessageButton());

    function togglePanel(e) {
      if (e) e.stopPropagation();
      const currentHidden = content.style.display === "none";
      content.style.display = currentHidden ? "flex" : "none";
      toggleBtn.innerHTML = currentHidden ? "➖" : "➕";
      toggleBtn.title = currentHidden ? "Minimize AI Panel" : "Expand AI Panel";
      localStorage.setItem("linkedin_ai_panel_minimized", !currentHidden);
    }

    header.addEventListener("click", togglePanel);
    toggleBtn.addEventListener("click", togglePanel);

    panel.appendChild(header);
    panel.appendChild(content);

    document.body.appendChild(panel);
  }

  function removeFloatingPanel() {
    const existing = document.getElementById(C.BUTTON_IDS.PANEL);
    if (existing) existing.remove();
  }

  LinkedInExtension.Features.Injection = {
    injectButtons: function() {
      createFloatingPanel();
    },

    checkAndInject: function() {
      if (location.hostname !== "www.linkedin.com" || !location.pathname.startsWith("/in/")) {
        removeFloatingPanel();
        return;
      }

      if (document.getElementById(C.BUTTON_IDS.PANEL)) {
        return;
      }

      this.injectButtons();
    },

    initializeInjection: function() {
      const self = this;

      function handleUrlChange() {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          self.checkAndInject();
        }
      }

      // 1. Listen for browser back/forward navigation
      window.addEventListener('popstate', handleUrlChange);

      // 2. Intercept single-page pushState / replaceState navigation
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function() {
        originalPushState.apply(history, arguments);
        handleUrlChange();
      };

      history.replaceState = function() {
        originalReplaceState.apply(history, arguments);
        handleUrlChange();
      };

      // 3. MutationObserver on main document body to catch DOM renders and dynamic profile changes
      const observer = new MutationObserver(function() {
        handleUrlChange();
        if (location.pathname.startsWith("/in/") && !document.getElementById(C.BUTTON_IDS.PANEL)) {
          self.checkAndInject();
        }
      });

      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: false });
      } else {
        document.addEventListener('DOMContentLoaded', function() {
          observer.observe(document.body, { childList: true, subtree: false });
        });
      }

      this.checkAndInject();
    }
  };
})();
