// Background service worker - handles fetching emojis from external sites to avoid CORS

console.log("[Emoji Importer BG] Service worker started");

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("[Emoji Importer BG] Received message:", request.action);

  if (request.action === "searchEmojis") {
    handleSearch(request.query)
      .then(function (result) {
        console.log("[Emoji Importer BG] Search complete, sending response");
        sendResponse(result);
      })
      .catch(function (err) {
        console.error("[Emoji Importer BG] Search error:", err);
        sendResponse({ slackmojis: [], slackemoji: [], error: err.message });
      });
    return true; // keep message channel open for async response
  }

  if (request.action === "fetchImage") {
    fetchImageAsBlob(request.url)
      .then(sendResponse)
      .catch(function (err) {
        sendResponse({ error: err.message });
      });
    return true;
  }
});

async function handleSearch(query) {
  var results = await Promise.allSettled([
    searchSlackmojis(query),
    searchSlackemoji(query),
  ]);

  var slackmojisResults =
    results[0].status === "fulfilled" ? results[0].value : [];
  var slackemojiResults =
    results[1].status === "fulfilled" ? results[1].value : [];

  console.log(
    "[Emoji Importer BG] slackmojis:" + slackmojisResults.length +
    " slackemoji:" + slackemojiResults.length
  );

  return {
    slackmojis: slackmojisResults,
    slackemoji: slackemojiResults,
  };
}

async function searchSlackmojis(query) {
  var urls;
  if (query) {
    // Use the search endpoint when there's a query
    urls = [
      "https://slackmojis.com/emojis/search?query=" + encodeURIComponent(query),
    ];
  } else {
    // Default: load popular and recent
    urls = [
      "https://slackmojis.com/emojis/popular",
      "https://slackmojis.com/emojis/recent",
    ];
  }

  var emojis = [];

  for (var i = 0; i < urls.length; i++) {
    try {
      console.log("[Emoji Importer BG] Fetching " + urls[i]);
      var response = await fetch(urls[i]);
      var html = await response.text();
      console.log("[Emoji Importer BG] Got " + html.length + " chars from " + urls[i]);
      var parsed = parseSlackmojisHTML(html);
      console.log("[Emoji Importer BG] Parsed " + parsed.length + " emojis from " + urls[i]);
      emojis = emojis.concat(parsed);
    } catch (e) {
      console.error("[Emoji Importer BG] Failed to fetch " + urls[i], e);
    }
  }

  return emojis;
}

function parseSlackmojisHTML(html) {
  var emojis = [];
  // Real HTML structure:
  // <li class='emoji NAME' title='NAME'>
  //   <a class="downloader" download="NAME.ext" href="/emojis/ID-NAME/download">
  //     <div class='wrapper'>
  //       <img alt="..." title="..." src="https://emojis.slackmojis.com/..." />
  //     </div>
  //     <div class='name' title='...'>:NAME:</div>
  //   </a>
  // </li>
  var liRegex =
    /<li[^>]*class='emoji[^']*'[^>]*>[\s\S]*?<a[^>]*href="([^"]*\/download)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>[\s\S]*?:([a-zA-Z0-9_-]+):[\s\S]*?<\/a>\s*<\/li>/gi;
  var match;
  var nameCount = {};
  while ((match = liRegex.exec(html)) !== null) {
    var name = match[3].trim();
    // Track duplicates and make names unique using the emoji ID from the URL
    nameCount[name] = (nameCount[name] || 0) + 1;
    var displayName = name;
    if (nameCount[name] > 1) {
      // Extract ID from download URL like /emojis/10418-nice/download
      var idMatch = match[1].match(/\/emojis\/(\d+)-/);
      displayName = idMatch ? name + "_" + idMatch[1] : name + "_" + nameCount[name];
    }
    emojis.push({
      source: "slackmojis",
      downloadUrl: match[1].indexOf("http") === 0
        ? match[1]
        : "https://slackmojis.com" + match[1],
      imageUrl: match[2],
      alt: "",
      tags: name,
      name: displayName,
    });
  }

  return emojis;
}

async function searchSlackemoji(query) {
  var categories = ["staff-picks", "original-style", "memes", "animated"];
  var emojis = [];

  for (var i = 0; i < categories.length; i++) {
    try {
      var url = "https://slackemoji.com/emojis/" + categories[i];
      console.log("[Emoji Importer BG] Fetching " + url);
      var response = await fetch(url);
      var html = await response.text();
      console.log("[Emoji Importer BG] Got " + html.length + " chars from " + url);
      var parsed = parseSlackemojiHTML(html);
      console.log("[Emoji Importer BG] Parsed " + parsed.length + " emojis from " + url);
      emojis = emojis.concat(parsed);
    } catch (e) {
      console.error("[Emoji Importer BG] Failed to fetch category " + categories[i], e);
    }
  }

  if (query) {
    var q = query.toLowerCase();
    return emojis.filter(function (e) {
      return e.name.toLowerCase().indexOf(q) >= 0;
    });
  }
  return emojis;
}

function parseSlackemojiHTML(html) {
  var emojis = [];
  // Real HTML structure:
  // <div class="col-md-3 mb-4 server-col emoji-col">
  //   <div class="card server-card">
  //     <a href="https://slackemoji.com/emoji/SLUG">
  //       <div class="emoji-item">
  //         <div class="thumb-color ...">
  //           <img src="...trns.png" data-src="https://slackemoji.com/assets/img/emoji/SLUG.png?t=..." ... />
  //         </div>
  //         <h5>Display Name</h5>
  //       </div>
  //     </a>
  //   </div>
  // </div>
  var cardRegex =
    /<a[^>]*href="https?:\/\/slackemoji\.com\/emoji\/([^"]+)"[^>]*>[\s\S]*?data-src="([^"]*)"[\s\S]*?<h5>([^<]*)<\/h5>[\s\S]*?<\/a>/gi;
  var match;
  while ((match = cardRegex.exec(html)) !== null) {
    var slug = match[1];
    var dataSrc = match[2];
    var displayName = match[3].trim();
    // Use slug as the emoji name (convert to slack-compatible format)
    var name = slug.replace(/[^a-zA-Z0-9_-]/g, "_");
    // Strip query params from data-src for clean URL
    var imageUrl = dataSrc.split("?")[0];
    emojis.push({
      source: "slackemoji",
      imageUrl: imageUrl,
      downloadUrl: imageUrl,
      name: name,
      tags: displayName,
    });
  }

  return emojis;
}

async function fetchImageAsBlob(url) {
  try {
    var response = await fetch(url);
    var blob = await response.blob();
    var reader = new FileReader();
    return new Promise(function (resolve) {
      reader.onloadend = function () {
        resolve({ dataUrl: reader.result, type: blob.type });
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return { error: e.message };
  }
}
