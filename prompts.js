const DEFAULT_INSTRUCTIONS = `- Write a personalized message that relates the recipient's background to the job I'm applying to.
- Research the company's industry, products, or mission and connect it to your projects.
- If the role includes Founder or Co-Founder, express interest in learning about potential opportunities or roles as the company grows.
- If the job description mentions specific skills, technologies, or experiences that match the recipient's background, reference those connections.
- Otherwise, write a message focused on connecting, learning about their work, and exploring potential opportunities.
- Show genuine interest in the role and how my background aligns with their needs.
- Mention that I've attached my resume.
- Keep ALL paragraphs SHORT and concise (2-3 sentences each maximum) - be direct and to the point.
- First paragraph: Keep it SHORT (2-3 sentences max). Brief introduction and why you're reaching out.
- Second paragraph: Keep it SHORT (2-3 sentences max). Select the MOST RELEVANT project or work experience from the resume details based on the company's industry, technologies, or role requirements:
  Be specific about how that particular experience relates to what the company does or what the role requires.`;

const DEFAULT_RULES = `- Keep it professional but warm and conversational.
- NEVER use generic phrases like "I hope this message finds you well" or "I hope you're doing well" - these are cliché and should be avoided
- Always start with "Hi [FirstName]" (never use "Hello")
- Keep ALL paragraphs SHORT and concise (2-3 sentences each maximum) - be direct and to the point, avoid lengthy explanations
- Generate ONLY the greeting starting with "Hi" and 2 SHORT body paragraphs (both concise and to the point). Portfolio links and closing signature will be added automatically.

Format:
- Start with: "Hi [FirstName]" or "Hi [FirstName] [Company] Team," (always use "Hi", never "Hello")
- First paragraph: Keep it SHORT and concise (2-3 sentences max). Brief introduction and why you're reaching out. Be direct and to the point.
- Second paragraph: Keep this SHORT (2-3 sentences max). Connect your projects/experience to the company's work, mission, or industry. Reference specific aspects of the company that relate to your background (e.g., if they work with Flutter/mobile apps, mention projects from your resume that used Flutter/mobile; if they use AI, mention projects that used AI/ML/LLM/agentic technologies from your resume).
- IMPORTANT: ONLY generate the greeting and 2 paragraphs. DO NOT include portfolio links or closing signature - those will be added automatically.
- NEVER use markdown formatting like ** or * for bold/italic - use plain text only
- NEVER use asterisks or special formatting characters in the message

CRITICAL PROMPT RULES:
- NEVER use phrases like "I hope this message finds you well" or "I hope you're doing well"
- NEVER use generic greetings or filler phrases
- NEVER use markdown formatting (**, *, _) - write in plain text only
- NEVER use asterisks or special formatting characters in the message body
- Keep the second paragraph concise and directly relevant to the company
- Make specific connections between your projects and their company
- DO NOT include portfolio links or closing signature - those will be added automatically

IMPORTANT: Your response must be in this EXACT format:
SUBJECT: [A short, professional subject line (max 60 characters)]
MESSAGE: [ONLY the greeting and 2 paragraphs - NO portfolio links, NO closing signature]

Example:
SUBJECT: Interest in Full Stack Engineer Position
MESSAGE: Hi John,

I'm reaching out to connect and learn more about your work at [Company]. As a [role], your experience is inspiring.

My background as a ...`;
