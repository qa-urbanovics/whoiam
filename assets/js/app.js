// assets/js/app.js
import { MusicEngine } from "./audio.js";

const $ = (id) => document.getElementById(id);

const CONFIG = {
  alphabet: "ASDFGHJKLQWERTYUIOPZXCVBNM",
  startTimeMs: 1600,
  minTimeMs: 420,
  timeDecayPerLevel: 0.95,

  padSize: 6,

  attemptsMax: 6,

  correctPerLevel: 10,
  maxLevel: 10,

  bestKey: "letter_dash_best_v2",
  themeKey: "ld_theme_v2",
};

class Game {
  constructor() {
    // UI
    this.root = document.documentElement;

    this.lightBtn = $("lightBtn");
    this.darkBtn = $("darkBtn");

    this.musicBtn = $("musicBtn");

    this.nameEl = $("name");
    this.startBtn = $("startBtn");
    this.restartBtn = $("restartBtn");

    this.levelEl = $("level");
    this.scoreEl = $("score");
    this.streakEl = $("streak");
    this.attemptsEl = $("attempts");

    this.targetEl = $("target");
    this.padEl = $("pad");
    this.logEl = $("log");
    this.timerFill = $("timerFill");

    this.runnerWrap = $("runnerWrap");
    this.runner = $("runner");
    this.mood = $("mood");
    this.item = $("item");

    this.lvlText = $("lvlText");
    this.lvlNeed = $("lvlNeed");
    this.finishFlag = $("finishFlag");
    this.dots = $("dots");

    this.shareText = $("shareText");
    this.copyBtn = $("copyBtn");
    this.shareBtn = $("shareBtn");
    this.xBtn = $("xBtn");
    this.fbBtn = $("fbBtn");
    this.linkedinBtn = $("linkedinBtn");
    this.linkBtn = $("linkBtn");
    this.bestEl = $("best");
    this.noteLine = $("noteLine");

    // Audio
    this.music = new MusicEngine();

    // State
    this.inputLocked = false;
    this.running = false;
    this.level = 1;
    this.score = 0;
    this.streak = 0;
    this.attemptsLeft = CONFIG.attemptsMax;
    this.correctInLevel = 0;

    this.need = null;
    this.allowedMs = CONFIG.startTimeMs;

    this.roundStart = 0;
    this.raf = 0;

    this.init();
  }

  init() {
    this.loadTheme();
    this.initBest();
    this.initButtons();
    this.updateUI();
    this.log("Press Start. Play with keyboard or taps.");

    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  initBest() {
    const best = Number(localStorage.getItem(CONFIG.bestKey) || "0");
    this.bestEl.textContent = String(best);
  }

  initButtons() {
    // Theme
    this.lightBtn.addEventListener("click", () => this.setTheme("light"));
    this.darkBtn.addEventListener("click", () => this.setTheme("dark"));

    // Music toggle (before start is fine)
    this.musicBtn.addEventListener("click", () => {
      const on = this.musicBtn.getAttribute("aria-pressed") !== "false";
      const next = !on;
      this.musicBtn.setAttribute("aria-pressed", String(next));
      this.musicBtn.querySelector(".icon").textContent = next ? "🔊" : "🔈";
      this.music.setEnabled(next);
      this.log(next ? "Music enabled." : "Music disabled.");
    });

    // Game controls
    this.startBtn.addEventListener("click", () => this.startGame());
    this.restartBtn.addEventListener("click", () => this.restartGame());

    // Keyboard input
    window.addEventListener("keydown", (e) => {
      if (!this.running) return;
      const k = e.key;
      const up = k && k.length === 1 ? k.toUpperCase() : "";
      if (up >= "A" && up <= "Z") this.attempt(up);
    });

    // Share
    this.copyBtn.addEventListener("click", () => this.copyResult());
    this.shareBtn.addEventListener("click", () => this.systemShare());
    this.xBtn.addEventListener("click", () => this.shareX());
    this.fbBtn.addEventListener("click", () => this.shareFacebook());
    this.linkedinBtn.addEventListener("click", () => this.shareLinkedIn());
    this.linkBtn.addEventListener("click", () => this.copyLink());

    // Resize runner positioning
    window.addEventListener("resize", () => this.updateRunnerX());
  }

  loadTheme() {
    const saved = localStorage.getItem(CONFIG.themeKey);
    this.setTheme(saved === "dark" ? "dark" : "light");
  }

  setTheme(theme) {
    this.root.setAttribute("data-theme", theme);
    this.lightBtn.classList.toggle("active", theme === "light");
    this.darkBtn.classList.toggle("active", theme === "dark");
    localStorage.setItem(CONFIG.themeKey, theme);
  }

  log(msg) {
    this.logEl.textContent = msg;
  }

  updateUI() {
    this.levelEl.textContent = String(this.level);
    this.scoreEl.textContent = String(this.score);
    this.streakEl.textContent = String(this.streak);
    this.attemptsEl.textContent = `${this.attemptsLeft} / ${CONFIG.attemptsMax}`;

    this.lvlText.textContent = `Level ${this.level}`;
    this.lvlNeed.textContent = String(this.correctInLevel);
    this.finishFlag.textContent = `Finish: Level ${CONFIG.maxLevel}`;

    this.renderDots();
    this.updateRunnerX();
  }

  renderDots() {
    this.dots.innerHTML = "";
    for (let i = 1; i <= CONFIG.maxLevel; i++) {
      const d = document.createElement("div");
      d.className = "dot";
      d.textContent = String(i);
      if (i < this.level) d.classList.add("done");
      if (i === this.level) d.classList.add("now");
      this.dots.appendChild(d);
    }
    const finish = document.createElement("div");
    finish.className = "flag";
    finish.textContent = "🏁";
    this.dots.appendChild(finish);
  }

  randLetter(except = null) {
    let c;
    do {
      const i = Math.floor(Math.random() * CONFIG.alphabet.length);
      c = CONFIG.alphabet[i];
    } while (c === except);
    return c;
  }

  padLetters(target) {
    const arr = [target];
    while (arr.length < CONFIG.padSize) {
      const c = this.randLetter();
      if (!arr.includes(c)) arr.push(c);
    }
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  renderPad(target) {
    this.padEl.innerHTML = "";
    const letters = this.padLetters(target);

    for (const c of letters) {
      const b = document.createElement("button");
      b.textContent = c;

      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this.attempt(c);
      }, { passive: false });

      this.padEl.appendChild(b);
    }
  }

  paintPadFeedback(okLetter, isOk) {
    const buttons = [...this.padEl.querySelectorAll("button")];
    for (const b of buttons) {
      b.classList.remove("good", "bad");
      if (b.textContent === okLetter) b.classList.add(isOk ? "good" : "bad");
    }
    setTimeout(() => buttons.forEach((b) => b.classList.remove("good", "bad")), 220);
  }

  runnerState(kind) {
    this.runner.classList.toggle("run", kind === "run");
    this.runner.classList.remove("collect", "stumble", "fall");
    if (kind !== "run") this.runner.classList.add(kind);

    this.mood.textContent =
      kind === "run" ? "Running…" :
      kind === "collect" ? "Got it!" :
      kind === "stumble" ? "Oops…" :
      "Fell down…";
  }

  updateRunnerX() {
    const wrapW = this.runnerWrap.clientWidth;
    const runnerW = 84;
    const maxX = Math.max(0, wrapW - runnerW - 10);

    const p = Math.min(1, this.correctInLevel / CONFIG.correctPerLevel);
    const x = Math.round(maxX * p);

    this.runner.style.setProperty("--x", `${x}px`);
    this.mood.style.setProperty("--x", `${x}px`);

    const ix = Math.round(Math.min(maxX, x + 46));
    this.item.style.setProperty("--ix", `${ix}px`);
  }

  showItem(symbol) {
    this.item.textContent = symbol;
    this.item.classList.add("show");
    setTimeout(() => this.item.classList.remove("show"), 200);
  }

  startGame() {
    if (this.running) return;

    this.running = true;
    this.level = 1;
    this.score = 0;
    this.streak = 0;
    this.attemptsLeft = CONFIG.attemptsMax;
    this.correctInLevel = 0;
    this.allowedMs = CONFIG.startTimeMs;

    this.clearShare();
    this.startBtn.disabled = true;
    this.restartBtn.disabled = false;

    // Music starts ONLY after Start (user gesture)
    this.music.start().catch(() => {
      // ignore if blocked
    });

    this.runnerState("run");
    this.updateUI();
    this.nextRound();
  }

  restartGame() {
    this.running = false;
    this.cancelTick();
    this.music.stop();
    this.startBtn.disabled = false;
    this.startGame();
  }

  cancelTick() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  nextRound() {
    if (!this.running) return;

    this.inputLocked = false;
    this.runnerState("run");
    this.need = this.randLetter(this.need);
    this.targetEl.textContent = this.need;
    this.renderPad(this.need);

    this.roundStart = performance.now();
    this.cancelTick();
    this.tick();
  }

  tick() {
    if (!this.running) return;

    const elapsed = performance.now() - this.roundStart;
    const t = Math.max(0, 1 - elapsed / this.allowedMs);
    this.timerFill.style.transform = `scaleX(${t})`;

    if (elapsed >= this.allowedMs) {
      this.miss("Too slow!");
      return;
    }
    this.raf = requestAnimationFrame(() => this.tick());
  }

  levelUp() {
    if (this.level >= CONFIG.maxLevel) return;

    this.level += 1;
    this.correctInLevel = 0;
    this.allowedMs = Math.max(CONFIG.minTimeMs, Math.floor(this.allowedMs * CONFIG.timeDecayPerLevel));

    this.log(`Level up! Welcome to Level ${this.level}. Time per letter: ${this.allowedMs}ms`);
    this.updateUI();
  }

  attempt(letter) {
    if (!this.running) return;
    if (this.inputLocked) return;

    this.inputLocked = true; 
    this.cancelTick();       

    const pressed = String(letter || "").toUpperCase();
    if (pressed === this.need) {
      const rt = performance.now() - this.roundStart;

      const speedBonus = Math.max(0, Math.floor((this.allowedMs - rt) / 10));
      const streakBonus = this.streak * 3;
      const gain = 10 + speedBonus + streakBonus;

      this.score += gain;
      this.streak += 1;
      this.correctInLevel += 1;

      this.paintPadFeedback(this.need, true);
      this.runnerState("collect");
      this.showItem("✨");
      this.log(`Nice! +${gain} (reaction ${Math.floor(rt)}ms)`);

      this.updateUI();

      if (this.correctInLevel >= CONFIG.correctPerLevel) {
        if (this.level >= CONFIG.maxLevel) {
          setTimeout(() => this.finishGame(), 420);
        } else {
          setTimeout(() => {
            this.levelUp();
            this.nextRound();
          }, 420);
        }
      } else {
        setTimeout(() => this.nextRound(), 260);
      }
    } else {
      this.miss(`Wrong (need "${this.need}")`);
    }
  }

  miss(message) {
    if (!this.running) return;

    this.cancelTick();
    this.attemptsLeft -= 1;
    this.streak = 0;

    this.paintPadFeedback(this.need, false);
    this.runnerState("stumble");
    this.showItem("💥");
    this.updateUI();

    this.log(`${message} — attempts left: ${Math.max(0, this.attemptsLeft)}`);

    if (this.attemptsLeft <= 0) {
      this.endGame();
    } else {
      setTimeout(() => this.nextRound(), 420);
    }
  }

  finishGame() {
    this.running = false;
    this.cancelTick();
    this.music.stop();

    this.correctInLevel = CONFIG.correctPerLevel;
    this.updateRunnerX();
    this.runnerState("collect");
    this.showItem("🏁");

    this.targetEl.textContent = "—";
    this.padEl.innerHTML = "";
    this.startBtn.disabled = false;

    this.setShare(true);
    this.saveBest();
    this.noteLine.textContent = "Finished! Try again to beat your score 🙂";
  }

  endGame() {
    this.running = false;
    this.cancelTick();
    this.music.stop();

    this.runnerState("fall");
    this.showItem("💫");

    this.targetEl.textContent = "—";
    this.padEl.innerHTML = "";
    this.startBtn.disabled = false;

    this.setShare(false);
    this.saveBest();
    this.noteLine.textContent = "Game over. Try again 🙂";
  }

  makeSharePayload(finished) {
    const player = (this.nameEl.value || "Someone").trim();
    const status = finished ? "FINISHED" : "Game Over";
    const theme = this.root.getAttribute("data-theme");
    const url = location.href;

    const text =
      `🏃 Letter Dash — Buddy Runner (${status})\n` +
      `${player}: ${this.score} pts — reached Level ${this.level}\n` +
      `Theme: ${theme}\n` +
      `Can you beat this?`;

    return { title: "Letter Dash — Buddy Runner", text, url };
  }

  setShare(finished) {
    const payload = this.makeSharePayload(finished);
    this.shareText.value = `${payload.text}\n${payload.url}`;
    this.enableShareButtons(true);
  }

  clearShare() {
    this.shareText.value = "";
    this.noteLine.textContent = "";
    this.enableShareButtons(false);
  }

  enableShareButtons(on) {
    this.copyBtn.disabled = !on;
    this.shareBtn.disabled = !on;
    this.xBtn.disabled = !on;
    this.fbBtn.disabled = !on;
    this.linkedinBtn.disabled = !on;
    this.linkBtn.disabled = !on;
  }

  saveBest() {
    const prev = Number(localStorage.getItem(CONFIG.bestKey) || "0");
    if (this.score > prev) {
      localStorage.setItem(CONFIG.bestKey, String(this.score));
      this.bestEl.textContent = String(this.score);
      this.noteLine.textContent = "New local best! 🎉";
    }
  }

  async copyResult() {
    try {
      await navigator.clipboard.writeText(this.shareText.value);
      this.log("Copied ✅");
    } catch {
      this.shareText.focus();
      this.shareText.select();
      this.log("Select & copy (Ctrl+C / Cmd+C)");
    }
  }

  async systemShare() {
    const payload = this.makeSharePayload(false);
    try {
      if (navigator.share) {
        await navigator.share({ title: payload.title, text: payload.text, url: payload.url });
        this.log("Shared ✅");
      } else {
        this.log("System Share not available here — use Copy/X/Facebook.");
      }
    } catch {
      this.log("Share canceled.");
    }
  }

  shareX() {
    const payload = this.makeSharePayload(false);
    const text = encodeURIComponent(`${payload.text}\n${payload.url}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank", "noopener,noreferrer");
  }

  shareFacebook() {
    const u = encodeURIComponent(location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`, "_blank", "noopener,noreferrer");
  }

  shareLinkedIn() {
    const url = encodeURIComponent(location.href);
    const text = encodeURIComponent(this.shareText.value);

    // LinkedIn share URL
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      this.log("Link copied ✅");
    } catch {
      this.log("Copy from browser address bar.");
    }
  }
}

// Boot
new Game();
