# Privacy Policy for Slack Emoji Importer

**Last Updated:** 2026-03-15

## Overview

Slack Emoji Importer is a Chrome extension that searches emojis from slackmojis.com and slackemoji.com and allows importing them directly into your Slack workspace. This privacy policy explains our data practices and commitment to user privacy.

## Data Collection and Usage

**We do not collect, store, or transmit any user data.**

This extension:
- Does NOT collect any personal information
- Does NOT track user behavior or browsing history
- Does NOT use cookies or local storage
- Does NOT use analytics or telemetry services

## Permissions

### activeTab

> Used to interact with the currently active Slack emoji customization page. The extension only activates on Slack's `/customize/emoji` page.

### Host Permissions: *.slack.com

> Required to inject the emoji search UI into the Slack emoji customization page and to upload emojis using Slack's internal API on behalf of the user's existing session.

### Host Permissions: slackmojis.com, slackemoji.com

> Required to fetch emoji listings and images from these public emoji directory sites for search and preview functionality.

## What the Extension Does

The extension performs only the following operations:
1. Injects a search panel UI into the Slack emoji customization page
2. Fetches publicly available emoji listings from slackmojis.com and slackemoji.com
3. Downloads emoji images from those sites when the user clicks "Add to Slack"
4. Uploads the emoji to the user's Slack workspace using Slack's emoji.add API with the user's existing session credentials

## Third-Party Services

This extension communicates with:
- **slackmojis.com** — to search and download publicly available emoji images
- **slackemoji.com** — to search and download publicly available emoji images
- **Slack API** — to upload emojis to the user's workspace (using existing session credentials)

No data is sent to any other services.

## Data Security

The extension does not store any credentials. It reads the Slack API token from the existing page session (already authenticated by the user) and uses it only for emoji uploads during the current page session.

## Children's Privacy

This extension does not knowingly collect information from children under 13 years of age.

## Changes to This Privacy Policy

We may update this privacy policy from time to time. Any changes will be reflected in the "Last Updated" date at the top of this document.

## Contact Information

If you have any questions about this privacy policy, please open an issue on our GitHub repository:
https://github.com/anshu-weaver/slack-emojis-importer

## Compliance

This extension complies with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)

## Summary

In simple terms: This extension searches public emoji sites and helps you add emojis to your Slack workspace. It does not collect, store, or share any information about you or your browsing activity.
