// Background service worker - handles fetching emojis from external sites to avoid CORS

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "searchEmojis") {
    handleSearch(request.query, request.page || 1).then(sendResponse);
    return true; // keep message channel open for async response
  }
  if (request.action === "fetchImage") {
    fetchImageAsBlob(request.url).then(sendResponse);
    return true;
  }
});

async function handleSearch(query, page) {
  const results = await Promise.allSettled([
    searchSlackmojis(query, page),
    searchSlackemoji(query, page),
  ]);

  const slackmojisResults =
    results[0].status === "fulfilled" ? results[0].value : [];
  const slackemojiResults =
    results[1].status === "fulfilled" ? results[1].value : [];

  return {
    slackmojis: slackmojisResults,
    slackemoji: slackemojiResults,
  };
}

async function searchSlackmojis(query, page) {
  const urls = [
    "https://slackmojis.com/emojis/popular",
    "https://slackmojis.com/emojis/recent",
    "https://slackmojis.com/categories/19-random-emojis",
  ];

  const emojis = [];

  for (const url of urls) {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const parsed = parseSlackmojisHTML(html);
      emojis.push(...parsed);
    } catch (e) {
      console.error("Failed to fetch " + url, e);
    }
  }

  if (query) {
    const q = query.toLowerCase();
    return emojis.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.tags && e.tags.toLowerCase().includes(q))
    );
  }
  return emojis;
}

function parseSlackmojisHTML(html) {
  const emojis = [];
  const liRegex =
    /<li[^>]*>\s*<a[^>]*href="([^"]*\/download)"[^>]*>\s*<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*title="([^"]*)"[^>]*>\s*:([^:]+):/g;
  let match;
  while ((match = liRegex.exec(html)) !== null) {
    emojis.push({
      source: "slackmojis",
      downloadUrl: match[1].startsWith("http")
        ? match[1]
        : "https://slackmojis.com" + match[1],
      imageUrl: match[2],
      alt: match[3],
      tags: match[4],
      name: match[5].trim(),
    });
  }
  return emojis;
}

async function searchSlackemoji(query, page) {
  const categories = [
    "staff-picks",
    "original-style",
    "technology",
    "memes",
    "animated",
    "other",
  ];
  const emojis = [];

  for (const cat of categories) {
    try {
      const url = "https://slackemoji.com/emojis/" + cat;
      const response = await fetch(url);
      const html = await response.text();
      const parsed = parseSlackemojiHTML(html);
      emojis.push(...parsed);
    } catch (e) {
      console.error("Failed to fetch category " + cat, e);
    }
  }

  if (query) {
    const q = query.toLowerCase();
    return emojis.filter((e) => e.name.toLowerCase().includes(q));
  }
  return emojis;
}

function parseSlackemojiHTML(html) {
  const emojis = [];
  const colRegex =
    /<div[^>]*class="[^"]*server-col[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
  let colMatch;
  while ((colMatch = colRegex.exec(html)) !== null) {
    const block = colMatch[1];
    const imgMatch = block.match(
      /(?:data-src|src)="(https:\/\/slackemoji\.com\/assets\/img\/emoji\/[^"]+)"/
    );
    const nameMatch = block.match(/:([a-zA-Z0-9_-]+):/);
    if (nameMatch) {
      const name = nameMatch[1];
      const imageUrl =
        imgMatch && imgMatch[1]
          ? imgMatch[1]
          : "https://slackemoji.com/assets/img/emoji/" + name + ".png";
      emojis.push({
        source: "slackemoji",
        imageUrl: imageUrl,
        downloadUrl: imageUrl,
        name: name,
        tags: "",
      });
    }
  }
  return emojis;
}

async function fetchImageAsBlob(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onloadend = () =>
        resolve({ dataUrl: reader.result, type: blob.type });
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return { error: e.message };
  }
}
