// Background service worker - handles API calls
// Note: For ES6 modules, use bundler. For now, using inline implementation

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.type !== "GENERATE_NOTE" && msg.type !== "GENERATE_MESSAGE") {
    return;
  }

  const name = msg.payload.name;
  const company = msg.payload.company;
  const role = msg.payload.role;
  const jobDescription = msg.payload.jobDescription || null;

  // Get API key from storage
  chrome.storage.sync.get(['openaiApiKey'], function(result) {
    const apiKey = result.openaiApiKey;
    
    if (!apiKey) {
      sendResponse({ 
        ok: false, 
        error: "API key not set. Please set your OpenAI API key in the extension options." 
      });
      return;
    }

    let prompt;
    let maxTokens;
    let responseKey;

    if (msg.type === "GENERATE_NOTE") {
      // Note generation prompt (short, 300 chars max)
      prompt = `
Write a single-paragraph LinkedIn connection note. Be professional and warm.

Recipient:
Name: ${name}
Company: ${company}
Role: ${role}

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
      maxTokens = 120;
      responseKey = "note";
    } else {
      // Message generation prompt (longer, professional message)
      prompt = `
Write a professional LinkedIn message. Be warm, personalized, and show genuine interest.

Recipient:
Name: ${name}
Company: ${company}
Role: ${role}

${jobDescription ? `Job Description I'm Applying To:\n${jobDescription}` : ""}

My Background:
- Full-stack and mobile engineer
- Strong experience in Flutter, backend systems, and AI-powered workflows
- Built production applications end-to-end
- Co-founded Floxi, an eco-rewards mobile app

My Portfolio Links (MUST INCLUDE ALL OF THESE IN EVERY MESSAGE):
- Portfolio: https://vishnupriyan.dev/
- GitHub: https://github.com/vishnu32510
- Floxi (Co-founder): https://floxi.co
- Fact Dynamics (Perplexity Showcase): https://docs.perplexity.ai/cookbook/showcase/fact-dynamics

CRITICAL REQUIREMENT - PORTFOLIO LINKS:
- You MUST ALWAYS include ALL four portfolio links listed above in every message - no exceptions
- Format each link on its own line: "Portfolio: [URL]", "GitHub: [URL]", "Floxi (Co-founder): [URL]", "Fact Dynamics (Perplexity Showcase): [URL]"
- Place all links together in a dedicated section near the end, before the closing
- Never omit, skip, or forget any of these links - they must appear in every single message

Instructions:
${jobDescription ? 
  `- Write a personalized message that relates the recipient's background to the job I'm applying to.
- If the job description mentions specific skills, technologies, or experiences that match the recipient's background, reference those connections.
- Show genuine interest in the role and how my background aligns with their needs.
- Mention that I've attached my resume.` :
  `- Write a personalized message based on the recipient's role and company.
- If the role includes Founder or Co-Founder, express interest in learning about potential opportunities or roles as the company grows.
- Otherwise, write a message focused on connecting, learning about their work, and exploring potential opportunities.`}
- Keep it professional but warm and conversational.
- Include a greeting, 2-3 body paragraphs, ALL portfolio links, and a closing.

Format:
- Start with: "Hello [FirstName]" or "Hello [FirstName] [Company] Team,"
- Include 2-3 body paragraphs
- Include ALL four portfolio links in a dedicated section (each on its own line, formatted as: "Portfolio: [URL]", "GitHub: [URL]", "Floxi (Co-founder): [URL]", "Fact Dynamics (Perplexity Showcase): [URL]")
- End with: "Thank you for your time and consideration. I'd love the opportunity to speak further.\n\nBest regards,"

IMPORTANT: Your response must be in this EXACT format:
SUBJECT: [A short, professional subject line (max 60 characters)]
MESSAGE: [The full message body - MUST include all 4 portfolio links]

Example:
SUBJECT: Interest in Full Stack Engineer Position
MESSAGE: Hello John,

I hope you're doing well...
`;

      maxTokens = 500;
      responseKey = "message";
    }

    fetch("https://api.openai.com/v1/chat/completions", {
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
      .then(function(res) {
        if (!res.ok) {
          return res.json().then(function(errorData) {
            throw new Error(errorData.error?.message || 'API request failed: ' + res.status);
          });
        }
        return res.json();
      })
      .then(function(data) {
        // Check for API errors in response
        if (data.error) {
          sendResponse({ 
            ok: false, 
            error: data.error.message || 'OpenAI API error: ' + JSON.stringify(data.error)
          });
          return;
        }
        
        const content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) 
          ? data.choices[0].message.content.trim() 
          : null;
        
        if (!content) {
          sendResponse({ 
            ok: false, 
            error: 'No content generated. API response: ' + JSON.stringify(data)
          });
          return;
        }
        
        const response = {};
        response.ok = true;
        
        // For messages, parse subject and body
        if (responseKey === "message") {
          const subjectMatch = content.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
          const messageMatch = content.match(/MESSAGE:\s*([\s\S]+)/i);
          
          if (subjectMatch && messageMatch) {
            response.subject = subjectMatch[1].trim();
            response.message = messageMatch[1].trim();
          } else {
            // Fallback: use first line as subject, rest as message
            const lines = content.split('\n');
            response.subject = lines[0].trim().substring(0, 60);
            response.message = content;
          }
        } else {
          response[responseKey] = content;
        }
        
        sendResponse(response);
      })
      .catch(function(err) {
        console.error('OpenAI API Error:', err);
        sendResponse({ 
          ok: false, 
          error: err.message || 'Failed to generate content. Please check your API key and try again.'
        });
      });
  });

  return true; // Keep channel open for async response
});
