<div align="center">

# 📅 Calendar Integration

### Google Calendar integration for Obsidian

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/joselrnz/obsidian-calendar-integration-plugin/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Obsidian](https://img.shields.io/badge/Obsidian-0.15.0+-purple.svg)](https://obsidian.md)
[![Platform](https://img.shields.io/badge/platform-Desktop-orange.svg)](https://obsidian.md)

*A powerful, lightweight plugin that brings your Google Calendar and Tasks directly into your Obsidian vault with professional UI and seamless integration.*

[Features](#-features) • [Installation](#-installation) • [Quick Start](#-quick-start) • [Troubleshooting](#-troubleshooting)

</div>

---

## 🌟 Overview

Calendar Integration transforms how you manage your schedule in Obsidian. Whether you're planning your day, reviewing past events, or organizing tasks, this plugin provides a seamless bridge between Google Calendar and your knowledge base.

**Key Highlights:**
- 📅 **Google Calendar Integration** - View and sync your Google Calendar events
- ✅ **Google Tasks Support** - Manage your tasks alongside calendar events
- 🔄 **Professional Calendar UI** - Powered by FullCalendar with month, week, and day views
- 🎯 **Smart Integration** - Automatic daily notes injection or manual insertion anywhere
- 🔐 **Secure & Private** - OAuth 2.0 authentication with local token storage
- ⚡ **Lightweight** - Fast, efficient, 340 KB bundle

---

## ✨ Features

### Current Features

#### 🗓️ **Multiple Calendar Views**
- **Week View** - See your entire week at a glance with time slots and events
- **Month View** - Monthly calendar with event indicators and task lists
- **Day View** - Detailed daily schedule with all events and tasks

#### 📝 **Flexible Integration**
- **Automatic Daily Notes** - Events automatically appear when you open daily notes
- **Manual Insertion** - Insert calendar blocks anywhere with a simple command
- **Code Block Configuration** - Use markdown code blocks to customize your calendar views

#### 🎯 **Smart Features**
- **Date-Specific Imports** - Choose any date to view events
- **Auto-Refresh** - Configurable auto-refresh intervals
- **Event & Task Filtering** - Show/hide events or tasks as needed
- **Time Display Options** - Customize how times are displayed
- **Today Highlighting** - Current day automatically highlighted

#### 🔐 **Security & Privacy**
- **OAuth 2.0 Authentication** - Secure Google authentication
- **Local Token Storage** - Credentials stored locally in Obsidian
- **Full Calendar Access** - Create, edit, and delete events and tasks
- **No Data Collection** - Your data stays between you and Google

---

## 📋 Requirements

| Requirement | Version/Details |
|------------|-----------------|
| **Obsidian** | v0.15.0 or later |
| **Platform** | Desktop only (Windows, macOS, Linux) |
| **Google Account** | Active Google Calendar account |
| **APIs** | Google Calendar API & Google Tasks API enabled |

---

## 🚀 Installation

### Method 1: From Obsidian Community Plugins (Recommended)

> *Coming soon to the official Obsidian Community Plugins directory*

1. Open **Settings** in Obsidian
2. Navigate to **Community Plugins** and disable **Safe Mode**
3. Click **Browse** and search for "Calendar Integration"
4. Click **Install**, then **Enable**

### Method 2: Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/joselrnz/obsidian-calendar-integration-plugin/releases)
2. Extract `main.js`, `manifest.json`, and `styles.css` to:
   ```
   <vault>/.obsidian/plugins/calendar-integration/
   ```
3. Reload Obsidian
4. Enable the plugin in **Settings** → **Community Plugins**

### Method 3: Development Installation

For developers who want to contribute or test the latest features:

```bash
# Clone the repository
cd <vault>/.obsidian/plugins/
git clone https://github.com/joselrnz/obsidian-calendar-integration-plugin.git
cd obsidian-calendar-integration-plugin

# Install dependencies
npm install

# Build the plugin
npm run build

# Or run in development mode with auto-rebuild
npm run dev
```

Then enable the plugin in Obsidian settings.

---

## ⚡ Quick Start

### Step 1: Google Cloud Setup

Before using the plugin, you need to set up Google OAuth credentials. This is a one-time setup.

<details>
<summary><b>📖 Click to expand detailed Google Cloud setup instructions</b></summary>

#### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown → **New Project**
3. Name it (e.g., "Obsidian Calendar Plugin") → **Create**
4. Select your new project from the dropdown

#### 2. Enable Required APIs ⚠️ CRITICAL

You **MUST** enable both APIs:

1. Navigate to **APIs & Services** → **Library**
2. Search for **"Google Calendar API"** → **Enable**
3. Search for **"Google Tasks API"** → **Enable**
4. ⏳ **Wait 2-3 minutes** for propagation

> **Important:** If you try to use the plugin immediately after enabling APIs, you'll get 403 errors. Wait a few minutes!

#### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type → **Create**
3. Fill in required fields:
   - **App name**: "Obsidian Calendar Importer"
   - **User support email**: Your email
   - **Developer contact**: Your email
4. **Save and Continue** through Scopes (no changes needed)
5. Add **Test Users**:
   - Click **+ ADD USERS**
   - Enter your Google email
   - **Add** → **Save and Continue**

#### 4. Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. **Application type**: **Desktop app** ⚠️ (NOT Web application!)
4. Name it (e.g., "Obsidian Plugin") → **Create**
5. Copy your **Client ID** and **Client Secret**

</details>

### Step 2: Configure the Plugin

1. Open **Obsidian Settings** → **Community Plugins** → **Calendar Integration**
2. Paste your **Client ID** and **Client Secret**
3. Click **"Authenticate with Google"**
4. Sign in with your Google account in the browser
5. Grant permissions when prompted
6. Return to Obsidian - you're authenticated! ✅

### Step 3: Use Calendar Blocks

Insert a calendar block in any note using a code block:

````markdown
```google-calendar
view: week
```
````

**That's it!** Your calendar will appear in the note.

---

## 📖 Usage Examples

### Week View (Default)

````markdown
```google-calendar
view: week
date: 2025-11-05
```
````

Shows a full week view starting from the specified date (or today if omitted).

### Month View

````markdown
```google-calendar
view: month
month: 2025-11
```
````

Displays a monthly calendar with all events and tasks.

### Custom Date Range

````markdown
```google-calendar
view: week
startDate: 2025-11-03
endDate: 2025-11-09
```
````

### Auto-Refresh Calendar

````markdown
```google-calendar
view: week
refreshInterval: 30
```
````

Automatically refreshes every 30 seconds (useful for live dashboards).

### Filter Events or Tasks

````markdown
```google-calendar
view: week
showEvents: true
showTasks: false
```
````

### Hide Time Display

````markdown
```google-calendar
view: month
showTime: false
```
````


---

## 🛠️ Development

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | v16+ | JavaScript runtime |
| **npm** | v7+ | Package manager |
| **TypeScript** | 4.7+ | Type checking |
| **Obsidian** | 0.15.0+ | Testing environment |

### Building from Source

```bash
# Install dependencies
npm install

# Development build with watch mode (auto-rebuild on changes)
npm run dev

# Production build (optimized)
npm run build

# Type checking only (no build)
npm run build -- --noEmit
```

### Project Architecture

The plugin uses a modern, modular architecture:

| Module | Purpose | Key Files |
|--------|---------|-----------|
| **Auth** | OAuth 2.0 authentication | `src/auth/oauth-server.ts` |
| **API** | Google API clients | `src/api/google-calendar-api.ts` |
| **UI** | Svelte components | `src/ui/views/`, `src/ui/components/` |
| **Processors** | Code block rendering | `src/processors/calendar-code-block.ts` |
| **Parsers** | Query & event parsing | `src/parsers/` |

### Testing

```bash
# Run tests (when available)
npm test

# Run tests in watch mode
npm test -- --watch
```

### Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Make** your changes
4. **Test** thoroughly in Obsidian
5. **Commit** with clear messages: `git commit -m 'Add amazing feature'`
6. **Push** to your fork: `git push origin feature/amazing-feature`
7. **Open** a Pull Request

**Contribution Guidelines:**
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Keep commits focused and atomic
- Write clear commit messages

---

## 🔐 Privacy & Security

Your privacy and security are paramount:

| Aspect | Implementation |
|--------|----------------|
| **Authentication** | Official Google OAuth 2.0 flow |
| **Data Storage** | Tokens stored locally in Obsidian only |
| **Data Transmission** | Direct HTTPS to Google APIs |
| **Permissions** | Read-only access to calendar & tasks |
| **Data Retention** | No permanent storage; fetched on-demand |
| **Third Parties** | No data shared with third parties |

**What we access:**
- ✅ Your calendar events (read-only)
- ✅ Your tasks (read-only)

**What we DON'T access:**
- ❌ Your emails
- ❌ Your contacts
- ❌ Your files
- ❌ Any other Google services

**Data flow:**
```
Obsidian → Google OAuth → Google Calendar API → Obsidian
         (HTTPS)         (HTTPS)
```

All data stays between your Obsidian vault and Google's servers. No intermediaries.

---

## 🐛 Troubleshooting

### Common Issues

<details>
<summary><b>❌ Error 400: redirect_uri_mismatch</b></summary>

**Cause:** Wrong OAuth client type

**Solution:**
1. You created a **Web application** instead of **Desktop app**
2. Go to Google Cloud Console → Credentials
3. Delete the Web application credential
4. Create a new **Desktop app** credential
5. Update your Client ID and Secret in Obsidian

</details>

<details>
<summary><b>❌ Error 403: access_denied</b></summary>

**Cause:** Not added as a test user

**Solution:**
1. Go to Google Cloud Console → OAuth consent screen
2. Scroll to **Test users** section
3. Click **+ ADD USERS**
4. Enter your Google email address
5. Save and try authenticating again

</details>

<details>
<summary><b>❌ Error 403: API Not Enabled</b></summary>

**Symptoms:**
```
Error fetching calendar events: Google Calendar API has not been used...
GET https://tasks.googleapis.com/tasks/v1/users/@me/lists 403 (Forbidden)
```

**Solution:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Library**
3. Enable **Google Calendar API**
4. Enable **Google Tasks API**
5. ⏳ **Wait 2-3 minutes** for propagation
6. Reload the plugin in Obsidian
7. Test again

**Common mistake:** Using the plugin immediately after enabling APIs. You MUST wait!

</details>

<details>
<summary><b>❌ Error: Code block postprocessor already registered</b></summary>

**Cause:** Multiple calendar plugins enabled

**Solution:**
1. Go to Settings → Community Plugins
2. Disable all other Google Calendar plugins
3. Keep only ONE calendar plugin enabled
4. Reload Obsidian

</details>

<details>
<summary><b>🔄 Calendar not loading or updating</b></summary>

**Checklist:**
- ✅ Check internet connectivity
- ✅ Verify Google account has calendar access
- ✅ Try re-authenticating (clear tokens in settings)
- ✅ Check browser console (`Ctrl/Cmd + Shift + I`) for errors
- ✅ Ensure APIs are enabled and propagated (wait 2-3 minutes)
- ✅ Restart Obsidian

</details>

---

## 🤝 Contributing

We love contributions! Whether it's bug reports, feature requests, or code contributions, all are welcome.

### How to Contribute

1. **Report Bugs** - [Open an issue](https://github.com/joselrnz/obsidian-calendar-integration-plugin/issues/new) with details
2. **Suggest Features** - Share your ideas in [Discussions](https://github.com/joselrnz/obsidian-calendar-integration-plugin/discussions)
3. **Submit Code** - Fork, code, test, and submit a PR

### Development Workflow

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/obsidian-calendar-integration-plugin.git
cd obsidian-calendar-integration-plugin

# 2. Create a feature branch
git checkout -b feature/my-awesome-feature

# 3. Install dependencies
npm install

# 4. Make changes and test
npm run dev  # Auto-rebuild on changes

# 5. Build and verify
npm run build

# 6. Commit and push
git add .
git commit -m "Add my awesome feature"
git push origin feature/my-awesome-feature

# 7. Open a Pull Request on GitHub
```

### Code Style

- Use TypeScript for type safety
- Follow existing code formatting
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Write meaningful commit messages

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**TL;DR:** You can use, modify, and distribute this plugin freely. Just include the original license.

---

## 💖 Support & Acknowledgments

### Show Your Support

If you find this plugin useful:

- ⭐ **Star this repository** - It helps others discover the plugin
- 🐛 **Report bugs** - Help us improve
- 💡 **Suggest features** - Share your ideas
- 🔀 **Contribute code** - Make it better together
- 📢 **Spread the word** - Tell your friends!

### Acknowledgments

- **Obsidian Team** - For creating an amazing knowledge base platform
- **Google** - For providing Calendar and Tasks APIs
- **Contributors** - Everyone who has contributed code, ideas, or feedback

---

## 📞 Contact & Links

- **GitHub**: [joselrnz/obsidian-calendar-integration-plugin](https://github.com/joselrnz/obsidian-calendar-integration-plugin)
- **Issues**: [Report a bug](https://github.com/joselrnz/obsidian-calendar-integration-plugin/issues)
- **Discussions**: [Join the conversation](https://github.com/joselrnz/obsidian-calendar-integration-plugin/discussions)
- **Author**: [joselrnz](https://github.com/joselrnz)

---

## 📝 Changelog

### v2.0.0 (Current)
- ✅ Restructured codebase with modular architecture
- ✅ Improved build configuration
- ✅ Enhanced documentation
- ✅ Better error handling
- ✅ Performance optimizations
- ✅ Google Calendar integration
- ✅ Google Tasks integration
- ✅ Week, month, and day views
- ✅ Daily notes automation
- ✅ Manual calendar block insertion
- ✅ OAuth 2.0 authentication
- ✅ Auto-refresh functionality

---

<div align="center">

**Made with ❤️ for the Obsidian community**

[⬆ Back to Top](#-calendar-integration)

</div>
