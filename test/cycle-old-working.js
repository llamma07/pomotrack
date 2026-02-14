(function (global) {

  function mmssToSeconds(mmss) {
    const parts = mmss.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  function secondsToMMSS(s) {
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  const CycleTab = {
    init(sharedInput) {
      this.input = sharedInput;
      this.callbacks = {};
      this.interval = null;
      this.timeout = null;
      this.running = false;

      this.segment = 'focus';
      this.remaining = 0;

      this.maxCycles = 4;
      this.currentCycle = 1;
      this.cycleContainer = null;
    },

    setCallbacks(cb){ this.callbacks = cb || {}; },

    // =====================================================
    // ACTIVATE
    // =====================================================
    activate() {
      this.renderUI();

      // disable shared input since we use custom UI
      this.input.disable();

      const fv = window.FocusTab.getState().savedValue || "25:00";
      const bv = window.BreakTab.getState().savedValue || "05:00";

      document.getElementById("focusTimer").textContent = fv;
      document.getElementById("breakTimer").textContent = bv;

      this.attachCycleControls();
      this.updateCycleDisplay();
    },

    deactivate() {
      this.pause();
      this.removeUI();
      this.input.enable();
    },

    // =====================================================
    // UI
    // =====================================================
    renderUI() {
      const timerDisplay = document.getElementById("timerDisplay");
      const helpText = document.querySelector(".text-help");

      if (timerDisplay) timerDisplay.style.display = "none";
      if (helpText) helpText.style.display = "none";

      const container = document.createElement("div");
      container.className = "cycle-container";

      container.innerHTML = `
      <div class="cycle-timers flex justify-center gap-32 mt-10">
        <div class="flex flex-col items-center">
          <label class="text-lg font-medium mb-4">Focus</label>
          <div contenteditable="true" id="focusTimer" class="timer-display text-[120px]">25:00</div>
        </div>

        <div class="flex flex-col items-center">
          <label class="text-lg font-medium mb-4">Break</label>
          <div contenteditable="true" id="breakTimer" class="timer-display text-[120px]">05:00</div>
        </div>
      </div>

      <div class="cycle-controls flex justify-center items-center gap-4 mt-8">
        <span class="text-lg font-medium">Cycles:</span>
        <button id="decreaseCycle">−</button>
        <input id="cyclesInput" value="4" readonly class="w-12 text-center">
        <button id="increaseCycle">+</button>
      </div>

      <div class="cycle-progress mt-6 text-center text-lg font-medium">
        <span id="currentCycleDisplay">Cycle 1 of 4 - Focus</span>
      </div>
      `;

      document.querySelector(".pomo-options")
        .insertAdjacentElement("afterend", container);

      this.cycleContainer = container;
    },

    removeUI() {
      if (this.cycleContainer) this.cycleContainer.remove();

      const timerDisplay = document.getElementById("timerDisplay");
      const helpText = document.querySelector(".text-help");

      if (timerDisplay) timerDisplay.style.display = "";
      if (helpText) helpText.style.display = "";
    },

    // =====================================================
    // CONTROLS
    // =====================================================
    attachCycleControls() {
      const dec = document.getElementById("decreaseCycle");
      const inc = document.getElementById("increaseCycle");
      const input = document.getElementById("cyclesInput");

      dec.onclick = () => {
        if (this.running) return;
        if (this.maxCycles > 1) {
          this.maxCycles--;
          input.value = this.maxCycles;
          this.updateCycleDisplay();
        }
      };

      inc.onclick = () => {
        if (this.running) return;
        if (this.maxCycles < 12) {
          this.maxCycles++;
          input.value = this.maxCycles;
          this.updateCycleDisplay();
        }
      };
    },

    updateCycleDisplay() {
      const el = document.getElementById("currentCycleDisplay");
      if (!el) return;
      const phase = this.segment === "focus" ? "Focus" : "Break";
      el.textContent = `Cycle ${this.currentCycle} of ${this.maxCycles} - ${phase}`;
    },

    // =====================================================
    // TIMER LOGIC
    // =====================================================
    canStart() {
      const f = mmssToSeconds(document.getElementById("focusTimer").textContent);
      const b = mmssToSeconds(document.getElementById("breakTimer").textContent);
      return f > 0 && b > 0;
    },

    _startSegment(seg) {
      this.segment = seg;
      this.updateCycleDisplay();

      const dur = seg === "focus"
        ? mmssToSeconds(document.getElementById("focusTimer").textContent)
        : mmssToSeconds(document.getElementById("breakTimer").textContent);

      this.remaining = dur;

      this.interval = setInterval(() => {
        this.remaining--;
        const formatted = secondsToMMSS(this.remaining);

        if (seg === "focus") {
          document.getElementById("focusTimer").textContent = formatted;
        } else {
          document.getElementById("breakTimer").textContent = formatted;
        }

        if (this.remaining <= 0) {
          clearInterval(this.interval);
          this.interval = null;

          if (seg === "break") {
            this.currentCycle++;
            if (this.currentCycle > this.maxCycles) {
              this.completeAll();
              return;
            }
          }

          this.timeout = setTimeout(() => {
            this._startSegment(seg === "focus" ? "break" : "focus");
          }, 1500);
        }
      }, 1000);
    },

    start() {
      if (this.running) return;
      if (!this.canStart()) return false;

      this.running = true;
      this.currentCycle = 1;
      this._startSegment("focus");
      return true;
    },

    pause() {
      if (this.interval) clearInterval(this.interval);
      if (this.timeout) clearTimeout(this.timeout);
      this.running = false;
    },

    reset() {
      this.pause();
      this.currentCycle = 1;
      this.segment = "focus";

      this.updateCycleDisplay();

      const fv = window.FocusTab.getState().savedValue || "25:00";
      const bv = window.BreakTab.getState().savedValue || "05:00";

      document.getElementById("focusTimer").textContent = fv;
      document.getElementById("breakTimer").textContent = bv;
    },

    completeAll() {
      this.pause();
      alert("All cycles complete! Great work 🎉");
      this.reset();
      if (this.callbacks.onExpire) this.callbacks.onExpire();
    },

    getState(){
      return {running:this.running, segment:this.segment, cycle:this.currentCycle};
    }
  };

  global.CycleTab = CycleTab;

})(window);
