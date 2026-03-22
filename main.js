document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const startButton    = document.getElementById('start-button');
    const diffSlider     = document.getElementById('difficulty-slider');
    const diffLabel      = document.getElementById('difficulty-label');
    const messageDiv     = document.getElementById('message');
    const moveCounterEl  = document.getElementById('move-counter');
    const pipeCounterEl  = document.getElementById('pipe-counter');
    const rulesButton    = document.getElementById('rules-button');
    const modal          = document.getElementById('rules-modal');
    const closeButton    = document.querySelector('.close-button');

    // ── Constants ────────────────────────────────────────────────────────────
    const DIFFICULTIES  = ['超易', '较易', '中等', '较难', '超难'];
    const LINE_W        = 10;      // drawn line width (px)
    const NODE_R        = 18;      // node radius (px)
    const SNAP_R        = 30;      // snap-to-node radius (px)
    const MIN_STEP      = 5;       // min px between recorded path points
    const OTHER_GAP     = LINE_W + 2;  // min distance between different-color lines

    const PALETTE = [
        ['#ff4757', '#ff6b81'],
        ['#2ed573', '#7bed9f'],
        ['#1e90ff', '#70a1ff'],
        ['#ffa502', '#ffc048'],
        ['#a29bfe', '#d7d0fc'],
        ['#fd79a8', '#fdacc5'],
        ['#00cec9', '#81ecec'],
        ['#fdcb6e', '#ffeaa7'],
    ];

    // Puzzle node positions as fractions [x, y] of canvas size.
    // Each entry in pairs is [[x1,y1],[x2,y2]].
    // 3 variants per difficulty level.
    const PUZZLES = {
        1: [  // 3 pairs – easy
            { pairs: [[[0.20,0.20],[0.80,0.80]], [[0.80,0.20],[0.20,0.80]], [[0.50,0.10],[0.50,0.90]]] },
            { pairs: [[[0.15,0.50],[0.85,0.50]], [[0.50,0.15],[0.50,0.85]], [[0.25,0.20],[0.75,0.80]]] },
            { pairs: [[[0.25,0.10],[0.75,0.90]], [[0.75,0.10],[0.25,0.90]], [[0.10,0.50],[0.90,0.50]]] },
        ],
        2: [  // 4 pairs
            { pairs: [[[0.15,0.15],[0.85,0.85]], [[0.85,0.15],[0.15,0.85]], [[0.50,0.10],[0.50,0.90]], [[0.10,0.50],[0.90,0.50]]] },
            { pairs: [[[0.20,0.10],[0.80,0.90]], [[0.80,0.10],[0.20,0.90]], [[0.10,0.35],[0.90,0.65]], [[0.10,0.65],[0.90,0.35]]] },
            { pairs: [[[0.15,0.20],[0.85,0.80]], [[0.85,0.20],[0.15,0.80]], [[0.35,0.10],[0.65,0.90]], [[0.50,0.15],[0.50,0.85]]] },
        ],
        3: [  // 5 pairs
            { pairs: [[[0.15,0.15],[0.85,0.85]], [[0.85,0.15],[0.15,0.85]], [[0.50,0.10],[0.50,0.90]], [[0.10,0.50],[0.90,0.50]], [[0.30,0.30],[0.70,0.70]]] },
            { pairs: [[[0.10,0.20],[0.90,0.80]], [[0.90,0.20],[0.10,0.80]], [[0.50,0.10],[0.50,0.90]], [[0.25,0.50],[0.75,0.15]], [[0.25,0.85],[0.75,0.50]]] },
            { pairs: [[[0.20,0.15],[0.80,0.85]], [[0.80,0.15],[0.20,0.85]], [[0.10,0.40],[0.90,0.60]], [[0.10,0.60],[0.90,0.40]], [[0.50,0.15],[0.50,0.85]]] },
        ],
        4: [  // 6 pairs
            { pairs: [[[0.10,0.10],[0.90,0.90]], [[0.90,0.10],[0.10,0.90]], [[0.50,0.10],[0.50,0.90]], [[0.10,0.50],[0.90,0.50]], [[0.30,0.15],[0.70,0.85]], [[0.30,0.85],[0.70,0.15]]] },
            { pairs: [[[0.15,0.15],[0.85,0.85]], [[0.85,0.15],[0.15,0.85]], [[0.50,0.08],[0.50,0.92]], [[0.08,0.50],[0.92,0.50]], [[0.25,0.25],[0.75,0.75]], [[0.30,0.50],[0.70,0.50]]] },
            { pairs: [[[0.10,0.20],[0.90,0.80]], [[0.90,0.20],[0.10,0.80]], [[0.50,0.10],[0.50,0.90]], [[0.20,0.50],[0.80,0.50]], [[0.15,0.35],[0.85,0.65]], [[0.15,0.65],[0.85,0.35]]] },
        ],
        5: [  // 7 pairs
            { pairs: [[[0.10,0.10],[0.90,0.90]], [[0.90,0.10],[0.10,0.90]], [[0.50,0.08],[0.50,0.92]], [[0.08,0.50],[0.92,0.50]], [[0.30,0.20],[0.70,0.80]], [[0.30,0.80],[0.70,0.20]], [[0.50,0.30],[0.50,0.70]]] },
            { pairs: [[[0.12,0.12],[0.88,0.88]], [[0.88,0.12],[0.12,0.88]], [[0.50,0.08],[0.50,0.92]], [[0.08,0.50],[0.92,0.50]], [[0.25,0.30],[0.75,0.70]], [[0.75,0.30],[0.25,0.70]], [[0.50,0.25],[0.50,0.75]]] },
            { pairs: [[[0.10,0.15],[0.90,0.85]], [[0.90,0.15],[0.10,0.85]], [[0.50,0.08],[0.50,0.92]], [[0.08,0.40],[0.92,0.60]], [[0.08,0.60],[0.92,0.40]], [[0.30,0.15],[0.70,0.85]], [[0.50,0.30],[0.50,0.70]]] },
        ],
    };

    // ── State ────────────────────────────────────────────────────────────────
    let nodes     = [];    // { id, colorIdx, fx, fy, x, y }
    let lines     = {};    // colorIdx → { points:[{x,y},...], complete:bool }
    let dragging  = null;  // { colorIdx, startNodeId }
    let doneCount = 0;
    let totalPairs = 0;
    let strokeCount = 0;   // completed strokes (stat shown as 步数)
    let canvasSize = 0;
    let currentPuzzle = null;
    let isGameActive = false;

    // ── Canvas sizing ────────────────────────────────────────────────────────
    function resizeCanvas() {
        canvasSize = Math.min(window.innerWidth * 0.92, window.innerHeight * 0.50, 460);
        canvas.width  = canvasSize;
        canvas.height = canvasSize;
        if (currentPuzzle) placeNodes();
        drawBoard();
    }

    function placeNodes() {
        nodes.forEach(n => {
            n.x = n.fx * canvasSize;
            n.y = n.fy * canvasSize;
        });
    }

    // ── Game init ─────────────────────────────────────────────────────────────
    function initGame() {
        const level = parseInt(diffSlider.value);
        const pool  = PUZZLES[level];
        currentPuzzle = pool[Math.floor(Math.random() * pool.length)];

        nodes = [];
        lines = {};
        doneCount  = 0;
        strokeCount = 0;
        totalPairs = currentPuzzle.pairs.length;

        currentPuzzle.pairs.forEach((pair, cidx) => {
            const [p1, p2] = pair;
            nodes.push({ id: cidx * 2,     colorIdx: cidx, fx: p1[0], fy: p1[1], x: p1[0] * canvasSize, y: p1[1] * canvasSize });
            nodes.push({ id: cidx * 2 + 1, colorIdx: cidx, fx: p2[0], fy: p2[1], x: p2[0] * canvasSize, y: p2[1] * canvasSize });
            lines[cidx] = { points: [], complete: false };
        });
    }

    // ── Geometry helpers ──────────────────────────────────────────────────────
    function dist(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    function cross2D(o, a, b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }

    // Strict crossing: ignores collinear / endpoint-touching cases
    function segsCross(p1, p2, p3, p4) {
        const d1 = cross2D(p3, p4, p1);
        const d2 = cross2D(p3, p4, p2);
        const d3 = cross2D(p1, p2, p3);
        const d4 = cross2D(p1, p2, p4);
        return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
               ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
    }

    function ptSegDistSq(p, a, b) {
        const dx = b.x - a.x, dy = b.y - a.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return (p.x - a.x) ** 2 + (p.y - a.y) ** 2;
        const t  = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
        const nx = a.x + t * dx, ny = a.y + t * dy;
        return (p.x - nx) ** 2 + (p.y - ny) ** 2;
    }

    function segMinDist(p1, p2, p3, p4) {
        if (segsCross(p1, p2, p3, p4)) return 0;
        return Math.sqrt(Math.min(
            ptSegDistSq(p1, p3, p4),
            ptSegDistSq(p2, p3, p4),
            ptSegDistSq(p3, p1, p2),
            ptSegDistSq(p4, p1, p2),
        ));
    }

    // ── Collision detection ───────────────────────────────────────────────────
    // Returns true if the segment newA→newB would cross or overlap an existing line.
    function wouldCollide(newA, newB) {
        if (dist(newA, newB) < 2) return false;

        for (const [cidxStr, line] of Object.entries(lines)) {
            const cidx = parseInt(cidxStr);
            const pts  = line.points;
            if (pts.length < 2) continue;

            const isSelf = dragging && cidx === dragging.colorIdx;

            // For own line, skip the last several segments to avoid false positives
            // right at the drawing tip (adjacent segments share an endpoint).
            // For other-color lines, check all segments.
            const skipTail = isSelf ? 6 : 0;
            const limit    = pts.length - 1 - skipTail;

            for (let i = 0; i < limit; i++) {
                const segA = pts[i], segB = pts[i + 1];
                if (dist(segA, segB) < 1) continue;

                if (isSelf) {
                    // Own line: only block strict crossing (allows tight curves)
                    if (segsCross(newA, newB, segA, segB)) return true;
                } else {
                    // Other color: block crossing AND close approach (visual overlap)
                    if (segMinDist(newA, newB, segA, segB) < OTHER_GAP) return true;
                }
            }
        }
        return false;
    }

    // ── Canvas coordinate helper ──────────────────────────────────────────────
    function toCanvas(clientX, clientY) {
        const rect  = canvas.getBoundingClientRect();
        const scaleX = canvas.width  / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    }

    function clampToCanvas(p) {
        const margin = NODE_R;
        return {
            x: Math.max(margin, Math.min(canvasSize - margin, p.x)),
            y: Math.max(margin, Math.min(canvasSize - margin, p.y)),
        };
    }

    function nearestNode(pos, colorIdx = null) {
        let best = null, bestDist = SNAP_R;
        nodes.forEach(n => {
            if (colorIdx !== null && n.colorIdx !== colorIdx) return;
            const d = dist(pos, n);
            if (d < bestDist) { bestDist = d; best = n; }
        });
        return best;
    }

    // ── Drag handlers ─────────────────────────────────────────────────────────
    function onStart(clientX, clientY) {
        if (!isGameActive) return;
        const pos  = toCanvas(clientX, clientY);
        const node = nearestNode(pos);
        if (!node) return;

        const cidx = node.colorIdx;
        // Clear previous line for this color (whether complete or partial)
        if (lines[cidx].complete) doneCount--;
        lines[cidx] = { points: [{ x: node.x, y: node.y }], complete: false };
        dragging = { colorIdx: cidx, startNodeId: node.id };
        updateStats();
        drawBoard();
    }

    function onMove(clientX, clientY) {
        if (!dragging) return;
        const raw  = toCanvas(clientX, clientY);
        const pos  = clampToCanvas(raw);
        const line = lines[dragging.colorIdx];
        const last = line.points[line.points.length - 1];

        if (dist(pos, last) < MIN_STEP) return;

        // Check if we've reached the destination node (snap-to-complete)
        const destNode = nodes.find(
            n => n.colorIdx === dragging.colorIdx && n.id !== dragging.startNodeId
        );
        if (destNode && dist(pos, destNode) < SNAP_R) {
            const snapPt = { x: destNode.x, y: destNode.y };
            // Final segment collision check before snapping
            if (!wouldCollide(last, snapPt)) {
                line.points.push(snapPt);
                line.complete = true;
                doneCount++;
                strokeCount++;
                dragging = null;
                updateStats();
                drawBoard();
                checkWin();
            }
            return;
        }

        // Normal extension: check for collision, canvas boundary already clamped
        if (wouldCollide(last, pos)) return;  // blocked — don't extend

        line.points.push(pos);
        drawBoard();
    }

    function onEnd() {
        if (!dragging) return;
        const line = lines[dragging.colorIdx];
        // Erase incomplete path so player starts fresh from the node
        if (!line.complete) {
            lines[dragging.colorIdx] = { points: [], complete: false };
        }
        dragging = null;
        updateStats();
        drawBoard();
    }

    // ── Drawing ───────────────────────────────────────────────────────────────
    function drawBoard() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBg();
        drawAllLines();
        drawNodes();
    }

    function drawBg() {
        ctx.fillStyle = '#0d1b2a';
        ctx.beginPath();
        rrect(0, 0, canvas.width, canvas.height, 12);
        ctx.fill();
    }

    function rrect(x, y, w, h, r) {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y,     x + w, y + r,     r);
        ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h); ctx.arcTo(x,     y + h, x,     y + h - r, r);
        ctx.lineTo(x,     y + r); ctx.arcTo(x,     y,     x + r, y,         r);
        ctx.closePath();
    }

    function drawAllLines() {
        for (const [cidxStr, line] of Object.entries(lines)) {
            const pts = line.points;
            if (pts.length < 2) continue;
            const cidx = parseInt(cidxStr);
            const [fill, glow] = PALETTE[cidx % PALETTE.length];

            ctx.save();
            ctx.shadowColor = glow;
            ctx.shadowBlur  = 10;
            ctx.strokeStyle = fill;
            ctx.lineWidth   = LINE_W;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';

            // Draw as smooth quadratic bezier spline
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length - 1; i++) {
                const mx = (pts[i].x + pts[i + 1].x) / 2;
                const my = (pts[i].y + pts[i + 1].y) / 2;
                ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
            }
            ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
            ctx.stroke();
            ctx.restore();
        }
    }

    function drawNodes() {
        nodes.forEach(n => {
            const [fill, glow] = PALETTE[n.colorIdx % PALETTE.length];
            const cx = n.x, cy = n.y, r = NODE_R;

            ctx.save();
            ctx.shadowColor = glow;
            ctx.shadowBlur  = 18;

            // Outer halo
            ctx.beginPath();
            ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fill();

            // Main dot
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = fill;
            ctx.fill();

            // Shine
            ctx.beginPath();
            ctx.arc(cx - r * 0.28, cy - r * 0.28, r * 0.30, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.45)';
            ctx.fill();

            ctx.restore();
        });
    }

    // ── Stats & win ───────────────────────────────────────────────────────────
    function updateStats() {
        moveCounterEl.textContent = strokeCount;
        pipeCounterEl.textContent = doneCount + ' / ' + totalPairs;
    }

    function checkWin() {
        if (doneCount === totalPairs) {
            isGameActive = false;
            messageDiv.className = 'win';
            messageDiv.textContent = `🎉 恭喜！${strokeCount} 笔完成！`;
        }
    }

    // ── Event wiring ──────────────────────────────────────────────────────────
    canvas.addEventListener('mousedown',  e => onStart(e.clientX, e.clientY));
    canvas.addEventListener('mousemove',  e => onMove(e.clientX, e.clientY));
    canvas.addEventListener('mouseup',    () => onEnd());
    canvas.addEventListener('mouseleave', () => onEnd());

    canvas.addEventListener('touchstart', e => { e.preventDefault(); onStart(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    canvas.addEventListener('touchmove',  e => { e.preventDefault(); onMove(e.touches[0].clientX,  e.touches[0].clientY);  }, { passive: false });
    canvas.addEventListener('touchend',   e => { e.preventDefault(); onEnd(); }, { passive: false });

    diffSlider.addEventListener('input', e => {
        diffLabel.textContent = DIFFICULTIES[parseInt(e.target.value) - 1];
    });

    startButton.addEventListener('click', () => {
        isGameActive = true;
        messageDiv.textContent = '';
        messageDiv.className = '';
        resizeCanvas();
        initGame();
        drawBoard();
        updateStats();
    });

    rulesButton.addEventListener('click',  () => modal.classList.add('active'));
    closeButton.addEventListener('click',  () => modal.classList.remove('active'));
    window.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
    window.addEventListener('resize', resizeCanvas);

    // ── Boot ──────────────────────────────────────────────────────────────────
    diffLabel.textContent = DIFFICULTIES[0];
    resizeCanvas();
    initGame();
    drawBoard();
    updateStats();
});
