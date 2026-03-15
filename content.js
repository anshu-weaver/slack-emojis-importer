// Content script - injected into *.slack.com/customize/emoji pages

(function () {
  "use strict";

  // Safe DOM element creation helper
  function createElement(tag, attrs, children) {
    const el = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([key, value]) => {
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
      children.forEach((child) => {
        if (typeof child === "string") {
          el.appendChild(document.createTextNode(child));
        } else if (child) {
          el.appendChild(child);
        }
      });
    }
    return el;
  }

  // Extract Slack API credentials from the page's boot_data
  function getSlackApiData() {
    const scripts = document.querySelectorAll('script[type="text/javascript"]');
    let apiToken = null;
    let versionUid = null;

    for (const script of scripts) {
      const text = script.textContent;
      if (!text) continue;

      const tokenMatch = text.match(/"?api_token"?\s*:\s*"(.+?)"/);
      if (tokenMatch) apiToken = tokenMatch[1];

      const versionMatch = text.match(/"?version_uid"?\s*:\s*"(.+?)"/);
      if (versionMatch) versionUid = versionMatch[1];

      if (apiToken && versionUid) break;
    }

    return { apiToken, versionUid };
  }

  // Upload an emoji to Slack
  async function uploadEmoji(name, imageDataUrl, imageType) {
    const { apiToken, versionUid } = getSlackApiData();
    if (!apiToken) {
      throw new Error(
        "Could not find Slack API token. Make sure you are on the emoji customization page."
      );
    }

    // Convert data URL to blob
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();

    const ext = imageType.includes("gif")
      ? "gif"
      : imageType.includes("png")
        ? "png"
        : "png";
    const file = new File([blob], name + "." + ext, { type: imageType });

    const formData = new FormData();
    formData.append("name", name);
    formData.append("mode", "data");
    formData.append("token", apiToken);
    formData.append("image", file);

    const xId = versionUid
      ? versionUid.substring(0, 8) + "-" + Date.now()
      : Date.now().toString();

    const uploadResponse = await fetch(
      window.location.origin + "/api/emoji.add?_x_id=" + xId,
      {
        method: "POST",
        body: formData,
        credentials: "include",
      }
    );

    const result = await uploadResponse.json();
    if (!result.ok) {
      throw new Error(result.error || "Upload failed");
    }
    return result;
  }

  // Build and inject the UI
  function injectUI() {
    const wrapper = document.querySelector(".p-customize_emoji_wrapper");
    if (!wrapper) {
      setTimeout(injectUI, 1000);
      return;
    }

    if (document.getElementById("sei-container")) return;

    const searchInput = createElement("input", {
      type: "text",
      id: "sei-search-input",
      placeholder: "Search emojis (e.g. party, cat, fire...)",
      autocomplete: "off",
    });

    const searchBtn = createElement("button", {
      id: "sei-search-btn",
      textContent: "Search",
    });

    const slackmojisCheckbox = createElement("input", {
      type: "checkbox",
      id: "sei-source-slackmojis",
      checked: "",
    });
    slackmojisCheckbox.checked = true;

    const slackemojiCheckbox = createElement("input", {
      type: "checkbox",
      id: "sei-source-slackemoji",
      checked: "",
    });
    slackemojiCheckbox.checked = true;

    const statusDiv = createElement("div", {
      id: "sei-status",
      className: "sei-status",
    });
    const resultsDiv = createElement("div", {
      id: "sei-results",
      className: "sei-results",
    });

    const spinner = createElement("div", { className: "sei-spinner" });
    const loadingDiv = createElement(
      "div",
      { id: "sei-loading", className: "sei-loading", style: "display:none" },
      [spinner, " Searching..."]
    );

    const container = createElement("div", { id: "sei-container" }, [
      createElement("div", { className: "sei-header" }, [
        createElement("h2", { className: "sei-title", textContent: "Emoji Importer" }),
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

    // Wire up event handlers
    searchBtn.addEventListener("click", () => performSearch());
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") performSearch();
    });

    // Default search
    performSearch("popular");
  }

  let currentSearchId = 0;

  async function performSearch(overrideQuery) {
    const query =
      overrideQuery ||
      document.getElementById("sei-search-input").value.trim();
    const resultsDiv = document.getElementById("sei-results");
    const loadingDiv = document.getElementById("sei-loading");
    const statusDiv = document.getElementById("sei-status");
    const showSlackmojis = document.getElementById("sei-source-slackmojis").checked;
    const showSlackemoji = document.getElementById("sei-source-slackemoji").checked;

    const searchId = ++currentSearchId;

    resultsDiv.textContent = "";
    statusDiv.textContent = "";
    loadingDiv.style.display = "flex";

    try {
      const response = await chrome.runtime.sendMessage({
        action: "searchEmojis",
        query: query,
      });

      if (searchId !== currentSearchId) return;

      loadingDiv.style.display = "none";

      let allResults = [];
      if (showSlackmojis && response.slackmojis) {
        allResults = allResults.concat(response.slackmojis);
      }
      if (showSlackemoji && response.slackemoji) {
        allResults = allResults.concat(response.slackemoji);
      }

      // Deduplicate by name
      const seen = new Set();
      allResults = allResults.filter((e) => {
        if (seen.has(e.name)) return false;
        seen.add(e.name);
        return true;
      });

      if (allResults.length === 0) {
        statusDiv.textContent = "No emojis found. Try a different search term.";
        return;
      }

      statusDiv.textContent =
        "Found " + allResults.length + ' emojis for "' + query + '"';
      renderResults(allResults, resultsDiv);
    } catch (err) {
      loadingDiv.style.display = "none";
      statusDiv.textContent = "Search failed: " + err.message;
    }
  }

  function renderResults(emojis, resultsDiv) {
    resultsDiv.textContent = "";

    emojis.forEach((emoji) => {
      const img = createElement("img", {
        src: emoji.imageUrl,
        alt: emoji.name,
        loading: "lazy",
      });

      const addBtn = createElement("button", {
        className: "sei-add-btn",
        textContent: "Add to Slack",
      });

      addBtn.addEventListener("click", () => handleAddEmoji(addBtn, emoji));

      const card = createElement("div", { className: "sei-emoji-card" }, [
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
    const originalText = button.textContent;
    button.textContent = "Downloading...";
    button.disabled = true;
    button.classList.add("sei-uploading");

    try {
      const imageData = await chrome.runtime.sendMessage({
        action: "fetchImage",
        url: emoji.downloadUrl || emoji.imageUrl,
      });

      if (imageData.error) {
        throw new Error(imageData.error);
      }

      button.textContent = "Uploading...";

      const cleanName = emoji.name
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_")
        .replace(/^_+|_+$/g, "");

      await uploadEmoji(cleanName, imageData.dataUrl, imageData.type);

      button.textContent = "Added!";
      button.classList.remove("sei-uploading");
      button.classList.add("sei-success");
    } catch (err) {
      button.textContent = "Failed";
      button.classList.remove("sei-uploading");
      button.classList.add("sei-error");
      button.title = err.message;

      setTimeout(() => {
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
