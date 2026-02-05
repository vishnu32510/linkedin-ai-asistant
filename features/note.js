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
  const UI = LinkedInExtension.UI;

  function normalizeLine(line) {
    return line.replace(/\s+/g, " ").trim();
  }

  function parseProfileData(profileData) {
    const empty = { name: "Unknown", firstName: "Unknown", company: "Unknown", role: "Unknown" };
    if (!profileData) return empty;

    if (profileData.indexOf("Name: ") === 0) {
      const lines = profileData.split("\n");
      let name = "Unknown";
      let company = "Unknown";
      let role = "Unknown";
      let location = "Unknown";
      let experiences = [];
      let education = [];
      let currentSection = null;

      lines.forEach(l => {
        const trimmed = l.trim();
        if (l.startsWith("Name: ")) name = l.replace("Name: ", "").trim();
        else if (l.startsWith("Company: ")) company = l.replace("Company: ", "").trim();
        else if (l.startsWith("Current Role: ")) role = l.replace("Current Role: ", "").trim();
        else if (l.startsWith("Location: ")) location = l.replace("Location: ", "").trim();
        else if (trimmed === "EXPERIENCE:") { currentSection = "exp"; }
        else if (trimmed === "EDUCATION:") { currentSection = "edu"; }
        else if (trimmed.startsWith("- ") && currentSection === "exp") { experiences.push(trimmed.substring(2)); }
        else if (trimmed.startsWith("- ") && currentSection === "edu") { education.push(trimmed.substring(2)); }
      });

      const firstName = name !== "Unknown" ? name.split(" ")[0] : "Unknown";
      return {
        name, firstName, company, role, location, experiences, education
      };
    }
    return empty; // Simple parser for now as we use AI scraping mostly
  }

  function showCopyFallback(title, text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.readOnly = true;
    textarea.style.cssText = `width: 100%; min-height: 160px; padding: 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;`;
    const closeBtn = UI.createButton("Close", () => {
      const popup = document.getElementById("copy-fallback-note");
      if (popup) popup.remove();
    }, { background: "#fff", color: "#666", border: "1px solid #ccc" });
    UI.createModal(title, textarea, [closeBtn]).overlay.id = "copy-fallback-note";
  }

  LinkedInExtension.Features.Note = {
    createJobDescriptionPopup: function(onGenerate) {
      const existingPopup = document.getElementById("job-desc-popup");
      if (existingPopup) existingPopup.remove();

      const profileTextarea = document.createElement("textarea");
      profileTextarea.id = "profile-data-input";
      profileTextarea.placeholder = "Pasting profile details via AI...";
      profileTextarea.style.cssText = `width: 100%; min-height: 120px; padding: 12px; border: 1px solid #ccc; border-radius: 4px;`;

      const textarea = document.createElement("textarea");
      textarea.id = "job-desc-input";
      textarea.placeholder = "Paste job description here (optional)...";
      textarea.style.cssText = `width: 100%; min-height: 150px; padding: 12px; border: 1px solid #ccc; border-radius: 4px; margin-top: 10px;`;

      profileTextarea.value = "Fetching profile details via AI...";
      profileTextarea.disabled = true;

      LinkedInExtension.Features.Profile.fetchProfileDetails(function (scraped) {
        profileTextarea.disabled = false;
        if (scraped) {
          let str = `Name: ${scraped.name}\nCompany: ${scraped.company}\nCurrent Role: ${scraped.role}\nLocation: ${scraped.location}\n\nEXPERIENCE:\n`;
          (scraped.experiences || []).forEach(exp => str += `- ${exp.title} at ${exp.company} (${exp.duration})\n`);
          str += "\nEDUCATION:\n";
          (scraped.education || []).forEach(edu => str += `- ${edu.school}: ${edu.degree}\n`);
          profileTextarea.value = str.trim();
        } else {
          profileTextarea.value = "";
          profileTextarea.placeholder = "AI failed to parse. Please paste details manually.";
        }
      });

      const cancelBtn = UI.createButton("Cancel", () => document.getElementById("job-desc-popup").remove(), { background: "#fff", color: "#666", border: "1px solid #ccc" });
      const generateBtn = UI.createButton("Generate Note", () => {
        const profileData = profileTextarea.value.trim();
        const jobDesc = textarea.value.trim();
        document.getElementById("job-desc-popup").remove();
        onGenerate({ profileData, jobDescription: jobDesc });
      });

      const modalResult = UI.createModal("Enter Details", null, [cancelBtn, generateBtn]);
      modalResult.overlay.id = "job-desc-popup";
      const modal = modalResult.overlay.querySelector('div');
      modal.insertBefore(profileTextarea, modal.querySelector('div:last-child'));
      modal.insertBefore(textarea, modal.querySelector('div:last-child'));
    },

    handleNoteGeneration: async function (btn, inputs) {
      btn.innerText = "Generating...";
      btn.disabled = true;

      const profile = parseProfileData(inputs.profileData);
      const payload = { ...profile, jobDescription: inputs.jobDescription, profileData: inputs.profileData };

      chrome.runtime.sendMessage({ type: "GENERATE_NOTE", payload }, async (res) => {
        btn.disabled = false;
        btn.innerText = "Generate LinkedIn Note";

        if (res && res.ok && res.note) {
          try {
            await navigator.clipboard.writeText(res.note);
            UI.showSnackbar("Note copied to clipboard! Logging to Sheets...", "success");
            chrome.runtime.sendMessage({
              type: "LOG_TO_SHEETS",
              payload: {
                type: "NOTE",
                url: window.location.href,
                name: profile.name,
                company: profile.company,
                role: profile.role,
                content: res.note,
                profileData: inputs.profileData
              }
            });
          } catch (err) {
            showCopyFallback("Copy Note", res.note);
          }
        } else {
          UI.showSnackbar(res ? res.error : "Failed to generate note", "error");
        }
      });
    }
  };
})();
