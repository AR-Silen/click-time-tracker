// Runs in every tab/frame. Reports each mouse click to the background worker,
// which only counts it while a session is active.
document.addEventListener(
  "mousedown",
  (event) => {
    if (event.button !== 0 && event.button !== 2) return; // left + right clicks
    try {
      chrome.runtime.sendMessage({ type: "click", host: location.hostname || "local" });
    } catch (_) {
      // Extension was reloaded; this old content script is orphaned. Ignore.
    }
  },
  true
);
