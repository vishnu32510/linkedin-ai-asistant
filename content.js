// Main content script - Entry point for LinkedIn extension
// All modules use namespace pattern for direct loading in Chrome extensions
// Runs on all LinkedIn pages so buttons appear when navigating to /in/* (SPA)

if (location.hostname === "www.linkedin.com" &&
    typeof chrome !== 'undefined' &&
    chrome && chrome.runtime && chrome.runtime.sendMessage) {

  function initExtension() {
    if (typeof LinkedInExtension !== 'undefined' &&
        LinkedInExtension.Features &&
        LinkedInExtension.Features.Injection) {
      LinkedInExtension.Features.Injection.initializeInjection();
      if (typeof window !== 'undefined') {
        window.debugLinkedInExtension = function() {
          console.log("LinkedIn Extension Debug Mode");
          console.log("Available modules:", Object.keys(LinkedInExtension || {}));
        };
      }
      return true;
    }
    return false;
  }

  if (!initExtension()) {
    setTimeout(function() {
      if (!initExtension()) {
        console.warn('LinkedIn Extension: Modules not loaded. Check manifest.json script order.');
      }
    }, 500);
  }
}
