# Chrome Web Store Submission Guide

Answers for the Privacy practices tab when publishing.

## Single Purpose Description

> Search emojis from slackmojis.com and slackemoji.com and import them directly into your Slack workspace from the emoji customization page.

## Permission Justifications

### activeTab

> Used to detect when the user is on the Slack emoji customization page and inject the search UI.

### Host Permission: *://*.slack.com/*

> Required to inject the emoji search panel into the Slack emoji customization page and to call Slack's internal emoji.add API to upload emojis on behalf of the authenticated user.

### Host Permission: https://slackmojis.com/*

> Required to fetch publicly available emoji listings and images from slackmojis.com for search and preview in the extension UI.

### Host Permission: https://slackemoji.com/*

> Required to fetch publicly available emoji listings and images from slackemoji.com for search and preview in the extension UI.

### Host Permission: https://emojis.slackmojis.com/*

> Required to load emoji preview images served from the slackmojis.com CDN.

### Remote Code

> This extension does not use any remote code. All JavaScript is bundled locally in the extension package. No scripts are fetched from external servers, no dynamic code execution is used, and no code is injected from remote sources.

## Data Usage Certification

This extension:
- Does NOT collect, transmit, or sell user data
- Does NOT use analytics, telemetry, or tracking
- Communicates only with slackmojis.com, slackemoji.com (to fetch public emoji data), and the user's own Slack workspace (to upload emojis)
- Does NOT store any data locally
- All code executes locally within the browser

The extension complies with the Chrome Web Store Developer Program Policies regarding data handling and user privacy.
