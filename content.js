// Main content script - Entry point for LinkedIn extension
// All modules use namespace pattern for direct loading in Chrome extensions

if (location.hostname === "www.linkedin.com" && 
    location.pathname.startsWith("/in/") &&
    typeof chrome !== 'undefined' && 
    chrome && chrome.runtime && chrome.runtime.sendMessage) {

  // Wait for all modules to load, then initialize
  // Modules are loaded in order via manifest.json
  function initExtension() {
    if (typeof LinkedInExtension !== 'undefined' && 
        LinkedInExtension.Features && 
        LinkedInExtension.Features.Injection) {
      LinkedInExtension.Features.Injection.initializeInjection();
      
      // Expose debug functions globally
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
  
  // Try immediately
  if (!initExtension()) {
    // Retry after a short delay if modules aren't loaded yet
    setTimeout(function() {
      if (!initExtension()) {
        console.warn('LinkedIn Extension: Modules not loaded. Make sure all files are loaded in manifest.json');
      }
    }, 500);
  }
}
