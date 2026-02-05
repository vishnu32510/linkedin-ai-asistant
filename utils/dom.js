// DOM utility functions - Single Responsibility: DOM operations only
(function() {
  'use strict';
  
  if (typeof LinkedInExtension === 'undefined') {
    window.LinkedInExtension = {};
  }
  
  const C = LinkedInExtension.Constants;
  
  LinkedInExtension.DOM = {
    /**
     * Wait for an element to appear in the DOM
     */
    waitForElement: function(selector, timeout) {
      timeout = timeout || C.TIMEOUTS.ELEMENT_WAIT;
      return new Promise((resolve, reject) => {
        const start = Date.now();
        const interval = setInterval(() => {
          const el = document.querySelector(selector);
          if (el) {
            clearInterval(interval);
            resolve(el);
          }
          if (Date.now() - start > timeout) {
            clearInterval(interval);
            reject(new Error(`Element not found: ${selector}`));
          }
        }, 300);
      });
    },

    /**
     * Check if element is visible
     */
    isElementVisible: function(element) {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      if (!style || style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
        return false;
      }
      return rect.width > 0 && rect.height > 0 && element.getClientRects().length > 0;
    },

    /**
     * Find element by text content
     */
    findElementByText: function(selector, text, exact) {
      exact = exact || false;
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).find(function(el) {
        const elText = el.innerText.trim().toLowerCase();
        const searchText = text.toLowerCase();
        return exact ? elText === searchText : elText.includes(searchText);
      });
    },

    /**
     * Find element by aria-label
     */
    findElementByAriaLabel: function(selector, ariaLabel, exact) {
      exact = exact || false;
      const elements = document.querySelectorAll(selector);
      return Array.from(elements).find(function(el) {
        const elAriaLabel = (el.getAttribute("aria-label") || "").toLowerCase();
        const searchAriaLabel = ariaLabel.toLowerCase();
        return exact ? elAriaLabel === searchAriaLabel : elAriaLabel.includes(searchAriaLabel);
      });
    },

    /**
     * Check if element is inside a modal
     */
    isInModal: function(element) {
      if (!element) return false;
      return !!(
        element.closest('[role="dialog"]') ||
        element.closest('.artdeco-modal') ||
        element.closest('.msg-overlay-bubble-header')
      );
    },

    /**
     * Check if element is inside a dropdown
     */
    isInDropdown: function(element) {
      if (!element) return false;
      return !!(
        element.closest('.artdeco-dropdown__content') ||
        element.closest('[role="menu"]') ||
        element.closest('[role="listbox"]') ||
        element.closest('[role="box"]')
      );
    },

    /**
     * Check if element is in profile area (not nav bar)
     */
    isInProfileArea: function(element) {
      if (!element) return false;
      const inProfileArea = element.closest('main') ||
                           element.closest('.pv-text-details__left-panel') ||
                           element.closest('.pv-top-card');
      const inNavBar = element.closest('.global-nav') || element.closest('nav');
      return !!inProfileArea && !inNavBar;
    },

    /**
     * Set value for textarea and trigger events
     */
    setTextareaValue: function(textarea, value) {
      textarea.focus();
      
      // Clear existing value
      textarea.value = '';
      
      // Set new value
      textarea.value = value;
      
      // Trigger all necessary events for LinkedIn
      textarea.dispatchEvent(new Event("focus", { bubbles: true }));
      textarea.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      textarea.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
      textarea.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
      
      // Also trigger native input event
      const inputEvent = new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: value
      });
      textarea.dispatchEvent(inputEvent);
    },

    /**
     * Set value for contenteditable div - improved for LinkedIn
     */
    setContentEditableValue: function(element, value) {
      element.focus();
      
      // Clear existing content
      element.textContent = '';
      element.innerHTML = '';
      
      // Try multiple methods to ensure LinkedIn detects the change
      
      // Method 1: Set textContent first
      element.textContent = value;
      
      // Method 2: Set innerHTML with proper formatting
      const lines = value.split('\n');
      const formattedHTML = lines.map(function(line) {
        if (line.trim() === '') {
          return '<br>';
        }
        // Use <p> tags for paragraphs (LinkedIn style)
        return '<p><span>' + line.replace(/\n/g, '<br>') + '</span></p>';
      }).join('');
      
      element.innerHTML = formattedHTML;
      
      // Method 3: Move cursor to end
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Trigger comprehensive events
      element.dispatchEvent(new Event("focus", { bubbles: true }));
      element.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      
      // Trigger InputEvent with proper data
      const inputEvent = new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: value
      });
      element.dispatchEvent(inputEvent);
      
      // Trigger composition events (LinkedIn might listen to these)
      element.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      element.dispatchEvent(new CompositionEvent("compositionupdate", { bubbles: true, data: value }));
      element.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: value }));
      
      // Trigger paste event simulation
      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: new DataTransfer()
      });
      element.dispatchEvent(pasteEvent);
    },

    /**
     * Wait for any of multiple selectors
     */
    waitForAnyElement: async function(selectors, timeout) {
      timeout = timeout || C.TIMEOUTS.ELEMENT_WAIT;
      const start = Date.now();
      const self = this;
      while (Date.now() - start < timeout) {
        for (let i = 0; i < selectors.length; i++) {
          const selector = selectors[i];
          const element = document.querySelector(selector);
          if (element && self.isElementVisible(element)) {
            return element;
          }
        }
        await new Promise(function(r) { setTimeout(r, 200); });
      }
      return null;
    }
  };
})();
