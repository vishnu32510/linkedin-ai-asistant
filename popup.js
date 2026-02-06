
// Defaults are now loaded from prompts.js

// Load saved settings
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['openaiApiKey', 'googleSheetsUrl', 'resumeDetails', 'signature', 'experienceMapping', 'promptInstructions', 'promptRules'], (result) => {
    if (result.openaiApiKey) {
      document.getElementById('apiKey').value = result.openaiApiKey;
    }
    if (result.googleSheetsUrl) {
      document.getElementById('sheetsUrl').value = result.googleSheetsUrl;
    }
    if (result.resumeDetails) {
      document.getElementById('resumeDetails').value = result.resumeDetails;
    }
        if (result.signature) {
            document.getElementById('signature').value = result.signature;
        }

        // Advanced Settings
        if (result.experienceMapping) {
            document.getElementById('experienceMapping').value = result.experienceMapping;
        }

        if (result.promptInstructions) {
            document.getElementById('instructions').value = result.promptInstructions;
        } else if (typeof DEFAULT_INSTRUCTIONS !== 'undefined') {
            document.getElementById('instructions').value = DEFAULT_INSTRUCTIONS;
        }

        if (result.promptRules) {
            document.getElementById('rules').value = result.promptRules;
        } else if (typeof DEFAULT_RULES !== 'undefined') {
            document.getElementById('rules').value = DEFAULT_RULES;
        }
  });
});

// Save settings
document.getElementById('optionsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const apiKey = document.getElementById('apiKey').value.trim();
  const sheetsUrl = document.getElementById('sheetsUrl').value.trim();
  const resumeDetails = document.getElementById('resumeDetails').value.trim();
    const signature = document.getElementById('signature').value.trim();
    const experienceMapping = document.getElementById('experienceMapping').value.trim();
    const promptInstructions = document.getElementById('instructions').value.trim();
    const promptRules = document.getElementById('rules').value.trim();
  
  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  chrome.storage.sync.set({
    openaiApiKey: apiKey,
    googleSheetsUrl: sheetsUrl,
      resumeDetails: resumeDetails,
      signature: signature,
      experienceMapping: experienceMapping,
      promptInstructions: promptInstructions,
      promptRules: promptRules
  }, () => {
    const saveBtn = document.querySelector('button[type="submit"]');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '✅ Saved!';
    saveBtn.style.background = '#057642';
    
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.style.background = '';
    }, 2000);
  });
});

// Test OpenAI Connection
document.getElementById('testBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!apiKey) {
      showStatus('Please enter an API key first', 'error', 'apiStatus');
    return;
  }

    showStatus('Testing connection...', 'success', 'apiStatus');
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.ok) {
        showStatus('✅ OpenAI connection successful!', 'success', 'apiStatus');
    } else {
      const error = await response.json();
        showStatus(`❌ Connection failed: ${error.error?.message || 'Invalid API key'}`, 'error', 'apiStatus');
    }
  } catch (err) {
      showStatus(`❌ Connection error: ${err.message}`, 'error', 'apiStatus');
  }
});

// Test Sheets Connection
document.getElementById('testSheetsBtn').addEventListener('click', () => {
  const url = document.getElementById('sheetsUrl').value.trim();
  const resumeDetails = document.getElementById('resumeDetails').value.trim();

  if (!url) {
      showStatus('Please enter a Google Sheets Webhook URL first', 'error', 'sheetsStatus');
    return;
  }

    showStatus('Testing Sheets connection...', 'success', 'sheetsStatus');

  chrome.runtime.sendMessage({
    type: "LOG_TO_SHEETS",
    payload: {
      type: "TEST",
      url: "N/A",
      name: "Test User",
      company: "Test Company",
      role: "Tester",
      content: "This is a test message to verify the Google Sheets integration.",
      jobDescription: "Sample Job Description for testing purposes",
      profileData: resumeDetails || "Sample Profile Bio (No resume details saved)"
    }
  }, (response) => {
    if (response && response.ok) {
        showStatus('✅ Sheets connection successful!', 'success', 'sheetsStatus');
    } else {
      const error = response ? response.error : 'No response from background script';
        showStatus(`❌ Sheets connection failed: ${error}`, 'error', 'sheetsStatus');
    }
  });
});

function showStatus(message, type, elementId = 'status') {
    const status = document.getElementById(elementId);
    if (!status) return;

  status.textContent = message;

    if (elementId === 'status') {
    // Main status box styles
      status.className = `status ${type}`;
    } else {
        // Inline small status styles
        status.className = `status-small ${type}`;
    }

  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 5000);
}
