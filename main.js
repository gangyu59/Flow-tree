document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const context = canvas.getContext('2d');
    const startButton = document.getElementById('start-button');
    const difficultySlider = document.getElementById('difficulty-slider');
    const difficultyLabel = document.getElementById('difficulty-label');
    const messageDiv = document.getElementById('message');
    const moveCounter = document.getElementById('move-counter');
    const rulesButton = document.getElementById('rules-button');
    const modal = document.getElementById('rules-modal');
    const closeButton = document.querySelector('.close-button');

    const boardSizes = [5, 6, 7, 8, 9];
    let boardSize = boardSizes[2];
    let board = [];
    let moveCount = 0;
    let isGameActive = false;
    let selectedPath = null;

    const difficulties = ['超易', '较易', '中等', '较难', '超难'];

    difficultySlider.addEventListener('input', (event) => {
        difficultyLabel.textContent = difficulties[event.target.value - 1];
        boardSize = boardSizes[event.target.value - 1];
        initializeBoard();
        drawBoard();
    });

    startButton.addEventListener('click', () => {
        messageDiv.textContent = '';
        moveCount = 0;
        isGameActive = true;
        moveCounter.textContent = `步数 = ${moveCount}`;
        initializeBoard();
        drawBoard();
    });

    function initializeBoard() {
        board = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
        // Example for setting up pairs with colors, you should replace with a proper algorithm
        board[0][0] = { color: 'red', id: 1 };
        board[2][2] = { color: 'red', id: 1 };
        // Add more pairs as needed to ensure a solvable puzzle
    }

    function drawBoard() {
        const cellSize = Math.min(canvas.width / boardSize, canvas.height / boardSize);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = `${cellSize / 2}px Arial`;

        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                context.strokeStyle = 'black';
                context.lineWidth = 1; // 细网格线
                context.strokeRect(col * cellSize, row * cellSize, cellSize, cellSize);

                if (board[row][col]) {
                    context.fillStyle = board[row][col].color;
                    context.fillText('●', col * cellSize + cellSize / 2, row * cellSize + cellSize / 2);
                }
            }
        }
        drawPath();
    }

    function drawPath() {
        if (!selectedPath) return;
        const cellSize = Math.min(canvas.width / boardSize, canvas.height / boardSize);
        context.strokeStyle = selectedPath.color;
        context.lineWidth = cellSize / 4; // 粗线条

        context.beginPath();
        selectedPath.path.forEach((pos, index) => {
            const x = pos.col * cellSize + cellSize / 2;
            const y = pos.row * cellSize + cellSize / 2;
            if (index === 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }
        });
        context.stroke();
    }

    canvas.addEventListener('touchstart', (event) => {
        event.preventDefault();
        const touch = event.touches[0];
        handleMouseDown(touch.clientX, touch.clientY);
    });

    canvas.addEventListener('touchmove', (event) => {
        event.preventDefault();
        const touch = event.touches[0];
        handleMouseMove(touch.clientX, touch.clientY);
    });

    canvas.addEventListener('touchend', (event) => {
        event.preventDefault();
        handleMouseUp();
    });

    canvas.addEventListener('mousedown', (event) => {
        handleMouseDown(event.clientX, event.clientY);
    });

    canvas.addEventListener('mousemove', (event) => {
        handleMouseMove(event.clientX, event.clientY);
    });

    canvas.addEventListener('mouseup', () => {
        handleMouseUp();
    });

    function handleMouseDown(clientX, clientY) {
        if (!isGameActive) return;

        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const col = Math.floor(x / (rect.width / boardSize));
        const row = Math.floor(y / (rect.height / boardSize));

        if (board[row][col]) {
            selectedPath = { color: board[row][col].color, id: board[row][col].id, path: [{ row, col }] };
        }
    }

    function handleMouseMove(clientX, clientY) {
        if (!selectedPath) return;

        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const col = Math.floor(x / (rect.width / boardSize));
        const row = Math.floor(y / (rect.height / boardSize));

        const last = selectedPath.path[selectedPath.path.length - 1];
        if (Math.abs(last.row - row) + Math.abs(last.col - col) === 1 &&
            (!board[row][col] || (board[row][col].id === selectedPath.id && board[row][col].color === selectedPath.color))) {
            selectedPath.path.push({ row, col });
            if (!board[row][col]) {
                board[row][col] = { color: selectedPath.color, id: selectedPath.id };
            }
            moveCount++;
            moveCounter.textContent = `步数 = ${moveCount}`;
            drawBoard();
        }
    }

    function handleMouseUp() {
        if (selectedPath && isPathComplete(selectedPath)) {
            if (isGameWon()) {
                messageDiv.style.color = 'green';
                messageDiv.textContent = `恭喜成功！一共用了${moveCount}步。`;
                isGameActive = false;
            } else {
                resetPath(selectedPath);
                messageDiv.style.color = 'red';
                messageDiv.textContent = `失败了，再来一次，加油！`;
            }
        }
        selectedPath = null;
        drawBoard();
    }

    function isPathComplete(path) {
        const last = path.path[path.path.length - 1];
        const start = path.path[0];
        if (board[start.row][start.col].id === path.id && board[last.row][last.col].id === path.id) {
            return true;
        }
        return false;
    }

    function resetPath(path) {
        if (!path) return;
        path.path.forEach(pos => {
            if (!(board[pos.row][pos.col].id === path.id && board[pos.row][pos.col].color === path.color)) {
                board[pos.row][pos.col] = null;
            }
        });
        drawBoard();
    }

    function isGameWon() {
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (!board[row][col]) return false;
            }
        }
        return true;
    }

    function resizeCanvas() {
        const minDimension = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8);
        canvas.width = minDimension;
        canvas.height = minDimension;
        drawBoard();
    }

    // Initialize game
    resizeCanvas();
    initializeBoard();
    drawBoard();

    // Rules modal
    rulesButton.addEventListener('click', () => {
        modal.style.display = 'block';
    });

    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    window.addEventListener('resize', resizeCanvas);
});