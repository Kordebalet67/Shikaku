(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const statusEl = document.getElementById("status");
  const levelSelect = document.getElementById("levelSelect");
  const sizeSelect = document.getElementById("sizeSelect");
  const themeBtn = document.getElementById("themeBtn");
  const randomBtn = document.getElementById("randomBtn");
  const undoBtn = document.getElementById("undoBtn");
  const clearBtn = document.getElementById("clearBtn");
  const checkBtn = document.getElementById("checkBtn");

  const STATIC_LEVELS = [
    {
      rows: 3,
      cols: 3,
      clues: [
        { r: 0, c: 0, value: 4 },
        { r: 0, c: 2, value: 3 },
        { r: 2, c: 0, value: 2 }
      ]
    },
    {
      rows: 4,
      cols: 4,
      clues: [
        { r: 1, c: 1, value: 4 },
        { r: 0, c: 2, value: 2 },
        { r: 0, c: 3, value: 4 },
        { r: 3, c: 0, value: 4 },
        { r: 2, c: 2, value: 2 }
      ]
    },
    {
      rows: 5,
      cols: 5,
      clues: [
        { r: 0, c: 0, value: 6 },
        { r: 0, c: 4, value: 4 },
        { r: 4, c: 0, value: 6 },
        { r: 2, c: 2, value: 4 },
        { r: 2, c: 4, value: 2 },
        { r: 4, c: 4, value: 3 }
      ]
    },
    {
      rows: 6,
      cols: 6,
      clues: [
        { r: 0, c: 3, value: 8 },
        { r: 0, c: 4, value: 4 },
        { r: 2, c: 0, value: 4 },
        { r: 2, c: 2, value: 6 },
        { r: 2, c: 5, value: 2 },
        { r: 4, c: 0, value: 6 },
        { r: 4, c: 5, value: 6 }
      ]
    }
  ];

  function mulberry32(seed) {
    let a = seed >>> 0;

    return function () {
      a += 0x6D2B79F5;

      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  function getMaxArea(size) {
    if (size <= 3) return 4;
    if (size <= 5) return 8;
    if (size <= 6) return 9;
    if (size <= 8) return 14;
    if (size <= 10) return 18;
    if (size <= 13) return 24;
    if (size <= 16) return 32;
    if (size <= 18) return 36;
    return 42;
  }

  function randomPartition(r, c, h, w, maxArea, rng) {
    const area = h * w;

    if (area <= 1) {
      return [{ r, c, h, w }];
    }

    if (area <= maxArea) {
      if (area <= 3) {
        return [{ r, c, h, w }];
      }

      const ratio = area / maxArea;
      let stopChance;

      if (ratio > 0.65) {
        stopChance = 0.72;
      } else if (ratio > 0.35) {
        stopChance = 0.45;
      } else {
        stopChance = 0.22;
      }

      if (rng() < stopChance) {
        return [{ r, c, h, w }];
      }
    }

    let horizontal;

    if (h === 1) {
      horizontal = false;
    } else if (w === 1) {
      horizontal = true;
    } else if (h > w) {
      horizontal = rng() < 0.72;
    } else if (w > h) {
      horizontal = rng() < 0.28;
    } else {
      horizontal = rng() < 0.5;
    }

    if (horizontal) {
      const split = randInt(rng, 1, h - 1);

      return [
        ...randomPartition(r, c, split, w, maxArea, rng),
        ...randomPartition(r + split, c, h - split, w, maxArea, rng)
      ];
    }

    const split = randInt(rng, 1, w - 1);

    return [
      ...randomPartition(r, c, h, split, maxArea, rng),
      ...randomPartition(r, c + split, h, w - split, maxArea, rng)
    ];
  }

  function generatePuzzle(rows, cols, rng) {
    const total = rows * cols;
    const maxArea = getMaxArea(Math.max(rows, cols));

    let minRects = Math.max(
      3,
      Math.ceil(total / maxArea),
      Math.floor(total / 45)
    );

    let maxRects = Math.max(
      minRects,
      Math.min(160, Math.floor(total / 3))
    );

    if (minRects > maxRects) {
      minRects = maxRects;
    }

    for (let attempt = 0; attempt < 60; attempt++) {
      const parts = randomPartition(0, 0, rows, cols, maxArea, rng);

      if (parts.length >= minRects && parts.length <= maxRects) {
        return {
          rows,
          cols,
          clues: parts.map((part) => ({
            r: randInt(rng, part.r, part.r + part.h - 1),
            c: randInt(rng, part.c, part.c + part.w - 1),
            value: part.h * part.w
          }))
        };
      }
    }

    const parts = randomPartition(0, 0, rows, cols, maxArea, rng);

    return {
      rows,
      cols,
      clues: parts.map((part) => ({
        r: randInt(rng, part.r, part.r + part.h - 1),
        c: randInt(rng, part.c, part.c + part.w - 1),
        value: part.h * part.w
      }))
    };
  }

  const LEVELS = [];

  for (let size = 3; size <= 20; size++) {
    const number = size - 2;
    const name = `Уровень ${number} · ${size}×${size}`;

    const staticLevel = STATIC_LEVELS.find(
      (item) => item.rows === size && item.cols === size
    );

    if (staticLevel) {
      LEVELS.push({
        name,
        puzzle: staticLevel
      });
    } else {
      LEVELS.push({
        name,
        rows: size,
        cols: size,
        seed: (size * 1013904223 + 12345) >>> 0,
        cache: null
      });
    }
  }

  let puzzle = null;
  let clueGrid = [];
  let board = [];
  let rects = [];
  let history = [];
  let nextId = 1;

  let cellSize = 52;
  let logicalW = 0;
  let logicalH = 0;

  const drawing = {
    active: false,
    start: null,
    current: null
  };

  let suppressPlaceAfterClickRemove = false;
  let pointerStart = null;

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  function updateThemeButton() {
    const theme = currentTheme();

    const label = theme === "dark"
      ? "Включить светлую тему"
      : "Включить темную тему";

    themeBtn.setAttribute("aria-label", label);
    themeBtn.setAttribute("title", label);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);

    try {
      localStorage.setItem("shikaku-theme", theme);
    } catch (error) {
      // Если хранилище недоступно, тема просто не сохраняется.
    }

    updateThemeButton();
    draw();
  }

  function themePalette() {
    const theme = currentTheme();

    if (theme === "light") {
      return {
        board: "#ffffff",
        checker: "rgba(148, 163, 184, 0.08)",
        grid: "rgba(15, 23, 42, 0.12)",
        border: "rgba(15, 23, 42, 0.16)",
        clueText: "#0f172a",
        clueHalo: "rgba(255, 255, 255, 0.78)",
        placedFill: (hue) => `hsl(${hue}, 82%, 86%)`,
        placedStroke: (hue) => `hsl(${hue}, 45%, 50%)`,
        validFill: "rgba(34, 197, 94, 0.22)",
        validStroke: "rgba(34, 197, 94, 0.85)",
        invalidFill: "rgba(239, 68, 68, 0.22)",
        invalidStroke: "rgba(239, 68, 68, 0.85)",
        solved: "rgba(34, 197, 94, 0.65)"
      };
    }

    return {
      board: "#0b1220",
      checker: "rgba(148, 163, 184, 0.06)",
      grid: "rgba(148, 163, 184, 0.16)",
      border: "rgba(148, 163, 184, 0.24)",
      clueText: "#f8fafc",
      clueHalo: "rgba(2, 6, 23, 0.55)",
      placedFill: (hue) => `hsl(${hue}, 50%, 26%)`,
      placedStroke: (hue) => `hsl(${hue}, 75%, 62%)`,
      validFill: "rgba(34, 197, 94, 0.20)",
      validStroke: "rgba(34, 197, 94, 0.85)",
      invalidFill: "rgba(239, 68, 68, 0.22)",
      invalidStroke: "rgba(239, 68, 68, 0.85)",
      solved: "rgba(34, 197, 94, 0.62)"
    };
  }

  function rectArea(rect) {
    return (rect.r2 - rect.r1 + 1) * (rect.c2 - rect.c1 + 1);
  }

  function clonePuzzle(source) {
    return {
      rows: source.rows,
      cols: source.cols,
      clues: source.clues.map((clue) => ({ ...clue }))
    };
  }

  function buildClueGrid() {
    clueGrid = Array.from(
      { length: puzzle.rows },
      () => Array(puzzle.cols).fill(null)
    );

    for (const clue of puzzle.clues) {
      clueGrid[clue.r][clue.c] = clue.value;
    }
  }

  function makeEmptyBoard() {
    return Array.from(
      { length: puzzle.rows },
      () => Array(puzzle.cols).fill(null)
    );
  }

  function rebuildBoard() {
    board = makeEmptyBoard();

    for (const rect of rects) {
      for (let r = rect.r1; r <= rect.r2; r++) {
        for (let c = rect.c1; c <= rect.c2; c++) {
          board[r][c] = rect.id;
        }
      }
    }
  }

  function setupCanvas() {
    const wrap = canvas.parentElement;
    const availableWidth = Math.max(220, wrap.clientWidth || 520);

    cellSize = Math.max(
      26,
      Math.min(60, Math.floor(availableWidth / puzzle.cols))
    );

    logicalW = puzzle.cols * cellSize;
    logicalH = puzzle.rows * cellSize;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = logicalW * dpr;
    canvas.height = logicalH * dpr;

    canvas.style.width = "100%";
    canvas.style.maxWidth = logicalW + "px";
    canvas.style.height = "auto";
    canvas.style.aspectRatio = `${puzzle.cols} / ${puzzle.rows}`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function loadPuzzle(source) {
    puzzle = clonePuzzle(source);
    buildClueGrid();
    board = makeEmptyBoard();
    rects = [];
    history = [];
    nextId = 1;

    drawing.active = false;
    drawing.start = null;
    drawing.current = null;

    suppressPlaceAfterClickRemove = false;
    pointerStart = null;

    setupCanvas();
    updateStatus();
    draw();
  }

  function pushHistory() {
    history.push({
      rects: rects.map((rect) => ({ ...rect })),
      nextId
    });

    if (history.length > 100) {
      history.shift();
    }
  }

  function undo() {
    if (!history.length) return;

    const snapshot = history.pop();
    rects = snapshot.rects;
    nextId = snapshot.nextId;

    rebuildBoard();

    drawing.active = false;
    drawing.start = null;
    drawing.current = null;
    suppressPlaceAfterClickRemove = false;
    pointerStart = null;

    updateStatus();
    draw();
  }

  function clearAll() {
    if (!rects.length) return;

    pushHistory();
    rects = [];
    rebuildBoard();

    drawing.active = false;
    drawing.start = null;
    drawing.current = null;
    suppressPlaceAfterClickRemove = false;
    pointerStart = null;

    updateStatus();
    draw();
  }

  function normalizeRect(a, b) {
    return {
      r1: Math.min(a.r, b.r),
      c1: Math.min(a.c, b.c),
      r2: Math.max(a.r, b.r),
      c2: Math.max(a.c, b.c)
    };
  }

  function isRectRuleValid(rect) {
    let clues = 0;
    let clueValue = 0;

    for (let r = rect.r1; r <= rect.r2; r++) {
      for (let c = rect.c1; c <= rect.c2; c++) {
        const value = clueGrid[r][c];

        if (value !== null) {
          clues++;
          clueValue = value;
        }
      }
    }

    return clues === 1 && rectArea(rect) === clueValue;
  }

  function canPlaceRect(rect) {
    if (
      rect.r1 < 0 ||
      rect.c1 < 0 ||
      rect.r2 >= puzzle.rows ||
      rect.c2 >= puzzle.cols ||
      rect.r1 > rect.r2 ||
      rect.c1 > rect.c2
    ) {
      return false;
    }

    for (let r = rect.r1; r <= rect.r2; r++) {
      for (let c = rect.c1; c <= rect.c2; c++) {
        if (board[r][c] !== null) {
          return false;
        }
      }
    }

    return isRectRuleValid(rect);
  }

  function filledCount() {
    let count = 0;

    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        if (board[r][c] !== null) count++;
      }
    }

    return count;
  }

  function isSolved() {
    if (filledCount() !== puzzle.rows * puzzle.cols) {
      return false;
    }

    return rects.every((rect) => isRectRuleValid(rect));
  }

  function removeRectAtCell(cell) {
    const id = board[cell.r][cell.c];

    if (id === null) return;

    pushHistory();
    rects = rects.filter((rect) => rect.id !== id);
    rebuildBoard();
    updateStatus();
  }

  function addRectFromDrawing() {
    if (!drawing.start || !drawing.current) return;

    const rect = normalizeRect(drawing.start, drawing.current);

    if (!canPlaceRect(rect)) return;

    pushHistory();

    rects.push({
      ...rect,
      id: nextId++
    });

    rebuildBoard();
    updateStatus();
  }

  function updateStatus(customMessage) {
    if (customMessage) {
      statusEl.textContent = customMessage;
      return;
    }

    if (isSolved()) {
      statusEl.textContent = "Головоломка решена.";
      return;
    }

    if (!rects.length) {
      statusEl.textContent =
        "Начните: зажмите клетку и растяните прямоугольник вокруг числа.";
      return;
    }

    const total = puzzle.rows * puzzle.cols;
    const filled = filledCount();

    statusEl.textContent = `Заполнено ${filled} из ${total} клеток.`;
  }

  function roundRectPath(x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawPlacedRect(rect, palette) {
    const x = rect.c1 * cellSize + 2;
    const y = rect.r1 * cellSize + 2;
    const w = (rect.c2 - rect.c1 + 1) * cellSize - 4;
    const h = (rect.r2 - rect.r1 + 1) * cellSize - 4;

    const hue = (rect.id * 57) % 360;

    ctx.fillStyle = palette.placedFill(hue);
    ctx.strokeStyle = palette.placedStroke(hue);
    ctx.lineWidth = 2;

    roundRectPath(x, y, w, h, 9);
    ctx.fill();
    ctx.stroke();
  }

  function drawPreviewRect(rect, palette) {
    const valid = canPlaceRect(rect);

    const x = rect.c1 * cellSize + 2;
    const y = rect.r1 * cellSize + 2;
    const w = (rect.c2 - rect.c1 + 1) * cellSize - 4;
    const h = (rect.r2 - rect.r1 + 1) * cellSize - 4;

    ctx.fillStyle = valid ? palette.validFill : palette.invalidFill;
    ctx.strokeStyle = valid ? palette.validStroke : palette.invalidStroke;

    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);

    roundRectPath(x, y, w, h, 9);
    ctx.fill();
    ctx.stroke();

    ctx.setLineDash([]);
  }

  function drawGridLines(palette) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.grid;

    for (let r = 1; r < puzzle.rows; r++) {
      const y = r * cellSize;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(logicalW, y);
      ctx.stroke();
    }

    for (let c = 1; c < puzzle.cols; c++) {
      const x = c * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, logicalH);
      ctx.stroke();
    }
  }

  function drawClues(palette) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";

    for (const clue of puzzle.clues) {
      const x = clue.c * cellSize + cellSize / 2;
      const y = clue.r * cellSize + cellSize / 2;

      const fontSize = Math.max(
        10,
        Math.floor(cellSize * (clue.value >= 10 ? 0.30 : 0.38))
      );

      ctx.font = `700 ${fontSize}px system-ui, sans-serif`;

      ctx.lineWidth = 4;
      ctx.strokeStyle = palette.clueHalo;
      ctx.strokeText(clue.value, x, y);

      ctx.fillStyle = palette.clueText;
      ctx.fillText(clue.value, x, y);
    }
  }

  function draw() {
    const palette = themePalette();

    ctx.clearRect(0, 0, logicalW, logicalH);

    ctx.save();

    roundRectPath(0, 0, logicalW, logicalH, 16);
    ctx.fillStyle = palette.board;
    ctx.fill();
    ctx.clip();

    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = palette.checker;
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }

    for (const rect of rects) {
      drawPlacedRect(rect, palette);
    }

    if (drawing.active && drawing.start && drawing.current) {
      const previewRect = normalizeRect(drawing.start, drawing.current);
      drawPreviewRect(previewRect, palette);
    }

    drawGridLines(palette);
    drawClues(palette);

    ctx.restore();

    ctx.lineWidth = 2;
    ctx.strokeStyle = palette.border;
    roundRectPath(1, 1, logicalW - 2, logicalH - 2, 15);
    ctx.stroke();

    if (isSolved()) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = palette.solved;
      roundRectPath(2, 2, logicalW - 4, logicalH - 4, 14);
      ctx.stroke();
    }
  }

  function eventToCell(event) {
    const bounds = canvas.getBoundingClientRect();

    if (!bounds.width || !bounds.height) return null;

    const x = (event.clientX - bounds.left) * (logicalW / bounds.width);
    const y = (event.clientY - bounds.top) * (logicalH / bounds.height);

    const r = Math.floor(y / cellSize);
    const c = Math.floor(x / cellSize);

    return {
      r: Math.max(0, Math.min(puzzle.rows - 1, r)),
      c: Math.max(0, Math.min(puzzle.cols - 1, c))
    };
  }

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();

    const cell = eventToCell(event);
    if (!cell) return;

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      // Игнорируем, если браузер не поддерживает захват указателя.
    }

    pointerStart = {
      x: event.clientX,
      y: event.clientY
    };

    suppressPlaceAfterClickRemove = board[cell.r][cell.c] !== null;

    if (suppressPlaceAfterClickRemove) {
      removeRectAtCell(cell);
    }

    drawing.active = true;
    drawing.start = cell;
    drawing.current = cell;

    draw();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!drawing.active) return;

    event.preventDefault();

    const cell = eventToCell(event);
    if (!cell) return;

    if (suppressPlaceAfterClickRemove && pointerStart) {
      const dx = event.clientX - pointerStart.x;
      const dy = event.clientY - pointerStart.y;

      if (Math.hypot(dx, dy) > 5) {
        suppressPlaceAfterClickRemove = false;
      }
    }

    drawing.current = cell;
    draw();
  });

  function finishDrawing(event) {
    if (!drawing.active) return;

    event.preventDefault();

    drawing.active = false;

    if (!suppressPlaceAfterClickRemove) {
      addRectFromDrawing();
    }

    suppressPlaceAfterClickRemove = false;
    pointerStart = null;
    drawing.start = null;
    drawing.current = null;

    draw();
  }

  canvas.addEventListener("pointerup", finishDrawing);
  canvas.addEventListener("pointercancel", finishDrawing);

  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  themeBtn.addEventListener("click", () => {
    setTheme(currentTheme() === "dark" ? "light" : "dark");
  });

  undoBtn.addEventListener("click", undo);

  clearBtn.addEventListener("click", clearAll);

  checkBtn.addEventListener("click", () => {
    if (isSolved()) {
      updateStatus("Решено. Все прямоугольники правильные.");
    } else {
      const total = puzzle.rows * puzzle.cols;
      const filled = filledCount();
      const remaining = total - filled;

      if (remaining > 0) {
        updateStatus(
          `Пока заполнено ${filled} из ${total}. Осталось клеток: ${remaining}.`
        );
      } else {
        updateStatus("Что-то не так. Проверьте прямоугольники.");
      }
    }

    draw();
  });

  function selectLevel(index) {
    const level = LEVELS[index];

    if (!level) return;

    if (level.puzzle) {
      loadPuzzle(level.puzzle);
      return;
    }

    if (level.cache) {
      loadPuzzle(level.cache);
      return;
    }

    updateStatus("Генерируем уровень...");

    setTimeout(() => {
      level.cache = generatePuzzle(
        level.rows,
        level.cols,
        mulberry32(level.seed)
      );

      loadPuzzle(level.cache);
      updateStatus("Уровень готов.");
    }, 20);
  }

  randomBtn.addEventListener("click", () => {
    updateStatus("Генерируем головоломку...");

    setTimeout(() => {
      const size = Number(sizeSelect.value);

      const generated = generatePuzzle(size, size, () => Math.random());

      loadPuzzle(generated);
      updateStatus("Новая головоломка готова.");
    }, 20);
  });

  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      undo();
    }
  });

  window.addEventListener("resize", () => {
    if (!puzzle) return;
    setupCanvas();
    draw();
  });

  LEVELS.forEach((level, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = level.name;
    levelSelect.appendChild(option);
  });

  levelSelect.addEventListener("change", () => {
    selectLevel(Number(levelSelect.value));
  });

  for (let size = 3; size <= 20; size++) {
    const option = document.createElement("option");
    option.value = size;
    option.textContent = `${size}×${size}`;

    if (size === 6) {
      option.selected = true;
    }

    sizeSelect.appendChild(option);
  }

  updateThemeButton();
  selectLevel(0);
})();