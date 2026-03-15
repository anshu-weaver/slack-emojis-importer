# Slack Emoji Importer

Chrome extension that embeds a search UI into your Slack workspace's emoji customization page, letting you find and import emojis from slackmojis.com and slackemoji.com with one click.

## Features

- Embedded search panel on Slack's `/customize/emoji` page
- Search across both slackmojis.com and slackemoji.com
- One-click "Add to Slack" — no manual download/upload needed
- Filter by source (toggle each site on/off)
- Loads popular emojis on page load

## Installation

### Manual Installation (Development)
1. Clone this repository
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode"
4. Click "Load unpacked" and select this extension's directory
5. Navigate to `https://{your-workspace}.slack.com/customize/emoji`

## Usage

1. Go to your Slack workspace's emoji customization page
2. The "Emoji Importer" panel appears above the emoji list
3. Type a search term and click Search (or press Enter)
4. Click "Add to Slack" on any emoji to import it directly

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Interact with the Slack emoji customization page |
| `*://*.slack.com/*` | Inject UI and call Slack's emoji upload API |
| `https://slackmojis.com/*` | Fetch emoji listings and images |
| `https://slackemoji.com/*` | Fetch emoji listings and images |
| `https://emojis.slackmojis.com/*` | Load emoji preview images from CDN |

## Privacy

This extension does not collect, store, or transmit any user data. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for details.

## Packaging

```bash
chmod +x package.sh
./package.sh
```

This creates a zip file ready for Chrome Web Store upload.
