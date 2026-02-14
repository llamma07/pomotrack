// focus.js — Focus timer module

const FocusTimer = (() => {
  let intervalId = null;
  let totalSeconds = 25 * 60; // default 25:00
  let savedSeconds = 25 * 60;
  let isRunning = false;
  let isPaused = false;

  // --- Getters ---
  const getIsRunning = () => isRunning;
  const getIsPaused = () => isPaused;
  const getTotalSeconds = () => totalSeconds;

  // --- Setters ---
  const setTotalSeconds = (secs) => {
    totalSeconds = secs;
    savedSeconds = secs;
  };

  const setSavedSeconds = (secs) => {
    savedSeconds = secs;
  };

  // --- Timer core ---
  const tick = (onTick, onComplete) => {
    if (totalSeconds <= 0) {
      clearInterval(intervalId);
      intervalId = null;
      isRunning = false;
      isPaused = false;
      onComplete?.();
      return;
    }
    totalSeconds--;
    onTick(totalSeconds);
  };

  const start = (onTick, onComplete) => {
    if (isRunning) return;
    if (intervalId) clearInterval(intervalId);
    isRunning = true;
    isPaused = false;
    intervalId = setInterval(() => tick(onTick, onComplete), 1000);
  };

  const pause = () => {
    if (!isRunning) return;
    clearInterval(intervalId);
    intervalId = null;
    isRunning = false;
    isPaused = true;
    savedSeconds = totalSeconds;
  };

  const reset = (defaultSeconds) => {
    clearInterval(intervalId);
    intervalId = null;
    isRunning = false;
    isPaused = false;
    totalSeconds = defaultSeconds ?? savedSeconds;
    savedSeconds = totalSeconds;
    return totalSeconds;
  };

  // Called when switching away from this tab
  const suspendForTabSwitch = () => {
    if (isRunning) {
      clearInterval(intervalId);
      intervalId = null;
      isRunning = false;
      isPaused = true;
      savedSeconds = totalSeconds;
    }
  };

  // Restore seconds when returning to tab (don't reset, keep paused state)
  const restoreSeconds = () => totalSeconds;

  return {
    start,
    pause,
    reset,
    suspendForTabSwitch,
    restoreSeconds,
    getIsRunning,
    getIsPaused,
    getTotalSeconds,
    setTotalSeconds,
    setSavedSeconds,
  };
})();
