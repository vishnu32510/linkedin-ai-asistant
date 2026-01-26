// Message flow feature - Single Responsibility: Handle Message workflow
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
  const Profile = LinkedInExtension.Features.Profile;

  LinkedInExtension.Features.Message = {
    createJobDescriptionPopup: function(onGenerate) {
      const existingPopup = document.getElementById("job-desc-popup-message");
      if (existingPopup) existingPopup.remove();

      const textarea = document.createElement("textarea");
      textarea.id = "job-desc-input-message";
      textarea.placeholder = "Paste job description here...";
      textarea.style.cssText = `
        width: 100%; min-height: 150px; padding: 12px; border: 1px solid #ccc;
        border-radius: 4px; font-size: 14px; font-family: inherit;
        resize: vertical; box-sizing: border-box;
      `;

      const cancelBtn = UI.createButton("Cancel", function() {
        const popup = document.getElementById("job-desc-popup-message");
        if (popup) popup.remove();
      }, { background: "#fff", color: "#666", border: "1px solid #ccc" });

      const generateBtn = UI.createButton("Generate Message", function() {
        const jobDescription = textarea.value.trim() || null;
        const popup = document.getElementById("job-desc-popup-message");
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
      
      modalResult.overlay.id = "job-desc-popup-message";
      const modal = modalResult.overlay.querySelector('div');
      modal.insertBefore(desc, modal.querySelector('div:last-child'));
      modal.insertBefore(textarea, modal.querySelector('div:last-child'));

      setTimeout(function() { textarea.focus(); }, 100);
    },

    waitForMessageComposer: async function(timeout) {
      timeout = timeout || C.TIMEOUTS.MODAL_WAIT;
      return await DOM.waitForAnyElement(C.SELECTORS.MESSAGE_COMPOSER, timeout);
    },

    findMessageSubject: async function(timeout) {
      timeout = timeout || C.TIMEOUTS.MODAL_WAIT;
      return await DOM.waitForAnyElement(C.SELECTORS.MESSAGE_SUBJECT, timeout);
    },

    pasteMessageToComposer: async function(message, subject) {
      subject = subject || null;
      
      // First, try to find and fill subject field
      if (subject) {
        UI.showSnackbar("Looking for subject field...", "info", 2000);
        const subjectField = await this.findMessageSubject(5000);
        
        if (subjectField) {
          UI.showSnackbar("Found subject field, filling...", "info", 2000);
          subjectField.focus();
          subjectField.value = subject;
          subjectField.dispatchEvent(new Event("input", { bubbles: true }));
          subjectField.dispatchEvent(new Event("change", { bubbles: true }));
          await new Promise(function(r) { setTimeout(r, 300); });
        } else {
          console.log("Subject field not found, continuing with message body only");
        }
      }
      
      const composer = await this.waitForMessageComposer(8000);
      
      if (!composer) {
        try {
          const fullText = subject ? "Subject: " + subject + "\n\n" + message : message;
          await navigator.clipboard.writeText(fullText);
          UI.showSnackbar("Message composer not found. Message copied to clipboard.", "error", 6000);
        } catch (err) {
          UI.showSnackbar("Message composer not found and clipboard failed", "error", 6000);
        }
        return false;
      }
      
      // Focus and clear first
      composer.focus();
      await new Promise(function(r) { setTimeout(r, 200); });
      
      if (composer.contentEditable === "true" || composer.hasAttribute("contenteditable")) {
        DOM.setContentEditableValue(composer, message);
        
        // Wait and verify
        await new Promise(function(r) { setTimeout(r, 500); });
        
        const textValue = composer.textContent || composer.innerText || '';
        if (textValue.trim().length === 0) {
          // Fallback: use clipboard
          try {
            await navigator.clipboard.writeText(message);
            composer.focus();
            document.execCommand('paste');
            await new Promise(function(r) { setTimeout(r, 500); });
          } catch (err) {
            console.warn("Clipboard paste fallback failed:", err);
          }
        }
        
        UI.showSnackbar("Message pasted successfully! ✓", "success", 3000);
        return true;
      } else if (composer.tagName === "TEXTAREA") {
        DOM.setTextareaValue(composer, message);
        
        // Wait and verify
        await new Promise(function(r) { setTimeout(r, 500); });
        
        const textValue = composer.value || '';
        if (textValue.trim().length === 0) {
          // Fallback: use clipboard
          try {
            await navigator.clipboard.writeText(message);
            composer.focus();
            document.execCommand('paste');
            await new Promise(function(r) { setTimeout(r, 500); });
          } catch (err) {
            console.warn("Clipboard paste fallback failed:", err);
          }
        }
        
        UI.showSnackbar("Message pasted successfully! ✓", "success", 3000);
        return true;
      }
      
      return false;
    },

    handleMessageGeneration: async function(btn, jobDescription) {
      jobDescription = jobDescription || null;
      btn.innerText = "Generating...";
      btn.disabled = true;

      const profile = Profile.extractProfile();
      const self = this;

      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        UI.showSnackbar("Extension context not available. Please reload the page.", "error");
        btn.disabled = false;
        btn.innerText = "Generate LinkedIn Message";
        return;
      }

      try {
        // Check if extension context is still valid
        if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
          UI.showSnackbar("Extension context not available. Please reload the page.", "error");
          btn.disabled = false;
          btn.innerText = "Generate LinkedIn Message";
          return;
        }

        // Check for extension context invalidation
        if (chrome.runtime.lastError) {
          UI.showSnackbar("Extension was reloaded. Please refresh this page and try again.", "error", 8000);
          btn.disabled = false;
          btn.innerText = "Generate LinkedIn Message";
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
            type: "GENERATE_MESSAGE",
            payload: payload
          },
          async function(res) {
            // Check for extension context invalidation in callback
            if (chrome.runtime.lastError) {
              UI.showSnackbar("Extension was reloaded. Please refresh this page and try again.", "error", 8000);
              btn.disabled = false;
              btn.innerText = "Generate LinkedIn Message";
              console.error("Extension context invalidated:", chrome.runtime.lastError.message);
              return;
            }

            btn.disabled = false;
            btn.innerText = "Generate LinkedIn Message";

            if (!res) {
              UI.showSnackbar("No response from extension. Please refresh the page and try again.", "error");
              console.error("No response from background script");
              return;
            }

            if (!res.ok) {
              const errorMsg = res.error || "Failed to generate message";
              UI.showSnackbar(errorMsg, "error", 8000);
              console.error("Message generation error:", res.error);
              return;
            }

            if (!res.message) {
              UI.showSnackbar("Generated message is empty. Please try again.", "error");
              console.error("Empty message in response:", res);
              return;
            }

            await self.openMessageAndPaste(res.message, res.subject);
          }
        );
      } catch (error) {
        btn.disabled = false;
        btn.innerText = "Generate LinkedIn Message";
        
        if (error.message && error.message.includes("Extension context invalidated")) {
          UI.showSnackbar("Extension was reloaded. Please refresh this page and try again.", "error", 8000);
        } else {
          UI.showSnackbar("Error generating message: " + error.message, "error", 8000);
        }
        console.error("Message generation error:", error);
      }
    },

    openMessageAndPaste: async function(message, subject) {
      const self = this;
      try {
        UI.showSnackbar("Looking for Message button...", "info", 2000);
        const messageBtn = Buttons.findMessageButton();
        
        if (!messageBtn) {
          UI.showSnackbar("Message button not found", "error", 6000);
          try {
            await navigator.clipboard.writeText(message);
            UI.showSnackbar("Message copied to clipboard. Paste manually.", "info", 6000);
          } catch (err) {
            UI.showSnackbar("Message button not found and clipboard failed", "error", 6000);
          }
          return;
        }
        
        UI.showSnackbar("Found Message button, clicking...", "info", 2000);
        messageBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await new Promise(function(r) { setTimeout(r, 300); });
        messageBtn.click();
        
        UI.showSnackbar("Waiting for message composer...", "info", 2000);
        await new Promise(function(r) { setTimeout(r, 1500); });
        
        const success = await self.pasteMessageToComposer(message, subject);
        if (!success) {
          try {
            const fullText = subject ? "Subject: " + subject + "\n\n" + message : message;
            await navigator.clipboard.writeText(fullText);
            UI.showSnackbar("Message copied to clipboard. Paste manually.", "info", 6000);
          } catch (err) {
            UI.showSnackbar("Failed to paste message", "error", 6000);
          }
        }
      } catch (error) {
        console.error("Error in openMessageAndPaste:", error);
        try {
          const fullText = subject ? "Subject: " + subject + "\n\n" + message : message;
          await navigator.clipboard.writeText(fullText);
          UI.showSnackbar("Error occurred. Message copied to clipboard.", "error", 6000);
        } catch (err) {
          UI.showSnackbar("Error occurred and clipboard failed", "error", 6000);
        }
      }
    }
  };
})();
