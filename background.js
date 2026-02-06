// Background service worker - handles API calls, Caching, and Logging
// Note: For ES6 modules, use bundler. For now, using inline implementation

// Show welcome page on first install
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  }
});

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
importScripts('prompts.js');

// Default Fallback Values from prompts.js
const defaultInstructions = typeof DEFAULT_INSTRUCTIONS !== 'undefined' ? DEFAULT_INSTRUCTIONS : '';
const defaultRules = typeof DEFAULT_RULES !== 'undefined' ? DEFAULT_RULES : '';
const MAX_CACHE_SIZE = 100; // Force clear after 100 profiles to keep storage clean

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.type === "LOG_TO_SHEETS") {
    handleSheetsLogging(msg.payload, sendResponse);
    return true;
  }

  if (msg.type !== "GENERATE_NOTE" && msg.type !== "GENERATE_MESSAGE" && msg.type !== "GENERATE_PROFILE") {
    return;
  }

  const payload = msg.payload || {};
  const pageText = payload.pageText || "";
  const url = payload.url || "";

  // Get API key and Sheets URL from storage
  chrome.storage.sync.get(['openaiApiKey', 'googleSheetsUrl'], function (result) {
    const apiKey = result.openaiApiKey;
    
    if (!apiKey) {
      sendResponse({ ok: false, error: "API key not set. Please set it in Options." });
      return;
    }

    if (msg.type === "GENERATE_PROFILE") {
      checkCache(url, function (cachedData) {
        if (cachedData) {
          console.log("📦 Cache hit for:", url);
          sendResponse({ ok: true, profile: cachedData });
        } else {
          performAIProfileExtraction(apiKey, pageText, url, sendResponse);
        }
      });
      return;
    }

    // Handle Note/Message generation
    chrome.storage.sync.get(['resumeDetails', 'signature', 'experienceMapping', 'promptInstructions', 'promptRules'], function (resResult) {
      const storedResume = resResult.resumeDetails;
      const storedSignature = resResult.signature;
      const storedMapping = resResult.experienceMapping;
      const storedInstructions = resResult.promptInstructions;
      const storedRules = resResult.promptRules;

      performAIGeneration(apiKey, msg, payload, storedResume, storedSignature, storedMapping, storedInstructions, storedRules, sendResponse);
    });
  });

  return true; // Keep channel open for async response
});

/**
 * Checks if a profile is cached and valid (< 7 days)
 */
function checkCache(url, callback) {
  const cacheKey = `profile_cache_${url}`;
  chrome.storage.local.get([cacheKey], function (result) {
    const data = result[cacheKey];
    if (data && (Date.now() - data.timestamp < CACHE_TTL)) {
      callback(data.profile);
    } else {
      callback(null);
    }
  });
}

/**
 * Saves a profile to cache with a limit check
 */
function saveToCache(url, profile) {
  const cacheKey = `profile_cache_${url}`;
  const countKey = 'profile_cache_count';

  chrome.storage.local.get([cacheKey, countKey], function (result) {
    let count = result[countKey] || 0;
    const isNew = !result[cacheKey];

    if (isNew) {
      if (count >= MAX_CACHE_SIZE) {
        console.log("🧹 Cache limit reached. Clearing storage...");
        chrome.storage.local.clear(function () {
          const newData = {
            [cacheKey]: { profile: profile, timestamp: Date.now() },
            [countKey]: 1
          };
          chrome.storage.local.set(newData);
        });
        return;
      }
      count++;
    }

    const updates = {
      [cacheKey]: { profile: profile, timestamp: Date.now() },
      [countKey]: count
    };
    chrome.storage.local.set(updates);
  });
}

/**
 * Extracts profile data using OpenAI
 */
function performAIProfileExtraction(apiKey, pageText, url, sendResponse) {
  const prompt = `
Extract detailed profile information from this LinkedIn profile text. 
Focus on identifying the current role, full experience history, and education.

Profile Text Snippet:
${pageText.substring(0, 8000)}

URL: ${url}

Return a valid JSON object with the following structure:
{
  "name": "Full Name",
  "firstName": "First Name",
  "company": "Current Company Name",
  "role": "Current Job Title / Headline",
  "location": "City, State/Country",
  "experiences": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "e.g. 2 yrs 3 mos",
      "description": "Brief summary of responsibilities (max 2 sentences)"
    }
  ],
  "education": [
    {
      "school": "University Name",
      "degree": "Degree Name"
    }
  ]
}

Rules:
- If a value is unknown, use an empty string or empty array.
- Be concise in the experience descriptions.
- Return ONLY the JSON object. No markdown formatting.
`;

  fetchOpenAI(apiKey, prompt, 800)
    .then(content => {
      try {
        const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
        const profile = JSON.parse(cleanContent);
        saveToCache(url, profile);
        sendResponse({ ok: true, profile: profile });
      } catch (e) {
        sendResponse({ ok: false, error: "JSON parse failed" });
      }
    })
    .catch(err => sendResponse({ ok: false, error: err.message }));
}

/**
 * Generates Note or Message using OpenAI
 */
function performAIGeneration(apiKey, msg, payload, storedResume, storedSignature, storedMapping, storedInstructions, storedRules, sendResponse) {
  let prompt;
  let maxTokens;
  let responseKey;

  const { name, company, role, about, bio, jobDescription } = payload;

  if (msg.type === 'GENERATE_NOTE') {
    // Note generation prompt (short, connecting)
    // My Background:
    // ${storedResume || ``} Not used at the moment as we need note to be short and concise
    prompt = `
Write a single-paragraph LinkedIn connection note. Be professional and warm.

Recipient:
Name: ${name}
Company: ${company}
Role: ${role}
About/BioSnippets: ${about || bio || ""}



${jobDescription ? `Job Description I'm Applying To:\n${jobDescription}` : ""}

CRITICAL: Maximum 300 characters EXACTLY. Count characters carefully. Do not exceed 300 characters.

Instructions:
${jobDescription ? 
  `- Write a personalized connection note that relates the recipient's background to the job I'm applying to.
- If the job description mentions specific skills, technologies, or experiences that match the recipient's background, reference those connections.
- Show genuine interest in connecting based on relevant experience or shared industry/role.` :
  `- If the role includes Founder or Co-Founder, express interest in learning about potential opportunities or roles as the company grows.
- Otherwise, write a general networking note focused on connecting and learning.`}
- Keep it concise to stay within the strict 290 character limit.

Rules:
- Output must be one line only.
- No double quotes.
- No sign-offs.
- No emojis.
- Neutral, non-salesy tone.
- STRICT: Maximum 290 characters. Verify character count before responding.
- If your response exceeds 290 characters, shorten it by removing words, not truncating.
`;
    maxTokens = 150;
    responseKey = "note";
  } else {
    // Message generation prompt (longer, professional message)
    prompt = `
Write a professional LinkedIn message. Be warm, personalized, and show genuine interest.

Recipient:
Name: ${name}
Company: ${company}
Role: ${role}
About/BioSnippets: ${about || bio || ""}

${jobDescription ? `Job Description I'm Applying To:\n${jobDescription}` : "No specific job description detection. Focus on general connection."}

My Background:
${storedResume || ''}

Instructions:
${storedInstructions || defaultInstructions}

${storedMapping ? `Experience Mapping Strategy (Use this logic to select relevant projects):
${storedMapping}` : `Experience Mapping Strategy (Map by comparing resume and job description):`}

Rules & Formatting:
${storedRules || defaultRules}
`;
    maxTokens = 800;
    responseKey = "message";
  }

  fetchOpenAI(apiKey, prompt, maxTokens)
    .then(content => {
      const response = { ok: true };
      if (responseKey === "message") {
        const subjectMatch = content.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
        const messageMatch = content.match(/MESSAGE:\s*([\s\S]+)/i);

        let messageBody = '';
        if (subjectMatch && messageMatch) {
          response.subject = subjectMatch[1].trim();
          messageBody = messageMatch[1].trim();
        } else {
          const lines = content.split('\n');
          response.subject = lines[0].replace(/SUBJECT:/i, "").trim().substring(0, 60);
          messageBody = content.replace(/SUBJECT:.*|MESSAGE:/ig, "").trim();
        }

        const portfolioLinks = storedSignature || '';

        response.message = messageBody + '\n\n' + portfolioLinks;
      } else {
        response[responseKey] = content.trim();
      }
      sendResponse(response);
    })
    .catch(err => sendResponse({ ok: false, error: err.message }));
}

function fetchOpenAI(apiKey, prompt, maxTokens) {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error.message);
      return data.choices[0].message.content.trim();
    });
}

function handleSheetsLogging(data, sendResponse) {
  chrome.storage.sync.get(['googleSheetsUrl'], function (result) {
    const url = result.googleSheetsUrl;

    if (!url) {
      console.warn("📁 Google Sheets URL not set. Skipping log.");
      sendResponse({ ok: false, error: "Sheets URL not set" });
      return;
    }

    console.log("📁 Logging to Sheets:", url);
    const payload = {
      ...data,
      timestamp: new Date().toISOString(),
      dateLabel: new Date().toLocaleString()
    };

    fetch(url, {
      method: "POST",
      redirect: "follow",
      // Using text/plain to avoid CORS preflight, which GAS doesn't handle well
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          console.error("❌ Sheets Log Failed:", res.status, text);
          sendResponse({ ok: false, error: `Sheets Error: ${res.status}` });
        } else {
          console.log("✅ Sheets Log Success!");
          sendResponse({ ok: true });
        }
      })
      .catch(err => {
        console.error("❌ Sheets Log Network Error:", err);
        sendResponse({ ok: false, error: err.message });
      });
  });
}


// Removed hardcoded getResumeDetails() - using DEFAULT_RESUME from prompts.js
