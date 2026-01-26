// Note generation feature - Single Responsibility: Handle note generation UI
(function() {
  'use strict';
  
  if (typeof LinkedInExtension === 'undefined') {
    window.LinkedInExtension = {};
  }
  if (!LinkedInExtension.Features) {
    LinkedInExtension.Features = {};
  }
  
  const C = LinkedInExtension.Constants;
  const Profile = LinkedInExtension.Features.Profile;
  const Connect = LinkedInExtension.Features.Connect;
  const UI = LinkedInExtension.UI;

  LinkedInExtension.Features.Note = {
    createJobDescriptionPopup: function(onGenerate) {
      const existingPopup = document.getElementById("job-desc-popup");
      if (existingPopup) existingPopup.remove();

      const textarea = document.createElement("textarea");
      textarea.id = "job-desc-input";
      textarea.placeholder = "Paste job description here...";
      textarea.style.cssText = `
        width: 100%; min-height: 150px; padding: 12px; border: 1px solid #ccc;
        border-radius: 4px; font-size: 14px; font-family: inherit;
        resize: vertical; box-sizing: border-box;
      `;

      const self = this;
      const cancelBtn = UI.createButton("Cancel", function() {
        const popup = document.getElementById("job-desc-popup");
        if (popup) popup.remove();
      }, { background: "#fff", color: "#666", border: "1px solid #ccc" });

      const generateBtn = UI.createButton("Generate Note", function() {
        const jobDescription = textarea.value.trim() || null;
        const popup = document.getElementById("job-desc-popup");
        if (popup) popup.remove();
        onGenerate(jobDescription);
      });

      const desc = document.createElement("p");
      desc.textContent = "Paste the job description you're applying to (optional):";
      desc.style.cssText = "margin: 0 0 12px 0; font-size: 14px; color: #666;";

      const modalResult = UI.createModal(
        "Enter Job Description",
        null,
        [cancelBtn, generateBtn]
      );
      
      modalResult.overlay.id = "job-desc-popup";
      const modal = modalResult.overlay.querySelector('div');
      modal.insertBefore(desc, modal.querySelector('div:last-child'));
      modal.insertBefore(textarea, modal.querySelector('div:last-child'));

      setTimeout(function() { textarea.focus(); }, 100);
    },

    handleNoteGeneration: async function(btn, jobDescription) {
      jobDescription = jobDescription || null;
      btn.innerText = "Generating...";
      btn.disabled = true;

      const profile = Profile.extractProfile();

      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        UI.showSnackbar("Extension context not available. Please reload the page.", "error");
        btn.disabled = false;
        btn.innerText = "Generate LinkedIn Note";
        return;
      }

      try {
        // Check if extension context is still valid
        if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
          UI.showSnackbar("Extension context not available. Please reload the page.", "error");
          btn.disabled = false;
          btn.innerText = "Generate LinkedIn Note";
          return;
        }

        // Check for extension context invalidation
        if (chrome.runtime.lastError) {
          UI.showSnackbar("Extension was reloaded. Please refresh this page and try again.", "error", 8000);
          btn.disabled = false;
          btn.innerText = "Generate LinkedIn Note";
          console.error("Extension context error:", chrome.runtime.lastError);
          return;
        }

        const payload = {
          name: profile.name,
          company: profile.company,
          role: profile.role,
          jobDescription: jobDescription
        };
        
        chrome.runtime.sendMessage(
          {
            type: "GENERATE_NOTE",
            payload: payload
          },
          async function(res) {
            // Check for extension context invalidation in callback
            if (chrome.runtime.lastError) {
              UI.showSnackbar("Extension was reloaded. Please refresh this page and try again.", "error", 8000);
              btn.disabled = false;
              btn.innerText = "Generate LinkedIn Note";
              console.error("Extension context invalidated:", chrome.runtime.lastError.message);
              return;
            }

            btn.disabled = false;
            btn.innerText = "Generate LinkedIn Note";

            if (!res) {
              UI.showSnackbar("No response from extension. Please refresh the page and try again.", "error");
              console.error("No response from background script");
              return;
            }

            if (!res.ok) {
              const errorMsg = res.error || "Failed to generate note";
              UI.showSnackbar(errorMsg, "error", 8000);
              console.error("Note generation error:", res.error);
              return;
            }

            if (!res.note) {
              UI.showSnackbar("Generated note is empty. Please try again.", "error");
              console.error("Empty note in response:", res);
              return;
            }

            await Connect.openConnectAndPaste(res.note);
          }
        );
      } catch (error) {
        btn.disabled = false;
        btn.innerText = "Generate LinkedIn Note";
        
        if (error.message && error.message.includes("Extension context invalidated")) {
          UI.showSnackbar("Extension was reloaded. Please refresh this page and try again.", "error", 8000);
        } else {
          UI.showSnackbar("Error generating note: " + error.message, "error", 8000);
        }
        console.error("Note generation error:", error);
      }
    }
  };
})();
