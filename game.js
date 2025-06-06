// Domain Layer - Entities et Value Objects
const CellType = {
    WALL: 'wall',
    FLOOR: 'floor',
    TARGET: 'target',
    BOX: 'box',
    PLAYER: 'player'
};

const Direction = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
};

// Value Objects
const Position = (x, y) => ({ x, y });

const Cell = (type, position) => ({
    type,
    position,
    hasTarget: false,
    hasBox: false,
    hasPlayer: false
});

const GameState = (board, playerPosition, moves, level, isComplete, targets) => ({
    board,
    playerPosition,
    moves,
    level,
    isComplete: isComplete || false,
    targets: targets || []
});

// Domain Services
const PositionService = {
    add: (pos1, pos2) => Position(pos1.x + pos2.x, pos1.y + pos2.y),
    equals: (pos1, pos2) => pos1.x === pos2.x && pos1.y === pos2.y,
    isValid: (position, boardSize) =>
        position.x >= 0 && position.x < boardSize.width &&
        position.y >= 0 && position.y < boardSize.height
};

const BoardService = {
    getCellAt: (board, position) => {
        if (!board[position.y] || !board[position.y][position.x]) return null;
        return board[position.y][position.x];
    },

    setCellAt: (board, position, cell) => {
        const newBoard = board.map(row => [...row]);
        newBoard[position.y][position.x] = { ...cell };
        return newBoard;
    },

    findPlayerPosition: (board) => {
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
                if (board[y][x].hasPlayer) {
                    return Position(x, y);
                }
            }
        }
        return null;
    },

    findAllTargets: (board) => {
        const targets = [];
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
                if (board[y][x].hasTarget) {
                    targets.push(Position(x, y));
                }
            }
        }
        return targets;
    },

    isLevelComplete: (board, targets) => {
        // Vérifier que toutes les cibles ont une caisse
        for (let target of targets) {
            const cell = BoardService.getCellAt(board, target);
            if (!cell || !cell.hasBox) {
                return false;
            }
        }
        return targets.length > 0; // Il faut au moins une cible pour gagner
    },

    countBoxesOnTargets: (board, targets) => {
        let count = 0;
        for (let target of targets) {
            const cell = BoardService.getCellAt(board, target);
            if (cell && cell.hasBox) {
                count++;
            }
        }
        return count;
    }
};

// Application Layer - Use Cases
const MovePlayerUseCase = {
    execute: (gameState, direction) => {
        if (gameState.isComplete) return gameState;

        const currentPos = gameState.playerPosition;
        const newPos = PositionService.add(currentPos, direction);
        const targetCell = BoardService.getCellAt(gameState.board, newPos);

        if (!targetCell || targetCell.type === CellType.WALL) {
            return gameState;
        }

        if (targetCell.hasBox) {
            const boxNewPos = PositionService.add(newPos, direction);
            const boxTargetCell = BoardService.getCellAt(gameState.board, boxNewPos);

            if (!boxTargetCell || boxTargetCell.type === CellType.WALL || boxTargetCell.hasBox) {
                return gameState;
            }

            // Move box
            let newBoard = BoardService.setCellAt(gameState.board, newPos, {
                ...targetCell,
                hasBox: false
            });

            newBoard = BoardService.setCellAt(newBoard, boxNewPos, {
                ...boxTargetCell,
                hasBox: true
            });

            // Move player
            newBoard = BoardService.setCellAt(newBoard, currentPos, {
                ...BoardService.getCellAt(newBoard, currentPos),
                hasPlayer: false
            });

            newBoard = BoardService.setCellAt(newBoard, newPos, {
                ...BoardService.getCellAt(newBoard, newPos),
                hasPlayer: true
            });

            const isComplete = BoardService.isLevelComplete(newBoard, gameState.targets);

            return GameState(newBoard, newPos, gameState.moves + 1, gameState.level, isComplete, gameState.targets);
        }

        // Simple move
        let newBoard = BoardService.setCellAt(gameState.board, currentPos, {
            ...BoardService.getCellAt(gameState.board, currentPos),
            hasPlayer: false
        });

        newBoard = BoardService.setCellAt(newBoard, newPos, {
            ...targetCell,
            hasPlayer: true
        });

        const isComplete = BoardService.isLevelComplete(newBoard, gameState.targets);

        return GameState(newBoard, newPos, gameState.moves + 1, gameState.level, isComplete, gameState.targets);
    }
};

const LoadLevelUseCase = {
    execute: (levelNumber) => {
        const levelData = LevelRepository.getLevel(levelNumber);
        if (!levelData) return null;

        const board = levelData.map((row, y) =>
            row.split('').map((char, x) => {
                const position = Position(x, y);
                let cell = Cell(CellType.FLOOR, position);

                switch (char) {
                    case '#':
                        cell = Cell(CellType.WALL, position);
                        break;
                    case '.':
                        cell.hasTarget = true;
                        break;
                    case '$':
                        cell.hasBox = true;
                        break;
                    case '@':
                        cell.hasPlayer = true;
                        break;
                    case '*':
                        cell.hasBox = true;
                        cell.hasTarget = true;
                        break;
                    case '+':
                        cell.hasPlayer = true;
                        cell.hasTarget = true;
                        break;
                }

                return cell;
            })
        );

        const playerPosition = BoardService.findPlayerPosition(board);
        const targets = BoardService.findAllTargets(board);

        return GameState(board, playerPosition, 0, levelNumber, false, targets);
    }
};

// Infrastructure Layer - Repositories
const LevelRepository = {
    levels: [
        [
            "########",
            "#......#",
            "#.@$.$.#",
            "#......#",
            "########"
        ],
        [
            "##########",
            "#........#",
            "#.@$..*..#",
            "#........#",
            "#.....$..#",
            "#........#",
            "##########"
        ],
        [
            "############",
            "#..........#",
            "#.@$$......#",
            "#.....**...#",
            "#..........#",
            "#..........#",
            "############"
        ],
        [
            "##############",
            "#............#",
            "#.@$$$....*..#",
            "#............#",
            "#.....*.*....#",
            "#............#",
            "#............#",
            "##############"
        ]
    ],

    getLevel: function(levelNumber) {
        return this.levels[levelNumber - 1] || null;
    },

    getTotalLevels: function() {
        return this.levels.length;
    }
};

// Presentation Layer - UI Controller
const GameController = {
    gameState: null,

    init() {
        this.loadLevel(1);
        this.setupEventListeners();
    },

    loadLevel(levelNumber) {
        const newGameState = LoadLevelUseCase.execute(levelNumber);
        if (newGameState) {
            this.gameState = newGameState;
            this.render();
            console.log(`Niveau ${levelNumber} chargé avec ${newGameState.targets.length} cibles`);
        }
    },

    movePlayer(direction) {
        if (!this.gameState || this.gameState.isComplete) return;

        const newGameState = MovePlayerUseCase.execute(this.gameState, direction);
        this.gameState = newGameState;
        this.render();

        // Debug info
        const boxesOnTargets = BoardService.countBoxesOnTargets(newGameState.board, newGameState.targets);
        console.log(`Caisses sur cibles: ${boxesOnTargets}/${newGameState.targets.length}`);

        if (newGameState.isComplete) {
            console.log('Niveau terminé !');
            setTimeout(() => this.showVictoryModal(), 300);
        }
    },

    resetLevel() {
        this.hideVictoryModal();
        this.loadLevel(this.gameState.level);
    },

    nextLevel() {
        this.hideVictoryModal();
        if (this.gameState.level < LevelRepository.getTotalLevels()) {
            this.loadLevel(this.gameState.level + 1);
        }
    },

    prevLevel() {
        this.hideVictoryModal();
        if (this.gameState.level > 1) {
            this.loadLevel(this.gameState.level - 1);
        }
    },

    render() {
        this.renderBoard();
        this.renderUI();
    },

    renderBoard() {
        const board = document.getElementById('game-board');
        const boardData = this.gameState.board;

        board.innerHTML = '';
        board.style.gridTemplateColumns = `repeat(${boardData[0].length}, 1fr)`;
        board.style.gridTemplateRows = `repeat(${boardData.length}, 1fr)`;

        boardData.forEach((row, y) => {
            row.forEach((cell, x) => {
                const cellElement = document.createElement('div');
                cellElement.className = 'cell';
                cellElement.dataset.x = x;
                cellElement.dataset.y = y;

                // Base cell type
                if (cell.type === CellType.WALL) {
                    cellElement.classList.add('wall');
                } else {
                    cellElement.classList.add('floor');
                }

                // Add additional states
                if (cell.hasTarget) {
                    cellElement.classList.add('target');
                }
                if (cell.hasBox) {
                    cellElement.classList.add('box');
                    // Si la caisse est sur une cible, ajouter une classe spéciale
                    if (cell.hasTarget) {
                        cellElement.classList.add('box-on-target');
                    }
                }
                if (cell.hasPlayer) {
                    cellElement.classList.add('player');
                }

                // Pointer events for touch interaction
                cellElement.addEventListener('pointerdown', (e) => {
                    e.preventDefault();
                    this.handleCellClick(Position(x, y));
                });

                board.appendChild(cellElement);
            });
        });
    },

    renderUI() {
        document.getElementById('level-display').textContent = this.gameState.level;
        document.getElementById('moves-display').textContent = this.gameState.moves;

        // Afficher le statut des cibles
        const boxesOnTargets = BoardService.countBoxesOnTargets(this.gameState.board, this.gameState.targets);
        const statusElement = document.getElementById('targets-status');
        if (statusElement) {
            statusElement.textContent = `${boxesOnTargets}/${this.gameState.targets.length}`;
        }
    },

    handleCellClick(clickedPosition) {
        const playerPos = this.gameState.playerPosition;
        const dx = clickedPosition.x - playerPos.x;
        const dy = clickedPosition.y - playerPos.y;

        // Only allow adjacent moves
        if (Math.abs(dx) + Math.abs(dy) === 1) {
            let direction;
            if (dx === 1) direction = Direction.RIGHT;
            else if (dx === -1) direction = Direction.LEFT;
            else if (dy === 1) direction = Direction.DOWN;
            else if (dy === -1) direction = Direction.UP;

            if (direction) {
                this.movePlayer(direction);
            }
        }
    },

    showVictoryModal() {
        document.getElementById('final-moves').textContent = this.gameState.moves;
        document.getElementById('victory-modal').classList.remove('hidden');

        // Désactiver le bouton "Niveau suivant" si c'est le dernier niveau
        const nextBtn = document.getElementById('next-level-modal');
        if (this.gameState.level >= LevelRepository.getTotalLevels()) {
            nextBtn.textContent = 'Jeu terminé !';
            nextBtn.disabled = true;
        } else {
            nextBtn.textContent = 'Niveau suivant';
            nextBtn.disabled = false;
        }
    },

    hideVictoryModal() {
        document.getElementById('victory-modal').classList.add('hidden');
    },

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.gameState.isComplete && e.key !== 'r' && e.key !== 'R') {
                return; // Empêcher les mouvements après victoire
            }

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    this.movePlayer(Direction.UP);
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    this.movePlayer(Direction.DOWN);
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    this.movePlayer(Direction.LEFT);
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    this.movePlayer(Direction.RIGHT);
                    break;
                case 'r':
                case 'R':
                    e.preventDefault();
                    this.resetLevel();
                    break;
                case 'Escape':
                    this.hideVictoryModal();
                    break;
            }
        });

        // Touch controls
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (this.gameState.isComplete) return;

                const direction = e.target.dataset.direction;
                switch (direction) {
                    case 'up':
                        this.movePlayer(Direction.UP);
                        break;
                    case 'down':
                        this.movePlayer(Direction.DOWN);
                        break;
                    case 'left':
                        this.movePlayer(Direction.LEFT);
                        break;
                    case 'right':
                        this.movePlayer(Direction.RIGHT);
                        break;
                }
            });
        });

        // UI buttons
        document.getElementById('reset-btn').addEventListener('click', () => this.resetLevel());
        document.getElementById('next-level').addEventListener('click', () => this.nextLevel());
        document.getElementById('prev-level').addEventListener('click', () => this.prevLevel());

        // Modal buttons
        document.getElementById('next-level-modal').addEventListener('click', () => {
            if (this.gameState.level < LevelRepository.getTotalLevels()) {
                this.nextLevel();
            }
        });

        document.getElementById('replay-level').addEventListener('click', () => {
            this.resetLevel();
        });

        // Fermer le modal en cliquant à l'extérieur
        document.getElementById('victory-modal').addEventListener('click', (e) => {
            if (e.target.id === 'victory-modal') {
                this.hideVictoryModal();
            }
        });

        // Prevent context menu on touch devices
        document.addEventListener('contextmenu', e => e.preventDefault());
    }
};

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    GameController.init();
});
