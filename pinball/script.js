/* ===================== FISICA (verificata in sandbox) ===================== */

const TABLE_W = 972, TABLE_H = 700;
const GRAVITY = 0.35;
const BALL_R = 8;
const FRICTION = 0.999;
const MAX_SPEED = 24;
const SUBSTEPS = 6;

// --- SEZIONE: TIRO_PALLINA ---
// Attiva SOLO per il lancio iniziale della pallina dalla molla, a inizio turno.
const TIRO_PALLINA = 1.4;

// --- SEZIONE: POTENZA_TAPPETINO_RIMBALZANTE ---
// Attiva per tutto il resto della partita: il rimbalzo dei tappetini sul pavimento.
const POTENZA_TAPPETINO_RIMBALZANTE = 1;

function buildWalls() {
    const walls = [];
    // muro sinistro fino in fondo
    walls.push({ x1: 48.6, y1: 150, x2: 48.6, y2: 650, restitution: 0.8, draw: true });

    // cupola estesa: copre l'intera larghezza dal muro sinistro al muro destro, nessun varco in cima
    const cx = 486, cy = 150, rx = 437.4, ry = 130;
    const N = 16;
    let prev = null;
    for (let i = 0; i <= N; i++) {
        const a = Math.PI - (Math.PI * i / N);
        const x = cx + rx * Math.cos(a);
        const y = cy - ry * Math.sin(a);
        if (prev) walls.push({ x1: prev.x, y1: prev.y, x2: x, y2: y, restitution: 0.8, draw: true });
        prev = { x, y };
    }

    // parete destra continua fino in fondo
    walls.push({ x1: 923.4, y1: 150, x2: 923.4, y2: 650, restitution: 0.8, draw: true });

    // 2 muretti verticali, posizionati esattamente sopra i due buchi laterali
    walls.push({ x1: 267.3, y1: 495, x2: 267.3, y2: 585, restitution: 0.8, draw: true });
    walls.push({ x1: 704.7, y1: 495, x2: 704.7, y2: 585, restitution: 0.8, draw: true });

    // pavimento con 3 buchi: a 1/4, al centro e a 3/4 della lunghezza
    const floorL = 48.6, floorR = 923.4;
    const holeXs = [267.3, 486, 704.7];
    const holeHalf = 50;
    const floorPts = [floorL, ...holeXs.flatMap(h => [h - holeHalf, h + holeHalf]), floorR];
    for (let i = 0; i < floorPts.length; i += 2) {
        walls.push({ x1: floorPts[i], y1: 650, x2: floorPts[i + 1], y2: 650, restitution: POTENZA_TAPPETINO_RIMBALZANTE, draw: true, mat: true, lastHit: -9999 });
    }

    return walls;
}

function buildBumpers() {
    return [
        { x: 315.9, y: 230, r: 16, lastHit: -9999 },
        { x: 595.35, y: 190, r: 16, lastHit: -9999 },
        { x: 729, y: 260, r: 16, lastHit: -9999 }
    ];
}

function buildPegs() {
    return [
        { x: 230.85, y: 260, r: 5 },
        { x: 388.8, y: 300, r: 5 },
        { x: 534.6, y: 260, r: 5 },
        { x: 680.4, y: 320, r: 5 },
        { x: 364.5, y: 220, r: 5 },
        { x: 486, y: 350, r: 5 }
    ];
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq > 0 ? ((px - x1) * dx + (py - y1) * dy) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    return { x: x1 + t * dx, y: y1 + t * dy };
}

function resolveWallCollision(ball, wall, now) {
    const cp = closestPointOnSegment(ball.x, ball.y, wall.x1, wall.y1, wall.x2, wall.y2);
    const dx = ball.x - cp.x, dy = ball.y - cp.y;
    const dist = Math.hypot(dx, dy);
    if (dist < BALL_R && dist > 0.0001) {
        const nx = dx / dist, ny = dy / dist;
        const overlap = BALL_R - dist;
        ball.x += nx * overlap; ball.y += ny * overlap;
        const vDotN = ball.vx * nx + ball.vy * ny;
        if (vDotN < 0) {
            const rest = wall.restitution || 0.85;
            ball.vx -= (1 + rest) * vDotN * nx;
            ball.vy -= (1 + rest) * vDotN * ny;
        }
        if (wall.mat) wall.lastHit = now;
        return true;
    }
    return false;
}

function resolveCircleCollision(ball, c, boost, now) {
    const dx = ball.x - c.x, dy = ball.y - c.y;
    const dist = Math.hypot(dx, dy);
    const minDist = BALL_R + c.r;
    if (dist < minDist && dist > 0.0001) {
        const nx = dx / dist, ny = dy / dist;
        ball.x = c.x + nx * minDist; ball.y = c.y + ny * minDist;
        if (boost) {
            const speed = Math.max(Math.hypot(ball.vx, ball.vy), 3) * 1.4;
            ball.vx = nx * speed; ball.vy = ny * speed;
            if (c.lastHit !== undefined) c.lastHit = now;
        } else {
            const vDotN = ball.vx * nx + ball.vy * ny;
            if (vDotN < 0) { ball.vx -= 1.8 * vDotN * nx; ball.vy -= 1.8 * vDotN * ny; }
        }
        return true;
    }
    return false;
}

/* ===================== STATO GIOCO ===================== */

const canvas = document.getElementById('table');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const scoreEl = document.getElementById('score');
const ballsEl = document.getElementById('balls');

const walls = buildWalls();
const bumpers = buildBumpers();
const pegs = buildPegs();

let ball, score, ballsLeft, gameState, charge, chargeStartTime, spaceDown, restFrames;

const SPRING_REST = { x: 886.95, y: 600 };

function resetBallToSpring() {
    ball = { x: SPRING_REST.x, y: SPRING_REST.y, vx: 0, vy: 0 };
    gameState = 'idle-spring';
    charge = 0;
    restFrames = 0;
}

function newGame() {
    score = 0;
    ballsLeft = 3;
    resetBallToSpring();
    updateHud();
    hideOverlay();
}

function updateHud() {
    scoreEl.textContent = score;
    ballsEl.textContent = '🔴'.repeat(Math.max(0, ballsLeft));
}

function addScore(points) { score += points; updateHud(); }

/* ===================== INPUT ===================== */

document.addEventListener('keydown', e => {
    if (e.key === ' ') {
        e.preventDefault();
        if (!spaceDown && gameState === 'idle-spring') { spaceDown = true; chargeStartTime = performance.now(); }
    }
});
document.addEventListener('keyup', e => {
    if (e.key === ' ') {
        if (spaceDown) {
            spaceDown = false;
            if (gameState === 'idle-spring') launchBall();
        }
    }
});

function launchBall() {
    // lancio verticale dalla molla, potenziato dal moltiplicatore TIRO_PALLINA (solo qui, solo ora)
    ball.vx = -2 * TIRO_PALLINA;
    ball.vy = (-13 - charge * 3) * TIRO_PALLINA;
    gameState = 'in-play';
    charge = 0;
    restFrames = 0;
}

/* ===================== LOOP ===================== */

function physicsFrame() {
    const now = performance.now();

    if (gameState === 'in-play') {
        ball.vy += GRAVITY;
        ball.vx *= FRICTION; ball.vy *= FRICTION;
        const speed = Math.hypot(ball.vx, ball.vy);
        if (speed > MAX_SPEED) { ball.vx = ball.vx / speed * MAX_SPEED; ball.vy = ball.vy / speed * MAX_SPEED; }

        const stepVx = ball.vx / SUBSTEPS, stepVy = ball.vy / SUBSTEPS;
        for (let s = 0; s < SUBSTEPS; s++) {
            ball.x += stepVx; ball.y += stepVy;
            walls.forEach(w => resolveWallCollision(ball, w, now));
            bumpers.forEach(b => { if (resolveCircleCollision(ball, b, true, now)) addScore(100); });
            pegs.forEach(p => resolveCircleCollision(ball, p, false, now));
        }

        // il pavimento chiude quasi tutto: se cade in uno dei 3 buchi, il turno finisce subito.
        // altrimenti, quando si ferma sul pavimento (velocita' minima per un po'), finisce lo stesso.
        if (ball.y - BALL_R > TABLE_H) { ballSettled(); return; }
        const curSpeed = Math.hypot(ball.vx, ball.vy);
        if (curSpeed < 0.6) restFrames++; else restFrames = 0;
        if (restFrames > 45) ballSettled();
    } else if (gameState === 'idle-spring') {
        if (spaceDown) charge = Math.min(1, (now - chargeStartTime) / 900);
    }
}

function ballSettled() {
    ballsLeft--;
    updateHud();
    if (ballsLeft <= 0) {
        gameState = 'gameover';
        showOverlay('💀 Game Over', `Punteggio finale: ${score}`, 'Rigioca', newGame);
    } else {
        gameState = 'ball-lost';
        showOverlay('🔻 Pallina Ferma', `Ne restano ${ballsLeft}`, 'Prossima Pallina', () => { resetBallToSpring(); });
    }
}

function showOverlay(title, subtitle, buttonText, onClick) {
    overlay.innerHTML = `<h2>${title}</h2><p>${subtitle}</p><button id="ov-btn">${buttonText}</button>`;
    overlay.style.display = 'flex';
    document.getElementById('ov-btn').onclick = () => { hideOverlay(); onClick(); };
}
function hideOverlay() { overlay.style.display = 'none'; }

/* ===================== RENDER ===================== */

function drawWalls(now) {
    walls.forEach(w => {
        ctx.beginPath();
        ctx.moveTo(w.x1, w.y1);
        ctx.lineTo(w.x2, w.y2);
        if (w.mat) {
            const hitRecently = now - w.lastHit < 150;
            ctx.strokeStyle = hitRecently ? '#c8ffe0' : '#00ff6a';
            ctx.lineWidth = hitRecently ? 8 : 6;
            ctx.shadowBlur = hitRecently ? 24 : 12;
        } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 4;
            ctx.shadowBlur = 0;
        }
        ctx.lineCap = 'round';
        ctx.shadowColor = '#00ff6a';
        ctx.stroke();
        ctx.shadowBlur = 0;
    });
}

function drawPegs() {
    pegs.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = '#8a8aa0';
        ctx.fill();
    });
}

function drawBumpers(now) {
    bumpers.forEach(b => {
        const hitRecently = now - b.lastHit < 150;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = hitRecently ? '#ffffff' : '#ffcc00';
        ctx.shadowBlur = hitRecently ? 25 : 12;
        ctx.shadowColor = '#ffcc00';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6,4,15,0.6)';
        ctx.fill();
    });
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffffff';
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawChargeMeter() {
    if (gameState !== 'idle-spring') return;
    const barX = 908, barBottom = 640, barTop = 170, maxH = barBottom - barTop;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(barX, barTop, 8, maxH);
    const h = maxH * charge;
    ctx.fillStyle = '#00f5d4';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00f5d4';
    ctx.fillRect(barX, barBottom - h, 8, h);
    ctx.shadowBlur = 0;
}

function render(now) {
    ctx.fillStyle = '#0a0817';
    ctx.fillRect(0, 0, TABLE_W, TABLE_H);
    drawWalls(now);
    drawPegs();
    drawBumpers(now);
    drawChargeMeter();
    drawBall();
}

function loop() {
    requestAnimationFrame(loop);
    physicsFrame();
    render(performance.now());
}

/* ===================== BOOT ===================== */

newGame();
loop();
