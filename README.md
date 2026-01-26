# LinkedIn GPT Note Generator

A Chrome extension that generates **personalized LinkedIn connection notes and messages** using GPT-4o-mini. Fully automated - generates, opens the connect/message dialog, and pastes the content for you.

## ✨ Features

- **🤖 GPT-Powered Note Generation**: Generates personalized connection notes (max 300 chars) using GPT-4o-mini
- **💬 GPT-Powered Message Generation**: Generates personalized LinkedIn messages with your portfolio links
- **🎯 Job-Specific Customization**: Optional job description input for targeted notes/messages
- **⚡ Fully Automated**: Automatically clicks "Connect" → "Add a note" → pastes the generated note
- **🔄 Smart Button Detection**: Finds buttons even when hidden behind "More" menu
- **📋 Fallback Support**: Copies to clipboard if auto-paste fails
- **🔒 Secure**: API key stored locally in Chrome storage (never hardcoded)

## 🚀 Quick Start

### 1. Install the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the `linkedin_note` folder

### 2. Set Your OpenAI API Key

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Right-click the extension icon → **"Options"**
   - Or go to `chrome://extensions/` → Find the extension → Click **"Options"**
3. Enter your API key (starts with `sk-proj-` or `sk-`)
4. Click **"Save"**
5. (Optional) Click **"Test Connection"** to verify

### 3. Use It!

1. Navigate to any LinkedIn profile (`linkedin.com/in/username`)
2. Two buttons will appear:
   - **"Generate LinkedIn Note"** (blue) - For connection requests
   - **"Generate LinkedIn Message"** (green) - For direct messages
3. Click either button:
   - **Note**: Optional job description popup → Auto-opens Connect dialog → Pastes note
   - **Message**: Optional job description popup → Auto-opens Message composer → Pastes message

## 📁 Project Structure

The codebase follows **SOLID principles** with a modular, feature-based structure:

```
linkedin_note/
├── manifest.json          # Extension manifest
├── background.js          # Service worker (handles OpenAI API calls)
├── content.js            # Main entry point
├── options.html/js        # Options page for API key management
├── constants.js          # Shared constants (selectors, timeouts, portfolio links)
│
├── utils/                # Reusable utilities
│   ├── dom.js           # DOM operations (waiting, finding, pasting)
│   ├── ui.js            # UI components (snackbar, modals, buttons)
│   └── storage.js       # Chrome storage utilities
│
├── features/             # Feature modules
│   ├── profile.js       # Extract LinkedIn profile data
│   ├── buttons.js       # Find LinkedIn buttons (More, Connect, Message, Add Note)
│   ├── connect.js       # Connect workflow (More → Connect → Add Note → Paste)
│   ├── message.js       # Message workflow (Open composer → Paste)
│   ├── note.js          # Note generation UI and logic
│   └── injection.js     # Inject buttons into LinkedIn pages
│
└── services/            # External services
    └── openai.js        # OpenAI API service (namespace pattern)
```

## 🎯 How It Works

### Note Generation Flow

1. User clicks **"Generate LinkedIn Note"**
2. Optional: User enters job description (or skips)
3. Extension extracts profile data (name, company, role)
4. Sends to GPT-4o-mini with personalized prompt
5. GPT generates note (max 300 chars, personalized)
6. Extension automatically:
   - Finds "Connect" button (or "More" → "Connect")
   - Clicks "Add a note"
   - Pastes the generated note
   - Shows success message

### Message Generation Flow

1. User clicks **"Generate LinkedIn Message"**
2. Optional: User enters job description (or skips)
3. Extension extracts profile data
4. Sends to GPT-4o-mini with personalized prompt (includes your portfolio links)
5. GPT generates professional message
6. Extension automatically:
   - Finds "Message" button
   - Opens message composer
   - Pastes the generated message
   - Shows success message

## 🔧 Technical Details

- **Manifest Version**: 3
- **GPT Model**: gpt-4o-mini
- **Storage**: Chrome Storage API (sync)
- **Architecture**: Modular namespace pattern (no build step needed)
- **Browser Support**: Chrome, Edge, Brave (Chromium-based)

## 🛠️ Troubleshooting

### "API key not set"
- Right-click extension icon → Options
- Enter your OpenAI API key
- Click Save

### "Extension context invalidated"
- Refresh the LinkedIn page (F5)
- This happens if you reloaded the extension while the page was open

### "Note/Message not pasting"
- Check browser console (F12) for errors
- Extension will copy to clipboard as fallback
- Try manually pasting (Cmd+V / Ctrl+V)

### "Button not found"
- Make sure you're on a LinkedIn profile page (`/in/username`)
- Wait a few seconds for the page to fully load
- Check browser console for debug info

## 🔒 Security

- ✅ API key stored in Chrome Storage (encrypted, local only)
- ✅ Never hardcoded in source code
- ✅ Never sent anywhere except OpenAI
- ✅ Never shared or logged

## 📝 Notes

- **Note Limit**: LinkedIn connection notes are limited to 300 characters
- **Message Length**: Messages can be longer (GPT generates appropriately)
- **Portfolio Links**: Automatically included in messages (from `constants.js`)
- **Job Description**: Optional - helps GPT create more targeted content

## 🎨 Customization

Edit `constants.js` to customize:
- Portfolio links
- Timeouts
- Button selectors
- Portfolio information in prompts

## 📄 License

MIT License - feel free to use and modify!

## 🙏 Credits

Built with:
- OpenAI GPT-4o-mini
- Chrome Extension APIs
- SOLID principles for clean architecture
