const STORAGE_KEYS = {
  habits: "ph_habits_v1",
  records: "ph_records_v1"
};

const CATEGORIES = {
  attention: { label: "Attention", plant: "🌾", description: "protect focus" },
  depth: { label: "Depth", plant: "🌳", description: "read, write, think" },
  stillness: { label: "Stillness", plant: "🪨", description: "tolerate silence" },
  connection: { label: "Connection", plant: "🐦", description: "real contact" },
  restraint: { label: "Restraint", plant: "🌿", description: "avoid passive loops" }
};

const DEFAULT_HABITS = [
  { id: "no-social-apps", title: "No social media apps", short: "Browser only for replies or specific checks.", category: "attention", enabled: true, custom: false },
  { id: "youtube-search", title: "YouTube search-only", short: "No Shorts, no feeds, no recommendation loops.", category: "attention", enabled: true, custom: false },
  { id: "whatsapp-limit", title: "WhatsApp under 30 min", short: "Checking/texting capped. Meaningful calls do not count.", category: "attention", enabled: true, custom: false },
  { id: "phone-away", title: "Phone away when possible", short: "Separate room during the day. Alarm exception at night.", category: "attention", enabled: true, custom: false },
  { id: "slow-reading", title: "30 min slow reading", short: "Measured by attention, not pages.", category: "depth", enabled: true, custom: false },
  { id: "daily-writing", title: "Write a short text", short: "Project thought. Structure thinking. Gain eloquence.", category: "depth", enabled: true, custom: false },
  { id: "speaking-reflection", title: "5 min spoken reflection", short: "Speak clearly, then repeat it more cleanly.", category: "depth", enabled: true, custom: false },
  { id: "nothing", title: "5 min doing nothing", short: "No phone. No music. No task. Just stillness.", category: "stillness", enabled: true, custom: false },
  { id: "real-connection", title: "Real connection", short: "Call someone or spend deliberate time with your wife/family/friends.", category: "connection", enabled: true, custom: false },
  { id: "passive-entertainment", title: "Passive entertainment within rules", short: "Weekends only, under two hours, never as default boredom response.", category: "restraint", enabled: true, custom: false },
  { id: "no-phone-contexts", title: "No phone in meals/conversations", short: "Protect the human space in front of you.", category: "restraint", enabled: true, custom: false }
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatDate(dateString) {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Failed to read ${key}`, error);
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getHabits() {
  const saved = readJSON(STORAGE_KEYS.habits, null);
  if (!saved || !Array.isArray(saved)) {
    writeJSON(STORAGE_KEYS.habits, DEFAULT_HABITS);
    return structuredClone(DEFAULT_HABITS);
  }
  const merged = [...saved];
  for (const habit of DEFAULT_HABITS) {
    if (!merged.some((item) => item.id === habit.id)) merged.push(habit);
  }
  return merged;
}

function setHabits(habits) {
  writeJSON(STORAGE_KEYS.habits, habits);
}

function getRecords() {
  return readJSON(STORAGE_KEYS.records, {});
}

function setRecords(records) {
  writeJSON(STORAGE_KEYS.records, records);
}

function getTodayRecord() {
  const records = getRecords();
  const today = localDate();
  if (!records[today]) records[today] = { checks: {}, reflection: "" };
  if (!records[today].checks) records[today].checks = {};
  if (typeof records[today].reflection !== "string") records[today].reflection = "";
  setRecords(records);
  return records[today];
}

function updateTodayRecord(updater) {
  const records = getRecords();
  const today = localDate();
  const record = records[today] || { checks: {}, reflection: "" };
  records[today] = updater(record) || record;
  setRecords(records);
  renderAll();
}

function enabledHabits() {
  return getHabits().filter((habit) => habit.enabled);
}

function completedToday() {
  const record = getTodayRecord();
  const habits = enabledHabits();
  return habits.filter((habit) => record.checks[habit.id]).length;
}

function todayPercent() {
  const habits = enabledHabits();
  if (!habits.length) return 0;
  return Math.round((completedToday() / habits.length) * 100);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function renderHeader() {
  const today = localDate();
  const percent = todayPercent();
  $("#todayLabel").textContent = formatDate(today);
  $("#progressNumber").textContent = `${percent}%`;
  $("#progressRing").style.setProperty("--value", `${percent * 3.6}deg`);

  const message = percent === 100
    ? "The garden is tended."
    : percent >= 70
      ? "Good cultivation. Finish clean."
      : percent >= 35
        ? "Return to the rule."
        : "Tend the garden.";
  $("#dailyMessage").textContent = message;
}

function renderChecklist() {
  const container = $("#checklist");
  const habits = enabledHabits();
  const record = getTodayRecord();
  container.innerHTML = "";

  if (!habits.length) {
    container.innerHTML = `<p class="hint">No habits enabled. Go to Settings and enable at least one.</p>`;
    return;
  }

  for (const habit of habits) {
    const label = document.createElement("label");
    label.className = "habit-card";
    label.innerHTML = `
      <input type="checkbox" ${record.checks[habit.id] ? "checked" : ""} aria-label="${escapeHTML(habit.title)}" />
      <span>
        <span class="habit-title">${escapeHTML(habit.title)}</span>
        <span class="habit-short">${escapeHTML(habit.short || "")}</span>
        <span class="category-label">${CATEGORIES[habit.category]?.label || habit.category}</span>
      </span>
    `;
    label.querySelector("input").addEventListener("change", (event) => {
      updateTodayRecord((record) => {
        record.checks[habit.id] = event.target.checked;
        return record;
      });
      showToast(event.target.checked ? "Cultivated." : "Unchecked.");
    });
    container.appendChild(label);
  }
}

function renderGarden() {
  const bed = $("#gardenBed");
  const legend = $("#gardenLegend");
  const habits = enabledHabits();
  const record = getTodayRecord();
  const completed = habits.filter((habit) => record.checks[habit.id]);
  bed.innerHTML = "";
  legend.innerHTML = "";

  $("#plantCount").textContent = `${completed.length} ${completed.length === 1 ? "plant" : "plants"}`;
  $("#gardenQuote").textContent = completed.length
    ? "A visible record of attention. Small actions, slow growth."
    : "Complete habits to cultivate the garden.";

  if (!completed.length) {
    const empty = document.createElement("div");
    empty.className = "plant";
    empty.style.left = "50%";
    empty.style.top = "72%";
    empty.style.setProperty("--size", "3rem");
    empty.textContent = "🌱";
    bed.appendChild(empty);
  }

  completed.forEach((habit, index) => {
    const plant = document.createElement("div");
    plant.className = "plant";
    const pos = seededPosition(habit.id, index, completed.length);
    plant.style.left = `${pos.x}%`;
    plant.style.top = `${pos.y}%`;
    plant.style.setProperty("--size", `${pos.size}rem`);
    plant.title = habit.title;
    plant.textContent = CATEGORIES[habit.category]?.plant || "🌱";
    bed.appendChild(plant);
  });

  Object.entries(CATEGORIES).forEach(([id, cat]) => {
    const item = document.createElement("span");
    item.className = "legend-item";
    item.textContent = `${cat.plant} ${cat.label}`;
    legend.appendChild(item);
  });
}

function seededPosition(seed, index, total) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const row = index % 3;
  const baseX = 12 + ((index * 17 + hash % 13) % 76);
  const y = 62 + row * 12 + (hash % 8);
  const size = 2 + ((hash % 9) / 10) + Math.min(total, 10) * 0.03;
  return { x: baseX, y, size };
}

function lastNDates(n) {
  const dates = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(localDate(d));
  }
  return dates;
}

function scoreForDate(dateString, habits = enabledHabits(), records = getRecords()) {
  const record = records[dateString];
  if (!habits.length) return 0;
  if (!record || !record.checks) return 0;
  const done = habits.filter((habit) => record.checks[habit.id]).length;
  return Math.round((done / habits.length) * 100);
}

function renderAnalytics() {
  const habits = enabledHabits();
  const records = getRecords();
  const days = lastNDates(7);
  const scores = days.map((day) => scoreForDate(day, habits, records));
  const weeklyAverage = habits.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  $("#weekScore").textContent = `${weeklyAverage}% week`;

  renderInsights(days, scores, habits, records);
  renderHeatmap(days, scores);
  renderCategoryStats(days, habits, records);
}

function renderInsights(days, scores, habits, records) {
  const grid = $("#insightGrid");
  const today = todayPercent();
  const activeDays = scores.filter((score) => score > 0).length;
  const category = categoryPerformance(days, habits, records);
  const sorted = Object.values(category).filter((item) => item.total > 0).sort((a, b) => b.percent - a.percent);
  const strongest = sorted[0]?.label || "No data";
  const needsCare = sorted[sorted.length - 1]?.label || "No data";

  grid.innerHTML = `
    <div class="insight-card"><div class="insight-value">${today}%</div><div class="insight-label">today</div></div>
    <div class="insight-card"><div class="insight-value">${activeDays}/7</div><div class="insight-label">days tended this week</div></div>
    <div class="insight-card"><div class="insight-value">${escapeHTML(strongest)}</div><div class="insight-label">strongest area · care: ${escapeHTML(needsCare)}</div></div>
  `;
}

function renderHeatmap(days, scores) {
  const heatmap = $("#heatmap");
  heatmap.innerHTML = "";
  days.forEach((day, index) => {
    const score = scores[index];
    const cell = document.createElement("div");
    cell.className = "day-cell";
    const alpha = 0.05 + score / 100 * 0.28;
    cell.style.setProperty("--alpha", alpha.toFixed(2));
    cell.innerHTML = `<strong>${formatDate(day)}</strong><span>${score}%</span>`;
    heatmap.appendChild(cell);
  });
}

function categoryPerformance(days, habits, records) {
  const result = {};
  for (const [id, category] of Object.entries(CATEGORIES)) {
    result[id] = { id, label: category.label, done: 0, total: 0, percent: 0 };
  }

  for (const day of days) {
    const checks = records[day]?.checks || {};
    for (const habit of habits) {
      if (!result[habit.category]) {
        result[habit.category] = { id: habit.category, label: habit.category, done: 0, total: 0, percent: 0 };
      }
      result[habit.category].total += 1;
      if (checks[habit.id]) result[habit.category].done += 1;
    }
  }

  for (const item of Object.values(result)) {
    item.percent = item.total ? Math.round((item.done / item.total) * 100) : 0;
  }
  return result;
}

function renderCategoryStats(days, habits, records) {
  const container = $("#categoryStats");
  const stats = categoryPerformance(days, habits, records);
  container.innerHTML = "";

  Object.values(stats).forEach((item) => {
    if (!item.total) return;
    const row = document.createElement("div");
    row.className = "category-row";
    row.innerHTML = `
      <span>${escapeHTML(item.label)}</span>
      <div class="bar-track"><div class="bar-fill" style="--width:${item.percent}%"></div></div>
      <strong>${item.percent}%</strong>
    `;
    container.appendChild(row);
  });
}

function renderReflection() {
  const record = getTodayRecord();
  const textarea = $("#reflectionText");
  if (document.activeElement !== textarea) textarea.value = record.reflection || "";
  updateWordCount();
  renderRecentReflections();
}

function updateWordCount() {
  const text = $("#reflectionText").value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  $("#wordCount").textContent = `${words} ${words === 1 ? "word" : "words"}`;
}

function renderRecentReflections() {
  const list = $("#reflectionList");
  const records = getRecords();
  const entries = Object.entries(records)
    .filter(([, record]) => record.reflection && record.reflection.trim())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 5);

  list.innerHTML = "";
  if (!entries.length) {
    list.innerHTML = `<p class="hint">No reflections yet.</p>`;
    return;
  }

  for (const [date, record] of entries) {
    const entry = document.createElement("article");
    entry.className = "reflection-entry";
    const preview = record.reflection.length > 220 ? `${record.reflection.slice(0, 220)}…` : record.reflection;
    entry.innerHTML = `<time>${formatDate(date)}</time><p>${escapeHTML(preview)}</p>`;
    list.appendChild(entry);
  }
}

function renderSettings() {
  const editor = $("#habitEditor");
  const habits = getHabits();
  editor.innerHTML = "";

  habits.forEach((habit) => {
    const row = document.createElement("div");
    row.className = "editor-row";
    row.innerHTML = `
      <input type="checkbox" ${habit.enabled ? "checked" : ""} aria-label="Enable ${escapeHTML(habit.title)}" />
      <span class="editor-title">${escapeHTML(habit.title)}</span>
      <span class="category-label">${CATEGORIES[habit.category]?.label || habit.category}</span>
      <button class="ghost-button" type="button">${habit.custom ? "Remove" : "Default"}</button>
    `;
    row.querySelector("input").addEventListener("change", (event) => {
      const next = getHabits().map((item) => item.id === habit.id ? { ...item, enabled: event.target.checked } : item);
      setHabits(next);
      renderAll();
      showToast(event.target.checked ? "Habit enabled." : "Habit disabled.");
    });
    row.querySelector("button").disabled = !habit.custom;
    if (!habit.custom) row.querySelector("button").style.opacity = "0.55";
    row.querySelector("button").addEventListener("click", () => {
      if (!habit.custom) return;
      const next = getHabits().filter((item) => item.id !== habit.id);
      setHabits(next);
      renderAll();
      showToast("Habit removed.");
    });
    editor.appendChild(row);
  });
}

function renderAll() {
  renderHeader();
  renderChecklist();
  renderGarden();
  renderAnalytics();
  renderReflection();
  renderSettings();
}

function bindEvents() {
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((item) => item.classList.toggle("active", item === tab));
      $$(".panel").forEach((panel) => panel.classList.remove("active"));
      $(`#${tab.dataset.tab}Panel`).classList.add("active");
    });
  });

  $("#clearTodayBtn").addEventListener("click", () => {
    if (!confirm("Clear today’s checklist?")) return;
    updateTodayRecord((record) => ({ ...record, checks: {} }));
    showToast("Today cleared.");
  });

  $("#reflectionText").addEventListener("input", (event) => {
    updateWordCount();
    const value = event.target.value;
    const records = getRecords();
    const today = localDate();
    records[today] = records[today] || { checks: {}, reflection: "" };
    records[today].reflection = value;
    setRecords(records);
    renderRecentReflections();
  });

  $("#copyReflectionBtn").addEventListener("click", async () => {
    const value = $("#reflectionText").value;
    try {
      await navigator.clipboard.writeText(value);
      showToast("Copied.");
    } catch {
      showToast("Copy unavailable.");
    }
  });

  $("#clearReflectionBtn").addEventListener("click", () => {
    if (!confirm("Clear today’s reflection?")) return;
    updateTodayRecord((record) => ({ ...record, reflection: "" }));
    showToast("Reflection cleared.");
  });

  $("#addHabitForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const title = $("#newHabitTitle").value.trim();
    const category = $("#newHabitCategory").value;
    if (!title) return;
    const id = `custom-${Date.now()}`;
    const habits = getHabits();
    habits.push({ id, title, short: "Custom Project Hermit habit.", category, enabled: true, custom: true });
    setHabits(habits);
    event.target.reset();
    renderAll();
    showToast("Habit added.");
  });

  $("#exportBtn").addEventListener("click", () => {
    const data = {
      exportedAt: new Date().toISOString(),
      habits: getHabits(),
      records: getRecords()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `project-hermit-export-${localDate()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Export created.");
  });

  $("#importFile").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data.habits) || typeof data.records !== "object") throw new Error("Invalid file");
      setHabits(data.habits);
      setRecords(data.records);
      renderAll();
      showToast("Import complete.");
    } catch (error) {
      console.error(error);
      showToast("Import failed.");
    } finally {
      event.target.value = "";
    }
  });

  $("#resetBtn").addEventListener("click", () => {
    if (!confirm("Reset all Project Hermit data on this device?")) return;
    localStorage.removeItem(STORAGE_KEYS.habits);
    localStorage.removeItem(STORAGE_KEYS.records);
    renderAll();
    showToast("App reset.");
  });
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setupPWA() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch((error) => console.warn("SW registration failed", error));
  }

  let deferredPrompt;
  const installBtn = $("#installBtn");
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installBtn.classList.remove("hidden");
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.classList.add("hidden");
  });
}

bindEvents();
renderAll();
setupPWA();
