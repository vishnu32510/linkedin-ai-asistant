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
    performAIGeneration(apiKey, msg, payload, sendResponse);
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
 * Saves a profile to cache
 */
function saveToCache(url, profile) {
  const cacheKey = `profile_cache_${url}`;
  const data = {
    profile: profile,
    timestamp: Date.now()
  };
  chrome.storage.local.set({ [cacheKey]: data });
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
function performAIGeneration(apiKey, msg, payload, sendResponse) {
  let prompt;
  let maxTokens;
  let responseKey;

  const { name, firstName, company, role, jobDescription } = payload;
  const resumeDetails = getResumeDetails();

  if (msg.type === "GENERATE_NOTE") {
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

${jobDescription ? `Job Description I'm Applying To:\n${jobDescription}` : ""}

My Background:
${resumeDetails}

Key Highlights:
- Full-stack and mobile engineer with extensive experience in Flutter, backend systems, and AI-powered workflows
- Currently Software Engineer at HealthLab Innovations (Python/FastAPI, Go, GCP, Azure, Healthcare)
- Co-founded Floxi, an eco-rewards mobile app (Flutter, Next.js, Node.js, Flask, GCP, AI/LLM)
- Strong background in Gen AI & LLM tools (ADK, LangChain, MCP, RAG pipelines, Prompt Engineering)
- Experience with cloud platforms (GCP, Azure, AWS), microservices, CI/CD, and distributed systems
- Built production applications end-to-end with focus on scalability, security, and compliance

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
- Mention that I've attached my resume.
- Keep ALL paragraphs SHORT and concise (2-3 sentences each maximum) - be direct and to the point.
- First paragraph: Keep it SHORT (2-3 sentences max). Brief introduction and why you're reaching out.
- Second paragraph: Keep it SHORT (2-3 sentences max). Select the MOST RELEVANT project or work experience from the resume details based on the company's industry, technologies, or role requirements:
  * Healthcare companies/roles: Reference HealthLab Innovations (FastAPI, Go, healthcare compliance, ETL pipelines) or Leap Of Faith (HIPAA-compliant Flutter apps, EHR/FHIR)
  * Fintech/Banking: Reference Grootan Technologies (Flutter fintech apps, 1M+ downloads, Stripe payments, biometric auth)
  * Sustainability/Eco-tech/Consumer products: Reference Floxi (eco-rewards platform, RAG-based AI, Flutter, Next.js, carbon tracking)
  * AI/ML/Data companies: Reference Fact Dynamics (AI fact-checking, Perplexity SDKs), HealthLab (LLM integration, OCR), or Floxi (RAG pipelines, agentic orchestration)
  * Mobile/Flutter roles: Reference Floxi (Flutter co-founder), Grootan (Flutter Engineer II), or Leap Of Faith (HIPAA-compliant Flutter apps)
  * Backend/API roles: Reference HealthLab (FastAPI, Go microservices, ETL), Floxi (Node.js/Flask APIs, PostgreSQL), or Leap Of Faith (FastAPI backend)
  * IoT/Embedded: Reference Farazon (IoT systems, MQTT, sensor-based apps)
  Be specific about how that particular experience relates to what the company does or what the role requires.` :
  `- Write a personalized message based on the recipient's role and company.
- Research the company's industry, products, or mission and connect it to your projects.
- If the role includes Founder or Co-Founder, express interest in learning about potential opportunities or roles as the company grows.
- Otherwise, write a message focused on connecting, learning about their work, and exploring potential opportunities.
- Keep ALL paragraphs SHORT and concise (2-3 sentences each maximum) - be direct and to the point.
- First paragraph: Keep it SHORT (2-3 sentences max). Brief introduction and why you're reaching out.
- Second paragraph: Keep it SHORT (2-3 sentences max). Select the MOST RELEVANT project or work experience from the resume details based on the company's industry, products, or mission:
  * Healthcare companies: Reference HealthLab Innovations (FastAPI, Go, healthcare compliance, ETL pipelines) or Leap Of Faith (HIPAA-compliant Flutter apps, EHR/FHIR)
  * Fintech/Banking: Reference Grootan Technologies (Flutter fintech apps, 1M+ downloads, Stripe payments, biometric auth)
  * Sustainability/Eco-tech/Consumer products: Reference Floxi (eco-rewards platform, RAG-based AI, Flutter, Next.js, carbon tracking)
  * AI/ML/Data companies: Reference Fact Dynamics (AI fact-checking, Perplexity SDKs), HealthLab (LLM integration, OCR), or Floxi (RAG pipelines, agentic orchestration)
  * Mobile/Flutter companies: Reference Floxi (Flutter co-founder), Grootan (Flutter Engineer II), or Leap Of Faith (HIPAA-compliant Flutter apps)
  * Backend/API companies: Reference HealthLab (FastAPI, Go microservices, ETL), Floxi (Node.js/Flask APIs, PostgreSQL), or Leap Of Faith (FastAPI backend)
  * IoT/Embedded companies: Reference Farazon (IoT systems, MQTT, sensor-based apps)
  Be specific about how that particular experience relates to what the company does.`}
- Keep it professional but warm and conversational.
- NEVER use generic phrases like "I hope this message finds you well" or "I hope you're doing well" - these are cliché and should be avoided
- Always start with "Hi [FirstName]" (never use "Hello")
- Keep ALL paragraphs SHORT and concise (2-3 sentences each maximum) - be direct and to the point, avoid lengthy explanations
- Generate ONLY the greeting starting with "Hi" and 2 SHORT body paragraphs (both concise and to the point). Portfolio links and closing signature will be added automatically.

Format:
- Start with: "Hi [FirstName]" or "Hi [FirstName] [Company] Team," (always use "Hi", never "Hello")
- First paragraph: Keep it SHORT and concise (2-3 sentences max). Brief introduction and why you're reaching out. Be direct and to the point.
- Second paragraph: Keep this SHORT (2-3 sentences max). Connect your projects/experience to the company's work, mission, or industry. Reference specific aspects of the company that relate to your background (e.g., if they work with Flutter/mobile apps, mention Floxi; if they use AI, mention Fact Dynamics).
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

My background as a Bac
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

        const portfolioLinks = `
Portfolio: https://vishnupriyan.dev/
GitHub: https://github.com/vishnu32510
Floxi (Co-founder): https://floxi.co
Fact Dynamics (Perplexity Showcase): https://docs.perplexity.ai/cookbook/showcase/fact-dynamics

Thank you for your time and consideration. I'd love the opportunity to speak further.

Best regards,
Vishnu Priyan Sellam Shanmugavel
vishnu32510@gmail.com`;

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

function getResumeDetails() {
  return `
CONTACT INFORMATION:
- Location: Charlotte, NC 28277
- Phone: +13127154060
- Email: vishnu32510@gmail.com
- LinkedIn: linkedin.com/in/vishnu32510
- GitHub: github.com/vishnu32510
- Devpost: devpost.com/vishnu32510
- Website: vishnupriyan.dev

SUMMARY:
- Backend Engineer with 4 years of experience building Python and JavaScript backend systems in production. Experienced in cloud-native microservices, ETL pipelines, and event-driven architectures on AWS, GCP, and Azure, with a focus on reliability, auditability, and scalability.
- Flutter Engineer with 5 years of experience building scalable, production-ready apps using Flutter SDK, Dart, and Bloc. Skilled in Clean Architecture, state management, and automated testing (unit, widget, integration). Delivered healthtech, fintech and sustainability products in agile teams, ensuring performance and reliability.
- Published open-source SDKs (perplexity_dart, perplexity_flutter) and built hackathon winning apps (Floxi, Chi Planner). Currently contributing to Dart Frog.

SKILLS:
- Programming Languages: Python, JavaScript, TypeScript, Go, Dart, Kotlin, Swift, C, C++, Java, Rust, Scala
- Gen AI & LLM Tools: ADK, LangChain, AutoGen, MCP, RAG pipelines, LLMs, OCR+LLM extraction, Vector embedding, Prompt Engineering
- Frameworks & Libs: Flask, FastAPI, Node.js, React.js, Next.js, Angular, Gin, Play Framework, Room, Mocha, Dart Frog, Bloc, Provider, Riverpod, MVVM, MVC, MVI, Clean Architecture
- Cloud & DevOps: GCP, Azure, AWS, Firebase, Docker, Containers, FCM, CI/CD, Pub/Sub, Jenkins, Git
- Data & Integrations: REST/gRPC APIs, BigQuery, GraphQL, Kafka, RabbitMQ, ETL, Data Pipelines, Automations, SQL, SQLite, Hive, NoSQL
- Mobile Development: Flutter SDK, Android SDK, Jetpack Compose, SwiftUI, Bloc, Redux, MVVM, JUnit, Mockito, XCTest, a11y
- Tools & Platforms: VSCode, Android Studio, XCode, Jupyter Notebooks, JIRA, GIT
- Testing: Flutter Test, Widget Test, Unit Test, Mockito, Integration Tests, Firebase Test, JUnit, XCTest
- Methodologies: OOP, TDD, SOLID, Agile, Scrum, Integration Testing, Distributed Systems, Multi-Tiered, Continuous Integration pipelines, Flutter-First Mindset

WORK EXPERIENCE:
- BACKEND ENGINEER / SOFTWARE DEVELOPER | HealthLab Innovations Inc, Arlington, VA | Remote | OCT 2025 - Present
  Tech: Python (FastAPI), GoLang, React.js(TypeScript), OCR, GCP, Azure, MongoDB, Docker, LLM Integration, Healthcare Data, AWS, JSON
  Designed FastAPI and Go microservices for lab code mapping and data validation, improving data accuracy.
  Built production ETL pipelines processing 1.5M+ files, with idempotency, audit logs, and automated 8 Cloud Run jobs.
  Designed and deployed Dockerized services on GCP/Azure using CI/CD pipelines, safe rollout, achieving 99% uptime.
  Implemented REST/gRPC + GraphQL APIs with auditability, observability, and healthcare compliance requirements.
  Built and maintained React.js/Next.js + TypeScript portals for patients and staff by adding role based access.
  Building and deploying REST APIs using FastAPI and GoLang for lab code mapping and scalable lookup microservices.

- FLUTTER ENGINEER / SOFTWARE DEVELOPMENT INTERN | Leap Of Faith Technologies, Chicago, IL | Remote | MAY 2025 - Present
  Tech: Python, AWS, ETL, Flutter(Dart), Provider, EHR/FHIR, HIPAA Certified, Functional Tool, MCP, Docker, LoRA/QLoRA, LLaMA
  Integrated MCP and LLM/agent based ETL with FlaskAPI, enabling automated insight for healthcare operations.
  Built & deployed a HIPAA-compliant healthcare Flutter app for EHR/FHIR data visualization on Play & App Store.
  Developed secure modules combining mobile technology and AI with Flutter to deliver a HIPAA-compliant experience.
  Developed backend mapping logic in FastAPI for the TheraCare platform, supporting patients and clinicians.
  Implemented TalkBack/VoiceOver accessibility, increasing compliance with accessibility standards for visually impaired.

- FLUTTER ENGINEER / BACKEND ENGINEER / CO-FOUNDER | Floxi, Chicago, IL | floxi.co | APR 2025 - Present
  Tech: Flask(Python), Node.js(JavaScript), Next.js(TypeScript), ADK, Flutter(Dart), Dart(Frog), Android, iOS, AI(LLM), Cloud SQL, Docker, Jetpack Compose, SwiftUI
  Migrating B2B+B2C eco-reward app from Flutter to native Android/iOS with Jetpack Compose & SwiftUI.
  Deployed AI integrated Flutter app to the App and Play Store using automated CI/CD pipelines.
  Built and maintained web and mobile features for eco-reward platforms using React.js, Next.js, Flutter, Node.js and Flask.
  Deployed Dockerized Node.js/Flask APIs migrated MySQL to PostgreSQL using backward-compatible schema changes.
  Designed a RAG-based eco-product suggestion system using agentic orchestration with functional & MCP tools.
  Built a receipt-extraction pipeline with OCR/LLM hybrid models, achieving 95% accuracy across real-world receipts.
  Built AI-driven product suggestions, barcode scanning, and receipt-based carbon tracking as scalable GCP microservices.
  Collaborated through pair programming, design syncs, and reviews to ensure rapid iteration and maintainable code.

- FLUTTER ENGINEER II | Grootan Technologies, Chennai | MAR 2022 - NOV 2023
  Tech: Dart(Flutter), Kotlin(Android), Swift(iOS), Plugin, TeamCity(CI/CD), Sentry, State management(Bloc), DSA, Fintech
  Collaborated in an agile, cross-functional team coordinating with PM in White-Label Superapps (Istanbul Senin - Banking, 1M+ downloads).
  Modularized the app architecture improving maintainability and scalability, reducing application load time by 40%.
  Refactored 50k+ LOC using Bloc, TDD, and SOLID principles, boosting test (unit and integration) coverage by 80%.
  Integrated Stripe for payments and built biometric authentication workflows to enhance app security and UI/UX.
  Implemented TalkBack/VoiceOver accessibility raising compliance. Leveraged Kotlin and Swift for plugin development.
  Diagnosed ANRs and memory leaks via Profiler and Sentry. Automated CI/CD via TeamCity, reducing effort by 80%.
  Mentored and onboarded 3 junior engineers, conducted code reviews, owned feature modules & contributed to architecture decisions.

- FLUTTER DEVELOPER / SOFTWARE ENGINEER | Farazon Software Technologies, Coimbatore | APR 2021 - MAR 2022
  Tech: Python, R & D, Dart(Flutter), Bloc, Flask, Embedded C, Firebase, Internet of Things, Embedded Systems, AWS, MQTT, DSA
  Contributed to the R & D team developing real-time IoT systems for oxygen generators using Flutter and MQTT.
  Collaborated with the R & D team to develop real-time IoT systems for oxygen generators using Flutter and MQTT.
  Developed cross-platform sensor-based apps (Bluetooth, GPS, NFC) & integrated IoT telemetry using Flask & Firebase.

HACKATHON PROJECTS & ACHIEVEMENTS:
- Fact Dynamics (Perplexity AI Cookbook): Built a real-time AI-powered fact checking app to verify spoken and visual claims Android/iOS/Web via Firebase. Authored and published perplexity_dart & perplexity_flutter SDKs on pub.dev.
- Chi Planner (Winner - Scarlet Hacks 2024): Won the hackathon for developing a real-time trip planner.

EDUCATION:
- Master of Science in Computer Science | Illinois Institute of Technology, Chicago, IL | JAN 2024 - DEC 2025 | 3.4/4
  Coursework: Machine Learning, Computer Vision, Operating Systems, Data Structures & Algorithms, Big Data Technology
- Bachelor of Technology, Electronics and Communication Engineering | Amrita Vishwa Vidhyapeetham, Coimbatore, India | JUL 2017 - JUN 2021 | 7.47/10
`;
}
