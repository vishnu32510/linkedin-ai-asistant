// Load saved settings
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['openaiApiKey', 'googleSheetsUrl', 'resumeDetails'], (result) => {
    if (result.openaiApiKey) {
      document.getElementById('apiKey').value = result.openaiApiKey;
    }
    if (result.googleSheetsUrl) {
      document.getElementById('sheetsUrl').value = result.googleSheetsUrl;
    }
    if (result.resumeDetails) {
      document.getElementById('resumeDetails').value = result.resumeDetails;
    }
  });
});

// Save settings
document.getElementById('optionsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const apiKey = document.getElementById('apiKey').value.trim();
  const sheetsUrl = document.getElementById('sheetsUrl').value.trim();
  const resumeDetails = document.getElementById('resumeDetails').value.trim();
  
  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  chrome.storage.sync.set({
    openaiApiKey: apiKey,
    googleSheetsUrl: sheetsUrl,
    resumeDetails: resumeDetails
  }, () => {
    showStatus('Settings saved successfully!', 'success');
  });
});

// Test OpenAI Connection
document.getElementById('testBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!apiKey) {
    showStatus('Please enter an API key first', 'error');
    return;
  }

  showStatus('Testing connection...', 'success');
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (response.ok) {
      showStatus('✅ OpenAI connection successful!', 'success');
    } else {
      const error = await response.json();
      showStatus(`❌ Connection failed: ${error.error?.message || 'Invalid API key'}`, 'error');
    }
  } catch (err) {
    showStatus(`❌ Connection error: ${err.message}`, 'error');
  }
});

// Test Sheets Connection
document.getElementById('testSheetsBtn').addEventListener('click', () => {
  const url = document.getElementById('sheetsUrl').value.trim();
  const resumeDetails = document.getElementById('resumeDetails').value.trim();

  if (!url) {
    showStatus('Please enter a Google Sheets Webhook URL first', 'error');
    return;
  }

  showStatus('Testing Sheets connection...', 'success');

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
      showStatus('✅ Sheets connection successful!', 'success');
    } else {
      const error = response ? response.error : 'No response from background script';
      showStatus(`❌ Sheets connection failed: ${error}`, 'error');
    }
  });
});

function showStatus(message, type) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 5000);
}
