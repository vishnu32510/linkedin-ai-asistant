// Connect flow feature - Single Responsibility: Handle Connect workflow
(function() {
  'use strict';
  
  if (typeof LinkedInExtension === 'undefined') {
    window.LinkedInExtension = {};
  }
  if (!LinkedInExtension.Features) {
    LinkedInExtension.Features = {};
  }
  
  const C = LinkedInExtension.Constants;
  const Buttons = LinkedInExtension.Features.Buttons;
  const DOM = LinkedInExtension.DOM;
  const UI = LinkedInExtension.UI;

  LinkedInExtension.Features.Connect = {
    waitForDropdownMenu: async function(timeout) {
      timeout = timeout || C.TIMEOUTS.DROPDOWN_WAIT;
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const menus = C.SELECTORS.DROPDOWN.slice();
        menus.push('.artdeco-dropdown__content-inner');
        menus.push('.msg-overlay-list-bubble');
        
        for (let i = 0; i < menus.length; i++) {
          const selector = menus[i];
          const menu = document.querySelector(selector);
          if (menu && DOM.isElementVisible(menu)) {
            return menu;
          }
        }
        
        const moreBtn = document.querySelector('button[aria-label*="More actions"]');
        if (moreBtn && moreBtn.getAttribute('aria-expanded') === 'true') {
          return true;
        }
        
        await new Promise(function(r) { setTimeout(r, 100); });
      }
      return null;
    },

    clickMoreAndConnect: async function() {
      console.log("🔍 Starting clickMoreAndConnect...");
      
      let moreBtn = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0) {
          console.log('Retry ' + attempt + ': Waiting for More button...');
          await new Promise(function(r) { setTimeout(r, C.TIMEOUTS.RETRY_DELAY); });
        }
        
        moreBtn = Buttons.findMoreButton();
        if (moreBtn) {
          console.log('✅ Found More button on attempt ' + (attempt + 1));
          break;
        }
      }
      
      if (!moreBtn) {
        console.error("❌ More button not found after 5 attempts!");
        UI.showSnackbar("Could not find More button. Check console for debug info.", "error", 8000);
        return false;
      }
      
      console.log("✅ Found More button, attempting to click...");
      UI.showSnackbar("Found More button, clicking...", "info", 2000);
      
      moreBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(function(r) { setTimeout(r, 300); });
      
      let clickSuccess = false;
      try {
        moreBtn.focus();
        moreBtn.click();
        clickSuccess = true;
        console.log("✅ Clicked More button");
      } catch (e) {
        console.warn("First click attempt failed, trying alternative:", e);
        try {
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            buttons: 1
          });
          moreBtn.dispatchEvent(clickEvent);
          clickSuccess = true;
          console.log("✅ Clicked More button (alternative method)");
        } catch (e2) {
          console.error("❌ Failed to click More button:", e2);
        }
      }
      
      if (!clickSuccess) {
        UI.showSnackbar("Failed to click More button", "error");
        return false;
      }
      
      UI.showSnackbar("Waiting for dropdown to open...", "info", 2000);
      const dropdownOpened = await this.waitForDropdownMenu(5000);
      if (!dropdownOpened) {
        console.error("❌ Dropdown did not open!");
        UI.showSnackbar("Dropdown did not open after clicking More. Check console.", "error", 8000);
        return false;
      }
      
      console.log("✅ Dropdown opened");
      await new Promise(function(r) { setTimeout(r, 800); });
      
      const connectBtn = Buttons.findConnectInDropdown();
      if (!connectBtn) {
        console.error("❌ Connect button not found in dropdown!");
        UI.showSnackbar("Connect option not found under More menu. Check console.", "error", 8000);
        return false;
      }
      
      console.log("✅ Found Connect button in dropdown, clicking...");
      UI.showSnackbar("Found Connect, clicking...", "info", 2000);
      connectBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(function(r) { setTimeout(r, 300); });
      connectBtn.click();
      console.log("✅ Clicked Connect button");
      return true;
    },

    waitForConnectModal: async function(timeout) {
      timeout = timeout || C.TIMEOUTS.MODAL_WAIT;
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const modal = await DOM.waitForAnyElement(C.SELECTORS.MODAL, 500);
        if (modal) {
          const textContent = modal.textContent ? modal.textContent.toLowerCase() : '';
          const hasConnectElements = modal.querySelector('button[aria-label*="Add a note"]') ||
                                     textContent.indexOf('add a note') !== -1 ||
                                     textContent.indexOf('send now') !== -1;
          if (hasConnectElements) {
            return modal;
          }
        }
        
        await new Promise(function(r) { setTimeout(r, 150); });
      }
      return null;
    },

    findTextareaInModal: async function(timeout) {
      timeout = timeout || C.TIMEOUTS.MODAL_WAIT;
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const textareaSelectors = [
          'textarea[name="message"]',
          'textarea#custom-message',
          'textarea[placeholder*="Add a note"]',
          'textarea[placeholder*="note"]',
          'textarea[placeholder*="message"]',
          'textarea'
        ];
        
        for (let i = 0; i < textareaSelectors.length; i++) {
          const selector = textareaSelectors[i];
          const textareas = document.querySelectorAll(selector);
          for (let j = 0; j < textareas.length; j++) {
            const textarea = textareas[j];
            if (DOM.isElementVisible(textarea)) {
              const inModal = textarea.closest('[role="dialog"]') || 
                             textarea.closest('.artdeco-modal') ||
                             textarea.closest('.msg-overlay-bubble-header');
              if (inModal) {
                return textarea;
              }
            }
          }
        }
        
        await new Promise(function(r) { setTimeout(r, 200); });
      }
      return null;
    },

    openConnectAndPaste: async function(note) {
      const self = this;
      try {
        const connectBtn = Buttons.findConnectButton();
        if (connectBtn) {
          connectBtn.click();
          UI.showSnackbar("Clicked Connect button", "info", 2000);
        } else {
          UI.showSnackbar("Opening More menu...", "info", 2000);
          const success = await self.clickMoreAndConnect();
          if (!success) {
            UI.showSnackbar("Failed to open Connect dialog", "error");
            return;
          }
          UI.showSnackbar("Clicked Connect from More menu", "info", 2000);
        }

        UI.showSnackbar("Waiting for Connect modal...", "info", 2000);
        const modal = await self.waitForConnectModal(8000);
        
        if (!modal) {
          UI.showSnackbar("Connect modal not detected, waiting longer...", "info", 2000);
          await new Promise(function(r) { setTimeout(r, 1500); });
        } else {
          UI.showSnackbar("Connect modal detected", "info", 2000);
        }

        await new Promise(function(r) { setTimeout(r, 1000); });

        UI.showSnackbar("Looking for Add a note button...", "info", 2000);
        const addNoteBtn = await Buttons.findAddNoteButton(8000);
        
        if (!addNoteBtn) {
          try {
            await navigator.clipboard.writeText(note);
            UI.showSnackbar("Add a note button not found. Note copied to clipboard.", "error", 6000);
          } catch (err) {
            UI.showSnackbar("Add a note button not found and clipboard failed", "error", 6000);
          }
          return;
        }
        
        UI.showSnackbar("Found Add a note button, clicking...", "info", 2000);
        addNoteBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(function(r) { setTimeout(r, 300); });
        addNoteBtn.click();
        await new Promise(function(r) { setTimeout(r, 1000); });

        UI.showSnackbar("Waiting for textarea...", "info", 2000);
        const textarea = await self.findTextareaInModal(8000);

        if (!textarea) {
          try {
            await navigator.clipboard.writeText(note);
            UI.showSnackbar("Textarea not found. Note copied to clipboard.", "error", 6000);
          } catch (err) {
            UI.showSnackbar("Textarea not found and clipboard failed", "error", 6000);
          }
          return;
        }

        UI.showSnackbar("Found textarea, pasting note...", "info", 2000);
        
        // Check if it's contenteditable or textarea
        if (textarea.contentEditable === "true" || textarea.hasAttribute("contenteditable")) {
          DOM.setContentEditableValue(textarea, note);
        } else {
          DOM.setTextareaValue(textarea, note);
        }
        
        await new Promise(function(r) { setTimeout(r, 800); });
        
        // Verify the text was set
        const textValue = textarea.value || textarea.textContent || textarea.innerText || '';
        if (textValue.trim().length === 0) {
          // Try alternative method - use clipboard API
          try {
            await navigator.clipboard.writeText(note);
            textarea.focus();
            // Try to paste using execCommand as fallback
            document.execCommand('paste');
            await new Promise(function(r) { setTimeout(r, 500); });
          } catch (err) {
            console.warn("Clipboard paste failed:", err);
          }
        }
        
        UI.showSnackbar("Note pasted successfully! ✓", "success", 3000);
      } catch (error) {
        console.error("Error in openConnectAndPaste:", error);
        try {
          await navigator.clipboard.writeText(note);
          UI.showSnackbar("Error occurred. Note copied to clipboard.", "error", 6000);
        } catch (err) {
          UI.showSnackbar("Error occurred and clipboard failed", "error", 6000);
        }
      }
    }
  };
})();
