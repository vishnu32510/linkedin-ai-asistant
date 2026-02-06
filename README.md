<br/>
<p align="center">
  <a href="https://github.com/vishnu32510/linkedin-ai-asistant">
    <img src="icon128.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">LinkedIn AI Assistance</h3>

  <p align="center">
    AI-powered Chrome extension for generating personalized LinkedIn connection notes and messages
    <br/>
    <br/>
    <a href="https://github.com/vishnu32510/linkedin-ai-asistant">View on GitHub</a>
  </p>
</p>

---

## Features

- AI-powered connection notes and direct messages using OpenAI GPT-4o-mini
- Automatic profile extraction (name, company, role, bio)
- Optional Google Sheets logging for outreach tracking
- Customizable resume details, signature, and AI prompts
- Privacy-first: all data stored locally

## Installation

### Prerequisites

- OpenAI API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Google account (optional, for logging)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/vishnu32510/linkedin-ai-asistant.git
   ```

2. Load in Chrome:
   - Navigate to [chrome://extensions/](chrome://extensions/)
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the repository folder

3. Configure API key:
   - Click extension icon → **Options**
   - Paste OpenAI API key
   - Click **Save Settings**

## Google Sheets Logging (Optional)

### 1. Create Google Sheet

Create a new Google Sheet at [sheets.google.com](https://sheets.google.com)

### 2. Deploy Apps Script

1. In your sheet: **Extensions** → **Apps Script**
2. Paste this code:

```javascript
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Outreach");
    
    if (!sheet) {
      sheet = ss.insertSheet("Outreach");
      sheet.appendRow(["Date", "Type", "Profile URL", "Name", "Company", "Role", "Outreach Content", "Job Description", "Full Profile Bio"]);
      sheet.setFrozenRows(1);
    }
    
    var data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      data.dateLabel || new Date().toLocaleString(),
      data.type || "N/A",
      data.url || "N/A",
      data.name || "N/A",
      data.company || "N/A",
      data.role || "N/A",
      data.content || "N/A",
      data.jobDescription || "N/A",
      data.profileData || "N/A"
    ]);
    
    return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.message).setMimeType(ContentService.MimeType.TEXT);
  }
}
```

3. Save the project

### 3. Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Select type: **Web app**
3. Configure:
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Click **Deploy** → **Authorize access**
5. Grant permissions (click **Advanced** → **Go to [Project] (unsafe)** → **Allow**)
6. Copy the Web App URL

### 4. Add to Extension

1. Extension **Options** → paste URL in **Google Sheets Webhook URL**
2. Click **Test Sheets** to verify
3. Click **Save Settings**

## Usage

### Connection Notes

1. Navigate to LinkedIn profile (`linkedin.com/in/username`)
2. Click **Generate LinkedIn Note**
3. Add job description (optional)
4. Click **Generate Note**

### Direct Messages

1. Navigate to LinkedIn profile
2. Click **Generate LinkedIn Message**
3. Add job description (optional)
4. Click **Generate Message**

## Configuration

### Resume Details

Add your professional background in **Options** to personalize AI-generated messages.

### Signature

Customize message closing in **Options**:
```
Portfolio: https://yoursite.com
GitHub: https://github.com/username

Best regards,
Your Name
```

### Advanced Settings

- **Experience Mapping**: Map industries to your relevant projects
- **Prompt Instructions**: Customize AI message generation logic
- **Message Rules**: Define formatting and style preferences

## Troubleshooting

**Extension context invalidated**: Refresh the LinkedIn page

**Connection note not pasting**: Ensure you're on a profile page with connection modal open

**Sheets not logging**: 
- Verify Web App URL is correct
- Check deployment settings: "Who has access: Anyone"
- Click "Test Sheets" in Options

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE)

## Author

Vishnu Priyan Sellam Shanmugavel  
[github.com/vishnu32510](https://github.com/vishnu32510)
