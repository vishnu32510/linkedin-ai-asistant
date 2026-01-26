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
    extractProfile: function() {
      const h1 = document.querySelector("h1");
      const name = (h1 && h1.innerText) ? h1.innerText.trim() : "Unknown";
      
      const suggestionTarget = document.querySelector('[data-generated-suggestion-target]');
      const textBody = document.querySelector(".text-body-medium");
      const headline = (suggestionTarget && suggestionTarget.innerText) 
        ? suggestionTarget.innerText 
        : (textBody && textBody.innerText) ? textBody.innerText : "";
      
      const companyLink = document.querySelector('a[href*="/company/"]');
      const company = (companyLink && companyLink.innerText) ? companyLink.innerText.trim() : "Unknown";
      
      return { name: name, company: company, role: headline };
    }
  };
})();
