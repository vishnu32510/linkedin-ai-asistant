// Button finding logic - Single Responsibility: Find LinkedIn buttons
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

  LinkedInExtension.Features.Buttons = {
    findMoreButton: function() {
      console.log("🔍 Searching for More button...");
      
      const idPatternSelectors = [
        'button[id$="-profile-overflow-action"]',
        'button[id*="profile-overflow-action"]'
      ];
      
      for (let i = 0; i < idPatternSelectors.length; i++) {
        const selector = idPatternSelectors[i];
        const matches = document.querySelectorAll(selector);
        console.log('Found ' + matches.length + ' button(s) with ID pattern: ' + selector);
        
        for (let j = 0; j < matches.length; j++) {
          const btn = matches[j];
          const ariaLabel = btn.getAttribute("aria-label");
          const text = btn.innerText.trim();
          
          if (ariaLabel !== "More actions") continue;
          
          const isTextExpander = btn.classList.contains('feed-shared-inline-show-more-text__see-more-less-toggle') ||
                                text.indexOf('…more') !== -1 ||
                                (ariaLabel && ariaLabel.indexOf('see more') !== -1);
          
          if (DOM.isElementVisible(btn) && !isTextExpander) {
            if (DOM.isInProfileArea(btn)) {
              console.log('✅ Found More button in profile area (ID: ' + btn.id + ')!');
              return btn;
            } else if (!btn.closest('.global-nav') && !btn.closest('nav')) {
              console.log('✅ Found More button (ID: ' + btn.id + ')!');
              return btn;
            }
          }
        }
      }
      
      const exactMatches = document.querySelectorAll(C.SELECTORS.MORE_BUTTON);
      console.log('Found ' + exactMatches.length + ' button(s) with aria-label="More actions"');
      
      for (let i = 0; i < exactMatches.length; i++) {
        const btn = exactMatches[i];
        if (!DOM.isElementVisible(btn)) continue;
        
        const isTextExpander = btn.classList.contains('feed-shared-inline-show-more-text__see-more-less-toggle') ||
                              btn.innerText.trim().indexOf('…more') !== -1;
        
        if (isTextExpander) continue;
        
        if (DOM.isInProfileArea(btn)) {
          console.log('✅ Found More button in profile area (ID: ' + btn.id + ')!');
          return btn;
        } else if (!btn.closest('.global-nav') && !btn.closest('nav')) {
          console.log('✅ Found More button (ID: ' + btn.id + ')!');
          return btn;
        }
      }
      
      console.error("❌ More button not found!");
      return null;
    },

    findConnectInDropdown: function() {
      const dropdownSelectors = C.SELECTORS.DROPDOWN;
      
      let dropdownContent = null;
      for (let i = 0; i < dropdownSelectors.length; i++) {
        const selector = dropdownSelectors[i];
        const dropdown = document.querySelector(selector);
        if (dropdown && DOM.isElementVisible(dropdown)) {
          dropdownContent = dropdown;
          console.log("✅ Found dropdown with selector:", selector);
          break;
        }
      }
      
      if (dropdownContent) {
        const allItems = dropdownContent.querySelectorAll('button, [role="menuitem"], a, span, li');
        for (let i = 0; i < allItems.length; i++) {
          const item = allItems[i];
          const text = item.innerText.trim().toLowerCase();
          const ariaLabel = (item.getAttribute("aria-label") || "").toLowerCase();
          
          if (DOM.isElementVisible(item) && 
              (text === "connect" || text.indexOf("connect") !== -1 || 
               ariaLabel.indexOf("connect") !== -1 || ariaLabel.indexOf("invite") !== -1) &&
              text.indexOf("about") === -1 && ariaLabel.indexOf("about") === -1 &&
              text.indexOf("withdraw") === -1 && text.indexOf("message") === -1) {
            
            console.log("✅ Found Connect in dropdown:", { text: text, ariaLabel: ariaLabel });
            
            if (item.tagName === 'SPAN' || item.tagName === 'LI') {
              const button = item.closest('button') || item.closest('a') || item;
              if (button && DOM.isElementVisible(button)) {
                return button;
              }
            }
            return item;
          }
        }
      }
      
      const allElements = Array.from(document.querySelectorAll("button, a, [role='menuitem'], span"))
        .filter(function(el) {
          const text = el.innerText.trim().toLowerCase();
          const ariaLabel = (el.getAttribute("aria-label") || "").toLowerCase();
          return DOM.isElementVisible(el) && DOM.isInDropdown(el) &&
                 (text === "connect" || text.indexOf("connect") !== -1 || 
                  ariaLabel.indexOf("connect") !== -1 || ariaLabel.indexOf("invite") !== -1) &&
                 text.indexOf("about") === -1 && ariaLabel.indexOf("about") === -1 &&
                 text.indexOf("withdraw") === -1 && text.indexOf("message") === -1;
        });
      
      if (allElements.length > 0) {
        console.log("✅ Found Connect in dropdown (fallback)");
        const item = allElements[0];
        if (item.tagName === 'SPAN' || item.tagName === 'LI') {
          return item.closest('button') || item.closest('a') || item;
        }
        return item;
      }
      
      console.error("❌ Connect button not found in dropdown!");
      return null;
    },

    findMessageButton: function() {
      const messageSelectors = [
        'button[aria-label*="Message"]',
        'button[aria-label*="message"]',
        'a[aria-label*="Message"]',
        'a[aria-label*="message"]'
      ];
      
      for (let i = 0; i < messageSelectors.length; i++) {
        const selector = messageSelectors[i];
        const elements = document.querySelectorAll(selector);
        for (let j = 0; j < elements.length; j++) {
          const el = elements[j];
          const ariaLabel = (el.getAttribute("aria-label") || "").toLowerCase();
          const text = el.innerText.trim().toLowerCase();
          
          if (DOM.isElementVisible(el) && (ariaLabel.indexOf("message") !== -1 || text === "message")) {
            if (!DOM.isInModal(el) && !DOM.isInDropdown(el)) {
              console.log("✅ Found Message button");
              return el;
            }
          }
        }
      }
      
      const allButtons = Array.from(document.querySelectorAll("button, a"));
      const messageBtn = allButtons.find(function(b) {
        const ariaLabel = (b.getAttribute("aria-label") || "").toLowerCase();
        const text = b.innerText.trim().toLowerCase();
        return DOM.isElementVisible(b) && !DOM.isInModal(b) && !DOM.isInDropdown(b) &&
               (text === "message" || ariaLabel.indexOf("message") !== -1) &&
               ariaLabel.indexOf("compose") === -1 && ariaLabel.indexOf("conversation") === -1;
      });
      
      return messageBtn || null;
    },

    findConnectButton: function() {
      const buttons = Array.from(document.querySelectorAll("button"));
      
      const exactConnect = buttons.find(function(b) {
        const text = b.innerText.trim();
        return DOM.isElementVisible(b) && !DOM.isInDropdown(b) && 
               (text === "Connect" || text === "Connect with");
      });
      if (exactConnect) return exactConnect;
      
      const ariaConnect = buttons.find(function(b) {
        const ariaLabel = (b.getAttribute("aria-label") || "").toLowerCase();
        return DOM.isElementVisible(b) && !DOM.isInDropdown(b) && 
               ariaLabel.indexOf("connect") !== -1;
      });
      
      return ariaConnect || null;
    },

    findAddNoteButton: async function(timeout) {
      timeout = timeout || C.TIMEOUTS.MODAL_WAIT;
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const ariaSelectors = [
          'button[aria-label="Add a note"]',
          'button[aria-label*="Add a note"]',
          'button[aria-label*="Add note"]'
        ];
        
        for (let i = 0; i < ariaSelectors.length; i++) {
          const selector = ariaSelectors[i];
          const btn = document.querySelector(selector);
          if (btn && DOM.isElementVisible(btn)) {
            return btn;
          }
        }
        
        const allButtons = Array.from(document.querySelectorAll("button"));
        const addNoteBtn = allButtons.find(function(b) {
          const text = b.innerText.trim().toLowerCase();
          const ariaLabel = (b.getAttribute("aria-label") || "").toLowerCase();
          return DOM.isElementVisible(b) && DOM.isInModal(b) &&
                 (text === "add a note" || text === "add note" ||
                  ariaLabel === "add a note" || ariaLabel.indexOf("add a note") !== -1);
        });
        
        if (addNoteBtn) return addNoteBtn;
        
        await new Promise(function(r) { setTimeout(r, 150); });
      }
      return null;
    }
  };
})();
