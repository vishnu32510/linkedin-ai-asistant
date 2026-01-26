// Button injection feature - Single Responsibility: Inject buttons into LinkedIn pages
(function() {
  'use strict';
  
  if (typeof LinkedInExtension === 'undefined') {
    window.LinkedInExtension = {};
  }
  if (!LinkedInExtension.Features) {
    LinkedInExtension.Features = {};
  }
  
  const C = LinkedInExtension.Constants;
  const DOM = LinkedInExtension.DOM;
  const UI = LinkedInExtension.UI;
  const Note = LinkedInExtension.Features.Note;
  const Profile = LinkedInExtension.Features.Profile;
  const Message = LinkedInExtension.Features.Message;

  let lastUrl = location.href;
  let isInjecting = false;

  function createNoteButton() {
    const btn = UI.createButton("Generate LinkedIn Note", function() {
      // Check extension context before proceeding
      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        UI.showSnackbar("Extension context invalid. Please refresh the page.", "error", 6000);
        return;
      }
      
      Note.createJobDescriptionPopup(function(jobDescription) {
        Note.handleNoteGeneration(btn, jobDescription);
      });
    }, {
      marginTop: "8px",
      marginLeft: "8px",
      padding: "8px 14px",
      borderRadius: "16px",
      border: "1px solid #0a66c2",
      background: "#0a66c2"
    });
    btn.id = C.BUTTON_IDS.NOTE;
    return btn;
  }

  function createMessageButton() {
    const btn = UI.createButton("Generate LinkedIn Message", function() {
      // Check extension context before proceeding
      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        UI.showSnackbar("Extension context invalid. Please refresh the page.", "error", 6000);
        return;
      }
      
      Message.createJobDescriptionPopup(function(jobDescription) {
        Message.handleMessageGeneration(btn, jobDescription);
      });
    }, {
      marginTop: "8px",
      marginLeft: "8px",
      padding: "8px 14px",
      borderRadius: "16px",
      border: "1px solid #28a745",
      background: "#28a745"
    });
    btn.id = C.BUTTON_IDS.MESSAGE;
    return btn;
  }

  LinkedInExtension.Features.Injection = {
    injectButtons: async function() {
      const existingNoteBtn = document.getElementById(C.BUTTON_IDS.NOTE);
      if (existingNoteBtn) existingNoteBtn.remove();
      
      const existingMessageBtn = document.getElementById(C.BUTTON_IDS.MESSAGE);
      if (existingMessageBtn) existingMessageBtn.remove();

      if (location.hostname !== "www.linkedin.com" || !location.pathname.startsWith("/in/")) {
        return;
      }

      try {
        const contactInfoLink = await DOM.waitForElement('a[href*="contact-info"]', 5000);
        const noteBtn = createNoteButton();
        const messageBtn = createMessageButton();
        contactInfoLink.parentElement.insertBefore(noteBtn, contactInfoLink.nextSibling);
        contactInfoLink.parentElement.insertBefore(messageBtn, noteBtn.nextSibling);
      } catch (e) {
        try {
          const h1 = await DOM.waitForElement("h1", 5000);
          const noteBtn = createNoteButton();
          const messageBtn = createMessageButton();
          h1.parentElement.appendChild(noteBtn);
          h1.parentElement.appendChild(messageBtn);
        } catch (e2) {
          setTimeout(function() {
            if (!document.getElementById(C.BUTTON_IDS.NOTE)) {
              LinkedInExtension.Features.Injection.injectButtons();
            }
          }, 2000);
        }
      }
    },

    checkAndInject: function() {
      if (location.hostname !== "www.linkedin.com" || !location.pathname.startsWith("/in/")) {
        const existingNoteBtn = document.getElementById(C.BUTTON_IDS.NOTE);
        if (existingNoteBtn) existingNoteBtn.remove();
        const existingMessageBtn = document.getElementById(C.BUTTON_IDS.MESSAGE);
        if (existingMessageBtn) existingMessageBtn.remove();
        return;
      }

      if (isInjecting || document.getElementById(C.BUTTON_IDS.NOTE)) {
        return;
      }

      const h1 = document.querySelector("h1");
      if (h1) {
        isInjecting = true;
        const self = this;
        this.injectButtons().then(function() {
          isInjecting = false;
        }).catch(function() {
          isInjecting = false;
        });
      }
    },

    initializeInjection: function() {
      const self = this;
      
      setInterval(function() {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          setTimeout(function() {
            self.checkAndInject();
          }, 500);
        }
      }, 300);

      window.addEventListener('popstate', function() {
        lastUrl = location.href;
        setTimeout(function() {
          self.checkAndInject();
        }, 500);
      });

      const observer = new MutationObserver(function() {
        if (location.href !== lastUrl) {
          lastUrl = location.href;
          setTimeout(function() {
            self.checkAndInject();
          }, 500);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function() {
        originalPushState.apply(history, arguments);
        lastUrl = location.href;
        setTimeout(function() {
          self.checkAndInject();
        }, 500);
      };

      history.replaceState = function() {
        originalReplaceState.apply(history, arguments);
        lastUrl = location.href;
        setTimeout(function() {
          self.checkAndInject();
        }, 500);
      };

      this.checkAndInject();
    }
  };
})();
