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
    // paraurti tondi, non tutti uguali: 3 principali coordinati + 2 piccoli fuori schema
    return [
        { x: 486, y: 260, r: 22, color: '#00f5d4', lastHit: -9999 },
        { x: 320, y: 350, r: 20, color: '#ff2f7e', lastHit: -9999 },
        { x: 652, y: 350, r: 20, color: '#00ff6a', lastHit: -9999 },
        { x: 190, y: 470, r: 13, color: '#ffb703', lastHit: -9999 },
        { x: 790, y: 440, r: 15, color: '#a855f7', lastHit: -9999 }
    ];
}

function buildPegs() {
    // intoppi sparsi, volutamente scoordinati e di dimensioni diverse
    return [
        { x: 486, y: 400, r: 5, color: '#5a6a8f' },
        { x: 410, y: 445, r: 5, color: '#5a6a8f' },
        { x: 562, y: 445, r: 5, color: '#5a6a8f' },
        { x: 486, y: 490, r: 5, color: '#5a6a8f' },
        { x: 486, y: 330, r: 4, color: '#5a6a8f' },
        { x: 140, y: 400, r: 4, color: '#6b5aa0' },
        { x: 850, y: 300, r: 6, color: '#a05a6b' },
        { x: 240, y: 550, r: 4, color: '#5a6a8f' },
        { x: 640, y: 500, r: 5, color: '#6b5aa0' }
    ];
}

function buildKickers() {
    // piccoli respingenti ad alto rimbalzo, posizionati in modo asimmetrico
    return [
        { x1: 130, y1: 250, x2: 165, y2: 300, restitution: 1.35 },
        { x1: 840, y1: 470, x2: 875, y2: 420, restitution: 1.35 }
    ];
}

function buildSpinner() {
    // mulinello che gira in continuazione, non controllato dal giocatore
    return { pivotX: 700, pivotY: 220, armLength: 42, radius: 4, angle: 0, spinSpeed: 0.09 };
}

function buildDomeLights() {
    // lucine decorative lungo la cupola (puro effetto, nessuna fisica)
    const cx = 486, cy = 150, rx = 437.4, ry = 130;
    const lights = [];
    const N = 20;
    for (let i = 1; i < N; i++) {
        const a = Math.PI - (Math.PI * i / N);
        lights.push({ x: cx + rx * Math.cos(a), y: cy - ry * Math.sin(a), colorIdx: i % 3 });
    }
    return lights;
}

function buildPaddles() {
    // 2 piccoli paddle per buco, leggermente inclinati e sollevati.
    // i paddle di sinistra rispondono a ⬅️, quelli di destra a ➡️ (stesso comando su tutti e 3 i buchi)
    const specs = [
        { holeX: 267.3 }, { holeX: 486 }, { holeX: 704.7 }
    ];
    const half = 50, length = 42, radius = 3, pivotY = 630;
    const paddles = [];
    specs.forEach(({ holeX }) => {
        paddles.push({ side: 'left', pivotX: holeX - half, pivotY, length, radius,
            restAngle: 80 * Math.PI / 180, activeAngle: 15 * Math.PI / 180, angle: 80 * Math.PI / 180, angularVel: 0, maxAngularSpeed: 18 * Math.PI / 180, active: false });
        paddles.push({ side: 'right', pivotX: holeX + half, pivotY, length, radius,
            restAngle: 100 * Math.PI / 180, activeAngle: 165 * Math.PI / 180, angle: 100 * Math.PI / 180, angularVel: 0, maxAngularSpeed: 18 * Math.PI / 180, active: false });
    });
    return paddles;
}

function buildTethers(paddles) {
    // rende tangibili i tiranti: un muro sottile ma solido da ogni perno fino al pavimento
    return paddles.map(p => ({ x1: p.pivotX, y1: p.pivotY, x2: p.pivotX, y2: 650, restitution: 0.8 }));
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

function paddleTip(p) {
    return { x: p.pivotX + Math.cos(p.angle) * p.length, y: p.pivotY + Math.sin(p.angle) * p.length };
}

function resolvePaddleCollision(ball, p) {
    const tip = paddleTip(p);
    const cp = closestPointOnSegment(ball.x, ball.y, p.pivotX, p.pivotY, tip.x, tip.y);
    const dx = ball.x - cp.x, dy = ball.y - cp.y;
    const dist = Math.hypot(dx, dy);
    const minDist = BALL_R + p.radius;
    if (dist < minDist && dist > 0.0001) {
        const nx = dx / dist, ny = dy / dist;
        ball.x = cp.x + nx * minDist; ball.y = cp.y + ny * minDist;
        const vDotN = ball.vx * nx + ball.vy * ny;
        if (vDotN < 0) { ball.vx -= 1.7 * vDotN * nx; ball.vy -= 1.7 * vDotN * ny; }
        return true;
    }
    return false;
}

function spinnerTips(s) {
    return [
        { x: s.pivotX + Math.cos(s.angle) * s.armLength, y: s.pivotY + Math.sin(s.angle) * s.armLength },
        { x: s.pivotX - Math.cos(s.angle) * s.armLength, y: s.pivotY - Math.sin(s.angle) * s.armLength }
    ];
}

function resolveSpinnerCollision(ball, s) {
    const [tip1, tip2] = spinnerTips(s);
    let hit = false;
    [[s.pivotX, s.pivotY, tip1.x, tip1.y], [s.pivotX, s.pivotY, tip2.x, tip2.y]].forEach(([x1, y1, x2, y2]) => {
        const cp = closestPointOnSegment(ball.x, ball.y, x1, y1, x2, y2);
        const dx = ball.x - cp.x, dy = ball.y - cp.y;
        const dist = Math.hypot(dx, dy);
        const minDist = BALL_R + s.radius;
        if (dist < minDist && dist > 0.0001) {
            const nx = dx / dist, ny = dy / dist;
            ball.x = cp.x + nx * minDist; ball.y = cp.y + ny * minDist;
            const distFromPivot = Math.hypot(cp.x - s.pivotX, cp.y - s.pivotY);
            const tangentialSpeed = s.spinSpeed * distFromPivot;
            const tx = -Math.sin(s.angle), ty = Math.cos(s.angle);
            const vDotN = ball.vx * nx + ball.vy * ny;
            if (vDotN < 0) { ball.vx -= 1.5 * vDotN * nx; ball.vy -= 1.5 * vDotN * ny; }
            ball.vx += tx * tangentialSpeed * 1.2; ball.vy += ty * tangentialSpeed * 1.2;
            hit = true;
        }
    });
    return hit;
}

function updatePaddle(p) {
    const target = p.active ? p.activeAngle : p.restAngle;
    const diff = target - p.angle;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), p.maxAngularSpeed);
    p.angularVel = step;
    p.angle += step;
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
const kickers = buildKickers();
const spinner = buildSpinner();
const domeLights = buildDomeLights();
const paddles = buildPaddles();
const tethers = buildTethers(paddles);

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

let leftDown = false, rightDown = false;

document.addEventListener('keydown', e => {
    if (e.key === ' ') {
        e.preventDefault();
        if (!spaceDown && gameState === 'idle-spring') { spaceDown = true; chargeStartTime = performance.now(); }
    }
    if (e.key === 'ArrowLeft') { leftDown = true; e.preventDefault(); }
    if (e.key === 'ArrowRight') { rightDown = true; e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        paddles.forEach(p => { p.active = (p.side === 'left') ? leftDown : rightDown; });
    }
});
document.addEventListener('keyup', e => {
    if (e.key === ' ') {
        if (spaceDown) {
            spaceDown = false;
            if (gameState === 'idle-spring') launchBall();
        }
    }
    if (e.key === 'ArrowLeft') leftDown = false;
    if (e.key === 'ArrowRight') rightDown = false;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        paddles.forEach(p => { p.active = (p.side === 'left') ? leftDown : rightDown; });
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
    paddles.forEach(updatePaddle);
    spinner.angle += spinner.spinSpeed;

    if (gameState === 'in-play') {
        ball.vy += GRAVITY;
        ball.vx *= FRICTION; ball.vy *= FRICTION;
        const speed = Math.hypot(ball.vx, ball.vy);
        if (speed > MAX_SPEED) { ball.vx = ball.vx / speed * MAX_SPEED; ball.vy = ball.vy / speed * MAX_SPEED; }

        const stepVx = ball.vx / SUBSTEPS, stepVy = ball.vy / SUBSTEPS;
        for (let s = 0; s < SUBSTEPS; s++) {
            ball.x += stepVx; ball.y += stepVy;
            walls.forEach(w => resolveWallCollision(ball, w, now));
            tethers.forEach(t => resolveWallCollision(ball, t, now));
            kickers.forEach(k => resolveWallCollision(ball, k, now));
            bumpers.forEach(b => { if (resolveCircleCollision(ball, b, true, now)) addScore(150); });
            pegs.forEach(p => resolveCircleCollision(ball, p, false, now));
            paddles.forEach(p => resolvePaddleCollision(ball, p));
            resolveSpinnerCollision(ball, spinner);
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

function drawDomeLights(now) {
    const colors = ['#00f5d4', '#ff2f7e', '#00ff6a'];
    domeLights.forEach((l, i) => {
        const pulse = (Math.sin(now / 400 + i * 0.6) + 1) / 2; // 0..1
        const color = colors[l.colorIdx];
        ctx.beginPath();
        ctx.arc(l.x, l.y, 2.5 + pulse * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.4 + pulse * 0.6;
        ctx.shadowBlur = 8;
        ctx.shadowColor = color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    });
}

function drawBackgroundEmblem() {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★ NEON PINBALL ★', TABLE_W / 2, 560);
    ctx.restore();
}

function drawWallGlow() {
    const gradL = ctx.createLinearGradient(48.6, 0, 108.6, 0);
    gradL.addColorStop(0, 'rgba(0,245,212,0.10)');
    gradL.addColorStop(1, 'rgba(0,245,212,0)');
    ctx.fillStyle = gradL;
    ctx.fillRect(48.6, 150, 60, 480);

    const gradR = ctx.createLinearGradient(923.4, 0, 863.4, 0);
    gradR.addColorStop(0, 'rgba(255,47,126,0.10)');
    gradR.addColorStop(1, 'rgba(255,47,126,0)');
    ctx.fillStyle = gradR;
    ctx.fillRect(863.4, 150, 60, 480);
}

function drawPegs() {
    pegs.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color || '#5a6a8f';
        ctx.shadowBlur = 5;
        ctx.shadowColor = p.color || '#5a6a8f';
        ctx.fill();
        ctx.shadowBlur = 0;
    });
}

function drawKickers() {
    kickers.forEach(k => {
        ctx.beginPath();
        ctx.moveTo(k.x1, k.y1);
        ctx.lineTo(k.x2, k.y2);
        ctx.strokeStyle = '#ffb703';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffb703';
        ctx.stroke();
        ctx.shadowBlur = 0;
    });
}

function drawSpinner() {
    const [tip1, tip2] = spinnerTips(spinner);
    ctx.beginPath();
    ctx.moveTo(tip1.x, tip1.y);
    ctx.lineTo(tip2.x, tip2.y);
    ctx.strokeStyle = '#e6e6f0';
    ctx.lineWidth = spinner.radius * 2;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#e6e6f0';
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(spinner.pivotX, spinner.pivotY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#3a3a4a';
    ctx.fill();
}

function drawBumpers(now) {
    bumpers.forEach(b => {
        const hitRecently = now - b.lastHit < 150;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = hitRecently ? '#ffffff' : b.color;
        ctx.shadowBlur = hitRecently ? 26 : 14;
        ctx.shadowColor = b.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(6,4,15,0.6)';
        ctx.fill();
    });
}

function drawPaddles() {
    paddles.forEach(p => {
        const tip = paddleTip(p);
        ctx.beginPath();
        ctx.moveTo(p.pivotX, p.pivotY);
        ctx.lineTo(tip.x, tip.y);
        ctx.strokeStyle = '#ff2f7e';
        ctx.lineWidth = p.radius * 2;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff2f7e';
        ctx.stroke();
        ctx.shadowBlur = 0;
    });
}

function drawTethers() {
    // piccoli tiranti sottili grigi, a molla, dal perno del paddle fino al pavimento sottostante
    paddles.forEach(p => {
        const x = p.pivotX, yTop = p.pivotY, yBottom = 650;
        const segments = 5;
        const amp = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, yTop);
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const y = yTop + (yBottom - yTop) * t;
            const dx = (i % 2 === 0) ? amp : -amp;
            ctx.lineTo(x + dx, y);
        }
        ctx.lineTo(x, yBottom);
        ctx.strokeStyle = '#8a8a9a';
        ctx.lineWidth = 1.3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
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
    drawWallGlow();
    drawBackgroundEmblem();
    drawWalls(now);
    drawDomeLights(now);
    drawKickers();
    drawPegs();
    drawBumpers(now);
    drawSpinner();
    drawPaddles();
    drawTethers();
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
