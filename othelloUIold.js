import othelloCore from "./othelloCore.js"

const othelloUI = (() => {
  const config = {
    firstPlayer: 'human', // 'human' or 'ai'
    difficulty: 'hard', // 'noob', 'easy', 'medium', 'hard'
    showHints: true
  };

  const elements = {
    board: document.getElementById('othello-board'),
    blackScore: document.getElementById('black-score'),
    whiteScore: document.getElementById('white-score'),
    status: document.getElementById('othello-status'),
    currentPlayer: document.getElementById('current-player'),
    newGameBtn: document.getElementById('new-game-btn'),
    showHintsToggle: document.getElementById('show-hints'),
    modal: document.getElementById('new-game-modal'),
    playerOptions: document.querySelectorAll('.option-card[data-player]'),
    difficultyOptions: document.querySelectorAll('.difficulty-card[data-difficulty]'),
    cancelBtn: document.getElementById('cancel-new-game'),
    startBtn: document.getElementById('start-new-game'),
    cellMap: {}
  };

  function initUI() {
    createBoardUI();
    setupEventListeners();
    config.showHints = elements.showHintsToggle.checked;
  };

  function createBoardUI() {
    elements.board.innerHTML = '';
    othelloCore.iterateBoard((row, col)=> {
      const cell = document.createElement('div');
      cell.classList.add('othello-cell');
      cell.dataset.row = row;
      cell.dataset.col = col;
      elements.board.appendChild(cell);
      elements.cellMap[`${row},${col}`] = cell;
    });
  }

  function setupEventListeners() {
    elements.board.addEventListener('click', handleBoardClick);
    elements.newGameBtn.addEventListener('click', showNewGameModal);
    elements.showHintsToggle.addEventListener('change', (e) => {
      config.showHints = e.target.checked;
      othelloController.updateHints();
    });
    elements.cancelBtn.addEventListener('click', hideNewGameModal);
    elements.startBtn.addEventListener('click', handleNewGameStart);
    elements.playerOptions.forEach(option => {
      option.addEventListener('click', () => {
        elements.playerOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        config.firstPlayer = option.dataset.player;
      });
    });
    elements.difficultyOptions.forEach(option => {
      option.addEventListener('click', () => {
        elements.difficultyOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        config.difficulty = option.dataset.difficulty;
      });
    });
  };

  function handleBoardClick(e) {
    const cell = e.target.closest('.othello-cell');
    if (!cell) return;
    const row = +cell.dataset.row;
    const col = +cell.dataset.col;
    othelloController.handleMove(row, col);
  }

  function showNewGameModal() {
    elements.modal.style.display = 'flex';
  }

  function hideNewGameModal() {
    elements.modal.style.display = 'none';
  }

  function handleNewGameStart() {
    hideNewGameModal();
    othelloController.startNewGame(config.firstPlayer, config.difficulty);
  }

  function updateBoard(board) {
    othelloCore.iterateBoard((row, col) => {
      const currentCell = board[row][col];
      const cell = elements.cellMap[`${row},${col}`];
      cell.classList.toggle('black', currentCell === othelloCore.PLAYER_BLACK);
      cell.classList.toggle('white', currentCell === othelloCore.PLAYER_WHITE);
    });
  };

  function updateValidMoves(validMoves) {
    document.querySelectorAll('.othello-cell.valid-move').forEach(cell => {
      cell.classList.remove('valid-move');
    });
    if (!config.showHints) return;
    validMoves.forEach(([row, col]) => {
      const cell = elements.cellMap[`${row},${col}`];
      cell.classList.add('valid-move');
    });
  }

  function updateScores(blackCount, whiteCount) {
    elements.blackScore.textContent = blackCount;
    elements.whiteScore.textContent = whiteCount;
  }

  function updateCurrentPlayer(player) {
    elements.currentPlayer.classList.remove('black', 'white');
    if (player === othelloCore.PLAYER_BLACK) {
        elements.currentPlayer.classList.add('black');
        elements.currentPlayer.textContent = 'Tour: Noir';
    } else if (player === othelloCore.PLAYER_WHITE) {
        elements.currentPlayer.classList.add('white');
        elements.currentPlayer.textContent = 'Tour: Blanc';
    } else {
        elements.currentPlayer.textContent = 'Partie terminée';
    }
  }

  function updateStatus(message) {
    elements.status.textContent = message;
  }

  return {
    initUI,
    updateBoard,
    updateValidMoves,
    updateScores,
    updateCurrentPlayer,
    updateStatus,
    getConfig: () => ({ ...config })
  };
})();

const othelloController = (() => {
  let gameState;
  let humanPlayer = othelloCore.PLAYER_BLACK;
  let aiPlayer = othelloCore.PLAYER_WHITE;

  function init() {
    othelloUI.initUI();
    gameState = othelloCore.createNewGame();
    refreshUI();
  };

  function startNewGame(firstPlayer, difficulty) {
    gameState = othelloCore.createNewGame();
    humanPlayer = firstPlayer === 'human' ? othelloCore.PLAYER_BLACK : othelloCore.PLAYER_WHITE;
    aiPlayer = firstPlayer === 'human' ? othelloCore.PLAYER_WHITE : othelloCore.PLAYER_BLACK;
    refreshUI();
    if (gameState.currentPlayer === aiPlayer) makeAIMove();
  };

  function handleMove(row, col) {
    if (gameState.currentPlayer !== humanPlayer || gameState.isGameOver) {
      return;
    } // If it's not human's turn or game is over, ignore
    const newState = othelloCore.makeMove(gameState, row, col); // Make the move
    if (newState === gameState) {
      return;
    } // If the state didn't change, the move was invalid
    gameState = newState; // Update the game state
    refreshUI();
    if (gameState.isGameOver) {
      endGame();
      return;
    }
    if (gameState.currentPlayer === aiPlayer) {
        setTimeout(makeAIMove, 800);
      };
    }

  function makeAIMove() {
    const config = othelloUI.getConfig();
    const move = othelloCore.findBestMove(gameState, config.difficulty);
    if (move) {
      const [row, col] = move;
      gameState = othelloCore.makeMove(gameState, row, col); // Make the move
      refreshUI();
      if (gameState.isGameOver) {
        endGame();
        return;
      }
      if (gameState.currentPlayer === aiPlayer) {
        othelloUI.updateStatus("Pas de coup valide pour vous, l'IA joue à nouveau");
          setTimeout(makeAIMove, 800);
      }
    }
  }

  function updateHints() {
    if (gameState.isGameOver) return;
    const validMoves = othelloCore.getAllValidMoves(gameState.board, gameState.currentPlayer);
    othelloUI.updateValidMoves(validMoves);
  }

  function refreshUI() {
    requestAnimationFrame(() => {
      othelloUI.updateBoard(gameState.board);
      const { blackCount, whiteCount } = othelloCore.countPieces(gameState.board);
      othelloUI.updateScores(blackCount, whiteCount);
      othelloUI.updateCurrentPlayer(gameState.currentPlayer);
      updateHints();
      if (!gameState.isGameOver) {
        const playerColor = gameState.currentPlayer === othelloCore.PLAYER_BLACK ? "Noir" : "Blanc";
        const playerType = gameState.currentPlayer === humanPlayer ? "Vous" : "IA";
        othelloUI.updateStatus(`Au tour du joueur ${playerColor} (${playerType})`);
      }
    });
  }

  function endGame() {
    const { winner, blackCount, whiteCount } = othelloCore.getGameResult(gameState.board);
    let message;
    if (winner === othelloCore.PLAYER_BLACK) {
      const playerType = winner === humanPlayer ? "You" : "AI";
      message = `Game Over ! Black (${playerType}) wins ${blackCount} to ${whiteCount}`;
    } else if (winner === othelloCore.PLAYER_WHITE) {
      const playerType = winner === humanPlayer ? "YOU" : "AI";
      message = `Game Over ! White (${playerType}) wins ${whiteCount} to ${blackCount}`;
    } else {
      message = `Game Over ! Draw ${blackCount} to ${whiteCount}`;
    }
    othelloUI.updateStatus(message);
  }

  return {
    init,
    startNewGame,
    handleMove,
    updateHints
  };
})();

window.addEventListener('DOMContentLoaded', othelloController.init);
