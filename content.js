// Content script - injected into *.slack.com/customize/emoji pages

(function () {
  "use strict";

  console.log("[Emoji Importer] Content script loaded on: " + window.location.href);

  // Safe DOM element creation helper
  function createElement(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (key === "textContent") {
          el.textContent = value;
        } else if (key === "className") {
          el.className = value;
        } else if (key.startsWith("on")) {
          el.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
          el.setAttribute(key, value);
        }
      });
    }
    if (children) {
      children.forEach(function (child) {
        if (typeof child === "string") {
          el.appendChild(document.createTextNode(child));
        } else if (child) {
          el.appendChild(child);
        }
      });
    }
    return el;
  }

  // Send message to background script with error handling
  function sendBgMessage(msg) {
    return new Promise(function (resolve, reject) {
      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        reject(new Error("Extension runtime not available"));
        return;
      }
      chrome.runtime.sendMessage(msg, function (response) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });
  }

  // Extract Slack API credentials from the page's boot_data
  function getSlackApiData() {
    var scripts = document.querySelectorAll('script[type="text/javascript"]');
    var apiToken = null;
    var versionUid = null;

    for (var i = 0; i < scripts.length; i++) {
      var text = scripts[i].textContent;
      if (!text) continue;

      var tokenMatch = text.match(/"?api_token"?\s*:\s*"(.+?)"/);
      if (tokenMatch) apiToken = tokenMatch[1];

      var versionMatch = text.match(/"?version_uid"?\s*:\s*"(.+?)"/);
      if (versionMatch) versionUid = versionMatch[1];

      if (apiToken && versionUid) break;
    }

    return { apiToken: apiToken, versionUid: versionUid };
  }

  // Upload an emoji to Slack
  async function uploadEmoji(name, imageDataUrl, imageType) {
    var data = getSlackApiData();
    if (!data.apiToken) {
      throw new Error(
        "Could not find Slack API token. Make sure you are on the emoji customization page."
      );
    }

    // Convert data URL to blob
    var response = await fetch(imageDataUrl);
    var blob = await response.blob();

    var ext = imageType.indexOf("gif") >= 0 ? "gif" : "png";
    var file = new File([blob], name + "." + ext, { type: imageType });

    var formData = new FormData();
    formData.append("name", name);
    formData.append("mode", "data");
    formData.append("token", data.apiToken);
    formData.append("image", file);

    var xId = data.versionUid
      ? data.versionUid.substring(0, 8) + "-" + Date.now()
      : Date.now().toString();

    var uploadResponse = await fetch(
      window.location.origin + "/api/emoji.add?_x_id=" + xId,
      {
        method: "POST",
        body: formData,
        credentials: "include",
      }
    );

    var result = await uploadResponse.json();
    if (!result.ok) {
      throw new Error(result.error || "Upload failed");
    }
    return result;
  }

  // --- UI ---

  function injectUI() {
    var wrapper = document.querySelector(".p-customize_emoji_wrapper");
    if (!wrapper) {
      console.log("[Emoji Importer] Wrapper not found, retrying in 1s...");
      setTimeout(injectUI, 1000);
      return;
    }

    if (document.getElementById("sei-container")) return;

    console.log("[Emoji Importer] Injecting UI before wrapper");

    var searchInput = createElement("input", {
      type: "text",
      id: "sei-search-input",
      placeholder: "Search emojis (e.g. party, cat, fire...)",
      autocomplete: "off",
    });

    var searchBtn = createElement("button", {
      id: "sei-search-btn",
      textContent: "Search",
    });

    var slackmojisCheckbox = createElement("input", {
      type: "checkbox",
      id: "sei-source-slackmojis",
    });
    slackmojisCheckbox.checked = true;

    var slackemojiCheckbox = createElement("input", {
      type: "checkbox",
      id: "sei-source-slackemoji",
    });
    slackemojiCheckbox.checked = true;

    var statusDiv = createElement("div", {
      id: "sei-status",
      className: "sei-status",
    });
    var resultsDiv = createElement("div", {
      id: "sei-results",
      className: "sei-results",
    });

    var spinner = createElement("div", { className: "sei-spinner" });
    var loadingDiv = createElement(
      "div",
      { id: "sei-loading", className: "sei-loading", style: "display:none" },
      [spinner, " Searching..."]
    );

    var container = createElement("div", { id: "sei-container" }, [
      createElement("div", { className: "sei-header" }, [
        createElement("h2", {
          className: "sei-title",
          textContent: "Emoji Importer",
        }),
        createElement("p", {
          className: "sei-subtitle",
          textContent:
            "Search emojis from slackmojis.com & slackemoji.com and add them directly to your workspace",
        }),
      ]),
      createElement("div", { className: "sei-search-bar" }, [
        searchInput,
        searchBtn,
      ]),
      createElement("div", { className: "sei-source-filters" }, [
        createElement("label", {}, [slackmojisCheckbox, " slackmojis.com"]),
        createElement("label", {}, [slackemojiCheckbox, " slackemoji.com"]),
      ]),
      statusDiv,
      loadingDiv,
      resultsDiv,
    ]);

    wrapper.parentNode.insertBefore(container, wrapper);

    searchBtn.addEventListener("click", function () {
      performSearch();
    });
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") performSearch();
    });

    // Load popular emojis by default (empty query = return all from popular pages)
    performSearch("");
  }

  var currentSearchId = 0;

  async function performSearch(overrideQuery) {
    var query =
      overrideQuery ||
      document.getElementById("sei-search-input").value.trim();
    var resultsDiv = document.getElementById("sei-results");
    var loadingDiv = document.getElementById("sei-loading");
    var statusDiv = document.getElementById("sei-status");
    var showSlackmojis = document.getElementById(
      "sei-source-slackmojis"
    ).checked;
    var showSlackemoji = document.getElementById(
      "sei-source-slackemoji"
    ).checked;

    var searchId = ++currentSearchId;

    resultsDiv.textContent = "";
    statusDiv.textContent = "";
    loadingDiv.style.display = "flex";

    console.log("[Emoji Importer] Searching for: " + query);

    try {
      var response = await sendBgMessage({
        action: "searchEmojis",
        query: query,
      });

      console.log("[Emoji Importer] Got response:", response);

      if (searchId !== currentSearchId) return;

      loadingDiv.style.display = "none";

      if (!response) {
        statusDiv.textContent =
          "Error: No response from background script. Try reloading the extension.";
        return;
      }

      if (response.error) {
        statusDiv.textContent = "Search error: " + response.error;
        return;
      }

      var allResults = [];
      if (showSlackmojis && response.slackmojis) {
        allResults = allResults.concat(response.slackmojis);
      }
      if (showSlackemoji && response.slackemoji) {
        allResults = allResults.concat(response.slackemoji);
      }

      // Deduplicate by name
      var seen = {};
      allResults = allResults.filter(function (e) {
        if (seen[e.name]) return false;
        seen[e.name] = true;
        return true;
      });

      console.log("[Emoji Importer] Total results: " + allResults.length);

      if (allResults.length === 0) {
        statusDiv.textContent =
          "No emojis found. Try a different search term.";
        return;
      }

      statusDiv.textContent = query
        ? "Found " + allResults.length + ' emojis for "' + query + '"'
        : "Showing " + allResults.length + " popular emojis";
      renderResults(allResults, resultsDiv);
    } catch (err) {
      console.error("[Emoji Importer] Search failed:", err);
      loadingDiv.style.display = "none";
      statusDiv.textContent = "Search failed: " + err.message;
    }
  }

  function renderResults(emojis, resultsDiv) {
    resultsDiv.textContent = "";

    emojis.forEach(function (emoji) {
      var img = createElement("img", {
        src: emoji.imageUrl,
        alt: emoji.name,
        loading: "lazy",
      });

      var addBtn = createElement("button", {
        className: "sei-add-btn",
        textContent: "Add to Slack",
      });

      addBtn.addEventListener("click", function () {
        handleAddEmoji(addBtn, emoji);
      });

      var card = createElement("div", { className: "sei-emoji-card" }, [
        createElement("div", { className: "sei-emoji-preview" }, [img]),
        createElement("div", {
          className: "sei-emoji-name",
          textContent: ":" + emoji.name + ":",
        }),
        createElement("div", {
          className: "sei-emoji-source",
          textContent: emoji.source,
        }),
        addBtn,
      ]);

      resultsDiv.appendChild(card);
    });
  }

  async function handleAddEmoji(button, emoji) {
    var originalText = button.textContent;
    button.textContent = "Downloading...";
    button.disabled = true;
    button.classList.add("sei-uploading");

    try {
      var imageData = await sendBgMessage({
        action: "fetchImage",
        url: emoji.downloadUrl || emoji.imageUrl,
      });

      if (imageData.error) {
        throw new Error(imageData.error);
      }

      button.textContent = "Uploading...";

      var cleanName = emoji.name
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_")
        .replace(/^_+|_+$/g, "");

      await uploadEmoji(cleanName, imageData.dataUrl, imageData.type);

      button.textContent = "Added!";
      button.classList.remove("sei-uploading");
      button.classList.add("sei-success");
    } catch (err) {
      console.error("[Emoji Importer] Upload error:", err);
      button.textContent = "Failed";
      button.classList.remove("sei-uploading");
      button.classList.add("sei-error");
      button.title = err.message;

      setTimeout(function () {
        button.textContent = originalText;
        button.disabled = false;
        button.classList.remove("sei-error");
        button.title = "";
      }, 3000);
    }
  }

  // Initialize
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectUI);
  } else {
    injectUI();
  }
})();
