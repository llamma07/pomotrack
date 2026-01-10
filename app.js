// app.js
// Timer Display Input Logic for pomotrack

// Timer state variables
let interval = null;
let totalSeconds = 0;
let savedTimerValue = '25:00';
let isErrorState = false;

// Position tracking (0-4, skipping index 2 which is ":")
let currentPosition = 0;
const validPositions = [0, 1, 3, 4];

// Initialize timer display
function initializeTimer() {
  const timerDisplay = document.getElementById('timerDisplay');
  if (timerDisplay) {
    timerDisplay.textContent = '25:00';
  }
  currentPosition = 0;
}

// Get current timer value as array
function getTimerArray() {
  const timerDisplay = document.getElementById('timerDisplay');
  return timerDisplay.textContent.split('');
}

// Set timer display from array
function setTimerDisplay(arr) {
  const timerDisplay = document.getElementById('timerDisplay');
  timerDisplay.textContent = arr.join('');
}

// Move cursor to specific position (constrained to valid positions)
function moveCursorToPosition(pos) {
  const timerDisplay = document.getElementById('timerDisplay');
  const range = document.createRange();
  const sel = window.getSelection();
  const textNode = timerDisplay.firstChild;
  
  // Ensure position is valid
  if (!validPositions.includes(pos)) {
    pos = validPositions[0];
  }
  
  if (textNode) {
    range.setStart(textNode, pos);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

// Get cursor position
function getCursorPosition() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    return sel.getRangeAt(0).startOffset;
  }
  return 0;
}

// Validate digit based on position and current values
function isValidDigit(digit, position, currentArray) {
  const num = parseInt(digit);
  
  if (isNaN(num)) return false;
  
  let helpText = document.querySelector('.text-help:not(.focus-help):not(.break-help)');
  
  switch (position) {
    case 0:
      if (num >= 0 && num <= 5) {
        if (!isErrorState) {
          helpText.textContent = "Click to edit & Use cursor keys to navigate.";
        }
        return true;
      } else {
        helpText.textContent = "Maximum time is 59:59";
        return false;
      }
    case 1:
      if (!isErrorState) {
        helpText.textContent = "Click to edit & Use cursor keys to navigate.";
      }
      return num >= 0 && num <= 9;
    case 3:
      if (num >= 0 && num <= 5) {
        if (!isErrorState) {
          helpText.textContent = "Click to edit & Use cursor keys to navigate.";
        }
        return true;
      } else {
        helpText.textContent = "Maximum time is 59:59";
        return false;
      }
    case 4:
      if (!isErrorState) {
        helpText.textContent = "Click to edit & Use cursor keys to navigate.";
      }
      return num >= 0 && num <= 9;
    default:
      return false;
  }
}

function checkAndResetErrorMessage() {
  const timerArray = getTimerArray();
  const minutes = parseInt(timerArray[0] + timerArray[1]);
  const seconds = parseInt(timerArray[3] + timerArray[4]);
  const total = minutes * 60 + seconds;
  
  const helpText = document.querySelector('.text-help:not(.focus-help):not(.break-help)');
  
  if (total > 0 && helpText.textContent === "Set a time greater than 00:00 to start the timer.") {
    helpText.textContent = "Click to edit & Use cursor keys to navigate.";
    isErrorState = false;
    helpText.classList.remove('error-visible');
  }
  
  if (total === 0) {
    helpText.textContent = "Set a time greater than 00:00 to start the timer.";
    isErrorState = true;
    helpText.classList.add('error-visible');
  }
}

// Attach event listeners to timer display
function attachSingleTimerListeners() {
  const timerDisplay = document.getElementById('timerDisplay');
  if (!timerDisplay) return;
  
  // Remove existing listeners by cloning
  const newTimerDisplay = timerDisplay.cloneNode(true);
  timerDisplay.parentNode.replaceChild(newTimerDisplay, timerDisplay);
  
  const timer = document.getElementById('timerDisplay');
  
  // Click handler - always start at position 0
  timer.addEventListener('click', (e) => {
    e.preventDefault();
    currentPosition = 0;
    moveCursorToPosition(currentPosition);
  });
  
  // Focus handler
  timer.addEventListener('focus', (e) => {
    currentPosition = 0;
    setTimeout(() => moveCursorToPosition(0), 0);
  });
  
  // Hover handler
  timer.addEventListener('mouseenter', () => {
    if (!isErrorState) {
      const helpText = document.querySelector('.text-help:not(.focus-help):not(.break-help)');
      helpText.textContent = "Click to edit & Use cursor keys to navigate.";
    }
  });
  
  // Keydown handler
  timer.addEventListener('keydown', (e) => {
    e.preventDefault();
    
    const key = e.key;
    const timerArray = getTimerArray();
    
    if (/^[0-9]$/.test(key)) {
      if (isValidDigit(key, currentPosition, timerArray)) {
        timerArray[currentPosition] = key;
        setTimerDisplay(timerArray);
        checkAndResetErrorMessage();
        
        const currentIndex = validPositions.indexOf(currentPosition);
        if (currentIndex < validPositions.length - 1) {
          currentPosition = validPositions[currentIndex + 1];
        } else {
          currentPosition = validPositions[0];
        }
        
        moveCursorToPosition(currentPosition);
      }
    } else if (key === 'ArrowLeft') {
      const currentIndex = validPositions.indexOf(currentPosition);
      if (currentIndex > 0) {
        currentPosition = validPositions[currentIndex - 1];
      } else {
        currentPosition = validPositions[validPositions.length - 1];
      }
      moveCursorToPosition(currentPosition);
    } else if (key === 'ArrowRight') {
      const currentIndex = validPositions.indexOf(currentPosition);
      if (currentIndex < validPositions.length - 1) {
        currentPosition = validPositions[currentIndex + 1];
      } else {
        currentPosition = validPositions[0];
      }
      moveCursorToPosition(currentPosition);
    } else if (key === 'Backspace') {
      timerArray[currentPosition] = '0';
      setTimerDisplay(timerArray);
      checkAndResetErrorMessage();
      
      const currentIndex = validPositions.indexOf(currentPosition);
      if (currentIndex > 0) {
        currentPosition = validPositions[currentIndex - 1];
      }
      moveCursorToPosition(currentPosition);
    } else if (key === 'Delete') {
      timerArray[currentPosition] = '0';
      setTimerDisplay(timerArray);
      checkAndResetErrorMessage();
      moveCursorToPosition(currentPosition);
    } else if (key === 'Home') {
      currentPosition = validPositions[0];
      moveCursorToPosition(currentPosition);
    } else if (key === 'End') {
      currentPosition = validPositions[validPositions.length - 1];
      moveCursorToPosition(currentPosition);
    } else if (key === 'Tab') {
      const currentIndex = validPositions.indexOf(currentPosition);
      if (currentIndex < validPositions.length - 1) {
        currentPosition = validPositions[currentIndex + 1];
      } else {
        currentPosition = validPositions[0];
      }
      moveCursorToPosition(currentPosition);
    }
  });
  
  // Prevent paste/cut
  timer.addEventListener('paste', (e) => e.preventDefault());
  timer.addEventListener('cut', (e) => e.preventDefault());
  
  // Mouse selection - always start at position 0
  timer.addEventListener('mouseup', (e) => {
    setTimeout(() => {
      currentPosition = 0;
      moveCursorToPosition(currentPosition);
    }, 0);
  });
}

// Initialize on load
initializeTimer();
attachSingleTimerListeners();

// Timer functionality
const startTimer = () => {
  const timerDisplay = document.getElementById('timerDisplay');
  timerDisplay.contentEditable = 'false';
  
  if (totalSeconds === 0) {
    savedTimerValue = timerDisplay.textContent;
    
    const timerArray = getTimerArray();
    const minutes = parseInt(timerArray[0] + timerArray[1]);
    const seconds = parseInt(timerArray[3] + timerArray[4]);
    totalSeconds = minutes * 60 + seconds;
    
    if (totalSeconds === 0) {
      alert('Please set a time greater than 00:00');
      timerDisplay.contentEditable = 'true';
      return;
    }
  }
  
  interval = setInterval(() => {
    if (totalSeconds <= 0) {
      clearInterval(interval);
      interval = null;
      totalSeconds = 0;
      const timerDisplay = document.getElementById('timerDisplay');
      timerDisplay.contentEditable = 'true';
      document.getElementById('startButton').textContent = 'Start';
      
      // Reset to saved value instead of showing 00:00
      if (savedTimerValue) {
        timerDisplay.textContent = savedTimerValue;
      }
      
      return;
    }
    
    totalSeconds--;
    
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    
    setTimerDisplay([
      Math.floor(mins / 10).toString(),
      (mins % 10).toString(),
      ':',
      Math.floor(secs / 10).toString(),
      (secs % 10).toString()
    ]);
  }, 1000);
};

// Start button logic
document.getElementById('startButton').addEventListener('click', () => {
  const startButton = document.getElementById('startButton');
  
  // Check if in cycle mode
  if (window.cycleMode && window.cycleMode.getCurrentMode() === 'cycle') {
    if (startButton.textContent.trim() === "Start") {
      const started = window.cycleMode.startCycleTimer();
      if (started) {
        startButton.textContent = "Pause";
      }
    } else {
      window.cycleMode.pauseCycleTimer();
      startButton.textContent = "Start";
    }
    return;
  }
  
  // Original single timer logic
  const timerArray = getTimerArray();
  const minutes = parseInt(timerArray[0] + timerArray[1]);
  const seconds = parseInt(timerArray[3] + timerArray[4]);
  const currentTotal = minutes * 60 + seconds;
  
  if (currentTotal === 0 && startButton.textContent.trim() === "Start") {
    const helpText = document.querySelector('.text-help:not(.focus-help):not(.break-help)');
    helpText.textContent = "Set a time greater than 00:00 to start the timer.";
    isErrorState = true;
    helpText.classList.add('error-visible');
    return;
  }
  
  if (startButton.textContent.trim() === "Start") {
    startTimer();
    startButton.textContent = "Pause";
  } else {
    clearInterval(interval);
    interval = null;
    totalSeconds = 0;
    startButton.textContent = "Start";
    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.contentEditable = 'true';
  }
});

// Reset button logic
document.querySelector('.reset').addEventListener('click', () => {
  // Check if in cycle mode
  if (window.cycleMode && window.cycleMode.getCurrentMode() === 'cycle') {
    window.cycleMode.resetCycleTimer();
    return;
  }
  
  // Original single timer reset logic
  clearInterval(interval);
  interval = null;
  totalSeconds = 0;
  const timerDisplay = document.getElementById('timerDisplay');
  timerDisplay.contentEditable = 'true';
  document.getElementById('startButton').textContent = 'Start';
  
  if (savedTimerValue) {
    timerDisplay.textContent = savedTimerValue;
  } else {
    initializeTimer();
  }
  
  // Clear any error states
  const helpText = document.querySelector('.text-help:not(.focus-help):not(.break-help)');
  if (helpText) {
    helpText.classList.remove('error-visible');
    isErrorState = false;
  }
});

// Expose function for cycle mode
window.attachSingleTimerListeners = attachSingleTimerListeners;