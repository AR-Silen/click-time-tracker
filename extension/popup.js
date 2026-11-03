let tick = null;

async function render() {
  const { projects = [], active, user = "" } = await chrome.storage.local.get(["projects", "active", "user"]);

  $("user").value = $("user").value || user;
  const select = $("project");
  const current = select.value;
  select.innerHTML = "";
  for (const p of projects) {
    const opt = document.createElement("option");
    opt.value = opt.textContent = p;
    select.appendChild(opt);
  }
  if (projects.includes(current)) select.value = current;

  $("idle").classList.toggle("hidden", !!active);
  $("running").classList.toggle("hidden", !active);

  clearInterval(tick);
  if (active) {
    $("runProject").textContent = active.project;
    $("clicks").textContent = active.clicks;
    const update = () => ($("time").textContent = formatDuration((Date.now() - active.startedAt) / 1000));
    update();
    tick = setInterval(update, 1000);
  }
}

$("addProject").addEventListener("click", async () => {
  const name = $("newProject").value.trim();
  if (!name) return;
  const { projects = [] } = await chrome.storage.local.get("projects");
  if (!projects.includes(name)) projects.push(name);
  await chrome.storage.local.set({ projects });
  $("newProject").value = "";
  await render();
  $("project").value = name;
});

$("start").addEventListener("click", async () => {
  const project = $("project").value;
  if (!project) return alert("Add a project first.");
  const res = await send({ type: "start", project, user: $("user").value.trim() });
  if (res.error) alert(res.error);
  $("lastResult").textContent = "";
  render();
});

$("end").addEventListener("click", async () => {
  const res = await send({ type: "end", note: $("note").value.trim() });
  if (res.error) return alert(res.error);
  const s = res.session;
  $("note").value = "";
  $("lastResult").textContent = `Logged: ${s.project} — ${s.clicks} clicks, ${formatDuration(s.durationSec)}`;
  render();
});

$("discard").addEventListener("click", async () => {
  if (!confirm("Discard the running session without logging it?")) return;
  await send({ type: "discard" });
  render();
});

$("openLog").addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("log.html") }));

// Live-update click count while the popup is open.
chrome.storage.onChanged.addListener((changes) => {
  if (changes.active?.newValue && !$("running").classList.contains("hidden")) {
    $("clicks").textContent = changes.active.newValue.clicks;
  } else if ("active" in changes || "projects" in changes) {
    render();
  }
});

render();
