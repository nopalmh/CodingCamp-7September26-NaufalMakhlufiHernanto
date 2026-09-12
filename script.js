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

  const $ = (selector) => document.querySelector(selector);

  function showToast(message, duration = 4000) {
    const toast = $("#storage-warning");

    toast.textContent = message;
    toast.classList.add("visible");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove("visible");
    }, duration);
  }

  function safeStorageGet(key) {
    if (!storageAvailable) return null;

    try {
      return localStorage.getItem(key);
    } catch {
      storageAvailable = false;
      showToast(
        "Local Storage is unavailable. Changes will only last during this session."
      );
      return null;
    }
  }

  function safeStorageSet(
    key,
    value,
    message = "Changes could not be saved."
  ) {
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

    if (
      Number.isInteger(duration) &&
      duration >= 1 &&
      duration <= 60
    ) {
      state.duration = duration;
    }

    const theme = safeStorageGet(KEYS.theme);

    if (theme === "light" || theme === "dark") {
      state.theme = theme;
    }

    const tasks = parseJSON(KEYS.tasks, []);

    if (Array.isArray(tasks)) {
      state.tasks = tasks
        .filter(
          (task) =>
            task &&
            typeof task.id === "string" &&
            typeof task.description === "string" &&
            typeof task.completed === "boolean"
        )
        .map((task) => ({
          id: task.id,
          description: task.description.slice(0, 200),
          completed: task.completed
        }));
    }

    const links = parseJSON(KEYS.links, []);

    if (Array.isArray(links)) {
      state.links = links
        .filter(
          (link) =>
            link &&
            typeof link.label === "string" &&
            typeof link.url === "string"
        )
        .slice(0, MAX_LINKS)
        .map((link) => ({
          label: link.label.trim(),
          url: link.url.trim()
        }))
        .filter(
          (link) =>
            link.label && /^https?:\/\//i.test(link.url)
        );
    }

    state.timer.remaining = state.duration * 60;
  }

  function applyTheme() {
    document.documentElement.setAttribute(
      "data-theme",
      state.theme
    );

    const toggle = $("#theme-toggle");

    toggle.textContent =
      state.theme === "dark" ? "☀️" : "🌙";

    toggle.setAttribute(
      "aria-label",
      state.theme === "dark"
        ? "Switch to light theme"
        : "Switch to dark theme"
    );

    toggle.setAttribute(
      "aria-pressed",
      String(state.theme === "dark")
    );
  }

  function updateClock() {
    try {
      const now = new Date();

      if (Number.isNaN(now.getTime())) {
        throw new Error("Invalid date");
      }

      lastValidDate = now;
    } catch {
      // Keep the last valid value.
    }

    $("#current-time").textContent =
      lastValidDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });

    $("#current-date").textContent =
      lastValidDate.toLocaleDateString("en-US", {
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

    return `${String(Math.floor(safe / 60)).padStart(
      2,
      "0"
    )}:${String(safe % 60).padStart(2, "0")}`;
  }

  function renderTimer() {
    $("#timer-display").textContent = formatTime(
      state.timer.remaining
    );

    let status = "Ready";

    if (state.timer.running) {
      status = "Running";
    } else if (state.timer.completed) {
      status = "Completed";
    } else if (
      state.timer.remaining !== state.duration * 60
    ) {
      status = "Paused";
    }

    $("#timer-status").textContent = status;
    $("#duration").value = state.duration;
  }

  function playAlert() {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

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

      oscillator.addEventListener("ended", () => {
        context.close().catch(() => {});
      });
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

    if (
      state.timer.remaining <= 0 ||
      state.timer.completed
    ) {
      state.timer.remaining = state.duration * 60;
      state.timer.completed = false;
    }

    state.timer.running = true;
    renderTimer();

    let lastTimestamp = Date.now();

    state.timer.intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor(
        (now - lastTimestamp) / 1000
      );

      if (elapsed < 1) return;

      lastTimestamp += elapsed * 1000;

      state.timer.remaining = Math.max(
        0,
        state.timer.remaining - elapsed
      );

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

    safeStorageSet(
      KEYS.username,
      state.username,
      "Username could not be saved."
    );

    updateGreeting(lastValidDate.getHours());
  }

  function handleDuration(event) {
    event.preventDefault();

    const input = $("#duration");
    const error = $("#duration-error");
    const value = Number(input.value);

    if (
      !Number.isInteger(value) ||
      value < 1 ||
      value > 60
    ) {
      error.textContent =
        "Duration must be a whole number from 1 to 60 minutes.";
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

    state.tasks.forEach((task) => {
      const li = document.createElement("li");

      li.className = "task-item";

      if (task.completed) {
        li.classList.add("completed");
      }

      li.dataset.id = task.id;

      const done = document.createElement("button");

      done.type = "button";
      done.textContent = task.completed ? "Undo" : "Done";
      done.setAttribute(
        "aria-label",
        task.completed
          ? "Mark task incomplete"
          : "Mark task done"
      );

      done.addEventListener("click", () => {
        task.completed = !task.completed;

        saveTasks();
        renderTasks();
      });

      const text = document.createElement("span");

      text.className = "task-text";
      text.textContent = task.description;

      const actions = document.createElement("div");

      actions.className = "task-actions";

      const edit = document.createElement("button");

      edit.type = "button";
      edit.className = "secondary";
      edit.textContent = "Edit";

      edit.addEventListener("click", () => {
        beginEditTask(li, task);
      });

      const remove = document.createElement("button");

      remove.type = "button";
      remove.className = "danger";
      remove.textContent = "Delete";

      remove.addEventListener("click", () => {
        state.tasks = state.tasks.filter(
          (item) => item.id !== task.id
        );

        saveTasks();
        renderTasks();
      });

      actions.append(edit, remove);
      li.append(done, text, actions);

      list.appendChild(li);
    });
  }

  function beginEditTask(li, task) {
    const text = li.querySelector(".task-text");
    const actions = li.querySelector(".task-actions");

    const wrapper = document.createElement("div");

    wrapper.className = "edit-wrap";

    const input = document.createElement("input");

    input.type = "text";
    input.maxLength = 200;
    input.value = task.description;

    const save = document.createElement("button");

    save.type = "button";
    save.textContent = "Save";

    const cancel = document.createElement("button");

    cancel.type = "button";
    cancel.className = "secondary";
    cancel.textContent = "Cancel";

    const error = document.createElement("span");

    error.className = "error";

    wrapper.append(input, save, cancel, error);

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

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        save.click();
      }

      if (event.key === "Escape") {
        cancel.click();
      }
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
      id: `${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`,
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

    state.links
      .slice(0, MAX_LINKS)
      .forEach((link, index) => {
        const wrapper = document.createElement("div");

        wrapper.className = "quick-link";

        const anchor = document.createElement("a");

        anchor.href = link.url;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.textContent = link.label;
        anchor.title = link.url;

        const remove = document.createElement("button");

        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute(
          "aria-label",
          `Delete ${link.label}`
        );

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

    return /^https?:\/\//i.test(value)
      ? value
      : `https://${value}`;
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

      error.textContent = `${invalid.join(
        " and "
      )} ${invalid.length > 1 ? "are" : "is"} required.`;

      return;
    }

    const url = normaliseURL(rawURL);

    if (!/^https?:\/\//i.test(url)) {
      error.textContent =
        "URL must use http:// or https://.";
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
    state.theme =
      state.theme === "light" ? "dark" : "light";

    applyTheme();

    safeStorageSet(
      KEYS.theme,
      state.theme,
      "Theme preference could not be saved."
    );
  }

  function init() {
    loadState();
    applyTheme();

    $("#username").value = state.username;
    $("#duration").value = state.duration;

    renderTasks();
    renderLinks();
    renderTimer();
    updateClock();

    $("#username-form").addEventListener(
      "submit",
      handleUsername
    );

    $("#duration-form").addEventListener(
      "submit",
      handleDuration
    );

    $("#todo-form").addEventListener(
      "submit",
      handleTodo
    );

    $("#link-form").addEventListener(
      "submit",
      handleLink
    );

    $("#timer-start").addEventListener(
      "click",
      startTimer
    );

    $("#timer-stop").addEventListener(
      "click",
      stopTimer
    );

    $("#timer-reset").addEventListener(
      "click",
      resetTimer
    );

    $("#theme-toggle").addEventListener(
      "click",
      toggleTheme
    );

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