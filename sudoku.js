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

  function createEmptyBoard() {
    return Array(81).fill(0);
  }

  function cloneBoard(board) {
    return board.slice();
  }

  function isValidValue(board, index, value) {
    const row = Math.floor(index / 9);
    const col = index % 9;

    for (let i = 0; i < 9; i++) {
      if (board[row * 9 + i] === value) {
        return false;
      }

      if (board[i * 9 + col] === value) {
        return false;
      }
    }

    const boxRow = row - (row % 3);
    const boxCol = col - (col % 3);

    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (board[r * 9 + c] === value) {
          return false;
        }
      }
    }

    return true;
  }

  function solveBoard(board, rng) {
    const emptyIndex = board.indexOf(0);

    if (emptyIndex === -1) {
      return true;
    }

    let candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    if (rng) {
      candidates = shuffle(candidates.slice(), rng);
    }

    for (const value of candidates) {
      if (isValidValue(board, emptyIndex, value)) {
        board[emptyIndex] = value;

        if (solveBoard(board, rng)) {
          return true;
        }

        board[emptyIndex] = 0;
      }
    }

    return false;
  }

  function countSolutions(board, limit = 2, maxNodes = 30000) {
    const work = cloneBoard(board);
    const totalCells = 81;

    let count = 0;
    let nodes = 0;
    let aborted = false;

    function search() {
      if (aborted || count >= limit) {
        return;
      }

      nodes++;

      if (nodes > maxNodes) {
        aborted = true;
        return;
      }

      const emptyIndex = work.indexOf(0);

      if (emptyIndex === -1) {
        count++;
        return;
      }

      for (let value = 1; value <= 9; value++) {
        if (isValidValue(work, emptyIndex, value)) {
          work[emptyIndex] = value;
          search();
          work[emptyIndex] = 0;

          if (aborted || count >= limit) {
            return;
          }
        }
      }
    }

    search();

    return aborted ? limit : count;
  }

  function generateFullBoard(rng) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const board = createEmptyBoard();
      const boxStarts = [0, 30, 60];

      for (const start of boxStarts) {
        const values = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng);
        const startRow = Math.floor(start / 9);
        const startCol = start % 9;

        for (let i = 0; i < 9; i++) {
          const row = startRow + Math.floor(i / 3);
          const col = startCol + (i % 3);
          board[row * 9 + col] = values[i];
        }
      }

      if (solveBoard(board, rng)) {
        return board;
      }
    }

    return createEmptyBoard();
  }

  function generatePuzzle(difficulty, rng) {
    const solution = generateFullBoard(rng);
    const puzzle = cloneBoard(solution);

    const targetCluesByDifficulty = {
      easy: 40,
      medium: 34,
      hard: 30
    };

    const targetClues = targetCluesByDifficulty[difficulty] || 36;
    const indices = shuffle(
      Array.from({ length: 81 }, (_, index) => index),
      rng
    );

    let clues = 81;

    for (const index of indices) {
      if (clues <= targetClues) {
        break;
      }

      const backup = puzzle[index];

      if (backup === 0) {
        continue;
      }

      puzzle[index] = 0;

      const solutions = countSolutions(puzzle, 2, 30000);

      if (solutions === 1) {
        clues--;
      } else {
        puzzle[index] = backup;
      }
    }

    return {
      puzzle,
      solution
    };
  }

  function isBoardValid(board) {
    for (let index = 0; index < 81; index++) {
      const value = board[index];

      if (!value) {
        return false;
      }

      board[index] = 0;
      const valid = isValidValue(board, index, value);
      board[index] = value;

      if (!valid) {
        return false;
      }
    }

    return true;
  }

  function createSudokuGame(container) {
    container.classList.add("sudoku");

    container.innerHTML = `
      <div class="sudoku-toolbar">
        <select class="sudoku-difficulty" aria-label="Сложность">
          <option value="easy">Легко</option>
          <option value="medium" selected>Средне</option>
          <option value="hard">Сложно</option>
        </select>

        <button class="sudoku-new" type="button">Новая игра</button>
        <button class="sudoku-check" type="button">Проверить</button>
        <button class="sudoku-clear" type="button">Очистить</button>
      </div>

      <div class="sudoku-board"></div>
      <div class="sudoku-status"></div>
    `;

    const boardEl = container.querySelector(".sudoku-board");
    const statusEl = container.querySelector(".sudoku-status");
    const difficultySelect = container.querySelector(".sudoku-difficulty");
    const newBtn = container.querySelector(".sudoku-new");
    const checkBtn = container.querySelector(".sudoku-check");
    const clearBtn = container.querySelector(".sudoku-clear");

    let inputs = [];
    let givens = Array(81).fill(false);

    function setStatus(text) {
      statusEl.textContent = text;
    }

    function createBoardInputs() {
      boardEl.innerHTML = "";
      inputs = [];

      for (let index = 0; index < 81; index++) {
        const input = document.createElement("input");

        input.className = "sudoku-cell";
        input.type = "text";
        input.inputMode = "numeric";
        input.maxLength = 1;
        input.dataset.index = index;

        input.addEventListener("input", () => {
          input.value = input.value.replace(/[^1-9]/g, "").slice(0, 1);
        });

        inputs.push(input);
        boardEl.appendChild(input);
      }
    }

    function renderBoard(board) {
      givens = board.map((value) => value !== 0);

      inputs.forEach((input, index) => {
        const value = board[index];

        input.value = value === 0 ? "" : String(value);
        input.readOnly = givens[index];

        input.classList.toggle("given", givens[index]);
        input.classList.toggle("empty", !givens[index]);
      });
    }

    function getBoardFromInputs() {
      const board = Array(81).fill(0);

      inputs.forEach((input, index) => {
        if (input.value) {
          board[index] = Number(input.value);
        }
      });

      return board;
    }

    function newGame() {
      setStatus("Генерация...");

      setTimeout(() => {
        const rng = () => Math.random();
        const difficulty = difficultySelect.value;
        const generated = generatePuzzle(difficulty, rng);

        renderBoard(generated.puzzle);
        setStatus("Новая игра готова.");
      }, 20);
    }

    function check() {
      const board = getBoardFromInputs();
      const filled = board.filter((value) => value !== 0).length;

      if (filled < 81) {
        setStatus(`Заполнено ${filled} из 81.`);
        return;
      }

      if (isBoardValid(board)) {
        setStatus("Решено.");
      } else {
        setStatus("Есть ошибки.");
      }
    }

    function clear() {
      inputs.forEach((input, index) => {
        if (!givens[index]) {
          input.value = "";
        }
      });

      setStatus("Поле очищено.");
    }

    createBoardInputs();

    newBtn.addEventListener("click", newGame);
    checkBtn.addEventListener("click", check);
    clearBtn.addEventListener("click", clear);

    newGame();

    return {
      newGame,
      check,
      clear,
      getBoardFromInputs
    };
  }

  window.SudokuGame = {
    create: createSudokuGame
  };

  function autoInit() {
    const container = document.getElementById("sudoku");

    if (container) {
      window.sudokuGame = createSudokuGame(container);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }
})();