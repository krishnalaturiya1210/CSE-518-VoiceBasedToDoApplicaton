// script3.js
const statusText = document.getElementById("status");
const taskList = document.getElementById("taskList");
const muteBtn = document.getElementById("muteBtn");
const clearBtn = document.getElementById("clearBtn");
const manualForm = document.getElementById("manualForm");
const manualInput = document.getElementById("manualInput");
const controls = document.getElementById("controls");

const synth = window.speechSynthesis;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let listening = true;
let wakeRecognition, commandRecognition;
let wakeRunning = false;
let inCommandMode = false;
let sortMode = "created";



function attachLongPressDelete(element, taskId) {
  let pressTimer = null;
  let longPressTriggered = false;

  const start = (e) => {
    longPressTriggered = false;
    // 650ms press = long-press
    pressTimer = setTimeout(() => {
      longPressTriggered = true;
      element.classList.add("task-long-pressed");
      if (confirm("Long press detected. Delete this task?")) {
        deleteTask(taskId);
      }
      // small delay then remove highlight
      setTimeout(() => {
        element.classList.remove("task-long-pressed");
      }, 300);
    }, 650);
  };

  const cancel = (e) => {
    if (pressTimer !== null) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  // Touch events (phone)
  element.addEventListener("touchstart", start);
  element.addEventListener("touchend", cancel);
  element.addEventListener("touchmove", cancel);
  element.addEventListener("touchcancel", cancel);

  // Mouse events (desktop)
  element.addEventListener("mousedown", start);
  element.addEventListener("mouseup", cancel);
  element.addEventListener("mouseleave", cancel);
}


/* --- Audio cue --- */
function playDing() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
  } catch (err) {
    console.warn("🔇 Ding playback failed:", err);
  }
}

function speak(text) {
  if (!synth) return;
  console.log("🗣️ Speaking:", text);

  //Important especially on mobile:
  // Cancel any queued / ongoing speech so we don't stutter.
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  synth.speak(utter);
}


function showStatus(msg, color = "#333") {
  console.log(`💬 Status: ${msg}`);
  statusText.textContent = msg;
  statusText.style.color = color;
}

/* --- Task List (NEW card layout) --- */
async function refreshTasks() {
  console.log("🎨 Refreshing tasks...");
  try {
    const res = await fetch(`/tasks?sort=${sortMode}`);
    const tasks = await res.json();
    taskList.innerHTML = "";

    console.log(`🎨 Rendering ${tasks.length} tasks.`);
    tasks.forEach(t => {
      const div = document.createElement("div");
      div.className = "task";
      div.dataset.id = t.id;

      // Format due date if present
      let formattedDate = "";
      if (t.due_date) {
        const dueDate = new Date(t.due_date);
        formattedDate = dueDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }

      div.innerHTML = `
        <div class="task-header">
          <input type="checkbox" ${t.done ? "checked" : ""}>
          <span class="task-title ${t.done ? "task-title-done" : ""}">
            ${t.name}
          </span>
        </div>

        <div class="task-meta">
          ${t.category && t.category !== "general"
            ? `<span class="task-pill">${t.category}</span>`
            : ""
          }
          <span class="priority-dot priority-${t.priority || 1}"></span>
          ${formattedDate
            ? `<span class="task-due"><span class="cal-icon">📅</span>${formattedDate}</span>`
            : ""
          }
        </div>

        <div class="task-footer">
          <button class="task-delete">Delete</button>
        </div>
      `;

      // Checkbox behavior
      const checkbox = div.querySelector("input[type='checkbox']");
      checkbox.addEventListener("change", () => toggleTask(t.id));

      const deleteBtn = div.querySelector(".task-delete");
      deleteBtn.addEventListener("click", () => deleteTask(t.id));

      // Attach long-press-to-delete on the whole card
      attachLongPressDelete(div, t.id);

      taskList.appendChild(div);

    
    });
  } catch (err) {
    showStatus("Failed to load tasks.", "red");
    console.error("🎨 Error refreshing tasks:", err);
  }
}

/* --- API Helper --- */
async function sendCommandJson(path, payload = {}) {
  console.log(`➡️ Sending API command to ${path}`, payload);
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("⬅️ Received API response:", data);
    if (!res.ok) {
      const err = data.error || "Unknown error";
      console.error("API Error:", err);
      speak(err);
      showStatus(err, "red");
      return null;
    }
    if (data.message) speak(data.message);
    await refreshTasks();
    return data;
  } catch (err) {
    console.error("API Network Error:", err);
    showStatus("Network error.", "red");
    speak("Network error.");
    return null;
  }
}

/* --- Voice Command Processing --- */
async function processCommand(cmd) {
  console.log(`🧠 Processing command: "${cmd}"`);
  if (!cmd) return;
  cmd = cmd.trim();
  if (!cmd) return;
  const lower = cmd.toLowerCase();

  if (lower.startsWith("add ")) {
    console.log("-> Matched ADD");
    const name = cmd.replace(/^\s*add\s*/i, "").trim();
    if (!name) return speak("What should I add?");
    sendCommandJson("/add", { task: name });
    return;
  }

  if (lower.startsWith("remind me to ")) {
    console.log("-> Matched REMIND ME TO");
    const name = cmd.replace(/^\s*remind me to\s*/i, "").trim();
    if (!name) return speak("What should I remind you to do?");
    sendCommandJson("/add", { task: name });
    return;
  }

  const markMatch = lower.match(/^mark\s+(.+?)\s+(?:as\s+)?done$/i);
  if (markMatch) {
    console.log("-> Matched MARK");
    sendCommandJson("/mark-by-name", { name: markMatch[1].trim() });
    return;
  }

  const deleteMatch = lower.match(/^(?:delete|remove)\s+(.+)$/i);
  if (deleteMatch) {
    console.log("-> Matched DELETE");
    sendCommandJson("/delete-by-name", { name: deleteMatch[1].trim() });
    return;
  }

  if (lower.includes("clear completed") || lower.includes("remove completed")) {
    console.log("-> Matched CLEAR COMPLETED");
    sendCommandJson("/clear-completed");
    return;
  }

  if (lower.includes("clear all") || lower.includes("remove all")) {
    console.log("-> Matched CLEAR ALL");
    sendCommandJson("/clear");
    return;
  }

  if (lower.includes("list all tasks") || lower.includes("what are my tasks")) {
    console.log("-> Matched LIST ALL");
    await listAllTasks();
    return;
  }
  if (lower.includes("list pending") || lower.includes("pending tasks")) {
    console.log("-> Matched LIST PENDING");
    await listPendingTasks();
    return;
  }
  if (lower.includes("list completed") || lower.includes("completed tasks")) {
    console.log("-> Matched LIST COMPLETED");
    await listCompletedTasks();
    return;
  }

  // Sorting
  if (lower.includes("sort by priority") || lower.includes("order by priority")) {
    sortMode = "priority";
    speak("Sorting by priority.");
    await refreshTasks();
    return;
  }

  if (lower.includes("sort by category") || lower.includes("order by category")) {
    sortMode = "category";
    speak("Sorting by category.");
    await refreshTasks();
    return;
  }

  if (
    lower.includes("sort by due") ||
    lower.includes("sort by date") ||
    lower.includes("sort by deadline") ||
    lower.includes("order by due") ||
    lower.includes("order by date") ||
    lower.includes("order by deadline")
  ) {
    sortMode = "due";
    speak("Sorting by due date.");
    await refreshTasks();
    return;
  }

  if (
    lower.includes("sort by created") ||
    lower.includes("sort by added") ||
    lower.includes("order by created") ||
    lower.includes("order by added")
  ) {
    sortMode = "created";
    speak("Sorting by created time.");
    await refreshTasks();
    return;
  }

  console.log("-> Command not understood.");
  speak("Sorry, I didn't understand that.");
}

/* --- Task Listing Commands --- */
async function listAllTasks() {
  console.log("📋 Listing all tasks...");
  try {
    const res = await fetch("/tasks");
    const tasks = await res.json();
    if (!tasks.length) {
      speak("You have no tasks.");
      showStatus("No tasks found.", "orange");
      return;
    }
    const names = tasks.map(t => t.name).join(", ");
    speak(`You have ${tasks.length} tasks: ${names}`);
  } catch (err) {
    console.error("Error listing all tasks:", err);
    speak("Failed to fetch tasks.");
  }
}

async function listPendingTasks() {
  console.log("📋 Listing pending tasks...");
  try {
    const res = await fetch("/tasks");
    const tasks = await res.json();
    const pending = tasks.filter(t => !t.done);

    if (!pending.length) {
      speak("You have no pending tasks.");
      showStatus("No pending tasks.", "green");
      return;
    }

    const names = pending.map(t => t.name).join(", ");
    speak(`You have ${pending.length} pending tasks: ${names}`);
  } catch (err) {
    console.error("Error listing pending tasks:", err);
    speak("Failed to fetch tasks.");
  }
}

async function listCompletedTasks() {
  console.log("📋 Listing completed tasks...");
  try {
    const res = await fetch("/tasks");
    const tasks = await res.json();
    const completed = tasks.filter(t => t.done);

    if (!completed.length) {
      speak("You have no completed tasks.");
      showStatus("No completed tasks.", "gray");
      return;
    }

    const names = completed.map(t => t.name).join(", ");
    speak(`You have ${completed.length} completed tasks: ${names}`);
  } catch (err) {
    console.error("Error listing completed tasks:", err);
    speak("Failed to fetch tasks.");
  }
}

async function toggleTask(id) {
  console.log(`🖱️ UI: Toggle task ${id}`);
  await sendCommandJson("/toggle", { id });
}

async function deleteTask(id) {
  console.log(`🖱️ UI: Delete task ${id}`);
  await sendCommandJson("/delete", { id });
}

/* --- Sorting Dropdown --- */
function addSortDropdown() {
  console.log("⚙️ Initializing Sort Dropdown");
  const old = document.getElementById("sortWrapper");
  if (old) old.remove();

  const wrapper = document.createElement("div");
  wrapper.className = "dropdown";
  wrapper.id = "sortWrapper";

  const btn = document.createElement("button");
  btn.id = "sortButton";
  btn.textContent = "Sort By ▾";

  const dropdown = document.createElement("div");
  dropdown.className = "dropdown-content";

  const options = [
    { value: "created", label: "Created At" },
    { value: "priority", label: "Priority" },
    { value: "category", label: "Category" },
    { value: "due", label: "Due Date" }
  ];

  options.forEach(opt => {
    const item = document.createElement("a");
    item.textContent = opt.label;
    item.href = "#";
    item.dataset.sort = opt.value;
    item.addEventListener("click", (e) => {
      e.preventDefault();
      console.log(`🎨 Sort mode changed to: ${opt.value}`);
      sortMode = opt.value;
      wrapper.classList.remove("show");
      btn.textContent = `Sort By: ${opt.label} ▾`;
      refreshTasks();
    });
    dropdown.appendChild(item);
  });

  btn.addEventListener("click", () => {
    wrapper.classList.toggle("show");
  });

  document.addEventListener("click", e => {
    if (!wrapper.contains(e.target)) {
      wrapper.classList.remove("show");
    }
  });

  wrapper.appendChild(btn);
  wrapper.appendChild(dropdown);
  controls.appendChild(wrapper);
}

/* --- Speech Recognition Setup --- */
function initRecognizers() {
  console.log("⚙️ Initializing speech recognizers...");
  if (!SpeechRecognition) {
    console.error("Web Speech API not supported.");
    showStatus("Web Speech API not supported.", "red");
    return;
  }

  wakeRecognition = new SpeechRecognition();
  wakeRecognition.lang = "en-US";
  wakeRecognition.continuous = true;

  commandRecognition = new SpeechRecognition();
  commandRecognition.lang = "en-US";
  commandRecognition.continuous = false;

  wakeRecognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
    console.log(`🎙️ Wake heard: "${transcript}"`);
    if ((transcript.includes("hey to do") || transcript.includes("hello to do")) && !inCommandMode) {
      console.log("✅ Wake word DETECTED. Activating command mode.");
      inCommandMode = true;
      stopWakeRecognition();

      const utter = new SpeechSynthesisUtterance("Yes?");
      utter.lang = "en-US";

      showStatus("Listening for command...", "blue");

      utter.onend = () => {
        console.log("🎙️ App finished speaking. Starting command recognition.");
        playDing();
        showStatus("Speak now!", "green");
        commandRecognition.start();
      };

      synth.speak(utter);
    }
  };

  wakeRecognition.onend = () => {
    console.log("🎙️ Wake recognizer stopped.");
    wakeRunning = false;
    if (!inCommandMode && listening) setTimeout(startWakeRecognition, 500);
  };

  wakeRecognition.onerror = (e) => {
    if (e.error !== "no-speech") console.warn("🎙️ Wake recognizer error:", e.error);
  };

  commandRecognition.onresult = (e) => {
    const transcript = e.results[e.results.length - 1][0].transcript;
    console.log(`🎙️ Command heard: "${transcript}"`);
    showStatus(`You said: "${transcript}"`, "purple");
    processCommand(transcript);
  };

  commandRecognition.onend = () => {
    console.log("🎙️ Command recognizer stopped. Returning to wake mode.");
    inCommandMode = false;
    showStatus("Say 'Hey To Do' to start again.", "green");
    if (listening) setTimeout(startWakeRecognition, 500);
  };

  commandRecognition.onerror = (e) => {
    console.warn("🎙️ Command recognizer error:", e.error);
    inCommandMode = false;
    startWakeRecognition();
  };
}

function startWakeRecognition() {
  if (!wakeRunning && listening && wakeRecognition) {
    console.log("🎙️ Starting wake recognizer...");
    wakeRecognition.start();
    wakeRunning = true;
  }
}

function stopWakeRecognition() {
  if (wakeRunning && wakeRecognition) {
    console.log("🎙️ Stopping wake recognizer.");
    try { wakeRecognition.stop(); } catch {}
    wakeRunning = false;
  }
}

/* --- Manual Input --- */
manualForm.addEventListener("submit", ev => {
  ev.preventDefault();
  const v = manualInput.value.trim();
  console.log(`🖱️ Manual form submitted: "${v}"`);
  if (!v) return;
  sendCommandJson("/add", { task: v });
  manualInput.value = "";
});

/* --- Mute Toggle --- */
muteBtn.addEventListener("click", () => {
  listening = !listening;
  console.log(`🖱️ Mute button clicked. Listening set to: ${listening}`);
  muteBtn.textContent = listening ? "Stop Listening" : "Start Listening";
  if (listening) {
    initRecognizers();
    startWakeRecognition();
    showStatus("Say 'Hey To Do' to start.", "green");
  } else {
    stopWakeRecognition();
    commandRecognition?.stop();
    showStatus("Voice paused. Use manual input.", "gray");
  }
});

/* --- Clear All --- */
clearBtn.addEventListener("click", async () => {
  console.log("🖱️ Clear All button clicked.");
  if (!confirm("Clear all tasks?")) {
    console.log("-> Clear all cancelled.");
    return;
  }
  await sendCommandJson("/clear");
});

/* --- Initialize App --- */
console.log("🚀 App starting...");
addSortDropdown();
initRecognizers();
startWakeRecognition();
refreshTasks();
showStatus("Say 'Hey To Do' to start.", "green");

/* --- Overlay + Service Worker on load --- */
window.addEventListener("load", () => {
  console.log("🎉 Page loaded.");

  const overlay = document.getElementById("overlay");
  if (overlay) {
    overlay.addEventListener("click", () => {
      overlay.classList.add("fade-out");
      setTimeout(() => overlay.remove(), 600);
      speak("Voice-based To-Do app ready. Say 'Hey To Do' to start.");
    });
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/static/sw.js")
      .catch(err => console.error("SW registration failed:", err));
  }
});
