const STORAGE_KEY = "migraineTracker.entries.v1";
const PREF_KEY = "migraineTracker.preferences.v1";
const BACKUP_FILE_NAME = "migraine-tracker-encrypted-backup.json";

const state = {
  entries: loadJson(STORAGE_KEY, []),
  preferences: loadJson(PREF_KEY, {
    language: "en",
    reminderTime: "20:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }),
  token: null
};

const entryForm = document.getElementById("entryForm");
const timelineOutput = document.getElementById("timelineOutput");
const calendarOutput = document.getElementById("calendarOutput");
const reportOutput = document.getElementById("reportOutput");
const streakOutput = document.getElementById("streakOutput");
const driveStatus = document.getElementById("driveStatus");
const timezoneInput = document.getElementById("timezone");
const languageInput = document.getElementById("language");
const reminderInput = document.getElementById("reminderTime");

timezoneInput.value = state.preferences.timezone;
languageInput.value = state.preferences.language;
reminderInput.value = state.preferences.reminderTime;

languageInput.addEventListener("change", () => updatePreferences());
reminderInput.addEventListener("change", () => {
  updatePreferences();
  scheduleReminder();
});

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const payload = formToEntry(new FormData(entryForm));
  const existingIndex = state.entries.findIndex((entry) => entry.id === payload.id);
  if (existingIndex >= 0) {
    state.entries[existingIndex] = payload;
  } else {
    state.entries.unshift(payload);
  }
  persistEntries();
  entryForm.reset();
  entryForm.elements.durationMinutes.value = 60;
  entryForm.elements.painLevel.value = 5;
  entryForm.elements.hydrationLiters.value = 1.5;
  entryForm.elements.sleepHours.value = 7;
  renderAll();
});

document.querySelectorAll(".reportBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const days = Number(btn.getAttribute("data-range"));
    reportOutput.textContent = renderReport(days);
  });
});

document.getElementById("printReportBtn").addEventListener("click", () => window.print());
document.getElementById("csvExportBtn").addEventListener("click", exportCsv);
document.getElementById("deleteDataBtn").addEventListener("click", deleteAllData);

document.getElementById("hit6CalcBtn").addEventListener("click", calcHit6);
document.getElementById("midasCalcBtn").addEventListener("click", calcMidas);

document.getElementById("driveConnectBtn").addEventListener("click", connectGoogleDrive);
document.getElementById("backupBtn").addEventListener("click", backupToDrive);
document.getElementById("restoreBtn").addEventListener("click", restoreFromDrive);

function formToEntry(formData) {
  const editingId = entryForm.dataset.editId;
  const startTime = formData.get("startTime");
  const durationMinutes = Number(formData.get("durationMinutes") || 0);
  const painLevel = Number(formData.get("painLevel") || 0);
  const symptoms = {
    nausea: formData.get("symptomNausea") === "on",
    photophobia: formData.get("symptomPhoto") === "on",
    phonophobia: formData.get("symptomPhono") === "on",
    aura: formData.get("symptomAura") === "on"
  };
  return {
    id: editingId || crypto.randomUUID(),
    createdAt: editingId ? undefined : new Date().toISOString(),
    startTime,
    durationMinutes,
    painLevel,
    foodNotes: String(formData.get("foodNotes") || ""),
    hydrationLiters: Number(formData.get("hydrationLiters") || 0),
    sleepHours: Number(formData.get("sleepHours") || 0),
    rescueMed: String(formData.get("rescueMed") || ""),
    medEffective: String(formData.get("medEffective") || "unknown"),
    suspectedTrigger: String(formData.get("suspectedTrigger") || ""),
    activityImpact: String(formData.get("activityImpact") || ""),
    notes: String(formData.get("notes") || ""),
    symptoms,
    ichd: {
      unilateral: formData.get("ichdUnilateral") === "on",
      pulsating: formData.get("ichdPulsating") === "on",
      aggravatedByActivity: formData.get("ichdAggravatedByActivity") === "on",
      moderateSevere: formData.get("ichdModerateSevere") === "on"
    }
  };
}

function renderAll() {
  renderTimeline();
  renderCalendar();
  renderStreaks();
  reportOutput.textContent = renderReport(30);
}

function renderTimeline() {
  const template = document.getElementById("timelineItemTemplate");
  timelineOutput.textContent = "";
  const sorted = [...state.entries].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  sorted.forEach((entry) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".date").textContent = new Date(entry.startTime).toLocaleString();
    node.querySelector(".pain").textContent = `Pain ${entry.painLevel}/10`;
    node.querySelector(".timeline-meta").textContent =
      `${entry.durationMinutes} min • Sleep ${entry.sleepHours}h • Hydration ${entry.hydrationLiters}L • Med: ${entry.rescueMed || "n/a"} (${entry.medEffective})`;
    node.querySelector(".timeline-notes").textContent =
      `Food: ${entry.foodNotes || "n/a"} • Trigger: ${entry.suspectedTrigger || "n/a"} • Activity impact: ${entry.activityImpact || "n/a"}`;
    node.querySelector(".editBtn").addEventListener("click", () => beginEdit(entry.id));
    node.querySelector(".deleteBtn").addEventListener("click", () => removeEntry(entry.id));
    timelineOutput.appendChild(node);
  });
}

function renderCalendar() {
  calendarOutput.textContent = "";
  const counts = new Map();
  for (const entry of state.entries) {
    const day = entry.startTime?.slice(0, 10);
    if (!day) continue;
    counts.set(day, (counts.get(day) || 0) + 1);
  }
  const days = Array.from(counts.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 42);
  days.forEach(([day, count]) => {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    cell.textContent = `${day}: ${count} event${count > 1 ? "s" : ""}`;
    calendarOutput.appendChild(cell);
  });
}

function renderStreaks() {
  const uniqueDays = new Set(state.entries.map((entry) => entry.startTime?.slice(0, 10)).filter(Boolean));
  let streak = 0;
  let pointer = new Date();
  while (true) {
    const key = pointer.toISOString().slice(0, 10);
    if (!uniqueDays.has(key)) break;
    streak += 1;
    pointer.setDate(pointer.getDate() - 1);
  }
  streakOutput.textContent = `Current consecutive migraine-day streak: ${streak} day(s).`;
}

function renderReport(days) {
  const now = Date.now();
  const threshold = now - days * 24 * 60 * 60 * 1000;
  const subset = state.entries.filter((entry) => new Date(entry.startTime).getTime() >= threshold);
  if (!subset.length) return `No entries in last ${days} days.`;
  const migraineDays = new Set(subset.map((entry) => entry.startTime.slice(0, 10))).size;
  const avgPain = mean(subset.map((entry) => entry.painLevel)).toFixed(2);
  const avgDuration = mean(subset.map((entry) => entry.durationMinutes)).toFixed(1);
  const effectiveCount = subset.filter((entry) => entry.medEffective === "yes" || entry.medEffective === "partial").length;
  const medResponse = ((effectiveCount / subset.length) * 100).toFixed(1);
  const topTriggers = topCounts(subset.map((entry) => entry.suspectedTrigger).filter(Boolean), 5);
  const topFoods = topCounts(subset.map((entry) => entry.foodNotes).filter(Boolean), 5);
  const insights = buildInsights(subset);
  return [
    `Migraine Tracker Report (${days} days)`,
    `Generated: ${new Date().toLocaleString()}`,
    "",
    `Entries: ${subset.length}`,
    `Migraine days/month (normalized): ${(migraineDays * 30 / days).toFixed(1)}`,
    `Average pain severity (0-10): ${avgPain}`,
    `Average duration (minutes): ${avgDuration}`,
    `Medication effectiveness rate (yes/partial): ${medResponse}%`,
    "",
    "Top suspected triggers:",
    ...topTriggers.map((item) => `- ${item.value}: ${item.count}`),
    "",
    "Top food associations:",
    ...topFoods.map((item) => `- ${item.value}: ${item.count}`),
    "",
    "Pattern signals (correlation, not causation):",
    ...insights,
    "",
    "Clinical framing:",
    "- Fields include ICHD-3-aligned characteristics for diagnostic support.",
    "- Use HIT-6 and MIDAS scores for disability trends.",
    "- Not medical advice; discuss findings with a clinician."
  ].join("\n");
}

function buildInsights(entries) {
  const total = entries.length;
  const analyses = [
    ratioAnalysis(entries, (e) => e.sleepHours > 0 && e.sleepHours < 6, "sleep <6h"),
    ratioAnalysis(entries, (e) => e.hydrationLiters > 0 && e.hydrationLiters < 1.5, "hydration <1.5L"),
    ratioAnalysis(entries, (e) => /stress/i.test(e.suspectedTrigger), "stress trigger label"),
    ratioAnalysis(entries, (e) => Boolean(e.foodNotes), "food logged")
  ].filter(Boolean);
  if (!analyses.length) return ["- Insufficient feature diversity for robust pattern signals."];
  return analyses.map((row) => {
    const confidence = row.support >= Math.max(8, Math.floor(total * 0.25)) ? "moderate" : "low";
    return `- Episodes with ${row.label} appear ${row.multiplier}x as frequent in this dataset (confidence: ${confidence}, support: ${row.support}).`;
  });
}

function ratioAnalysis(entries, predicate, label) {
  const yes = entries.filter(predicate);
  const no = entries.filter((entry) => !predicate(entry));
  if (!yes.length || !no.length) return null;
  const yesRate = yes.length / entries.length;
  const noRate = no.length / entries.length;
  return {
    label,
    support: yes.length,
    multiplier: (yesRate / noRate).toFixed(2)
  };
}

function beginEdit(id) {
  const entry = state.entries.find((candidate) => candidate.id === id);
  if (!entry) return;
  entryForm.dataset.editId = id;
  for (const [key, value] of Object.entries(entry)) {
    if (entryForm.elements[key] && typeof value !== "object") {
      entryForm.elements[key].value = value ?? "";
    }
  }
  entryForm.elements.symptomNausea.checked = Boolean(entry.symptoms?.nausea);
  entryForm.elements.symptomPhoto.checked = Boolean(entry.symptoms?.photophobia);
  entryForm.elements.symptomPhono.checked = Boolean(entry.symptoms?.phonophobia);
  entryForm.elements.symptomAura.checked = Boolean(entry.symptoms?.aura);
  entryForm.elements.ichdUnilateral.checked = Boolean(entry.ichd?.unilateral);
  entryForm.elements.ichdPulsating.checked = Boolean(entry.ichd?.pulsating);
  entryForm.elements.ichdAggravatedByActivity.checked = Boolean(entry.ichd?.aggravatedByActivity);
  entryForm.elements.ichdModerateSevere.checked = Boolean(entry.ichd?.moderateSevere);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function removeEntry(id) {
  state.entries = state.entries.filter((entry) => entry.id !== id);
  persistEntries();
  renderAll();
}

function calcHit6() {
  const values = csvToNumbers(document.getElementById("hit6Input").value);
  const score = values.reduce((sum, value) => sum + value, 0);
  let category = "little/no impact";
  if (score >= 60) category = "severe impact";
  else if (score >= 56) category = "substantial impact";
  else if (score >= 50) category = "some impact";
  document.getElementById("hit6Result").textContent = `HIT-6 score: ${score} (${category})`;
}

function calcMidas() {
  const values = csvToNumbers(document.getElementById("midasInput").value);
  const score = values.reduce((sum, value) => sum + value, 0);
  let grade = "Grade I (little/no disability)";
  if (score >= 21) grade = "Grade IV (severe disability)";
  else if (score >= 11) grade = "Grade III (moderate disability)";
  else if (score >= 6) grade = "Grade II (mild disability)";
  document.getElementById("midasResult").textContent = `MIDAS score: ${score} (${grade})`;
}

function csvToNumbers(raw) {
  return raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value));
}

function exportCsv() {
  if (!state.entries.length) return;
  const headers = [
    "id", "startTime", "durationMinutes", "painLevel", "foodNotes", "hydrationLiters", "sleepHours",
    "rescueMed", "medEffective", "suspectedTrigger", "activityImpact", "notes", "nausea", "photophobia",
    "phonophobia", "aura", "ichdUnilateral", "ichdPulsating", "ichdAggravatedByActivity", "ichdModerateSevere"
  ];
  const rows = state.entries.map((entry) => [
    entry.id,
    entry.startTime,
    entry.durationMinutes,
    entry.painLevel,
    entry.foodNotes,
    entry.hydrationLiters,
    entry.sleepHours,
    entry.rescueMed,
    entry.medEffective,
    entry.suspectedTrigger,
    entry.activityImpact,
    entry.notes,
    entry.symptoms?.nausea,
    entry.symptoms?.photophobia,
    entry.symptoms?.phonophobia,
    entry.symptoms?.aura,
    entry.ichd?.unilateral,
    entry.ichd?.pulsating,
    entry.ichd?.aggravatedByActivity,
    entry.ichd?.moderateSevere
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  downloadBlob(new Blob([csv], { type: "text/csv" }), `migraine-report-${Date.now()}.csv`);
}

async function connectGoogleDrive() {
  if (!window.google?.accounts?.oauth2) {
    driveStatus.textContent = "Drive status: Google Identity unavailable.";
    return;
  }
  const clientId = window.MIGRAINE_TRACKER_GOOGLE_CLIENT_ID || prompt("Enter Google OAuth Client ID");
  if (!clientId) return;
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata",
    callback: (response) => {
      state.token = response.access_token;
      driveStatus.textContent = "Drive status: connected";
    }
  });
  tokenClient.requestAccessToken({ prompt: "consent" });
}

async function backupToDrive() {
  if (!state.token) {
    driveStatus.textContent = "Drive status: connect first.";
    return;
  }
  const passphrase = document.getElementById("passphrase").value;
  if (!passphrase) {
    driveStatus.textContent = "Drive status: passphrase required.";
    return;
  }
  const payload = JSON.stringify({ entries: state.entries, preferences: state.preferences });
  const encrypted = await encryptString(payload, passphrase);
  const metadata = {
    name: BACKUP_FILE_NAME,
    parents: ["appDataFolder"]
  };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", new Blob([JSON.stringify(encrypted)], { type: "application/json" }));
  await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { Authorization: `Bearer ${state.token}` },
    body: form
  });
  driveStatus.textContent = "Drive status: encrypted backup uploaded.";
}

async function restoreFromDrive() {
  if (!state.token) {
    driveStatus.textContent = "Drive status: connect first.";
    return;
  }
  const passphrase = document.getElementById("passphrase").value;
  if (!passphrase) {
    driveStatus.textContent = "Drive status: passphrase required.";
    return;
  }
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(BACKUP_FILE_NAME)}' and 'appDataFolder' in parents&spaces=appDataFolder&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`;
  const searchRes = await fetch(searchUrl, { headers: { Authorization: `Bearer ${state.token}` } });
  const searchJson = await searchRes.json();
  const file = searchJson.files?.[0];
  if (!file) {
    driveStatus.textContent = "Drive status: no backup file found.";
    return;
  }
  const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${state.token}` }
  });
  const encrypted = await fileRes.json();
  const decrypted = await decryptString(encrypted, passphrase);
  const parsed = JSON.parse(decrypted);
  state.entries = parsed.entries || [];
  state.preferences = { ...state.preferences, ...(parsed.preferences || {}) };
  persistEntries();
  updatePreferences(true);
  renderAll();
  driveStatus.textContent = "Drive status: restore complete.";
}

async function encryptString(plainText, passphrase) {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 },
    passphraseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoder.encode(plainText));
  return {
    salt: toBase64(salt),
    iv: toBase64(iv),
    cipherText: toBase64(new Uint8Array(encrypted))
  };
}

async function decryptString(payload, passphrase) {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const aesKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: fromBase64(payload.salt), iterations: 100000 },
    passphraseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(payload.iv) },
    aesKey,
    fromBase64(payload.cipherText)
  );
  return new TextDecoder().decode(decrypted);
}

function toBase64(uint8) {
  return btoa(String.fromCharCode(...uint8));
}

function fromBase64(base64) {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function updatePreferences(skipPersist = false) {
  state.preferences.language = languageInput.value;
  state.preferences.reminderTime = reminderInput.value;
  state.preferences.timezone = timezoneInput.value;
  if (!skipPersist) localStorage.setItem(PREF_KEY, JSON.stringify(state.preferences));
}

function scheduleReminder() {
  if (!("Notification" in window)) return;
  Notification.requestPermission().then((result) => {
    if (result !== "granted") return;
    const [hour, minute] = state.preferences.reminderTime.split(":").map(Number);
    const now = new Date();
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - now.getTime();
    window.setTimeout(() => {
      new Notification("Migraine Tracker reminder", { body: "Log today’s migraine data if applicable." });
    }, Math.min(delay, 2147483647));
  });
}

function deleteAllData() {
  if (!confirm("Delete all local migraine entries and preferences?")) return;
  state.entries = [];
  persistEntries();
  localStorage.removeItem(PREF_KEY);
  renderAll();
}

function persistEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function topCounts(values, limit) {
  const map = new Map();
  values.forEach((value) => map.set(value, (map.get(value) || 0) + 1));
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

renderAll();
scheduleReminder();
