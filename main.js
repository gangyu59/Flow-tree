document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const startButton = document.getElementById('start-button');
    const difficultySlider = document.getElementById('difficulty-slider');
    const difficultyLabel = document.getElementById('difficulty-label');
    const messageDiv = document.getElementById('message');
    const moveCounterEl = document.getElementById('move-counter');
    const pipeCounterEl = document.getElementById('pipe-counter');
    const rulesButton = document.getElementById('rules-button');
    const modal = document.getElementById('rules-modal');
    const closeButton = document.querySelector('.close-button');

    // ── Config ──────────────────────────────────────────────────────────────
    const BOARD_SIZES  = [5, 6, 7, 8, 9];
    const DIFFICULTIES = ['超易', '较易', '中等', '较难', '超难'];

    // Vibrant palette – each entry is [fillColor, glowColor]
    const PALETTE = [
        ['#ff4757', '#ff6b81'],   // red
        ['#2ed573', '#7bed9f'],   // green
        ['#1e90ff', '#70a1ff'],   // blue
        ['#ffa502', '#ffc048'],   // orange
        ['#a29bfe', '#d7d0fc'],   // purple
        ['#fd79a8', '#fdacc5'],   // pink
        ['#00cec9', '#81ecec'],   // teal
        ['#fdcb6e', '#ffeaa7'],   // yellow
        ['#e17055', '#fab1a0'],   // salmon
        ['#6c5ce7', '#a29bfe'],   // indigo
    ];

    // Pre-built solvable puzzles for each difficulty level
    // Format: { pairs: [[r1,c1,r2,c2], ...] }  (0-indexed)
    const PUZZLES = {
        // 5×5  (5 pairs, all cells filled)
        5: [
            { pairs: [[0,0,4,0],[0,2,2,4],[0,4,3,4],[1,1,3,3],[2,0,4,2]] },
            { pairs: [[0,0,0,4],[1,0,4,0],[1,4,4,4],[2,1,2,3],[3,1,3,3]] },
            { pairs: [[0,0,2,2],[0,4,4,4],[1,1,3,3],[2,0,4,0],[0,2,4,2]] },
        ],
        // 6×6  (6 pairs)
        6: [
            { pairs: [[0,0,5,0],[0,2,0,5],[1,1,4,1],[2,2,5,5],[3,3,5,3],[1,4,3,5]] },
            { pairs: [[0,0,0,5],[5,0,5,5],[1,1,4,4],[2,2,3,3],[1,4,4,1],[2,0,3,5]] },
            { pairs: [[0,0,3,0],[0,5,3,5],[1,2,4,2],[2,1,5,4],[0,3,5,1],[1,4,4,3]] },
        ],
        // 7×7  (7 pairs)
        7: [
            { pairs: [[0,0,6,0],[0,6,6,6],[0,3,3,6],[1,1,5,5],[2,2,4,4],[1,5,4,1],[3,0,6,3]] },
            { pairs: [[0,0,0,6],[6,0,6,6],[1,1,5,5],[2,2,4,4],[3,3,3,6],[0,3,3,0],[1,4,4,2]] },
            { pairs: [[0,0,4,0],[0,6,4,6],[1,2,5,4],[2,1,5,5],[3,3,6,3],[0,3,3,6],[1,5,5,1]] },
        ],
        // 8×8  (8 pairs)
        8: [
            { pairs: [[0,0,7,0],[0,7,7,7],[0,3,3,7],[1,1,6,6],[2,2,5,5],[3,3,4,4],[1,5,5,1],[0,5,4,0]] },
            { pairs: [[0,0,0,7],[7,0,7,7],[1,1,6,6],[2,2,5,5],[3,3,4,4],[0,4,4,0],[1,5,6,2],[2,4,5,3]] },
            { pairs: [[0,0,5,0],[0,7,5,7],[1,2,4,5],[2,1,5,6],[3,3,6,3],[0,4,4,0],[1,6,6,1],[3,5,7,4]] },
        ],
        // 9×9  (9 pairs)
        9: [
            { pairs: [[0,0,8,0],[0,8,8,8],[0,4,4,8],[1,1,7,7],[2,2,6,6],[3,3,5,5],[4,0,8,4],[1,6,6,1],[0,6,3,8]] },
            { pairs: [[0,0,0,8],[8,0,8,8],[1,1,7,7],[2,2,6,6],[3,3,5,5],[4,4,4,8],[0,4,4,0],[1,5,5,2],[2,4,6,3]] },
            { pairs: [[0,0,6,0],[0,8,6,8],[1,2,5,6],[2,1,6,7],[3,3,7,3],[0,5,4,0],[1,7,7,1],[4,4,8,4],[3,6,8,5]] },
        ],
    };

    // ── State ────────────────────────────────────────────────────────────────
    let boardSize    = BOARD_SIZES[0];
    let board        = [];       // board[row][col] = { colorIdx, isEndpoint } | null
    let paths        = {};       // colorIdx → array of {row,col}
    let completedPipes = new Set();
    let moveCount    = 0;
    let isGameActive = false;
    let dragging     = null;     // { colorIdx, path[] }
    let cellSize     = 0;
    let currentPuzzle = null;

    // ── Helpers ──────────────────────────────────────────────────────────────
    function pickPuzzle(size) {
        const pool = PUZZLES[size];
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function resizeCanvas() {
        const side = Math.min(window.innerWidth * 0.92, window.innerHeight * 0.48, 420);
        canvas.width  = side;
        canvas.height = side;
        cellSize = side / boardSize;
        drawBoard();
    }

    // ── Board init ────────────────────────────────────────────────────────────
    function initializeBoard() {
        board = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
        paths = {};
        completedPipes = new Set();

        currentPuzzle = pickPuzzle(boardSize);
        currentPuzzle.pairs.forEach(([r1, c1, r2, c2], idx) => {
            board[r1][c1] = { colorIdx: idx, isEndpoint: true };
            board[r2][c2] = { colorIdx: idx, isEndpoint: true };
            paths[idx] = [];
        });
    }

    // ── Drawing ───────────────────────────────────────────────────────────────
    function drawBoard() {
        if (!canvas.width) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawPaths();
        drawGrid();
        drawEndpoints();
    }

    function drawBackground() {
        ctx.fillStyle = '#0d1b2a';
        ctx.beginPath();
        roundRect(ctx, 0, 0, canvas.width, canvas.height, 12);
        ctx.fill();
    }

    function roundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.lineTo(x + w - r, y);
        c.arcTo(x + w, y, x + w, y + r, r);
        c.lineTo(x + w, y + h - r);
        c.arcTo(x + w, y + h, x + w - r, y + h, r);
        c.lineTo(x + r, y + h);
        c.arcTo(x, y + h, x, y + h - r, r);
        c.lineTo(x, y + r);
        c.arcTo(x, y, x + r, y, r);
        c.closePath();
    }

    function drawGrid() {
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= boardSize; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(canvas.width, i * cellSize);
            ctx.stroke();
        }
    }

    function drawPaths() {
        Object.entries(paths).forEach(([idxStr, path]) => {
            if (path.length < 2) return;
            const idx = parseInt(idxStr);
            const [fill, glow] = PALETTE[idx % PALETTE.length];

            ctx.save();
            ctx.shadowColor  = glow;
            ctx.shadowBlur   = 10;
            ctx.strokeStyle  = fill;
            ctx.lineWidth    = cellSize * 0.42;
            ctx.lineCap      = 'round';
            ctx.lineJoin     = 'round';

            ctx.beginPath();
            path.forEach((pos, i) => {
                const x = pos.col * cellSize + cellSize / 2;
                const y = pos.row * cellSize + cellSize / 2;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            ctx.restore();
        });
    }

    function drawEndpoints() {
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                const cell = board[row][col];
                if (!cell || !cell.isEndpoint) continue;

                const [fill, glow] = PALETTE[cell.colorIdx % PALETTE.length];
                const cx = col * cellSize + cellSize / 2;
                const cy = row * cellSize + cellSize / 2;
                const r  = cellSize * 0.30;

                ctx.save();
                ctx.shadowColor = glow;
                ctx.shadowBlur  = 16;

                // Outer ring
                ctx.beginPath();
                ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fill();

                // Main dot
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fillStyle = fill;
                ctx.fill();

                // Shine
                ctx.beginPath();
                ctx.arc(cx - r * 0.28, cy - r * 0.28, r * 0.32, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.45)';
                ctx.fill();

                ctx.restore();
            }
        }
    }

    // ── Input helpers ─────────────────────────────────────────────────────────
    function canvasXY(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width  / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            col: Math.floor((clientX - rect.left) * scaleX / cellSize),
            row: Math.floor((clientY - rect.top)  * scaleY / cellSize),
        };
    }

    function inBounds(row, col) {
        return row >= 0 && row < boardSize && col >= 0 && col < boardSize;
    }

    function adjacent(a, b) {
        return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
    }

    function endpointsForColor(idx) {
        const eps = [];
        for (let r = 0; r < boardSize; r++)
            for (let c = 0; c < boardSize; c++)
                if (board[r][c] && board[r][c].isEndpoint && board[r][c].colorIdx === idx)
                    eps.push({ row: r, col: c });
        return eps;
    }

    // ── Path drawing logic ────────────────────────────────────────────────────
    function clearPathForColor(idx) {
        (paths[idx] || []).forEach(pos => {
            const cell = board[pos.row][pos.col];
            if (cell && !cell.isEndpoint) board[pos.row][pos.col] = null;
        });
        paths[idx] = [];
        completedPipes.delete(idx);
    }

    function startDrag(row, col) {
        if (!isGameActive || !inBounds(row, col)) return;
        const cell = board[row][col];
        if (!cell) return;

        const idx = cell.colorIdx;
        clearPathForColor(idx);
        dragging = { colorIdx: idx, path: [{ row, col }] };
        paths[idx] = dragging.path;
    }

    function extendDrag(row, col) {
        if (!dragging || !inBounds(row, col)) return;

        const path = dragging.path;
        const last = path[path.length - 1];
        if (last.row === row && last.col === col) return;

        // Allow backtracking
        if (path.length >= 2) {
            const prev = path[path.length - 2];
            if (prev.row === row && prev.col === col) {
                const removed = path.pop();
                const cell = board[removed.row][removed.col];
                if (cell && !cell.isEndpoint) board[removed.row][removed.col] = null;
                moveCount++;
                updateStats();
                drawBoard();
                return;
            }
        }

        if (!adjacent(last, { row, col })) return;

        const targetCell = board[row][col];
        // Block if occupied by a different color
        if (targetCell && !targetCell.isEndpoint) return;
        // Block if same-color endpoint already in path (can only end there)
        if (targetCell && targetCell.isEndpoint && targetCell.colorIdx === dragging.colorIdx) {
            // Only allow if it's the OTHER endpoint (not the one we started from)
            const startCell = board[path[0].row][path[0].col];
            if (row === path[0].row && col === path[0].col) return; // can't loop back to start
        }
        // Block path from going through a different color's endpoint
        if (targetCell && targetCell.isEndpoint && targetCell.colorIdx !== dragging.colorIdx) return;

        path.push({ row, col });
        if (!targetCell) {
            board[row][col] = { colorIdx: dragging.colorIdx, isEndpoint: false };
        }
        moveCount++;
        updateStats();
        drawBoard();

        // Auto-complete if we hit our matching endpoint
        if (targetCell && targetCell.isEndpoint && targetCell.colorIdx === dragging.colorIdx) {
            finishDrag();
        }
    }

    function finishDrag() {
        if (!dragging) return;
        const path = dragging.path;
        if (path.length >= 2) {
            const startCell = board[path[0].row][path[0].col];
            const endCell   = board[path[path.length - 1].row][path[path.length - 1].col];
            if (startCell && endCell &&
                startCell.isEndpoint && endCell.isEndpoint &&
                startCell.colorIdx === dragging.colorIdx &&
                endCell.colorIdx   === dragging.colorIdx &&
                !(path[0].row === path[path.length-1].row && path[0].col === path[path.length-1].col)) {
                completedPipes.add(dragging.colorIdx);
            }
        }
        dragging = null;
        updateStats();
        drawBoard();
        checkWin();
    }

    // ── Game state ────────────────────────────────────────────────────────────
    function updateStats() {
        moveCounterEl.textContent = moveCount;
        pipeCounterEl.textContent = completedPipes.size + ' / ' + currentPuzzle.pairs.length;
    }

    function isBoardFull() {
        for (let r = 0; r < boardSize; r++)
            for (let c = 0; c < boardSize; c++)
                if (!board[r][c]) return false;
        return true;
    }

    function checkWin() {
        if (completedPipes.size === currentPuzzle.pairs.length && isBoardFull()) {
            isGameActive = false;
            messageDiv.className = 'win';
            messageDiv.textContent = `🎉 恭喜！共用 ${moveCount} 步完成！`;
        }
    }

    // ── Events ────────────────────────────────────────────────────────────────
    canvas.addEventListener('mousedown', e => {
        const { row, col } = canvasXY(e.clientX, e.clientY);
        startDrag(row, col);
    });
    canvas.addEventListener('mousemove', e => {
        const { row, col } = canvasXY(e.clientX, e.clientY);
        extendDrag(row, col);
    });
    canvas.addEventListener('mouseup', () => finishDrag());
    canvas.addEventListener('mouseleave', () => finishDrag());

    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.touches[0];
        const { row, col } = canvasXY(t.clientX, t.clientY);
        startDrag(row, col);
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        const t = e.touches[0];
        const { row, col } = canvasXY(t.clientX, t.clientY);
        extendDrag(row, col);
    }, { passive: false });
    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        finishDrag();
    }, { passive: false });

    difficultySlider.addEventListener('input', e => {
        const level = parseInt(e.target.value) - 1;
        difficultyLabel.textContent = DIFFICULTIES[level];
        boardSize = BOARD_SIZES[level];
        cellSize  = canvas.width / boardSize;
    });

    startButton.addEventListener('click', () => {
        const level = parseInt(difficultySlider.value) - 1;
        boardSize = BOARD_SIZES[level];
        moveCount = 0;
        isGameActive = true;
        messageDiv.textContent = '';
        messageDiv.className = '';
        initializeBoard();
        resizeCanvas();
        updateStats();
    });

    rulesButton.addEventListener('click', () => modal.classList.add('active'));
    closeButton.addEventListener('click', () => modal.classList.remove('active'));
    window.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
    window.addEventListener('resize', resizeCanvas);

    // ── Boot ──────────────────────────────────────────────────────────────────
    // Set difficulty label to match default slider value (1 = 超易)
    difficultyLabel.textContent = DIFFICULTIES[0];
    boardSize = BOARD_SIZES[0];
    initializeBoard();
    resizeCanvas();
    updateStats();
});
