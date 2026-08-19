
// Defaults are now loaded from prompts.js

// Load saved settings & view-only configs
document.addEventListener('DOMContentLoaded', () => {
  // Populate view-only data from user_data.js and prompts.js
  if (typeof USER_RESUME_DETAILS !== 'undefined') {
    document.getElementById('resumeDetails').value = USER_RESUME_DETAILS;
  }
  if (typeof USER_SIGNATURE !== 'undefined') {
    document.getElementById('signature').value = USER_SIGNATURE;
  }
  if (typeof USER_EXPERIENCE_MAPPING_STRATEGY !== 'undefined') {
    document.getElementById('experienceMapping').value = USER_EXPERIENCE_MAPPING_STRATEGY;
  }
  if (typeof USER_PROMPT_INSTRUCTIONS !== 'undefined') {
    document.getElementById('instructions').value = USER_PROMPT_INSTRUCTIONS;
  } else if (typeof DEFAULT_INSTRUCTIONS !== 'undefined') {
    document.getElementById('instructions').value = DEFAULT_INSTRUCTIONS;
  }
  if (typeof DEFAULT_RULES !== 'undefined') {
    document.getElementById('rules').value = DEFAULT_RULES;
  }

  // Load API Key & Sheets URL from sync storage
  chrome.storage.sync.get(['openaiApiKey', 'geminiApiKey', 'googleSheetsUrl'], (result) => {
    if (result.openaiApiKey) {
      document.getElementById('apiKey').value = result.openaiApiKey;
    }
    if (result.geminiApiKey) {
      document.getElementById('geminiApiKey').value = result.geminiApiKey;
    }
    if (result.googleSheetsUrl) {
      document.getElementById('sheetsUrl').value = result.googleSheetsUrl;
    }
  });
});

// Save API settings
document.getElementById('optionsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const apiKey = document.getElementById('apiKey').value.trim();
  const geminiApiKey = document.getElementById('geminiApiKey').value.trim();
  const sheetsUrl = document.getElementById('sheetsUrl').value.trim();

  if (!apiKey && !geminiApiKey) {
    showStatus('Please enter at least one API key (Gemini or OpenAI)', 'error');
    return;
  }

  chrome.storage.sync.set({
    openaiApiKey: apiKey,
    geminiApiKey: geminiApiKey,
    googleSheetsUrl: sheetsUrl
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

// Test Gemini Connection
document.getElementById('testGeminiBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('geminiApiKey').value.trim();

  if (!apiKey) {
    showStatus('Please enter a Gemini API key first', 'error', 'geminiStatus');
    return;
  }

  showStatus('Testing Gemini...', 'success', 'geminiStatus');

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (response.ok) {
      showStatus('✅ Gemini key valid!', 'success', 'geminiStatus');
    } else {
      const error = await response.json();
      showStatus(`❌ ${error.error?.message || 'Invalid key'}`, 'error', 'geminiStatus');
    }
  } catch (err) {
    showStatus(`❌ ${err.message}`, 'error', 'geminiStatus');
  }
});

// Test OpenAI Connection
document.getElementById('testBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();

  if (!apiKey) {
    showStatus('Please enter an OpenAI API key first', 'error', 'apiStatus');
    return;
  }

  showStatus('Testing connection...', 'success', 'apiStatus');

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
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
