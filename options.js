// Load saved settings
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

// Save settings
document.getElementById('optionsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const apiKey = document.getElementById('apiKey').value.trim();
  const geminiApiKey = document.getElementById('geminiApiKey').value.trim();
  const sheetsUrl = document.getElementById('sheetsUrl').value.trim();

  if (!apiKey && !geminiApiKey) {
    showStatus('Please enter at least one API key (OpenAI or Gemini)', 'error');
    return;
  }

  chrome.storage.sync.set({
    openaiApiKey: apiKey,
    geminiApiKey: geminiApiKey,
    googleSheetsUrl: sheetsUrl
  }, () => {
    showStatus('Settings saved successfully!', 'success');
  });
});

// Test OpenAI Connection
document.getElementById('testBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();

  if (!apiKey) {
    showStatus('Please enter an OpenAI API key first', 'error');
    return;
  }

  showStatus('Testing OpenAI connection...', 'success');

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (response.ok) {
      showStatus('✅ OpenAI connection successful! API key is valid.', 'success');
    } else {
      const error = await response.json();
      showStatus(`❌ OpenAI failed: ${error.error?.message || 'Invalid API key'}`, 'error');
    }
  } catch (err) {
    showStatus(`❌ OpenAI error: ${err.message}`, 'error');
  }
});

// Test Gemini Connection
document.getElementById('testGeminiBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('geminiApiKey').value.trim();

  if (!apiKey) {
    showStatus('Please enter a Gemini API key first', 'error');
    return;
  }

  showStatus('Testing Gemini connection...', 'success');

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (response.ok) {
      showStatus('✅ Gemini connection successful! API key is valid.', 'success');
    } else {
      const error = await response.json();
      showStatus(`❌ Gemini failed: ${error.error?.message || 'Invalid API key'}`, 'error');
    }
  } catch (err) {
    showStatus(`❌ Gemini error: ${err.message}`, 'error');
  }
});

// Test Sheets Connection
document.getElementById('testSheetsBtn').addEventListener('click', () => {
  const url = document.getElementById('sheetsUrl').value.trim();

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
      profileData: "Name: Test User\nCompany: Test Company\nCurrent Role: Tester"
    }
  }, (response) => {
    if (response && response.ok) {
      showStatus('✅ Sheets connection successful! Check your Google Sheet.', 'success');
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
