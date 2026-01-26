// OpenAI service - Single Responsibility: Handle OpenAI API calls
(function() {
  'use strict';
  
  if (typeof LinkedInExtension === 'undefined') {
    window.LinkedInExtension = {};
  }
  if (!LinkedInExtension.Services) {
    LinkedInExtension.Services = {};
  }

  const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
  const MODEL = "gpt-4o-mini";

  LinkedInExtension.Services.OpenAI = {
    generateNote: async function(profile, jobDescription) {
      jobDescription = jobDescription || null;
      
      const apiKey = await LinkedInExtension.Storage.getStorage('openaiApiKey');
      
      if (!apiKey) {
        throw new Error("API key not set. Please set your OpenAI API key in the extension options.");
      }

      const name = profile.name;
      const company = profile.company;
      const role = profile.role;

      const prompt = `
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

      try {
        const response = await fetch(OPENAI_API_URL, {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.6,
            max_tokens: 120
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error((error.error && error.error.message) || 'Failed to generate note');
        }

        const data = await response.json();
        const note = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) 
          ? data.choices[0].message.content.trim() 
          : null;
        
        if (!note) {
          throw new Error('No note generated');
        }

        return note;
      } catch (error) {
        console.error('OpenAI API error:', error);
        throw error;
      }
    }
  };
})();
