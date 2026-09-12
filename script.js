(() => {
  "use strict";

  const KEYS = {
    username: "pd_username",
    duration: "pd_duration",
    tasks: "pd_tasks",
    links: "pd_links",
    theme: "pd_theme"
  };

  const DEFAULT_DURATION = 25;
  const MAX_LINKS = 20;

  let storageAvailable = true;
  let lastValidDate = new Date();
  let toastTimer = null;

  const state = {
    username: "",
    duration: DEFAULT_DURATION,
    theme: "light",
    tasks: [],
    links: [],
    timer: {
      remaining: DEFAULT_DURATION * 60,
      running: false,
      completed: false,
      intervalId: null
    }
  };

  const $ = selector => document.querySelector(selector);

  function showToast(message, duration = 4000) {
    const toast = $("#storage-warning");
    toast.textContent = message;
    toast.classList.remove("opacity-0", "translate-y-32");
    toast.classList.add("opacity-100", "translate-y-0");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("opacity-100", "translate-y-0");
      toast.classList.add("opacity-0", "translate-y-32");
    }, duration);
  }

  function safeStorageGet(key) {
    if (!storageAvailable) return null;

    try {
      return localStorage.getItem(key);
    } catch {
      storageAvailable = false;
      showToast("Local Storage is unavailable. Changes will only last during this session.");
      return null;
    }
  }

  function safeStorageSet(key, value, message = "Changes could not be saved.") {
    if (!storageAvailable) {
      showToast(message);
      return false;
    }

    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      storageAvailable = false;
      showToast(message);
      return false;
    }
  }

  function safeStorageRemove(key) {
    if (!storageAvailable) return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      storageAvailable = false;
      showToast("Changes could not be saved.");
      return false;
    }
  }

  function parseJSON(key, fallback) {
    const raw = safeStorageGet(key);
    if (raw === null) return fallback;

    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function loadState() {
    const username = safeStorageGet(KEYS.username);
    if (typeof username === "string" && username.trim()) {
      state.username = username.trim().slice(0, 50);
    }

    const duration = Number(safeStorageGet(KEYS.duration));
    if (Number.isInteger(duration) && duration >= 1 && duration <= 60) {
      state.duration = duration;
    }

    const theme = safeStorageGet(KEYS.theme);
    if (theme === "light" || theme === "dark") {
      state.theme = theme;
    }

    const tasks = parseJSON(KEYS.tasks, []);
    if (Array.isArray(tasks)) {
      state.tasks = tasks
        .filter(task =>
          task &&
          typeof task.id === "string" &&
          typeof task.description === "string" &&
          typeof task.completed === "boolean"
        )
        .map(task => ({
          id: task.id,
          description: task.description.slice(0, 200),
          completed: task.completed
        }));
    }

    const links = parseJSON(KEYS.links, []);
    if (Array.isArray(links)) {
      state.links = links
        .filter(link =>
          link &&
          typeof link.label === "string" &&
          typeof link.url === "string"
        )
        .slice(0, MAX_LINKS)
        .map(link => ({
          label: link.label.trim(),
          url: link.url.trim()
        }))
        .filter(link => link.label && /^https?:\/\//i.test(link.url));
    }

    state.timer.remaining = state.duration * 60;
  }

  function applyTheme() {
    document.documentElement.classList.toggle("dark", state.theme === "dark");

    const toggle = $("#theme-toggle");
    toggle.textContent = state.theme === "dark" ? "☀️" : "🌙";
    toggle.setAttribute(
      "aria-label",
      state.theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
    );
    toggle.setAttribute("aria-pressed", String(state.theme === "dark"));
  }

  function updateClock() {
    try {
      const now = new Date();
      if (Number.isNaN(now.getTime())) throw new Error("Invalid date");
      lastValidDate = now;
    } catch {
      // Keep the last valid value.
    }

    $("#current-time").textContent = lastValidDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });

    $("#current-date").textContent = lastValidDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    updateGreeting(lastValidDate.getHours());
  }

  function updateGreeting(hour) {
    let greeting;

    if (!Number.isInteger(hour)) {
      greeting = "Hello";
    } else if (hour >= 5 && hour <= 11) {
      greeting = "Good Morning";
    } else if (hour >= 12 && hour <= 17) {
      greeting = "Good Afternoon";
    } else if (hour >= 18 && hour <= 21) {
      greeting = "Good Evening";
    } else {
      greeting = "Good Night";
    }

    $("#greeting").textContent = state.username
      ? `${greeting}, ${state.username}`
      : greeting;
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
  }

  function renderTimer() {
    $("#timer-display").textContent = formatTime(state.timer.remaining);

    let status = "Ready";
    if (state.timer.running) status = "Running";
    else if (state.timer.completed) status = "Completed";
    else if (state.timer.remaining !== state.duration * 60) status = "Paused";

    $("#timer-status").textContent = status;
    $("#duration").value = state.duration;
  }

  function playAlert() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.12;

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.35);

      oscillator.addEventListener("ended", () => context.close().catch(() => {}));
    } catch {
      // Audio availability varies by browser.
    }
  }

  function stopTimerInterval() {
    if (state.timer.intervalId !== null) {
      clearInterval(state.timer.intervalId);
      state.timer.intervalId = null;
    }
  }

  function startTimer() {
    if (state.timer.running) return;

    if (state.timer.remaining <= 0 || state.timer.completed) {
      state.timer.remaining = state.duration * 60;
      state.timer.completed = false;
    }

    state.timer.running = true;
    renderTimer();

    let lastTimestamp = Date.now();

    state.timer.intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastTimestamp) / 1000);

      if (elapsed < 1) return;

      lastTimestamp += elapsed * 1000;
      state.timer.remaining = Math.max(0, state.timer.remaining - elapsed);
      renderTimer();

      if (state.timer.remaining === 0) {
        stopTimerInterval();
        state.timer.running = false;
        state.timer.completed = true;
        renderTimer();
        playAlert();
      }
    }, 250);
  }

  function stopTimer() {
    if (!state.timer.running) return;
    stopTimerInterval();
    state.timer.running = false;
    renderTimer();
  }

  function resetTimer() {
    stopTimerInterval();
    state.timer.running = false;
    state.timer.completed = false;
    state.timer.remaining = state.duration * 60;
    renderTimer();
  }

  function handleUsername(event) {
    event.preventDefault();

    const input = $("#username");
    const value = input.value.trim();

    if (!value) {
      state.username = "";
      safeStorageRemove(KEYS.username);
      input.value = "";
      updateGreeting(lastValidDate.getHours());
      return;
    }

    state.username = value.slice(0, 50);
    input.value = state.username;

    safeStorageSet(KEYS.username, state.username, "Username could not be saved.");
    updateGreeting(lastValidDate.getHours());
  }

  function handleDuration(event) {
    event.preventDefault();

    const input = $("#duration");
    const error = $("#duration-error");
    const value = Number(input.value);

    if (!Number.isInteger(value) || value < 1 || value > 60) {
      error.textContent = "Duration must be a whole number from 1 to 60 minutes.";
      return;
    }

    error.textContent = "";
    state.duration = value;

    safeStorageSet(
      KEYS.duration,
      String(value),
      "The duration could not be saved, but it will be used for this session."
    );

    if (!state.timer.running) {
      state.timer.completed = false;
      state.timer.remaining = value * 60;
      renderTimer();
    }
  }

  function saveTasks() {
    safeStorageSet(
      KEYS.tasks,
      JSON.stringify(state.tasks),
      "Task changes could not be saved."
    );
  }

  function renderTasks() {
    const list = $("#todo-list");
    list.replaceChildren();

    state.tasks.forEach(task => {
      const li = document.createElement("li");
      li.className =
        "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-600 dark:bg-slate-900 max-sm:grid-cols-[auto_minmax(0,1fr)]";
      if (task.completed) li.classList.add("opacity-70");
      li.dataset.id = task.id;

      const done = document.createElement("button");
      done.type = "button";
      done.className =
        "min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700";
      done.textContent = task.completed ? "Undo" : "Done";
      done.setAttribute("aria-label", task.completed ? "Mark task incomplete" : "Mark task done");

      done.addEventListener("click", () => {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
      });

      const text = document.createElement("span");
      text.className = "min-w-0 break-words text-sm";
      text.textContent = task.description;
      if (task.completed) {
        text.classList.add("text-slate-500", "line-through", "dark:text-slate-400");
      }

      const actions = document.createElement("div");
      actions.className = "flex flex-wrap justify-end gap-1.5 max-sm:col-span-full max-sm:justify-start";

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className =
        "min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => beginEditTask(li, task));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className =
        "min-h-10 rounded-lg border border-slate-200 bg-transparent px-3 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-slate-600 dark:text-red-400 dark:hover:bg-red-950/30";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => {
        state.tasks = state.tasks.filter(item => item.id !== task.id);
        saveTasks();
        renderTasks();
      });

      actions.append(edit, remove);
      li.append(done, text, actions);
      list.appendChild(li);
    });
  }

  function beginEditTask(li, task) {
    const text = li.querySelector("span");
    const actions = li.querySelector(".flex.flex-wrap");

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 200;
    input.value = task.description;
    input.className =
      "min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800";

    const wrapper = document.createElement("div");
    wrapper.className = "col-span-full flex min-w-0 flex-wrap gap-2";
    wrapper.appendChild(input);

    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "Save";
    save.className = "min-h-10 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    cancel.className =
      "min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

    const error = document.createElement("span");
    error.className = "basis-full text-xs text-red-600 dark:text-red-400";

    wrapper.append(save, cancel, error);
    text.replaceWith(wrapper);
    actions.replaceChildren();

    input.focus();
    input.select();

    save.addEventListener("click", () => {
      const value = input.value.trim();

      if (!value) {
        error.textContent = "Task description is required.";
        input.focus();
        return;
      }

      task.description = value.slice(0, 200);
      saveTasks();
      renderTasks();
    });

    cancel.addEventListener("click", renderTasks);

    input.addEventListener("keydown", event => {
      if (event.key === "Enter") save.click();
      if (event.key === "Escape") cancel.click();
    });
  }

  function handleTodo(event) {
    event.preventDefault();

    const input = $("#todo-input");
    const error = $("#todo-error");
    const description = input.value.trim();

    if (!description) {
      error.textContent = "Task description is required.";
      return;
    }

    error.textContent = "";

    state.tasks.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      description: description.slice(0, 200),
      completed: false
    });

    input.value = "";
    saveTasks();
    renderTasks();
  }

  function saveLinks() {
    safeStorageSet(
      KEYS.links,
      JSON.stringify(state.links),
      "Link data could not be saved."
    );
  }

  function renderLinks() {
    const container = $("#link-list");
    container.replaceChildren();

    state.links.slice(0, MAX_LINKS).forEach((link, index) => {
      const wrapper = document.createElement("div");
      wrapper.className =
        "flex min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-900";

      const anchor = document.createElement("a");
      anchor.href = link.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = link.label;
      anchor.title = link.url;
      anchor.className =
        "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-3 py-3 text-sm font-medium text-slate-800 hover:underline dark:text-slate-100";

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Delete ${link.label}`);
      remove.className =
        "min-h-11 w-11 shrink-0 border-l border-slate-200 bg-transparent text-lg text-red-600 hover:bg-red-50 dark:border-slate-600 dark:text-red-400 dark:hover:bg-red-950/30";

      remove.addEventListener("click", () => {
        state.links.splice(index, 1);
        saveLinks();
        renderLinks();
      });

      wrapper.append(anchor, remove);
      container.appendChild(wrapper);
    });
  }

  function normaliseURL(rawURL) {
    const value = rawURL.trim();
    return /^https?:\/\//i.test(value) ? value : `https://${value}`;
  }

  function handleLink(event) {
    event.preventDefault();

    const labelInput = $("#link-label");
    const urlInput = $("#link-url");
    const error = $("#link-error");

    const label = labelInput.value.trim();
    const rawURL = urlInput.value.trim();

    if (!label || !rawURL) {
      const invalid = [];
      if (!label) invalid.push("label");
      if (!rawURL) invalid.push("URL");
      error.textContent = `${invalid.join(" and ")} ${invalid.length > 1 ? "are" : "is"} required.`;
      return;
    }

    const url = normaliseURL(rawURL);

    if (!/^https?:\/\//i.test(url)) {
      error.textContent = "URL must use http:// or https://.";
      return;
    }

    if (state.links.length >= MAX_LINKS) {
      error.textContent = `You can save a maximum of ${MAX_LINKS} links.`;
      return;
    }

    error.textContent = "";

    state.links.push({
      label: label.slice(0, 100),
      url
    });

    labelInput.value = "";
    urlInput.value = "";
    saveLinks();
    renderLinks();
  }

  function toggleTheme() {
    state.theme = state.theme === "light" ? "dark" : "light";
    applyTheme();

    safeStorageSet(
      KEYS.theme,
      state.theme,
      "Theme preference could not be saved."
    );
  }

  function init() {
    // Load persisted state before rendering widgets.
    loadState();

    applyTheme();

    $("#username").value = state.username;
    $("#duration").value = state.duration;

    renderTasks();
    renderLinks();
    renderTimer();
    updateClock();

    $("#username-form").addEventListener("submit", handleUsername);
    $("#duration-form").addEventListener("submit", handleDuration);
    $("#todo-form").addEventListener("submit", handleTodo);
    $("#link-form").addEventListener("submit", handleLink);

    $("#timer-start").addEventListener("click", startTimer);
    $("#timer-stop").addEventListener("click", stopTimer);
    $("#timer-reset").addEventListener("click", resetTimer);
    $("#theme-toggle").addEventListener("click", toggleTheme);

    setInterval(updateClock, 250);

    if (!storageAvailable) {
      showToast(
        "Local Storage is unavailable. The dashboard will continue using in-memory data.",
        5000
      );
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
