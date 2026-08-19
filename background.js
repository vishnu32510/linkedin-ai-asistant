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
importScripts('prompts.js', 'user_data.js');

// ─── AI PROVIDER FLAG ────────────────────────────────────────────────────────
// Switch between 'openai' and 'gemini'. No env file needed — just change here.
const AI_PROVIDER = 'gemini'; // 'openai' | 'gemini'
// ─────────────────────────────────────────────────────────────────────────────

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
  chrome.storage.sync.get(['openaiApiKey', 'geminiApiKey', 'googleSheetsUrl'], function (result) {
    const apiKey = AI_PROVIDER === 'gemini' ? result.geminiApiKey : result.openaiApiKey;

    if (!apiKey) {
      const providerLabel = AI_PROVIDER === 'gemini' ? 'Gemini' : 'OpenAI';
      sendResponse({ ok: false, error: `${providerLabel} API key not set. Please set it in Options.` });
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

    // Handle Note/Message generation using fixed code configurations
    const resumeData = typeof USER_RESUME_DETAILS !== 'undefined' ? USER_RESUME_DETAILS : '';
    const signatureData = typeof USER_SIGNATURE !== 'undefined' ? USER_SIGNATURE : '';
    const mappingData = typeof USER_EXPERIENCE_MAPPING_STRATEGY !== 'undefined' ? USER_EXPERIENCE_MAPPING_STRATEGY : '';
    const instructionsData = typeof USER_PROMPT_INSTRUCTIONS !== 'undefined' ? USER_PROMPT_INSTRUCTIONS : defaultInstructions;
    const rulesData = typeof DEFAULT_RULES !== 'undefined' ? DEFAULT_RULES : '';

    performAIGeneration(apiKey, msg, payload, resumeData, signatureData, mappingData, instructionsData, rulesData, sendResponse);
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
You are extracting structured data from a LinkedIn profile.

TASK:
Extract ALL available professional experience entries and education entries from the text.
Do NOT stop after the first role. Enumerate every distinct experience listed.

Profile Text:
${pageText.substring(0, 8000)}

Profile URL:
${url}
OUTPUT FORMAT (VALID JSON ONLY):
Return a valid JSON object with the following structure:
{
  "name": "Full Name",
  "firstName": "First Name",
  "headline": "Full LinkedIn headline",
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

STRICT RULES:
- Include EVERY job, internship, contract, or role mentioned.
- Experiences MUST be listed in reverse chronological order (most recent first).
- If multiple roles exist at the same company, list them as separate entries.
- Do NOT merge roles unless the title is identical.
- If information is missing, use an empty string.
- If no experiences are found, return an empty array.
- Return ONLY valid JSON. No commentary, no markdown.

VALIDATION:
- The experiences array should contain MORE THAN ONE entry if multiple roles are present in the text.
- Do not summarize the career into a single role.
`;

  fetchAI(apiKey, prompt, 2000)
    .then(content => {
      try {
        const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
        const profile = JSON.parse(cleanContent);
        saveToCache(url, profile);
        sendResponse({ ok: true, profile: profile });
      } catch (e) {
        sendResponse({ ok: false, error: "JSON parse failed. API response may have been truncated." });
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

  const { name, company, role, headline, about, bio, jobDescription } = payload;

  if (msg.type === 'GENERATE_NOTE') {
    // Note generation prompt (short, connecting)
    prompt = `
Write a single-paragraph LinkedIn connection note. Be professional and warm.

My Background (sender):
${storedResume || ''}

Recipient:
Name: ${name || ""}
Headline: ${headline || ""}
Company: ${company || ""}
Role: ${role || ""}
About/BioSnippets: ${about || bio || ""}

${jobDescription ? `Job Description I'm Applying To:\n${jobDescription}` : ""}

Instructions:
${jobDescription ?
      `- Write a personalized connection note that relates MY background (sender) to the job I'm applying to.
- Reference a specific, relevant connection between my experience and the job or recipient's background.
- Show genuine interest in connecting based on that specific shared industry or skill.` :
      `- If the role includes Founder or Co-Founder, express interest in learning about potential opportunities as the company grows.
- Otherwise, write a general networking note focused on connecting and learning from their work.`}
- Keep it concise to stay within the strict 290 character limit.
- Focus on the recipient's CURRENT or most recent role when making a connection — do not reference older experience.

Rules:
- Output must be one line only.
- No double quotes.
- No sign-offs.
- No emojis.
- Neutral, non-salesy tone.
- STRICT: Maximum 290 characters. Verify character count before responding.
- If your response exceeds 290 characters, shorten it by removing words, not truncating.
`;
    maxTokens = 2000; // Plenty of room for thinking + output. Length strictly governed by prompt rules (290 chars).
    responseKey = "note";
  } else {
    // Message generation prompt (longer, professional message)
    prompt = `
Write a professional LinkedIn message. Be warm, personalized, and show genuine interest.

Recipient:
Name: ${name || ""}
Headline: ${headline || ""}
Company: ${company || ""}
Current Role: ${role || ""}
About/BioSnippets: ${about || bio || ""}

${payload.profileData ? `Recipient Full Profile (experiences listed most recent first):\n${payload.profileData}` : ''}

${jobDescription ? `Job Description I'm Applying To:\n${jobDescription}` : "No job description provided. Focus on general networking and mutual interest in their work."}

My Background:
${storedResume || ''}

Instructions:
${storedInstructions || defaultInstructions}
- When referencing the recipient's background, focus on their CURRENT or most recent 1-2 roles — do not reference their older experience unless it is uniquely relevant.

${storedMapping ? `Experience Mapping Strategy (Use this logic to select the most relevant project or role):
${storedMapping}` : ''}

Rules & Formatting:
${storedRules || defaultRules}
`;
    maxTokens = 2500; // Plenty of room for thinking + full message output. Length governed by prompt rules.
    responseKey = "message";
  }

  fetchAI(apiKey, prompt, maxTokens)
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

function fetchGemini(apiKey, prompt, maxTokens) {
  const model = 'gemini-3.6-flash';
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 500 } // 500 thinking + 500 output fits within maxOutputTokens:1000
      }
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error.message || data.error.status);
      // Filter out thought parts (internal reasoning) — only use actual response parts
      const parts = data.candidates[0].content.parts || [];
      const text = parts.filter(p => !p.thought).map(p => p.text || '').join('').trim();
      return text;
    });
}

/**
 * Routes to the correct AI provider based on AI_PROVIDER flag.
 * Drop-in replacement for fetchOpenAI — same signature, same return.
 */
function fetchAI(apiKey, prompt, maxTokens) {
  console.log(`🤖 Using provider: ${AI_PROVIDER}`);
  return AI_PROVIDER === 'gemini'
    ? fetchGemini(apiKey, prompt, maxTokens)
    : fetchOpenAI(apiKey, prompt, maxTokens);
}



// Removed hardcoded getResumeDetails() - using DEFAULT_RESUME from prompts.js

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
