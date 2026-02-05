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

    const panel = document.createElement("div");
    panel.id = C.BUTTON_IDS.PANEL;
    panel.style.cssText = `
      position: fixed; right: 24px; bottom: 24px;
      display: flex; flex-direction: column; gap: 10px;
      z-index: 2147483647; padding: 12px;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 12px;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
    `;

    const title = document.createElement("div");
    title.textContent = "LinkedIn AI Assistance";
    title.style.cssText = "font-size: 12px; font-weight: 600; color: #333; text-align: center;";

    panel.appendChild(title);
    panel.appendChild(createNoteButton());
    panel.appendChild(createMessageButton());

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

      setInterval(handleUrlChange, 500);
      window.addEventListener('popstate', handleUrlChange);

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

      this.checkAndInject();
    }
  };
})();
