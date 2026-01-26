// Load saved API key
chrome.storage.sync.get(['openaiApiKey'], (result) => {
  if (result.openaiApiKey) {
    document.getElementById('apiKey').value = result.openaiApiKey;
  }
});

// Save API key
document.getElementById('optionsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }
  
  if (!apiKey.startsWith('sk-')) {
    showStatus('Invalid API key format. OpenAI keys start with "sk-"', 'error');
    return;
  }
  
  chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
    showStatus('API key saved successfully!', 'success');
  });
});

// Test connection
document.getElementById('testBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!apiKey) {
    showStatus('Please enter an API key first', 'error');
    return;
  }
  
  if (!apiKey.startsWith('sk-')) {
    showStatus('Invalid API key format', 'error');
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
      showStatus('✅ Connection successful! API key is valid.', 'success');
    } else {
      const error = await response.json();
      showStatus(`❌ Connection failed: ${error.error?.message || 'Invalid API key'}`, 'error');
    }
  } catch (err) {
    showStatus(`❌ Connection error: ${err.message}`, 'error');
  }
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
