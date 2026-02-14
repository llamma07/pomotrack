// app.js — Main controller

// ─── Utility ────────────────────────────────────────────────────────────────

const formatTime = (secs) => {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const parseTime = (str) => {
  const [m, s] = str.split(":").map(Number);
  return m * 60 + s;
};

// ─── DOM References ──────────────────────────────────────────────────────────

const timerDisplay = document.getElementById("timerDisplay");
const startButton = document.getElementById("startButton");
const resetBtn = document.querySelector(".reset");
const originalHelpText = document.querySelector(".text-help");
let helpText = originalHelpText;
const mainContent = document.querySelector(".main-content");

const tabFocus = document.querySelector(".pmo-btn.focus");
const tabBreak = document.querySelector(".pmo-btn.break");
const tabCycle = document.querySelector(".pmo-btn.cycle");

// ─── State ───────────────────────────────────────────────────────────────────

let activeTab = "focus"; // 'focus' | 'break' | 'cycle'
let helpFadeTimeout = null;
let cycleUIInjected = false;

// ─── Help Text ───────────────────────────────────────────────────────────────

const showHelp = (msg, persist = false, isError = false) => {
  clearTimeout(helpFadeTimeout);

  // Set the message first
  helpText.textContent = msg;

  if (msg) {
    // Show the message with fade-in
    helpText.classList.add("fading");

    // Auto-fade out if not persistent and not an error
    if (!persist && !isError) {
      helpFadeTimeout = setTimeout(() => {
        fadeHelp();
      }, 500);
    }
  } else {
    // Empty string means fade out what's currently there
    fadeHelp();
  }
};

const fadeHelp = () => {
  clearTimeout(helpFadeTimeout);
  // Remove fading class to trigger fade-out
  helpText.classList.remove("fading");

  // Clear text after CSS transition completes (300ms)
  setTimeout(() => {
    // Only clear if it's still not showing
    if (!helpText.classList.contains("fading")) {
      helpText.textContent = "";
    }
  }, 300);
};

// ─── Timer Hover Behaviour ───────────────────────────────────────────────────

let timerHovered = false;

timerDisplay.addEventListener("mouseenter", () => {
  timerHovered = true;
  clearTimeout(helpFadeTimeout);
  if (isAnyTimerRunning()) {
    showHelp("Timer can't be changed when running.", true);
  } else {
    showHelp("Click to edit & Use cursor keys to navigate.", true);
  }
});

timerDisplay.addEventListener("mouseleave", () => {
  timerHovered = false;
  fadeHelp();
});

// ─── Helper: current module ───────────────────────────────────────────────────

const isAnyTimerRunning = () => {
  if (activeTab === "focus") return FocusTimer.getIsRunning();
  if (activeTab === "break") return BreakTimer.getIsRunning();
  if (activeTab === "cycle") return CycleTimer.getIsRunning();
  return false;
};

const isInvalidFirstDigit = (pos, digit) => {
  return (pos === 0 || pos === 3) && Number(digit) > 5;
};

// ─── Timer Display Editing ───────────────────────────────────────────────────
// Valid cursor positions: 0, 1 (minutes), 3, 4 (seconds). Position 2 is ':'.

let cursorPos = 0; // currently active editable position

const VALID_POSITIONS = [0, 1, 3, 4];

const nextPos = (pos) => {
  const idx = VALID_POSITIONS.indexOf(pos);
  return VALID_POSITIONS[(idx + 1) % VALID_POSITIONS.length];
};

const prevPos = (pos) => {
  const idx = VALID_POSITIONS.indexOf(pos);
  return VALID_POSITIONS[
    (idx - 1 + VALID_POSITIONS.length) % VALID_POSITIONS.length
  ];
};

// Get the character-level offset in the text content for a display position
// text format: "MM:SS" → indices 0,1,2,3,4
const setCursorAtPosition = (pos) => {
  const sel = window.getSelection();
  const range = document.createRange();
  const textNode = timerDisplay.firstChild;
  if (!textNode) return;
  range.setStart(textNode, pos);
  range.setEnd(textNode, pos);
  sel.removeAllRanges();
  sel.addRange(range);
};

const getCaretPosition = (e) => {
  // Find which character was clicked using caretPositionFromPoint / caretRangeFromPoint
  let rawOffset = null;
  if (document.caretPositionFromPoint) {
    const caret = document.caretPositionFromPoint(e.clientX, e.clientY);
    rawOffset = caret?.offset ?? null;
  } else if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(e.clientX, e.clientY);
    rawOffset = range?.startOffset ?? null;
  }

  if (rawOffset === null) return VALID_POSITIONS[0];

  // Snap to nearest valid position
  return VALID_POSITIONS.reduce((best, p) =>
    Math.abs(p - rawOffset) < Math.abs(best - rawOffset) ? p : best,
  );
};

// Update a single digit in the displayed time string
const setDigitAtPosition = (pos, digit) => {
  const current = timerDisplay.textContent.replace(/\s/g, "");
  const chars = current.split("");
  chars[pos] = digit;
  const newStr = chars.join("");
  return newStr; // "MM:SS"
};

const validate = (timeStr) => {
  //clamping removed
  let [m, s] = timeStr.split(":").map(Number);
  if (isNaN(m)) m = 0;
  if (isNaN(s)) s = 0;

  if (m > 59 || s > 59) {
    showHelp("Maximum time is 59:59", false, true);
    return { valid: false, reason: "max" };
  }

  if (m === 0 && s === 0) {
    showHelp("Timer must be greater than 00:00", false, true);
    return { valid: false, reason: "zero" };
  }

  return { valid: true };
};

// Commit current display value to the active module's state
const commitDisplayToModule = (display) => {
  const timeStr = display.trim();
  const secs = parseTime(timeStr);

  if (activeTab === "focus") {
    FocusTimer.setTotalSeconds(secs);
  } else if (activeTab === "break") {
    BreakTimer.setTotalSeconds(secs);
  }
  // Cycle timers are committed separately via cycle input handlers
};

// ─── Timer Display Click ──────────────────────────────────────────────────────

timerDisplay.addEventListener("click", (e) => {
  if (isAnyTimerRunning()) {
    showHelp("Timer can't be changed when running.");
    e.preventDefault();
    timerDisplay.blur();
    return;
  }

  cursorPos = getCaretPosition(e);
  // Avoid colon position
  if (!VALID_POSITIONS.includes(cursorPos)) {
    cursorPos = VALID_POSITIONS[0];
  }

  requestAnimationFrame(() => setCursorAtPosition(cursorPos));
});

// ─── Keyboard Navigation & Input ─────────────────────────────────────────────

timerDisplay.addEventListener("keydown", (e) => {
  if (isAnyTimerRunning()) {
    e.preventDefault();
    showHelp("Timer can't be changed when running.");
    return;
  }

  // Arrow navigation
  if (e.key === "ArrowRight") {
    e.preventDefault();
    cursorPos = nextPos(cursorPos);
    requestAnimationFrame(() => setCursorAtPosition(cursorPos));
    return;
  }

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    cursorPos = prevPos(cursorPos);
    requestAnimationFrame(() => setCursorAtPosition(cursorPos));
    return;
  }

  // Allow Tab and Escape to blur
  if (e.key === "Tab" || e.key === "Escape") {
    timerDisplay.blur();
    return;
  }

  // Numeric input only
  if (/^[0-9]$/.test(e.key)) {
    e.preventDefault();

    if (isInvalidFirstDigit(cursorPos, e.key)) {
      showHelp("Maximum time is 59:59", false, true);
      return;
    }

    const newStr = setDigitAtPosition(cursorPos, e.key);
    const result = validate(newStr);

    // 🚫 If invalid → do NOTHING (no auto change), error stays visible
    if (!result.valid) return;

    // ✔ Valid → update display and clear any error message
    timerDisplay.textContent = newStr;
    commitDisplayToModule(newStr);

    // Clear the helper text (which will fade out nicely)
    showHelp("", false, false);

    cursorPos = nextPos(cursorPos);
    requestAnimationFrame(() => setCursorAtPosition(cursorPos));
    return;
  }

  // Block everything else
  e.preventDefault();
});

// Prevent paste
timerDisplay.addEventListener("paste", (e) => e.preventDefault());

// On focus, snap cursor to position 0 only if no position is set
timerDisplay.addEventListener("focus", () => {
  requestAnimationFrame(() => setCursorAtPosition(cursorPos));
});

// ─── Start / Pause Button ─────────────────────────────────────────────────────

const updateStartButton = (running) => {
  startButton.textContent = running ? "Pause" : "Start";
};

const startTimerHandler = (timerModule, completeMsg) => {
  if (timerModule.getIsRunning()) {
    timerModule.pause();
    updateStartButton(false);
  } else {
    timerModule.start(
      (secs) => {
        timerDisplay.textContent = formatTime(secs);
      },
      () => {
        timerDisplay.textContent = "00:00";
        updateStartButton(false);
        showHelp(completeMsg);
      },
    );
    updateStartButton(true);
  }
};

startButton.addEventListener("click", () => {
  if (activeTab === "focus") {
    startTimerHandler(FocusTimer, "Focus session complete!");
  } else if (activeTab === "break") {
    startTimerHandler(BreakTimer, "Break complete! Time to focus.");
  } else if (activeTab === "cycle") {
    handleCycleStartPause();
  }
});

// ─── Reset Button ─────────────────────────────────────────────────────────────

resetBtn.addEventListener("click", () => {
  if (activeTab === "focus") {
    const secs = FocusTimer.reset();
    timerDisplay.textContent = formatTime(secs);
    updateStartButton(false);
  } else if (activeTab === "break") {
    const secs = BreakTimer.reset();
    timerDisplay.textContent = formatTime(secs);
    updateStartButton(false);
  } else if (activeTab === "cycle") {
    const { focusSeconds, breakSeconds } = CycleTimer.reset();
    updateCycleUI(focusSeconds, breakSeconds);
    updateCycleProgress(1, CycleTimer.getTotalCycles(), "Focus");
    updateStartButton(false);
    // Restore cycle timer displays
    const focusEl = document.getElementById("focusTimer");
    const breakEl = document.getElementById("breakTimer");
    if (focusEl) focusEl.textContent = formatTime(focusSeconds);
    if (breakEl) breakEl.textContent = formatTime(breakSeconds);
  }
});

// ─── Tab Switching ────────────────────────────────────────────────────────────

const switchTab = (tab) => {
  if (tab === activeTab) return;

  // Suspend currently active timers
  if (activeTab === "focus") FocusTimer.suspendForTabSwitch();
  if (activeTab === "break") BreakTimer.suspendForTabSwitch();
  if (activeTab === "cycle") CycleTimer.suspendForTabSwitch();

  // Remove active styling from all tabs
  [tabFocus, tabBreak, tabCycle].forEach((t) => t.classList.remove("active"));

  activeTab = tab;

  // Restore & update UI for new tab
  if (tab === "focus") {
    tabFocus.classList.add("active");
    showFocusBreakUI();
    timerDisplay.textContent = formatTime(FocusTimer.getTotalSeconds());
    updateStartButton(FocusTimer.getIsRunning());
  } else if (tab === "break") {
    tabBreak.classList.add("active");
    showFocusBreakUI();
    timerDisplay.textContent = formatTime(BreakTimer.getTotalSeconds());
    updateStartButton(BreakTimer.getIsRunning());
  } else if (tab === "cycle") {
    tabCycle.classList.add("active");
    showCycleUI();
    updateStartButton(CycleTimer.getIsRunning());
  }
};

tabFocus.addEventListener("click", () => switchTab("focus"));
tabBreak.addEventListener("click", () => switchTab("break"));
tabCycle.addEventListener("click", () => switchTab("cycle"));

// ─── Focus / Break UI ─────────────────────────────────────────────────────────

const showFocusBreakUI = () => {
  // Remove cycle UI if present
  const cycleContainer = document.getElementById("cycle-ui-container");
  if (cycleContainer) cycleContainer.style.display = "none";
  // Restore original timer & help text for focus/break tabs
  timerDisplay.style.display = "";
  helpText = originalHelpText;
  if (helpText) helpText.style.display = "";
  startButton.parentElement.style.display = "";
  document.querySelector(".options").style.display = "";
};

// ─── Cycle UI ─────────────────────────────────────────────────────────────────

const showCycleUI = () => {
  timerDisplay.style.display = "none";

  if (!cycleUIInjected) {
    injectCycleUI();
    cycleUIInjected = true;
  }

  const cycleContainer = document.getElementById("cycle-ui-container");
  cycleContainer.style.display = "";

  // Use the cycle-specific help element when in cycle tab
  const cycleHelp = cycleContainer.querySelector(".cycle-help");
  if (cycleHelp) helpText = cycleHelp;
  // Hide the original single-timer help while cycle UI is active
  if (originalHelpText) originalHelpText.style.display = "none";

  // Restore displayed times
  const focusEl = document.getElementById("focusTimer");
  const breakEl = document.getElementById("breakTimer");
  if (focusEl)
    focusEl.textContent = formatTime(
      CycleTimer.getCurrentPhase() === "focus"
        ? CycleTimer.getCurrentSeconds() || 25 * 60
        : 25 * 60,
    );
  if (breakEl)
    breakEl.textContent = formatTime(
      CycleTimer.getCurrentPhase() === "break"
        ? CycleTimer.getCurrentSeconds() || 5 * 60
        : 5 * 60,
    );

  document.querySelector(".options").style.display = "";
};

const injectCycleUI = () => {
  const container = document.createElement("div");
  container.id = "cycle-ui-container";
  container.innerHTML = `
  <div class="cycle-timers flex justify-center gap-32 mt-10">
    <div class="flex flex-col items-center">
      <label class="text-lg font-medium mb-4">Focus</label>
      <div contenteditable="true" id="focusTimer" class="timer-display text-[120px] manrope">25:00</div>
    </div>
    <div class="flex flex-col items-center">
      <label class="text-lg font-medium mb-4">Break</label>
      <div contenteditable="true" id="breakTimer" class="timer-display text-[120px] manrope">05:00</div>
    </div>
  </div>

  <!-- Cycle-specific help text (single centered element) -->
  <div class="flex justify-center mt-2 mb-2">
    <div class="text-help cycle-help text-gray-500 text-sm min-h-6"></div>
  </div>

  <div class="cycle-controls flex justify-center items-center gap-4 mt-8">
    <span class="text-lg font-medium">Cycles:</span>
    <button id="decreaseCycle" class="cycle-count-btn flex items-center justify-center w-8 h-8 rounded-full border-2 bg-[#F8F3F3] shadow hover:bg-[#B5B5B5] transition text-xl font-bold">−</button>
    <input id="cyclesInput" value="4" readonly class="w-12 text-center text-lg font-medium border-none outline-none bg-transparent">
    <button id="increaseCycle" class="cycle-count-btn flex items-center justify-center w-8 h-8 rounded-full border-2 bg-[#F8F3F3] shadow hover:bg-[#B5B5B5] transition text-xl font-bold">+</button>
  </div>

  <div class="cycle-progress mt-6 text-center text-lg font-medium">
    <span id="currentCycleDisplay">Cycle 1 of 4 — Focus</span>
  </div>
`;

  // Insert after pomo-options in main-content
  const pomoOptions = document.querySelector(".pomo-options");
  pomoOptions.after(container);

  // Wire up cycle-specific timer editing
  setupCycleTimerEditing(document.getElementById("focusTimer"), "focus");
  setupCycleTimerEditing(document.getElementById("breakTimer"), "break");

  // Cycle count buttons
  document.getElementById("decreaseCycle").addEventListener("click", () => {
    const current = CycleTimer.getTotalCycles();
    if (current > 1) {
      CycleTimer.setTotalCycles(current - 1);
      document.getElementById("cyclesInput").value =
        CycleTimer.getTotalCycles();
      updateCycleProgress(
        CycleTimer.getCurrentCycle(),
        CycleTimer.getTotalCycles(),
        CycleTimer.getCurrentPhase() === "focus" ? "Focus" : "Break",
      );
    }
  });

  document.getElementById("increaseCycle").addEventListener("click", () => {
    CycleTimer.setTotalCycles(CycleTimer.getTotalCycles() + 1);
    document.getElementById("cyclesInput").value = CycleTimer.getTotalCycles();
    updateCycleProgress(
      CycleTimer.getCurrentCycle(),
      CycleTimer.getTotalCycles(),
      CycleTimer.getCurrentPhase() === "focus" ? "Focus" : "Break",
    );
  });
};

// ─── Cycle Timer Editing ──────────────────────────────────────────────────────

const setupCycleTimerEditing = (el, which) => {
  let pos = 0;

  el.addEventListener("mouseenter", () => {
    if (CycleTimer.getIsRunning()) {
      showHelp("Timer can't be changed when running.", true);
    } else {
      showHelp("Click to edit & Use cursor keys to navigate.", true);
    }
  });

  el.addEventListener("mouseleave", () => {
    fadeHelp();
  });

  el.addEventListener("click", (e) => {
    if (CycleTimer.getIsRunning()) {
      showHelp("Timer can't be changed when running.");
      e.preventDefault();
      el.blur();
      return;
    }
    pos = getCaretPosition(e);
    requestAnimationFrame(() => setCycleCursor(el, pos));
  });

  el.addEventListener("keydown", (e) => {
    if (CycleTimer.getIsRunning()) {
      e.preventDefault();
      showHelp("Timer can't be changed when running.");
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      pos = nextPos(pos);
      requestAnimationFrame(() => setCycleCursor(el, pos));
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      pos = prevPos(pos);
      requestAnimationFrame(() => setCycleCursor(el, pos));
      return;
    }
    if (e.key === "Tab" || e.key === "Escape") {
      el.blur();
      return;
    }

    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();

      if (isInvalidFirstDigit(pos, e.key)) {
        showHelp("Maximum time is 59:59", false, true);
        return;
      }

      const current = el.textContent.replace(/\s/g, "");
      const chars = current.split("");
      chars[pos] = e.key;
      const newStr = chars.join("");

      const result = validate(newStr);
      if (!result.valid) return;

      el.textContent = newStr;

      const secs = parseTime(newStr);
      if (which === "focus") CycleTimer.setFocusSeconds(secs);
      else CycleTimer.setBreakSeconds(secs);

      // Clear the helper text (will fade out nicely)
      showHelp("", false, false);

      pos = nextPos(pos);
      requestAnimationFrame(() => setCycleCursor(el, pos));
      return;
    }

    e.preventDefault();
  });

  el.addEventListener("paste", (e) => e.preventDefault());
  el.addEventListener("focus", () =>
    requestAnimationFrame(() => setCycleCursor(el, pos)),
  );
};

const setCycleCursor = (el, pos) => {
  const sel = window.getSelection();
  const range = document.createRange();
  const textNode = el.firstChild;
  if (!textNode) return;
  range.setStart(textNode, pos);
  range.setEnd(textNode, pos);
  sel.removeAllRanges();
  sel.addRange(range);
};

// ─── Cycle Start / Pause ──────────────────────────────────────────────────────

const handleCycleStartPause = () => {
  if (CycleTimer.getIsRunning()) {
    CycleTimer.pause();
    updateStartButton(false);
  } else {
    const callbacks = {
      onTick: (secs, phase) => {
        if (activeTab !== "cycle") return;
        const el =
          phase === "focus"
            ? document.getElementById("focusTimer")
            : document.getElementById("breakTimer");
        if (el) el.textContent = formatTime(secs);
      },
      onPhaseChange: (phase, secs, cycle, total) => {
        if (activeTab !== "cycle") return;
        updateCycleProgress(
          cycle,
          total,
          phase === "focus" ? "Focus" : "Break",
        );
        // Reset the finished timer's display
        const doneEl =
          phase === "focus"
            ? document.getElementById("breakTimer") // just finished break -> show next focus
            : document.getElementById("focusTimer"); // just finished focus -> show break
        // Actually handled by onTick; just ensure progress label updates
      },
      onCycleProgress: (cycle, total, phaseLabel) => {
        updateCycleProgress(cycle, total, phaseLabel);
      },
      onAllComplete: () => {
        updateStartButton(false);
        showHelp("All cycles complete! Great work 🎉");
        updateCycleProgress(
          CycleTimer.getTotalCycles(),
          CycleTimer.getTotalCycles(),
          "Done",
        );
      },
    };

    CycleTimer.start(callbacks);
    updateStartButton(true);
  }
};

const updateCycleProgress = (cycle, total, phaseLabel) => {
  const el = document.getElementById("currentCycleDisplay");
  if (el) el.textContent = `Cycle ${cycle} of ${total} — ${phaseLabel}`;
};

const updateCycleUI = (focusSecs, breakSecs) => {
  const focusEl = document.getElementById("focusTimer");
  const breakEl = document.getElementById("breakTimer");
  if (focusEl) focusEl.textContent = formatTime(focusSecs);
  if (breakEl) breakEl.textContent = formatTime(breakSecs);
  const cyclesInput = document.getElementById("cyclesInput");
  if (cyclesInput) cyclesInput.value = CycleTimer.getTotalCycles();
  updateCycleProgress(1, CycleTimer.getTotalCycles(), "Focus");
};

// ─── Initialise ───────────────────────────────────────────────────────────────

const init = () => {
  // Set initial active tab styling
  tabFocus.classList.add("active");

  // Initialise display
  timerDisplay.textContent = formatTime(FocusTimer.getTotalSeconds());

  // Prevent default contenteditable behaviours: no rich-text, no enter
  timerDisplay.addEventListener("keypress", (e) => {
    if (e.key === "Enter") e.preventDefault();
  });

  // Initial tab active state
  activeTab = "focus";
};

init();
