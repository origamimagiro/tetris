// https://tetris.wiki/Tetromino
const CHARS = "IOJLSZT.,X";
const COLORS = ["cyan", "yellow", "blue", "orange",
    "green", "red", "purple", "white", "pink", "lightgray"];
const BLK = 7, END = 8, BKG = 9;

const P = [[-1, 1], [0, 1], [1, 1],          // 012
           [-1, 0], [0, 0], [1, 0], [2, 0]]; // 3456

const SHAPES = [[3, 4, 5, 6], [1, 2, 4, 5], [0, 3, 4, 5],
    [2, 3, 4, 5], [1, 2, 3, 4], [0, 1, 4, 5], [1, 3, 4, 5]];

const CENTERS = [[0.5, -0.5], [0.5, 0.5],
    [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];

// https://tetris.wiki/Super_Rotation_System
const kick = (r1, r2, t) => {
    const a = -1 + (((r1 == 1) || (r2 == 3)) << 1);
    if (CHARS[t] != 'I') {
        const b = -1 + 2*((r1 % 2) == 1);
        return [[0, 0], [a, 0], [a, -b], [0, 2*b], [a, 2*b]];
    } else {
        const c = 2 - ((r1 & 2) == (r2 & 2));
        const d = -1 + 2*((r1 == 0) || (r2 == 2));
        const e = 3 - c, f = -e*d, g = c*d;
        return [[0, 0], [f, 0], [g, 0], [f, c*a], [g, -e*a]];
    }
};

// https://tetris.wiki/Scoring
const POINTS = [0, 40, 100, 300, 1200];

// https://tetris.wiki/Tetris_(Famicom)
const TIMES = [1333, 1083, 833, 667, 533, 417, 333, 283, 250, 217];
const NUM_STAGES = TIMES.length;
const NUM_ROUNDS = 6;
const WIN_LINES = 25;

// https://mixbutton.com/music-tools/frequency-and-pitch/music-note-to-frequency-chart
const NOTES = [
    415.30, // 0: G#
    440.00, // 1: A
    493.88, // 2: B
    523.25, // 3: C
    587.33, // 4: D
    659.25, // 5: E
    698.46, // 6: F
    783.99, // 7: G
    830.61, // 8: G#
    880.00, // 9: A
];

// http://www.jk-quantized.com/blog/2013/11/22/tetris-theme-song-using-processing
const TUNE = [
    [5, 2], [2, 1], [3, 1], [4, 2], [3, 1], [2, 1], [1, 2], [1, 1], [3, 1],
    [5, 2], [4, 1], [3, 1], [2, 3], [3, 1], [4, 2], [5, 2], [3, 2], [1, 2],
    [1, 5], [4, 2], [6, 1], [9, 2], [7, 1], [6, 1], [5, 3], [3, 1], [5, 2],
    [4, 1], [3, 1], [2, 2], [2, 1], [3, 1], [4, 2], [5, 2], [3, 2], [1, 2],
    [1, 4], [5, 4], [3, 4], [4, 4], [2, 4], [3, 4], [1, 4], [0, 4], [2, 4],
    [5, 4], [3, 4], [4, 4], [2, 4], [3, 2], [5, 2], [9, 2], [9, 2], [8, 8],
];

const play_note = (G, i = G.game, note = 0) => {
    if (i != G.game) { return; }
    const [f, t] = TUNE[note];
    const time = (TIMES[G.stage - 1]*0.1 + 90)*t;
    G.oscillator = new OscillatorNode(G.audioCtx, {
        type: 'square', frequency: NOTES[f]});
    G.oscillator.connect(G.volume);
    G.oscillator.start();
    G.oscillator.stop(G.audioCtx.currentTime + 0.0007*time);
    window.setTimeout(() => play_note(G, i, (note + 1) % TUNE.length), time);
};

const main = () => {
    document.body.style.background = COLORS[BKG];
    const title = document.createElement("title");
    title.innerHTML = "Tetris";
    document.head.appendChild(title);
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const volume = audioCtx.createGain();
    volume.connect(audioCtx.destination);
    volume.gain.value = 0.002;
    const G = {
        B: Array(24).fill().map(() => Array(10).fill()),
        P: Array(7).fill().map((_, i) => i),
        t: 0, t_: 0, i: 0, x: 0, y: 0, r: 0, m: 20,
        running: false, lost: false, hold: true, game: 0,
        round: 1, stage: 1, lines: 0, score: 0,
        audioCtx, volume, oscillator: undefined,
    };
    const GUI = [
        ["title", "Tetris", 25, 15],
        ["end", "", 240, 150],
        ["control", "Start [Return]<br>" +
            "Move [Arrows]<br>Drop [Space]<br>" +
            "Rotate [Z and Up]<br>Hold [C]", 240, 240],
        ["next", "Hold:", 240, 350],
        ["copyright", "© Jason S. Ku 2025 " +
            "<a href='https://github.com/origamimagiro/tetris'>" +
            "Code on Github</a>", 25, 460],
    ];
    for (const [stat, y] of [
        ["Score", 15], ["Round", 50], ["Stage", 75], ["Lines", 100]
    ]) {
        const id = stat.toLowerCase();
        GUI.push([id, stat + ":", 240, y]);
        GUI.push([`${id}_val`, "", 300, y]);
    }
    for (const [id, text, x, y] of GUI) {
        const el = document.createElement("div");
        fill_el(el, {id, innerHTML: text}, {
            position: "absolute",
            left: `${x}px`,
            top: `${y}px`,
            fontFamily: "monospace",
        });
        document.body.appendChild(el);
    }
    const n = G.B[0].length;
    const size = 20;
    const make_cell = (c, x, y, ox, oy) => {
        const cell = document.createElement("div");
        fill_el(cell, {id: `${c}${x},${y}`}, {
            position: "absolute",
            height: `${size}px`, top: `${size*(oy - y)}px`,
            width: `${size}px`, left: `${size*(ox + x)}px`,
        });
        document.body.appendChild(cell);
    };
    for (let y = 0; y < G.m; ++y) {
        for (let x = 0; x < n; ++x) {
            make_cell('B', x, y, 1, 21);
        }
    }
    for (const [x, y] of P) {
        make_cell('P', x, y, 13, 20);
    }
    clear_board(G);
    draw(G);
    document.onkeydown = (e) => process(G, e);
};

const update = (G, game) => {
    if (!G.running || (G.game != game)) { return; }
    G.y--;
    if (!check(G)) {
        G.y++;
        place(G);
    }
    draw(G);
    if (!G.running) { return; }
    window.setTimeout(() => update(G, game), TIMES[G.stage - 1]);
};

const start_piece = (G) => { G.x = 4, G.y = 20, G.r = 0; }

const process = (G, e) => {
    const k = e.keyCode;
    if (k == 13) {  // ENTER (RESTART)
        if ((G.lines < WIN_LINES) || (
            (G.stage == NUM_STAGES) && (G.round == NUM_ROUNDS)
        )) {
            G.score = 0;
            G.stage = G.round = 1;
        } else {
            if (G.stage == NUM_STAGES) {
                G.stage = 1;
                ++G.round;
            } else {
                ++G.stage;
            }
        }
        G.lines = 0;
        clear_board(G);
        G.running = !G.running;
        if (G.running) {
            G.lost = false;
            update(G, G.game);
            play_note(G);
        } else {
            G.oscillator.stop();
            ++G.game;
            draw(G);
        }
        return;
    }
    if (!G.running) { return; }
    switch (k) {
        case 37: // LEFT
        case 39: // RIGHT
            const d = (k == 37) ? -1 : 1;
            G.x += d;
            if (!check(G)) { G.x -= d; }
            break;
        case 40: // DOWN
            --G.y;
            if (!check(G)) { ++G.y; place(G); }
            break;
        case 38: // UP (ROTATE CW)
        case 90: // Z  (ROTATE CCW)
            const a = (k == 38) ? 3 : 1;
            const r = G.r;
            G.r = (G.r + a) % 4;
            for (const [x, y] of kick(r, G.r, G.t)) {
                G.x += x; G.y += y;
                if (check(G)) { break; }
                G.x -= x; G.y -= y;
            }
            if (!check(G)) { G.r = (G.r + a + 2) % 4; }
            break;
        case 32: // SPACE DROP
            let drop = G.y + 1;
            do { --G.y; } while (check(G))
            ++G.y;
            drop -= G.y;
            place(G, drop);
            break;
        case 67: // C HOLD
            if (!G.hold) { return; }
            [G.t, G.t_] = [G.t_, G.t];
            start_piece(G);
            G.hold = false;
            break;
    }
    draw(G);
};

const check = (G) => {
    const m = G.B.length;
    const n = G.B[0].length;
    for (const [x, y] of rotated_piece(G.t, G.r)) {
        const y_ = y + G.y;
        const x_ = x + G.x;
        if ((y_ < 0) || (y_ >= m + 4) ||
            (x_ < 0) || (x_ >= n) ||
            ((y_ < m) && (G.B[y_][x_] != BLK))
        ) { return false; }
    }
    return true;
};

const shuffle = (A) => {
    for (let i = A.length - 1; i >= 0; --i) {
        const j = Math.floor(Math.random()*i);
        [A[i], A[j]] = [A[j], A[i]];
    }
};

const fill_el = (el, att, sty = {}) => {
    for (const [k, v] of Object.entries(att)) { el[k] = v; }
    for (const [k, v] of Object.entries(sty)) { el.style[k] = v; }
};

const draw_cell = (id, t) => {
    fill_el(document.getElementById(id), {}, {
        background: COLORS[t],
        boxSizing: "border-box",
        border: (t > 6) ? "none" : `1px solid ${COLORS[BKG]}`,
    });
};

const draw = (G) => {
    for (const s of ["lines", "stage", "round", "score"]) {
        fill_el(document.getElementById(`${s}_val`), {innerHTML: `${G[s]}`});
    }
    fill_el(document.getElementById("end"), {innerHTML:
        G.lost ? "GAME OVER" : (
        (G.running || (G.lines == 0)) ? "" : (
        (G.stage == NUM_STAGES) ? (
            (G.round == NUM_ROUNDS) ? "GAME COMPLETE!" : "ROUND COMPLETE!"
        ) : "STAGE COMPLETE!"))
    }, {});
    const n = G.B[0].length;
    for (let y = 0; y < G.m; ++y) {
        for (let x = 0; x < n; ++x) {
            const c = G.B[y][x];
            draw_cell(`B${x},${y}`, (G.lost && (c == BLK)) ? END : c);
        }
    }
    for (const [x, y] of P) {
        draw_cell(`P${x},${y}`, BKG);
    }
    if (!(G.running || G.lost)) { return; }
    for (const i of SHAPES[G.t_]) {
        draw_cell(`P${P[i][0]},${P[i][1]}`, G.t_);
    }
    process_piece(G, (x, y) => draw_cell(`B${x},${y}`, G.t), G.m);
};

const print_board = (G) => {
    const S = G.B.map((R, y) => R.map((c, x) => CHARS[c]));
    if (!(G.running || G.lost)) { process_piece(G, (x, y) => S[y][x] = G.t); }
    S.reverse();
    console.log(S.map(R => R.join("")).join("\n"));
};

const clear_board = (G) => {
    const m = G.B.length;
    const n = G.B[0].length;
    for (let y = 0; y < m; ++y) {
        for (let x = 0; x < n; ++x) {
            G.B[y][x] = BLK;
        }
    }
    shuffle(G.P);
    [G.t, G.t_] = [G.P[0], G.P[1]];
    G.i = 2;
    start_piece(G);
};

const process_piece = (G, f, m = G.B.length) => {
    const n = G.B[0].length;
    for (const [x, y] of rotated_piece(G.t, G.r)) {
        const x_ = G.x + x;
        const y_ = G.y + y;
        if ((x_ < 0) || (x_ >= n)) { continue; }
        if ((y_ < 0) || (y_ >= m)) { continue; }
        f(x_, y_);
    }
};

const place = (G, drop = 0) => {
    process_piece(G, (x, y) => G.B[y][x] = G.t);
    const m = G.B.length;
    const n = G.B[0].length;
    let cleared = 0;
    for (let y = 0; y < m; ++y) {
        let filled = true;
        for (let x = 0; x < n; ++x) {
            if (G.B[y][x] == BLK) {
                filled = false;
                break;
            }
        }
        if (filled) { ++cleared; }
        const y_ = filled ? y : (y - cleared);
        for (let x = 0; x < n; ++x) {
            G.B[y_][x] = filled ? BLK : G.B[y][x];
        }
    }
    G.lines += cleared;
    G.score += POINTS[cleared] + drop;
    [G.t, G.t_] = [G.t_, G.P[G.i++]];
    if (G.i == G.P.length) {
        shuffle(G.P);
        G.i = 0;
    }
    start_piece(G);
    G.hold = true;
    G.lost = !check(G);
    if (G.lost || (G.lines >= WIN_LINES)) {
        G.running = false;
        ++G.game;
        G.oscillator.stop();
    }
};

const rotated_piece = (type, r) => {
    const out = SHAPES[type].map(i => P[i]);
    const [ox, oy] = CENTERS[type];
    for (let i = 0; i < r; ++i) {
        for (let j = 0; j < 4; ++j) {
            const [x, y] = out[j];
            out[j] = [y - oy + ox, -x + ox + oy];
        }
    }
    return out;
};

window.onload = () => main();
