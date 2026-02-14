// cycle.js — Cycle mode module

const CycleTimer = (() => {
  // --- State ---
  let focusSeconds = 25 * 60; // Default focus duration
  let breakSeconds = 5 * 60; // Default break duration
  let savedFocusSeconds = 25 * 60;
  let savedBreakSeconds = 5 * 60;

  let currentSeconds = 0;
  let isRunning = false;
  let isPaused = false;
  let intervalId = null;

  let totalCycles = 4; // User-set total cycles
  let currentCycle = 1; // Current cycle index (1-based)
  let currentPhase = "focus"; // 'focus' | 'break'
  let completedCycles = 0;
  let sessionToken = 0; // Incremented on reset to invalidate stale timeouts

  // Callbacks set by app.js
  let onTickCb = null;
  let onPhaseChangeCb = null;
  let onAllCompleteCb = null;
  let onCycleProgressCb = null;

  // --- Getters ---
  const getIsRunning = () => isRunning;
  const getIsPaused = () => isPaused;
  const getCurrentSeconds = () => currentSeconds;
  const getCurrentPhase = () => currentPhase;
  const getCurrentCycle = () => currentCycle;
  const getTotalCycles = () => totalCycles;

  // --- Setters ---
  const setFocusSeconds = (secs) => {
    focusSeconds = secs;
    savedFocusSeconds = secs;
  };

  const setBreakSeconds = (secs) => {
    breakSeconds = secs;
    savedBreakSeconds = secs;
  };

  const setTotalCycles = (n) => {
    totalCycles = Math.max(1, Math.min(99, n));
  };

  // --- Helpers ---
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // --- Core tick ---
  const tick = () => {
    if (currentSeconds <= 0) {
      clearInterval(intervalId);
      intervalId = null;
      handlePhaseComplete();
      return;
    }
    currentSeconds--;
    onTickCb?.(currentSeconds, currentPhase);
  };

  const handlePhaseComplete = () => {
    const token = sessionToken; // capture current token

    if (currentPhase === "focus") {
      // Focus done — transition to break after 1.5s
      isRunning = false;
      isPaused = true; // Mark paused during the gap so start() knows to resume
      setTimeout(() => {
        if (sessionToken !== token) return; // session was reset/changed
        currentPhase = "break";
        currentSeconds = breakSeconds;
        onPhaseChangeCb?.("break", currentSeconds, currentCycle, totalCycles);
        onCycleProgressCb?.(currentCycle, totalCycles, "Break");
        startInterval();
      }, 500);
    } else {
      // Break done — one cycle complete
      completedCycles++;
      if (completedCycles >= totalCycles) {
        isRunning = false;
        isPaused = false;
        onAllCompleteCb?.();
      } else {
        isRunning = false;
        isPaused = true;
        setTimeout(() => {
          if (sessionToken !== token) return;
          currentCycle++;
          currentPhase = "focus";
          currentSeconds = focusSeconds;
          onPhaseChangeCb?.("focus", currentSeconds, currentCycle, totalCycles);
          onCycleProgressCb?.(currentCycle, totalCycles, "Focus");
          startInterval();
        }, 500);
      }
    }
  };

  const startInterval = () => {
    if (intervalId) clearInterval(intervalId);
    isRunning = true;
    isPaused = false;
    intervalId = setInterval(tick, 1000);
  };

  // --- Public API ---
  const start = (callbacks) => {
    if (isRunning) return;

    // Register callbacks
    onTickCb = callbacks?.onTick ?? onTickCb;
    onPhaseChangeCb = callbacks?.onPhaseChange ?? onPhaseChangeCb;
    onAllCompleteCb = callbacks?.onAllComplete ?? onAllCompleteCb;
    onCycleProgressCb = callbacks?.onCycleProgress ?? onCycleProgressCb;

    if (!isPaused) {
      // Fresh start
      currentCycle = 1;
      completedCycles = 0;
      currentPhase = "focus";
      currentSeconds = focusSeconds;
      onCycleProgressCb?.(currentCycle, totalCycles, "Focus");
    }

    startInterval();
  };

  const pause = () => {
    if (!isRunning) return;
    clearInterval(intervalId);
    intervalId = null;
    isRunning = false;
    isPaused = true;
  };

  const reset = () => {
    clearInterval(intervalId);
    intervalId = null;
    isRunning = false;
    isPaused = false;
    sessionToken++; // Invalidate any pending setTimeout
    currentCycle = 1;
    completedCycles = 0;
    currentPhase = "focus";
    currentSeconds = focusSeconds;
    return { focusSeconds, breakSeconds };
  };

  const suspendForTabSwitch = () => {
    if (isRunning) {
      clearInterval(intervalId);
      intervalId = null;
      isRunning = false;
      isPaused = true;
    }
  };

  // Resume from paused state (called on returning to cycle tab)
  const resume = (callbacks) => {
    if (isPaused) {
      start(callbacks);
    }
  };

  const getDisplaySeconds = () => currentSeconds || focusSeconds;

  return {
    start,
    pause,
    reset,
    resume,
    suspendForTabSwitch,
    getIsRunning,
    getIsPaused,
    getCurrentSeconds,
    getCurrentPhase,
    getCurrentCycle,
    getTotalCycles,
    setFocusSeconds,
    setBreakSeconds,
    setTotalCycles,
    formatTime,
    getDisplaySeconds,
  };
})();
