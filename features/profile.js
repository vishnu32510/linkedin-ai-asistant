// Profile extraction feature - Single Responsibility: Extract profile data
(function() {
  'use strict';
  
  if (typeof LinkedInExtension === 'undefined') {
    window.LinkedInExtension = {};
  }
  if (!LinkedInExtension.Features) {
    LinkedInExtension.Features = {};
  }

  LinkedInExtension.Features.Profile = {
    fetchProfileDetails: function (callback) {
      console.log("🚀 Requesting AI-powered rich profile parsing...");

      // Grab enough text for the top sections (header, experience, education)
      // 5,000 chars is usually sufficient and saves significantly on token costs.
      const pageText = document.body.innerText.substring(0, 5000);
      const url = window.location.href;

      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        console.error("Extension context not available");
        callback(null);
        return;
      }

      chrome.runtime.sendMessage({
        type: "GENERATE_PROFILE",
        payload: {
          pageText: pageText,
          url: url
        }
      }, function (res) {
        if (chrome.runtime.lastError) {
          console.error("GENERATE_PROFILE error:", chrome.runtime.lastError);
          callback(null);
          return;
        }

        if (res && res.ok && res.profile) {
          console.log("✅ AI parsing complete:", res.profile);
          callback(res.profile);
        } else {
          console.error("AI parsing failed:", res ? res.error : "No response");
          callback(null);
        }
      });
    },

    // Legacy support
    extractProfile: function () {
      const name = document.title.split("|")[0].trim();
      const firstName = name.split(" ")[0];
      return {
        name: name === "LinkedIn" ? "" : name,
        firstName: firstName === "LinkedIn" ? "" : firstName,
        company: "",
        role: ""
      };
    }
  };
})();
