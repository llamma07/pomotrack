// cycle.js
// Cycle Mode Logic for pomotrack

// Cycle mode state
const cycleMode = {
  currentMode: 'single', // 'single', 'focus', 'break', 'cycle'
  cycleInterval: null,
  totalSeconds: 0,
  currentCycle: 1,
  maxCycles: 4,
  isInFocusPhase: true,
  savedFocusTime: '25:00',
  savedBreakTime: '05:00',
  isPaused: false,
  singleModeFocusTime: '25:00',  // Store separate values for single mode
  singleModeBreakTime: '05:00',
  
  // Get current mode
  getCurrentMode() {
    return this.currentMode;
  },
  
  // Initialize cycle mode UI
  initCycleMode() {
    const mainContent = document.querySelector('.main-content');
    const timerDisplay = document.getElementById('timerDisplay');
    const helpText = document.querySelector('.text-help');
    
    // Hide single timer
    timerDisplay.style.display = 'none';
    helpText.style.display = 'none';
    
    // Create cycle mode UI
    const cycleContainer = document.createElement('div');
    cycleContainer.className = 'cycle-container';
    cycleContainer.innerHTML = `
      <div class="cycle-timers flex justify-center gap-32 mt-6">
        <div class="focus-timer-section flex flex-col items-center">
          <label class="text-lg font-medium mb-4">Focus</label>
          <div contenteditable="true" id="focusTimer" class="timer-display flex justify-center items-center text-[120px] manrope">${this.savedFocusTime}</div>
          <p class="text-help focus-help mt-4 text-gray-500 text-sm">Click to edit & Use cursor keys to navigate.</p>
        </div>
        <div class="break-timer-section flex flex-col items-center">
          <label class="text-lg font-medium mb-4">Break</label>
          <div contenteditable="true" id="breakTimer" class="timer-display flex justify-center items-center text-[120px] manrope">${this.savedBreakTime}</div>
          <p class="text-help break-help mt-4 text-gray-500 text-sm">Click to edit & Use cursor keys to navigate.</p>
        </div>
      </div>
      <div class="cycle-controls flex justify-center items-center gap-4 mt-8">
        <span class="text-lg font-medium">Cycles:</span>
        <button id="decreaseCycle" class="flex items-center justify-center w-8 h-8 border-2 rounded-full hover:bg-[#B5B5B5] transition">−</button>
        <input type="text" id="cyclesInput" value="4" class="w-12 text-center text-lg font-medium border-2 rounded-lg" readonly>
        <button id="increaseCycle" class="flex items-center justify-center w-8 h-8 border-2 rounded-full hover:bg-[#B5B5B5] transition">+</button>
      </div>
      <div class="cycle-progress mt-6 text-center text-lg font-medium">
        <span id="currentCycleDisplay">Cycle 1 of 4 - Focus</span>
      </div>
    `;
    
    // Insert after pomo-options
    const pomoOptions = document.querySelector('.pomo-options');
    pomoOptions.insertAdjacentElement('afterend', cycleContainer);
    
    // Initialize timer listeners
    this.attachCycleTimerListeners('focusTimer');
    this.attachCycleTimerListeners('breakTimer');
    
    // Attach cycle controls
    this.attachCycleControls();
    
    this.currentMode = 'cycle';
  },
  
  // Remove cycle mode UI
  removeCycleMode() {
    const cycleContainer = document.querySelector('.cycle-container');
    if (cycleContainer) {
      cycleContainer.remove();
    }
    
    const timerDisplay = document.getElementById('timerDisplay');
    const helpText = document.querySelector('.text-help:not(.focus-help):not(.break-help)');
    
    timerDisplay.style.display = 'flex';
    helpText.style.display = 'block';
    
    this.currentMode = 'single';
    
    // Reset state
    this.resetCycleState();
  },
  
  // Attach timer listeners to cycle timers
  attachCycleTimerListeners(timerId) {
    const timer = document.getElementById(timerId);
    if (!timer) return;
    
    let currentPosition = 0;
    const validPositions = [0, 1, 3, 4];
    
    const getTimerArray = () => timer.textContent.split('');
    const setTimerDisplay = (arr) => { timer.textContent = arr.join(''); };
    
    // Get nearest valid position
    const getNearestValidPosition = (pos) => {
      if (validPositions.includes(pos)) {
        return pos;
      }
      if (pos === 2) {
        return 1;
      }
      if (pos > 4) {
        return 4;
      }
      let nearest = validPositions[0];
      let minDiff = Math.abs(pos - nearest);
      for (let vpos of validPositions) {
        let diff = Math.abs(pos - vpos);
        if (diff < minDiff) {
          minDiff = diff;
          nearest = vpos;
        }
      }
      return nearest;
    };
    
    const moveCursorToPosition = (pos) => {
      const range = document.createRange();
      const sel = window.getSelection();
      const textNode = timer.firstChild;
      
      // Ensure position is valid
      pos = getNearestValidPosition(pos);
      
      if (textNode) {
        range.setStart(textNode, pos);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    };
    
    const getCursorPosition = () => {
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        return sel.getRangeAt(0).startOffset;
      }
      return 0;
    };
    
    const isValidDigit = (digit, position, currentArray) => {
      const num = parseInt(digit);
      if (isNaN(num)) return false;
      
      const isFocusTimer = timerId === 'focusTimer';
      const helpText = document.querySelector(isFocusTimer ? '.focus-help' : '.break-help');
      
      switch (position) {
        case 0:
          if (num >= 0 && num <= 5) {
            helpText.textContent = "Click to edit & Use cursor keys to navigate.";
            return true;
          } else {
            helpText.textContent = "Maximum time is 59:59";
            return false;
          }
        case 1:
          helpText.textContent = "Click to edit & Use cursor keys to navigate.";
          return num >= 0 && num <= 9;
        case 3:
          if (num >= 0 && num <= 5) {
            helpText.textContent = "Click to edit & Use cursor keys to navigate.";
            return true;
          } else {
            helpText.textContent = "Maximum time is 59:59";
            return false;
          }
        case 4:
          helpText.textContent = "Click to edit & Use cursor keys to navigate.";
          return num >= 0 && num <= 9;
        default:
          return false;
      }
    };
    
    // Click handler
    timer.addEventListener('click', (e) => {
      e.preventDefault();
      currentPosition = 0;
      moveCursorToPosition(currentPosition);
    });
    
    // Focus handler
    timer.addEventListener('focus', () => {
      currentPosition = 0;
      setTimeout(() => moveCursorToPosition(0), 0);
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
          
          // Save the updated value
          if (timerId === 'focusTimer') {
            this.savedFocusTime = timerArray.join('');
          } else {
            this.savedBreakTime = timerArray.join('');
          }
          
          const currentIndex = validPositions.indexOf(currentPosition);
          if (currentIndex < validPositions.length - 1) {
            currentPosition = validPositions[currentIndex + 1];
          } else {
            currentPosition = validPositions[0];
          }
          
          moveCursorToPosition(currentPosition);
        }
      } else if (key === 'ArrowLeft') {
        // Get actual cursor position and normalize it
        const actualPos = getCursorPosition();
        currentPosition = getNearestValidPosition(actualPos);
        
        const currentIndex = validPositions.indexOf(currentPosition);
        if (currentIndex > 0) {
          currentPosition = validPositions[currentIndex - 1];
        } else {
          currentPosition = validPositions[validPositions.length - 1];
        }
        moveCursorToPosition(currentPosition);
      } else if (key === 'ArrowRight') {
        // Get actual cursor position and normalize it
        const actualPos = getCursorPosition();
        currentPosition = getNearestValidPosition(actualPos);
        
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
        
        // Save the updated value
        if (timerId === 'focusTimer') {
          this.savedFocusTime = timerArray.join('');
        } else {
          this.savedBreakTime = timerArray.join('');
        }
        
        const currentIndex = validPositions.indexOf(currentPosition);
        if (currentIndex > 0) {
          currentPosition = validPositions[currentIndex - 1];
        }
        moveCursorToPosition(currentPosition);
      } else if (key === 'Delete') {
        timerArray[currentPosition] = '0';
        setTimerDisplay(timerArray);
        
        // Save the updated value
        if (timerId === 'focusTimer') {
          this.savedFocusTime = timerArray.join('');
        } else {
          this.savedBreakTime = timerArray.join('');
        }
        
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
    
    // Mouse selection
    timer.addEventListener('mouseup', () => {
      setTimeout(() => {
        currentPosition = 0;
        moveCursorToPosition(currentPosition);
      }, 0);
    });
  },
  
  // Attach cycle controls (increase/decrease cycles)
  attachCycleControls() {
    const decreaseBtn = document.getElementById('decreaseCycle');
    const increaseBtn = document.getElementById('increaseCycle');
    const cyclesInput = document.getElementById('cyclesInput');
    
    decreaseBtn?.addEventListener('click', () => {
      if (this.maxCycles > 1 && !this.cycleInterval) {
        this.maxCycles--;
        cyclesInput.value = this.maxCycles;
        this.updateCycleDisplay();
      }
    });
    
    increaseBtn?.addEventListener('click', () => {
      if (this.maxCycles < 10 && !this.cycleInterval) {
        this.maxCycles++;
        cyclesInput.value = this.maxCycles;
        this.updateCycleDisplay();
      }
    });
  },
  
  // Start cycle timer
  startCycleTimer() {
    if (this.cycleInterval) return false;
    
    const focusTimer = document.getElementById('focusTimer');
    const breakTimer = document.getElementById('breakTimer');
    const decreaseBtn = document.getElementById('decreaseCycle');
    const increaseBtn = document.getElementById('increaseCycle');
    const cyclesInput = document.getElementById('cyclesInput');
    
    // Disable editing and controls
    focusTimer.contentEditable = 'false';
    breakTimer.contentEditable = 'false';
    decreaseBtn.disabled = true;
    increaseBtn.disabled = true;
    cyclesInput.disabled = true;
    
    // Save initial times
    this.savedFocusTime = focusTimer.textContent;
    this.savedBreakTime = breakTimer.textContent;
    
    // Start with focus phase
    if (this.totalSeconds === 0) {
      const timerArray = focusTimer.textContent.split('');
      const minutes = parseInt(timerArray[0] + timerArray[1]);
      const seconds = parseInt(timerArray[3] + timerArray[4]);
      this.totalSeconds = minutes * 60 + seconds;
      
      if (this.totalSeconds === 0) {
        alert('Please set a focus time greater than 00:00');
        focusTimer.contentEditable = 'true';
        breakTimer.contentEditable = 'true';
        decreaseBtn.disabled = false;
        increaseBtn.disabled = false;
        cyclesInput.disabled = false;
        return false;
      }
      
      this.isInFocusPhase = true;
      this.currentCycle = 1;
    }
    
    this.updateCycleDisplay();
    this.startCycleInterval(focusTimer, breakTimer);
    
    return true;
  },
  
  // Extracted interval logic for reuse
  startCycleInterval(focusTimer, breakTimer) {
    
    this.cycleInterval = setInterval(() => {
      if (this.totalSeconds <= 0) {
        // Switch phase or complete cycle
        if (this.isInFocusPhase) {
          // Focus phase complete, switch to break
          this.isInFocusPhase = false;
          const timerArray = this.savedBreakTime.split('');
          const minutes = parseInt(timerArray[0] + timerArray[1]);
          const seconds = parseInt(timerArray[3] + timerArray[4]);
          this.totalSeconds = minutes * 60 + seconds;
          
          if (this.totalSeconds === 0) {
            // Skip break if it's 00:00, complete cycle immediately
            this.isInFocusPhase = true;
            this.currentCycle++;
            
            if (this.currentCycle > this.maxCycles) {
              this.completeCycle();
              return;
            }
            
            // Pause for 2 seconds between cycles
            clearInterval(this.cycleInterval);
            this.cycleInterval = null;
            
            setTimeout(() => {
              // Reset both timers to saved values for next cycle
              focusTimer.textContent = this.savedFocusTime;
              breakTimer.textContent = this.savedBreakTime;
              
              const focusTimerArray = this.savedFocusTime.split('');
              const focusMinutes = parseInt(focusTimerArray[0] + focusTimerArray[1]);
              const focusSeconds = parseInt(focusTimerArray[3] + focusTimerArray[4]);
              this.totalSeconds = focusMinutes * 60 + focusSeconds;
              
              this.updateCycleDisplay();
              this.startCycleInterval(focusTimer, breakTimer);
            }, 2000);
            
            return;
          }
        } else {
          // Break phase complete, cycle finished
          this.isInFocusPhase = true;
          this.currentCycle++;
          
          if (this.currentCycle > this.maxCycles) {
            this.completeCycle();
            return;
          }
          
          // Pause for 2 seconds between cycles
          clearInterval(this.cycleInterval);
          this.cycleInterval = null;
          
          setTimeout(() => {
            // Reset both timers to saved values for next cycle
            focusTimer.textContent = this.savedFocusTime;
            breakTimer.textContent = this.savedBreakTime;
            
            const timerArray = this.savedFocusTime.split('');
            const minutes = parseInt(timerArray[0] + timerArray[1]);
            const seconds = parseInt(timerArray[3] + timerArray[4]);
            this.totalSeconds = minutes * 60 + seconds;
            
            this.updateCycleDisplay();
            this.startCycleInterval(focusTimer, breakTimer);
          }, 2000);
          
          return;
        }
        
        this.updateCycleDisplay();
      }
      
      this.totalSeconds--;
      
      const mins = Math.floor(this.totalSeconds / 60);
      const secs = this.totalSeconds % 60;
      
      const displayArray = [
        Math.floor(mins / 10).toString(),
        (mins % 10).toString(),
        ':',
        Math.floor(secs / 10).toString(),
        (secs % 10).toString()
      ];
      
      if (this.isInFocusPhase) {
        focusTimer.textContent = displayArray.join('');
      } else {
        breakTimer.textContent = displayArray.join('');
      }
    }, 1000);
    
    return true;
  },
  
  // Pause cycle timer
  pauseCycleTimer() {
    clearInterval(this.cycleInterval);
    this.cycleInterval = null;
  },
  
  // Reset cycle timer
  resetCycleTimer() {
    clearInterval(this.cycleInterval);
    this.cycleInterval = null;
    this.totalSeconds = 0;
    this.currentCycle = 1;
    this.isInFocusPhase = true;
    
    const focusTimer = document.getElementById('focusTimer');
    const breakTimer = document.getElementById('breakTimer');
    const decreaseBtn = document.getElementById('decreaseCycle');
    const increaseBtn = document.getElementById('increaseCycle');
    const cyclesInput = document.getElementById('cyclesInput');
    const startButton = document.getElementById('startButton');
    
    if (focusTimer) {
      focusTimer.contentEditable = 'true';
      focusTimer.textContent = this.savedFocusTime;
    }
    
    if (breakTimer) {
      breakTimer.contentEditable = 'true';
      breakTimer.textContent = this.savedBreakTime;
    }
    
    if (decreaseBtn) decreaseBtn.disabled = false;
    if (increaseBtn) increaseBtn.disabled = false;
    if (cyclesInput) cyclesInput.disabled = false;
    if (startButton) startButton.textContent = 'Start';
    
    this.updateCycleDisplay();
  },
  
  // Complete cycle
  completeCycle() {
    clearInterval(this.cycleInterval);
    this.cycleInterval = null;
    this.totalSeconds = 0;
    
    const focusTimer = document.getElementById('focusTimer');
    const breakTimer = document.getElementById('breakTimer');
    const decreaseBtn = document.getElementById('decreaseCycle');
    const increaseBtn = document.getElementById('increaseCycle');
    const cyclesInput = document.getElementById('cyclesInput');
    const startButton = document.getElementById('startButton');
    
    focusTimer.contentEditable = 'true';
    breakTimer.contentEditable = 'true';
    
    // Reset timers to saved values immediately
    focusTimer.textContent = this.savedFocusTime;
    breakTimer.textContent = this.savedBreakTime;
    
    decreaseBtn.disabled = false;
    increaseBtn.disabled = false;
    cyclesInput.disabled = false;
    startButton.textContent = 'Start';
    
    this.currentCycle = 1;
    this.isInFocusPhase = true;
    this.updateCycleDisplay();
    
    alert('All cycles completed! Great work! 🎉');
  },
  
  // Update cycle display
  updateCycleDisplay() {
    const display = document.getElementById('currentCycleDisplay');
    if (display) {
      const phase = this.isInFocusPhase ? 'Focus' : 'Break';
      display.textContent = `Cycle ${this.currentCycle} of ${this.maxCycles} - ${phase}`;
    }
  },
  
  // Reset cycle state
  resetCycleState() {
    clearInterval(this.cycleInterval);
    this.cycleInterval = null;
    this.totalSeconds = 0;
    this.currentCycle = 1;
    this.maxCycles = 4;
    this.isInFocusPhase = true;
    this.isPaused = false;
  }
};

// Mode switching logic
document.addEventListener('DOMContentLoaded', () => {
  const focusBtn = document.querySelector('.pmo-btn.focus');
  const breakBtn = document.querySelector('.pmo-btn.break');
  const cycleBtn = document.querySelector('.pmo-btn.cycle');
  const timerDisplay = document.getElementById('timerDisplay');
  const startButton = document.getElementById('startButton');
  
  // Focus mode
  focusBtn?.addEventListener('click', () => {
    // Skip if already in focus mode
    if (focusBtn.classList.contains('active') && cycleMode.currentMode !== 'cycle') {
      return;
    }
    
    // Save current timer value before switching
    if (breakBtn.classList.contains('active')) {
      cycleMode.singleModeBreakTime = timerDisplay.textContent;
    }
    
    if (cycleMode.currentMode === 'cycle') {
      cycleMode.removeCycleMode();
    }
    
    // Update active states
    focusBtn.classList.add('active');
    breakBtn.classList.remove('active');
    cycleBtn.classList.remove('active');
    
    // Set timer display to saved focus time
    timerDisplay.textContent = cycleMode.singleModeFocusTime;
    startButton.textContent = 'Start';
    
    // Reattach single timer listeners
    if (window.attachSingleTimerListeners) {
      window.attachSingleTimerListeners();
    }
  });
  
  // Break mode
  breakBtn?.addEventListener('click', () => {
    // Skip if already in break mode
    if (breakBtn.classList.contains('active') && cycleMode.currentMode !== 'cycle') {
      return;
    }
    
    // Save current timer value before switching
    if (focusBtn.classList.contains('active')) {
      cycleMode.singleModeFocusTime = timerDisplay.textContent;
    }
    
    if (cycleMode.currentMode === 'cycle') {
      cycleMode.removeCycleMode();
    }
    
    // Update active states
    focusBtn.classList.remove('active');
    breakBtn.classList.add('active');
    cycleBtn.classList.remove('active');
    
    // Set timer display to saved break time
    timerDisplay.textContent = cycleMode.singleModeBreakTime;
    startButton.textContent = 'Start';
    
    // Reattach single timer listeners
    if (window.attachSingleTimerListeners) {
      window.attachSingleTimerListeners();
    }
  });
  
  // Cycle mode
  cycleBtn?.addEventListener('click', () => {
    // Save current timer value before switching
    if (focusBtn.classList.contains('active')) {
      cycleMode.singleModeFocusTime = timerDisplay.textContent;
    } else if (breakBtn.classList.contains('active')) {
      cycleMode.singleModeBreakTime = timerDisplay.textContent;
    }
    
    // Update active states
    focusBtn.classList.remove('active');
    breakBtn.classList.remove('active');
    cycleBtn.classList.add('active');
    
    startButton.textContent = 'Start';
    
    cycleMode.initCycleMode();
  });
  
  // Set initial active state
  focusBtn?.classList.add('active');
});

// Expose cycleMode globally
window.cycleMode = cycleMode;