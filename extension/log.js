const fmtDate = (ms) => new Date(ms).toLocaleString();
const iso = (ms) => new Date(ms).toISOString();

function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}

function topHosts(byHost, n = 3) {
  return Object.entries(byHost || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([h, c]) => `${h} (${c})`)
    .join(", ");
}

async function load() {
  const { sessions = [], projects = [] } = await chrome.storage.local.get(["sessions", "projects"]);
  return { sessions, projects };
}

async function render() {
  const { sessions, projects } = await load();

  // Project filter
  const filter = $("filter");
  const chosen = filter.value;
  const names = [...new Set([...projects, ...sessions.map((s) => s.project)])].sort();
  filter.length = 1;
  for (const p of names) filter.add(new Option(p, p));
  filter.value = names.includes(chosen) ? chosen : "";

  const visible = sessions
    .filter((s) => !filter.value || s.project === filter.value)
    .sort((a, b) => b.startedAt - a.startedAt);

  // Summary
  const groups = {};
  for (const s of visible) {
    const g = (groups[s.project] ||= { n: 0, sec: 0, clicks: 0 });
    g.n++; g.sec += s.durationSec; g.clicks += s.clicks;
  }
  const sum = $("summary");
  sum.innerHTML = "";
  for (const [p, g] of Object.entries(groups).sort()) {
    const tr = el("tr");
    tr.append(
      el("td", p),
      el("td", g.n, "num"),
      el("td", formatDuration(g.sec), "num"),
      el("td", g.clicks, "num"),
      el("td", formatDuration(g.sec / g.n), "num"),
      el("td", Math.round(g.clicks / g.n), "num"),
      el("td", g.sec ? (g.clicks / (g.sec / 60)).toFixed(1) : "–", "num")
    );
    sum.appendChild(tr);
  }

  // Sessions
  const body = $("sessions");
  body.innerHTML = "";
  for (const s of visible) {
    const tr = el("tr");
    const del = el("button", "Delete", "link");
    del.onclick = () => removeSession(s.id);
    const delTd = el("td");
    delTd.appendChild(del);
    tr.append(
      el("td", fmtDate(s.startedAt)),
      el("td", s.project),
      el("td", s.user || ""),
      el("td", formatDuration(s.durationSec), "num"),
      el("td", s.clicks, "num"),
      el("td", topHosts(s.clicksByHost)),
      el("td", s.note || "", "note"),
      delTd
    );
    body.appendChild(tr);
  }
  $("empty").classList.toggle("hidden", visible.length > 0);

  // Project management
  const list = $("projectList");
  list.innerHTML = "";
  for (const p of projects) {
    const b = el("button", `✕ ${p}`);
    b.title = "Remove from project list (logged sessions are kept)";
    b.onclick = async () => {
      if (!confirm(`Remove "${p}" from the project list? Logged sessions are kept.`)) return;
      await chrome.storage.local.set({ projects: projects.filter((x) => x !== p) });
    };
    list.appendChild(b);
  }
  if (!projects.length) list.appendChild(el("span", "No projects. Add one from the popup.", "muted"));
}

async function removeSession(id) {
  if (!confirm("Delete this session permanently?")) return;
  const { sessions } = await load();
  await chrome.storage.local.set({ sessions: sessions.filter((s) => s.id !== id) });
}

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().slice(0, 10);

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

$("exportCsv").onclick = async () => {
  const { sessions } = await load();
  const header = ["id", "project", "user", "started_at", "ended_at", "duration_sec", "duration", "clicks", "clicks_per_min", "clicks_by_host", "note"];
  const rows = sessions.map((s) => [
    s.id, s.project, s.user, iso(s.startedAt), iso(s.endedAt), s.durationSec, formatDuration(s.durationSec),
    s.clicks, s.durationSec ? (s.clicks / (s.durationSec / 60)).toFixed(2) : "",
    JSON.stringify(s.clicksByHost || {}), s.note,
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  download(`sessions-${stamp()}.csv`, "﻿" + csv, "text/csv"); // BOM so Excel reads UTF-8 (õ, ä, ö, ü)
};

$("exportJson").onclick = async () => {
  const { sessions, projects } = await load();
  download(`sessions-${stamp()}.json`, JSON.stringify({ projects, sessions }, null, 2), "application/json");
};

$("importJson").onclick = () => $("importFile").click();
$("importFile").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const { sessions, projects } = await load();
    const known = new Set(sessions.map((s) => s.id));
    const added = (data.sessions || []).filter((s) => s.id && !known.has(s.id));
    await chrome.storage.local.set({
      sessions: [...sessions, ...added],
      projects: [...new Set([...projects, ...(data.projects || [])])],
    });
    alert(`Imported ${added.length} new session(s).`);
  } catch (err) {
    alert("Could not import: " + err.message);
  }
  e.target.value = "";
};

$("filter").onchange = render;
chrome.storage.onChanged.addListener(render);
render();
