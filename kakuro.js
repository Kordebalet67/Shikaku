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

  function generateKakuroPuzzle(size, rng) {
    const latin = generateLatinSquare(size, rng);

    const rows = size + 2;
    const cols = size + 2;

    const cells = Array.from(
      { length: rows },
      () =>
        Array.from(
          { length: cols },
          () => ({ type: "block" })
        )
    );

    const runs = [];

    for (let col = 0; col < size; col++) {
      let sum = 0;
      const runCells = [];

      for (let row = 0; row < size; row++) {
        sum += latin[row][col];
        runCells.push([row + 1, col + 1]);
      }

      cells[0][col + 1] = {
        type: "block",
        down: sum
      };

      runs.push({
        direction: "down",
        sum,
        cells: runCells
      });
    }

    for (let row = 0; row < size; row++) {
      let sum = 0;
      const runCells = [];

      for (let col = 0; col < size; col++) {
        sum += latin[row][col];
        runCells.push([row + 1, col + 1]);
      }

      cells[row + 1][0] = {
        type: "block",
        across: sum
      };

      runs.push({
        direction: "across",
        sum,
        cells: runCells
      });
    }

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        cells[row + 1][col + 1] = {
          type: "answer"
        };
      }
    }

    return {
      rows,
      cols,
      cells,
      runs
    };
  }

  function createKakuroGame(container) {
    container.classList.add("kakuro");

    container.innerHTML = `
      <div class="kakuro-toolbar">
        <select class="kakuro-size" aria-label="Размер поля">
          <option value="3">3×3</option>
          <option value="4">4×4</option>
          <option value="5" selected>5×5</option>
          <option value="6">6×6</option>
          <option value="7">7×7</option>
        </select>

        <button class="kakuro-new" type="button">Новая игра</button>
        <button class="kakuro-check" type="button">Проверить</button>
        <button class="kakuro-clear" type="button">Очистить</button>
      </div>

      <div class="kakuro-board"></div>
      <div class="kakuro-status"></div>
    `;

    const boardEl = container.querySelector(".kakuro-board");
    const statusEl = container.querySelector(".kakuro-status");
    const sizeSelect = container.querySelector(".kakuro-size");
    const newBtn = container.querySelector(".kakuro-new");
    const checkBtn = container.querySelector(".kakuro-check");
    const clearBtn = container.querySelector(".kakuro-clear");

    let puzzle = null;
    let inputGrid = [];
    let answerCount = 0;

    function setStatus(text) {
      statusEl.textContent = text;
    }

    function createClueContent(cell) {
      const clue = document.createElement("div");
      clue.className = "kakuro-clue";

      if (typeof cell.across === "number") {
        const across = document.createElement("span");
        across.className = "kakuro-clue-across";
        across.textContent = cell.across;
        across.title = "Сумма по горизонтали";
        clue.appendChild(across);
      }

      if (typeof cell.down === "number") {
        const down = document.createElement("span");
        down.className = "kakuro-clue-down";
        down.textContent = cell.down;
        down.title = "Сумма по вертикали";
        clue.appendChild(down);
      }

      return clue;
    }

    function renderPuzzle() {
      boardEl.innerHTML = "";
      inputGrid = [];
      answerCount = 0;

      const table = document.createElement("table");
      table.className = "kakuro-table";

      const tbody = document.createElement("tbody");

      for (let row = 0; row < puzzle.rows; row++) {
        const tr = document.createElement("tr");
        const inputRow = [];

        for (let col = 0; col < puzzle.cols; col++) {
          const cell = puzzle.cells[row][col];
          const td = document.createElement("td");

          td.className = "kakuro-td";

          if (cell.type === "answer") {
            td.classList.add("kakuro-answer");

            const input = document.createElement("input");

            input.className = "kakuro-cell";
            input.type = "text";
            input.inputMode = "numeric";
            input.maxLength = 1;
            input.dataset.row = row;
            input.dataset.col = col;

            input.addEventListener("input", () => {
              input.value = input.value.replace(/[^1-9]/g, "").slice(0, 1);
            });

            inputGrid[row] = inputGrid[row] || [];
            inputGrid[row][col] = input;
            td.appendChild(input);

            answerCount++;
          } else {
            td.classList.add("kakuro-block");
            td.appendChild(createClueContent(cell));
            inputGrid[row] = inputGrid[row] || [];
            inputGrid[row][col] = null;
          }

          tr.appendChild(td);
        }

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      boardEl.appendChild(table);
    }

    function getFilledCount() {
      let filled = 0;

      for (let row = 0; row < puzzle.rows; row++) {
        for (let col = 0; col < puzzle.cols; col++) {
          const input = inputGrid[row]?.[col];

          if (input && input.value) {
            filled++;
          }
        }
      }

      return filled;
    }

    function check() {
      if (!puzzle) {
        return;
      }

      const filled = getFilledCount();
      let hasError = false;
      let allRunsComplete = true;

      for (const run of puzzle.runs) {
        const values = [];

        for (const [row, col] of run.cells) {
          const input = inputGrid[row]?.[col];

          if (!input || input.value === "") {
            allRunsComplete = false;
          } else {
            values.push(Number(input.value));
          }
        }

        if (values.length === 0) {
          continue;
        }

        const uniqueValues = new Set(values);

        if (uniqueValues.size !== values.length) {
          hasError = true;
        }

        const sum = values.reduce((acc, value) => acc + value, 0);

        if (sum > run.sum) {
          hasError = true;
        }

        if (values.length === run.cells.length && sum !== run.sum) {
          hasError = true;
        }
      }

      if (hasError) {
        setStatus("Есть ошибки.");
        return;
      }

      if (!allRunsComplete) {
        setStatus(`Заполнено ${filled} из ${answerCount}.`);
        return;
      }

      setStatus("Решено.");
    }

    function clear() {
      for (let row = 0; row < puzzle.rows; row++) {
        for (let col = 0; col < puzzle.cols; col++) {
          const input = inputGrid[row]?.[col];

          if (input) {
            input.value = "";
          }
        }
      }

      setStatus("Поле очищено.");
    }

    function newGame() {
      setStatus("Генерация...");

      setTimeout(() => {
        const size = Number(sizeSelect.value);
        const rng = () => Math.random();

        puzzle = generateKakuroPuzzle(size, rng);
        renderPuzzle();

        setStatus("Новая игра готова.");
      }, 20);
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

  window.KakuroGame = {
    create: createKakuroGame
  };

  function autoInit() {
    const container = document.getElementById("kakuro");

    if (container) {
      window.kakuroGame = createKakuroGame(container);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
})();