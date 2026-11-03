// Storage layout (chrome.storage.local):
//   projects: string[]
//   active:   { id, project, user, note, startedAt, clicks, clicksByHost } | null
//   sessions: Array<{ id, project, user, note, startedAt, endedAt, durationSec, clicks, clicksByHost }>
//   user:     string (last used name)

const DEFAULT_PROJECTS = ["ODOO TO CARGOSON"];

// Serialize all storage read-modify-write operations so fast clicks are never lost.
let queue = Promise.resolve();
function locked(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

const get = (keys) => chrome.storage.local.get(keys);
const set = (obj) => chrome.storage.local.set(obj);

chrome.runtime.onInstalled.addListener(async () => {
  const { projects } = await get("projects");
  if (!projects) await set({ projects: DEFAULT_PROJECTS, sessions: [], active: null });
  updateBadge();
});

chrome.runtime.onStartup.addListener(updateBadge);

async function updateBadge() {
  const { active } = await get("active");
  if (active) {
    await chrome.action.setBadgeBackgroundColor({ color: "#d93025" });
    await chrome.action.setBadgeText({ text: String(active.clicks) });
  } else {
    await chrome.action.setBadgeText({ text: "" });
  }
}

async function handle(msg) {
  switch (msg.type) {
    case "click":
      return locked(async () => {
        const { active } = await get("active");
        if (!active) return;
        active.clicks += 1;
        active.clicksByHost[msg.host] = (active.clicksByHost[msg.host] || 0) + 1;
        await set({ active });
        await updateBadge();
      });

    case "start":
      return locked(async () => {
        const { active } = await get("active");
        if (active) return { error: "A session is already running." };
        const session = {
          id: crypto.randomUUID(),
          project: msg.project,
          user: msg.user || "",
          note: "",
          startedAt: Date.now(),
          clicks: 0,
          clicksByHost: {},
        };
        await set({ active: session, user: msg.user || "" });
        await updateBadge();
        return { active: session };
      });

    case "end":
      return locked(async () => {
        const { active, sessions = [] } = await get(["active", "sessions"]);
        if (!active) return { error: "No session running." };
        const endedAt = Date.now();
        const done = {
          ...active,
          note: msg.note || "",
          endedAt,
          durationSec: Math.round((endedAt - active.startedAt) / 1000),
        };
        sessions.push(done);
        await set({ sessions, active: null });
        await updateBadge();
        return { session: done };
      });

    case "discard":
      return locked(async () => {
        await set({ active: null });
        await updateBadge();
        return {};
      });
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  handle(msg).then((res) => sendResponse(res || {}));
  return true; // keep channel open for async response
});
