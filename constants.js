// Constants used across the extension
// Using namespace pattern for Chrome extension compatibility
(function() {
  'use strict';
  
  if (typeof LinkedInExtension === 'undefined') {
    window.LinkedInExtension = {};
  }

  LinkedInExtension.Constants = {
    BUTTON_IDS: {
      NOTE: "li-gpt-note-btn",
      MESSAGE: "li-gpt-message-btn",
      SNACKBAR: "li-snackbar",
      PANEL: "li-gpt-floating-panel"
    },
    
    SELECTORS: {
      LINKEDIN_PROFILE: "https://www.linkedin.com/in/",
      MORE_BUTTON: 'button[aria-label="More actions"]',
      MORE_BUTTON_ALT: 'button[aria-label="More"]',
      MORE_BUTTON_DATA: 'button[data-view-name="profile-overflow-button"]',
      MESSAGE_BUTTON: 'a[href*="/messaging/compose/"]',
      CONNECT_BUTTON: 'a[href*="/custom-invite/"]',
      NOTE_TEXTAREA: 'textarea#custom-message',
      DROPDOWN: [
        '.artdeco-dropdown__content',
        '[role="menu"]',
        '[role="listbox"]',
        '[role="box"]',
        '[data-view-name*="overflow"]',
        '[data-view-name*="dropdown"]',
        '.artdeco-dropdown__content-inner'
      ],
      MODAL: [
        '[role="dialog"]',
        '.artdeco-modal',
        '.msg-overlay-bubble-header'
      ],
      MESSAGE_COMPOSER: [
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]',
        '.msg-form__contenteditable',
        '.msg-send-form__contenteditable'
      ],
      MESSAGE_SUBJECT: [
        'input[placeholder*="Subject"]',
        'input[placeholder*="subject"]',
        'input[name="subject"]',
        '.msg-form__subject input',
        '.msg-send-form__subject input',
        'input[aria-label*="Subject"]',
        'input[aria-label*="subject"]'
      ]
    },
    
    TIMEOUTS: {
      ELEMENT_WAIT: 10000,
      DROPDOWN_WAIT: 5000,
      MODAL_WAIT: 8000,
      RETRY_DELAY: 500
    },
    
    PORTFOLIO_LINKS: {
      portfolio: "https://vishnupriyan.dev/",
      github: "https://github.com/vishnu32510",
      floxi: "https://floxi.co",
      factDynamics: "https://docs.perplexity.ai/cookbook/showcase/fact-dynamics"
    }
  };
})();
