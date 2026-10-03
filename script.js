(() => {
  "use strict";

  const CONFIG = {
    TOTAL_ROUNDS: 10,
    BEST_KEY: "who-is-that.best.v1"
  };

  const STATE = Object.freeze({
    START: "START",
    PLAYING: "PLAYING",
    FEEDBACK: "FEEDBACK",
    COMPLETED: "COMPLETED"
  });

  const BADGE = {
    [STATE.START]: { icon: "\u25CF", text: "READY" },
    [STATE.PLAYING]: { icon: "\uD83D\uDC40", text: "PLAYING" },
    [STATE.FEEDBACK]: { icon: "\u2728", text: "THINKING" },
    [STATE.COMPLETED]: { icon: "\u2B50", text: "COMPLETE" }
  };

  const POSITIVE_FEEDBACK = [
    "That's right!",
    "Wonderful!",
    "Great job!",
    "Well done!",
    "Perfect!",
    "Excellent!"
  ];

  const people = [
    { id: 1, name: "Alex", image: "./assets/placeholder1.svg", relationship: "" },
    { id: 2, name: "Jordan", image: "./assets/placeholder2.svg", relationship: "" },
    { id: 3, name: "Morgan", image: "./assets/placeholder3.svg", relationship: "" },
    { id: 4, name: "Casey", image: "./assets/placeholder4.svg", relationship: "" },
    { id: 5, name: "Taylor", image: "./assets/placeholder5.svg", relationship: "" },
    { id: 6, name: "Jamie", image: "./assets/placeholder6.svg", relationship: "" }
  ];

  const $ = function(id) { return document.getElementById(id); };

  const el = {
    badgeIcon: $("stateBadgeIcon"),
    badgeText: $("stateBadgeText"),
    statRound: $("statRound"),
    statTotal: $("statTotal"),
    statCorrect: $("statCorrect"),
    statBest: $("statBest"),
    startScreen: $("startScreen"),
    gameScreen: $("gameScreen"),
    completeScreen: $("completeScreen"),
    questionText: $("questionText"),
    faceImage: $("faceImage"),
    optionsGrid: $("optionsGrid"),
    feedback: $("feedback"),
    nextContainer: $("nextContainer"),
    completeMessage: $("completeMessage"),
    completeBest: $("completeBest"),
    faceCard: document.querySelector(".face-card"),
    announcer: $("announcer")
  };

  const btn = {
    start: $("btnStart"),
    next: $("btnNext"),
    playAgain: $("btnPlayAgain")
  };

  const game = {
    state: STATE.START,
    round: 0,
    totalRounds: CONFIG.TOTAL_ROUNDS,
    correctCount: 0,
    best: { score: 0, total: CONFIG.TOTAL_ROUNDS },
    currentPerson: null,
    usedPersonIds: [],
    options: [],
    answered: false
  };

  function readBest() {
    try {
      const raw = localStorage.getItem(CONFIG.BEST_KEY);
      if (raw === null) {
        return { score: 0, total: CONFIG.TOTAL_ROUNDS };
      }
      const parsed = JSON.parse(raw);
      if (typeof parsed.score === "number" && typeof parsed.total === "number") {
        return { score: parsed.score, total: parsed.total };
      }
      return { score: 0, total: CONFIG.TOTAL_ROUNDS };
    } catch (err) {
      return { score: 0, total: CONFIG.TOTAL_ROUNDS };
    }
  }

  function saveBest(score, total) {
    try {
      localStorage.setItem(CONFIG.BEST_KEY, JSON.stringify({ score: score, total: total }));
    } catch (err) {}
  }

  function setState(newState) {
    game.state = newState;
    const badge = BADGE[newState];
    if (badge) {
      el.badgeIcon.textContent = badge.icon;
      el.badgeText.textContent = badge.text;
    }
  }

  function updateHud() {
    el.statRound.textContent = String(game.round);
    el.statTotal.textContent = String(game.totalRounds);
    el.statCorrect.textContent = String(game.correctCount);
    el.statBest.textContent = game.best.score + " / " + game.best.total;
  }

  function shuffleArray(arr) {
    const array = arr.slice();
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  function getRandomPerson(excludeIds) {
    const excluded = new Set(excludeIds);
    const candidates = [];
    for (let i = 0; i < people.length; i++) {
      if (!excluded.has(people[i].id)) {
        candidates.push(people[i]);
      }
    }
    if (candidates.length === 0) {
      const lastId = game.currentPerson !== null ? game.currentPerson.id : -1;
      const others = [];
      for (let i = 0; i < people.length; i++) {
        if (people[i].id !== lastId) {
          others.push(people[i]);
        }
      }
      if (others.length === 0) {
        return people[Math.floor(Math.random() * people.length)];
      }
      return others[Math.floor(Math.random() * others.length)];
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function generateOptions(correctPerson) {
    const options = [correctPerson];
    const excluded = new Set([correctPerson.id]);
    let distractorsNeeded = people.length - 1;
    if (distractorsNeeded > 3) distractorsNeeded = 3;
    while (options.length < distractorsNeeded + 1 && options.length < 4) {
      let candidate = null;
      for (let i = 0; i < people.length; i++) {
        if (!excluded.has(people[i].id)) {
          candidate = people[i];
          break;
        }
      }
      if (candidate === null) break;
      options.push(candidate);
      excluded.add(candidate.id);
    }
    const shuffled = shuffleArray(options);
    if (shuffled.length > 4) return shuffled.slice(0, 4);
    return shuffled;
  }

  function generateQuestion() {
    const exclude = game.usedPersonIds.slice();
    if (game.round > 0 && game.currentPerson !== null) {
      exclude.push(game.currentPerson.id);
    }
    const person = getRandomPerson(exclude);
    game.currentPerson = person;
    game.usedPersonIds.push(person.id);
    if (game.usedPersonIds.length > people.length) {
      game.usedPersonIds.shift();
    }
    game.options = generateOptions(person);
    game.answered = false;
  }

  function retriggerFaceAnimation() {
    if (el.faceCard === null) return;
    el.faceCard.classList.remove("face-card");
    void el.faceCard.offsetWidth;
    el.faceCard.classList.add("face-card");
  }

  function showQuestion() {
    if (game.currentPerson === null) return;
    el.faceImage.src = game.currentPerson.image;
    el.faceImage.alt = "Face to identify";
    el.questionText.textContent = "Who is this?";
    el.feedback.textContent = "";
    el.nextContainer.classList.add("hidden");
    retriggerFaceAnimation();
    el.optionsGrid.innerHTML = "";
    for (let i = 0; i < game.options.length; i++) {
      const option = game.options[i];
      const btnOpt = document.createElement("button");
      btnOpt.type = "button";
      btnOpt.className = "option-btn";
      btnOpt.textContent = option.name;
      btnOpt.dataset.optionId = String(option.id);
      btnOpt.addEventListener("click", (function(opt, btnEl) {
        return function() { handleAnswer(opt, btnEl); };
      })(option, btnOpt));
      el.optionsGrid.appendChild(btnOpt);
    }
    el.optionsGrid.style.pointerEvents = "auto";
  }

  function handleAnswer(selectedOption, button) {
    if (game.answered || game.state === STATE.FEEDBACK) return;
    game.answered = true;
    el.optionsGrid.style.pointerEvents = "none";
    setState(STATE.FEEDBACK);
    const isCorrect = selectedOption.id === game.currentPerson.id;
    let correctOption = null;
    for (let i = 0; i < game.options.length; i++) {
      if (game.options[i].id === game.currentPerson.id) {
        correctOption = game.options[i];
        break;
      }
    }
    const buttons = el.optionsGrid.querySelectorAll(".option-btn");
    if (isCorrect) {
      game.correctCount += 1;
      button.classList.add("correct");
      const idx = Math.floor(Math.random() * POSITIVE_FEEDBACK.length);
      const feedbackText = POSITIVE_FEEDBACK[idx];
      el.feedback.textContent = feedbackText;
      announce(feedbackText);
    } else {
      button.classList.add("incorrect");
      for (let i = 0; i < buttons.length; i++) {
        if (buttons[i].dataset.optionId === String(correctOption.id)) {
          buttons[i].classList.add("correct");
        }
      }
      const feedbackText = "That's okay - this was " + game.currentPerson.name + ".";
      el.feedback.textContent = feedbackText;
      announce(feedbackText);
    }
    updateHud();
    el.nextContainer.classList.remove("hidden");
  }

  function nextRound() {
    game.round += 1;
    if (game.round > game.totalRounds) {
      finishGame();
      return;
    }
    generateQuestion();
    showQuestion();
    setState(STATE.PLAYING);
    updateHud();
    announce("Round " + game.round + " of " + game.totalRounds + ". Who is this?");
  }

  function finishGame() {
    setState(STATE.COMPLETED);
    el.gameScreen.classList.add("hidden");
    el.completeScreen.classList.remove("hidden");
    const score = game.correctCount;
    const total = game.totalRounds;
    const best = game.best;
    const message = "You recognised " + score + " out of " + total + " people.";
    el.completeMessage.textContent = message;
    if (score > best.score) {
      game.best = { score: score, total: total };
      saveBest(score, total);
      el.completeBest.textContent = "Best Score: " + score + " / " + total;
      el.completeBest.classList.remove("hidden");
      announce("Well done! " + message + " New best score!");
    } else {
      el.completeBest.textContent = "Best Score: " + best.score + " / " + best.total;
      el.completeBest.classList.remove("hidden");
      announce("Well done! " + message);
    }
    updateHud();
  }

  function startGame() {
    game.round = 0;
    game.correctCount = 0;
    game.usedPersonIds = [];
    game.currentPerson = null;
    game.answered = false;
    setState(STATE.START);
    el.startScreen.classList.add("hidden");
    el.completeScreen.classList.add("hidden");
    el.gameScreen.classList.remove("hidden");
    nextRound();
    updateHud();
  }

  function restartGame() {
    startGame();
  }

  function announce(message) {
    if (el.announcer === null) return;
    el.announcer.textContent = "";
    setTimeout(function() {
      el.announcer.textContent = message;
    }, 0);
  }

  function bindEvents() {
    btn.start.addEventListener("click", startGame);
    btn.next.addEventListener("click", nextRound);
    btn.playAgain.addEventListener("click", restartGame);
    window.addEventListener("keydown", function(event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target;
      const onControl = target instanceof Element && target.closest("button, a[href], input, select, textarea");
      if (onControl) return;
      if (game.state === STATE.START) {
        event.preventDefault();
        startGame();
      } else if (game.state === STATE.FEEDBACK) {
        event.preventDefault();
        nextRound();
      } else if (game.state === STATE.COMPLETED) {
        event.preventDefault();
        restartGame();
      }
    });
  }

  function init() {
    game.totalRounds = CONFIG.TOTAL_ROUNDS;
    game.best = readBest();
    updateHud();
    setState(STATE.START);
    el.startScreen.classList.remove("hidden");
    el.gameScreen.classList.add("hidden");
    el.completeScreen.classList.add("hidden");
    bindEvents();
    announce("Who Is That? Recognition game. No rush, take your time.");
  }

  init();
})();
