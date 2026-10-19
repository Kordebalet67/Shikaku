(() => {
  function shuffle(array, rng) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }

    return array;
  }

  function randInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  function generateLatinSquare(size, rng) {
    const symbols = shuffle(
      Array.from({ length: size }, (_, index) => index + 1),
      rng
    );

    const base = Array.from(
      { length: size },
      (_, row) =>
        Array.from(
          { length: size },
          (_, col) => symbols[(row + col) % size]
        )
    );

    const rowOrder = shuffle(
      Array.from({ length: size }, (_, index) => index),
      rng
    );

    const colOrder = shuffle(
      Array.from({ length: size }, (_, index) => index),
      rng
    );

    return rowOrder.map((row) => colOrder.map((col) => base[row][col]));
  }

  function createEmptyShaded(size) {
    return Array.from(
      { length: size },
      () => Array(size).fill(false)
    );
  }

  function hasShadedNeighbor(shaded, row, col) {
    const size = shaded.length;

    const directions = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ];

    for (const [dr, dc] of directions) {
      const r = row + dr;
      const c = col + dc;

      if (r >= 0 && r < size && c >= 0 && c < size && shaded[r][c]) {
        return true;
      }
    }

    return false;
  }

  function isUnshadedConnected(shaded) {
    const size = shaded.length;

    let start = null;
    let totalUnshaded = 0;

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!shaded[row][col]) {
          totalUnshaded++;

          if (!start) {
            start = [row, col];
          }
        }
      }
    }

    if (totalUnshaded === 0) {
      return false;
    }

    const visited = Array.from(
      { length: size },
      () => Array(size).fill(false)
    );

    const stack = [start];
    visited[start[0]][start[1]] = true;

    let count = 0;

    while (stack.length) {
      const [row, col] = stack.pop();
      count++;

      const directions = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ];

      for (const [dr, dc] of directions) {
        const r = row + dr;
        const c = col + dc;

        if (
          r >= 0 &&
          r < size &&
          c >= 0 &&
          c < size &&
          !shaded[r][c] &&
          !visited[r][c]
        ) {
          visited[r][c] = true;
          stack.push([r, c]);
        }
      }
    }

    return count === totalUnshaded;
  }

  function generateShadedMask(size, rng) {
    const total = size * size;
    const minTarget = Math.max(3, Math.floor(total * 0.12));
    const maxTarget = Math.max(minTarget, Math.floor(total * 0.22));

    for (let attempt = 0; attempt < 300; attempt++) {
      const shaded = createEmptyShaded(size);
      const indices = shuffle(
        Array.from({ length: total }, (_, index) => index),
        rng
      );

      const target = randInt(rng, minTarget, maxTarget);
      let count = 0;

      for (const index of indices) {
        if (count >= target) {
          break;
        }

        const row = Math.floor(index / size);
        const col = index % size;

        if (!hasShadedNeighbor(shaded, row, col)) {
          shaded[row][col] = true;
          count++;
        }
      }

      if (count >= minTarget && isUnshadedConnected(shaded)) {
        return shaded;
      }
    }

    const shaded = createEmptyShaded(size);

    const fallbackCandidates = [
      [0, 0],
      [0, size - 1],
      [size - 1, 0],
      [size - 1, size - 1],
      [0, Math.floor(size / 2)],
      [Math.floor(size / 2), 0],
      [size - 1, Math.floor(size / 2)],
      [Math.floor(size / 2), size - 1]
    ];

    for (const [row, col] of fallbackCandidates) {
      if (!hasShadedNeighbor(shaded, row, col)) {
        shaded[row][col] = true;
      }
    }

    return shaded;
  }

  function generateHitoriPuzzle(size, rng) {
    const base = generateLatinSquare(size, rng);
    const shadedSolution = generateShadedMask(size, rng);

    const numbers = base.map((row) => row.slice());

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!shadedSolution[row][col]) {
          continue;
        }

        const options = [];

        for (let c = 0; c < size; c++) {
          if (!shadedSolution[row][c] && c !== col) {
            options.push([row, c]);
          }
        }

        for (let r = 0; r < size; r++) {
          if (!shadedSolution[r][col] && r !== row) {
            options.push([r, col]);
          }
        }

        if (options.length) {
          const target = options[Math.floor(rng() * options.length)];
          numbers[row][col] = base[target[0]][target[1]];
        }
      }
    }

    return {
      size,
      numbers,
      shadedSolution
    };
  }

  function hasAdjacentShaded(shaded) {
    const size = shaded.length;

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!shaded[row][col]) {
          continue;
        }

        if (row + 1 < size && shaded[row + 1][col]) {
          return true;
        }

        if (col + 1 < size && shaded[row][col + 1]) {
          return true;
        }
      }
    }

    return false;
  }

  function hasUnshadedDuplicates(numbers, shaded) {
    const size = numbers.length;

    for (let row = 0; row < size; row++) {
      const seen = new Set();

      for (let col = 0; col < size; col++) {
        if (shaded[row][col]) {
          continue;
        }

        const value = numbers[row][col];

        if (seen.has(value)) {
          return true;
        }

        seen.add(value);
      }
    }

    for (let col = 0; col < size; col++) {
      const seen = new Set();

      for (let row = 0; row < size; row++) {
        if (shaded[row][col]) {
          continue;
        }

        const value = numbers[row][col];

        if (seen.has(value)) {
          return true;
        }

        seen.add(value);
      }
    }

    return false;
  }

  function isHitoriSolved(numbers, shaded) {
    if (hasAdjacentShaded(shaded)) {
      return false;
    }

    if (!isUnshadedConnected(shaded)) {
      return false;
    }

    if (hasUnshadedDuplicates(numbers, shaded)) {
      return false;
    }

    return true;
  }

  function createHitoriGame(container) {
    container.classList.add("hitori");

    container.innerHTML = `
      <div class="hitori-toolbar">
        <select class="hitori-size" aria-label="Размер поля">
          <option value="5">5×5</option>
          <option value="6" selected>6×6</option>
          <option value="7">7×7</option>
          <option value="8">8×8</option>
        </select>

        <button class="hitori-new" type="button">Новая игра</button>
        <button class="hitori-check" type="button">Проверить</button>
        <button class="hitori-clear" type="button">Очистить</button>
      </div>

      <div class="hitori-board"></div>
      <div class="hitori-status"></div>
    `;

    const boardEl = container.querySelector(".hitori-board");
    const statusEl = container.querySelector(".hitori-status");
    const sizeSelect = container.querySelector(".hitori-size");
    const newBtn = container.querySelector(".hitori-new");
    const checkBtn = container.querySelector(".hitori-check");
    const clearBtn = container.querySelector(".hitori-clear");

    let puzzle = null;
    let shaded = [];
    let marked = [];
    let cellButtons = [];

    function setStatus(text) {
      statusEl.textContent = text;
    }

    function createState(size) {
      shaded = createEmptyShaded(size);
      marked = createEmptyShaded(size);
    }

    function updateCell(row, col) {
      const button = cellButtons[row]?.[col];

      if (!button) {
        return;
      }

      button.classList.toggle("shaded", shaded[row][col]);
      button.classList.toggle("marked", marked[row][col]);
      button.setAttribute("aria-pressed", String(shaded[row][col]));
    }

    function renderPuzzle() {
      boardEl.innerHTML = "";
      cellButtons = [];

      const table = document.createElement("table");
      table.className = "hitori-table";

      const tbody = document.createElement("tbody");

      for (let row = 0; row < puzzle.size; row++) {
        const tr = document.createElement("tr");
        const buttonRow = [];

        for (let col = 0; col < puzzle.size; col++) {
          const td = document.createElement("td");
          td.className = "hitori-td";

          const button = document.createElement("button");
          button.type = "button";
          button.className = "hitori-cell";
          button.textContent = puzzle.numbers[row][col];

          button.addEventListener("click", () => {
            shaded[row][col] = !shaded[row][col];

            if (shaded[row][col]) {
              marked[row][col] = false;
            }

            updateCell(row, col);
          });

          button.addEventListener("contextmenu", (event) => {
            event.preventDefault();

            if (!shaded[row][col]) {
              marked[row][col] = !marked[row][col];
              updateCell(row, col);
            }
          });

          buttonRow.push(button);
          td.appendChild(button);
          tr.appendChild(td);
        }

        cellButtons.push(buttonRow);
        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      boardEl.appendChild(table);

      for (let row = 0; row < puzzle.size; row++) {
        for (let col = 0; col < puzzle.size; col++) {
          updateCell(row, col);
        }
      }
    }

    function newGame() {
      setStatus("Генерация...");

      setTimeout(() => {
        const size = Number(sizeSelect.value);
        const rng = () => Math.random();

        puzzle = generateHitoriPuzzle(size, rng);
        createState(size);
        renderPuzzle();

        setStatus("Новая игра готова.");
      }, 20);
    }

    function check() {
      if (!puzzle) {
        return;
      }

      if (isHitoriSolved(puzzle.numbers, shaded)) {
        setStatus("Решено.");
        return;
      }

      if (hasAdjacentShaded(shaded)) {
        setStatus("Затененные клетки не должны соседствовать.");
        return;
      }

      if (hasUnshadedDuplicates(puzzle.numbers, shaded)) {
        setStatus("Есть повторяющиеся числа в незатененных клетках.");
        return;
      }

      if (!isUnshadedConnected(shaded)) {
        setStatus("Незатененные клетки должны быть связаны.");
        return;
      }

      setStatus("Есть ошибка.");
    }

    function clear() {
      if (!puzzle) {
        return;
      }

      createState(puzzle.size);

      for (let row = 0; row < puzzle.size; row++) {
        for (let col = 0; col < puzzle.size; col++) {
          updateCell(row, col);
        }
      }

      setStatus("Поле очищено.");
    }

    newBtn.addEventListener("click", newGame);
    checkBtn.addEventListener("click", check);
    clearBtn.addEventListener("click", clear);

    newGame();

    return {
      newGame,
      check,
      clear
    };
  }

  window.HitoriGame = {
    create: createHitoriGame
  };

  function autoInit() {
    const container = document.getElementById("hitori");

    if (container) {
      window.hitoriGame = createHitoriGame(container);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
})();