const GUI = [
    ["title", "Tetris", 25, 15],
    ["score", "Score:", 240, 15],
    ["score_val", "0", 300, 15],
    ["round", "Round:", 240, 50],
    ["round_val", "1", 300, 50],
    ["stage", "Stage:", 240, 75],
    ["stage_val", "1", 300, 75],
    ["lines", "Lines:", 240, 100],
    ["lines_val", "0", 300, 100],
    ["end", "", 240, 150],
    ["control", "Start [Return]<br>" +
        "Move [Arrows]<br>" +
        "Drop [Space]<br>" +
        "Rotate [Z and Up]<br>" +
        "Hold [C]", 240, 240],
    ["next", "Next:", 240, 340],
    ["copyright", "© Jason S. Ku 2025 " +
        "<a href='https://github.com/origamimagiro/tetris'>" +
        "Code on Github</a>", 25, 460],
];

// https://tetris.wiki/Tetromino
const COLORS = {
    B: "white",  X: "lightgray",
    F: "pink",   I: "cyan",  O: "yellow", J: "blue",
    L: "orange", S: "green", Z: "red",    T: "purple",
};

const SHAPES = {
    I: ["    ", "####", "    ", "    "],
    O: ["    ", " ## ", " ## ", "    "],
    J: ["   ", "###", "#  "],
    L: ["   ", "###", "  #"],
    S: ["   ", "## ", " ##"],
    Z: ["   ", " ##", "## "],
    T: ["   ", "###", " # "],
};

// https://tetris.wiki/Super_Rotation_System
const KICKS = {
    "0,3": [[0, 0], [-1, 0], [-1, 1], [0,-2], [-1,-2]],
    "3,0": [[0, 0], [ 1, 0], [ 1,-1], [0, 2], [ 1, 2]],
    "3,2": [[0, 0], [ 1, 0], [ 1,-1], [0, 2], [ 1, 2]],
    "2,3": [[0, 0], [-1, 0], [-1, 1], [0,-2], [-1,-2]],
    "2,1": [[0, 0], [ 1, 0], [ 1, 1], [0,-2], [ 1,-2]],
    "1,2": [[0, 0], [-1, 0], [-1,-1], [0, 2], [-1, 2]],
    "1,0": [[0, 0], [-1, 0], [-1,-1], [0, 2], [-1, 2]],
    "0,1": [[0, 0], [ 1, 0], [ 1, 1], [0,-2], [ 1,-2]],
};

const KICKS_I = {
    "0,1": [[0, 0], [-2, 0], [ 1, 0], [-2,-1], [ 1, 2]],
    "1,0": [[0, 0], [ 2, 0], [-1, 0], [ 2, 1], [-1,-2]],
    "1,2": [[0, 0], [-1, 0], [+2, 0], [-1, 2], [ 2,-1]],
    "2,1": [[0, 0], [ 1, 0], [-2, 0], [ 1,-2], [-2, 1]],
    "2,3": [[0, 0], [ 2, 0], [-1, 0], [ 2, 1], [-1,-2]],
    "3,2": [[0, 0], [-2, 0], [ 1, 0], [-2,-1], [ 1, 2]],
    "3,0": [[0, 0], [ 1, 0], [-2, 0], [ 1,-2], [-2, 1]],
    "0,3": [[0, 0], [-1, 0], [ 2, 0], [-1, 2], [ 2,-1]],
};

// https://tetris.wiki/Scoring
const POINTS = [0, 40, 100, 300, 1200];

// https://tetris.wiki/Tetris_(Famicom)
const STEPS = [1333, 1083, 833, 667, 533, 417, 333, 283, 250, 217];

const WIN_LINES = 25;
const NUM_STAGES = 10;
const NUM_ROUNDS = 6;

const START_Y = 19;
const START_X = 5;

const main = () => {
    document.body.style.background = COLORS.X;
    const G = {
        B: Array(24).fill().map(() => Array(10).fill()),
        P: [], t: 'I', x: 0, y: START_Y, r: 0, m: START_Y + 1,
        end: true, hold: true,
        round: 1, stage: 0, lines: 0, score: 0, drop: 0,
    };
    make_gui(G);
    clear_board(G.B);
    draw(G);
    document.onkeydown = (e) => process(G, e.keyCode);
};

const next_piece = (G) => {
    G.t = G.P.pop();
    G.x = START_X - Math.floor(SHAPES[G.t].length/2);
    G.y = START_Y;
    G.r = 0;
    if (G.P.length == 0) { refill(G.P); }
};

const update = (G) => {
    if (G.end) { return; }
    if (G.P.length == 0) { refill(G.P); }
    G.y--;
    if (!check(G)) {
        G.y++;
        place(G);
    }
    draw(G);
    if (G.end) { return; }
    window.setTimeout(() => update(G), STEPS[G.stage]);
};

const process = (G, k) => {
    if (k == 13) {  // ENTER RESTART
        G.end = false;
        if ((G.lines < WIN_LINES) || (
            (G.stage + 1 == NUM_STAGES) && (G.round == NUM_ROUNDS)
        )) {
            G.stage = 0;
            G.round = 1;
            G.score = 0;
        } else {
            if (G.stage + 1 == NUM_STAGES) {
                G.stage = 0;
                ++G.round;
            } else {
                ++G.stage;
            }
        }
        G.lines = 0;
        clear_board(G.B);
        G.P.length = 0;
        refill(G.P);
        next_piece(G);
        --G.y;
        draw(G);
        update(G);
        return;
    }
    if (G.end) { return; }
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
        case 38: // UP ROTATE CW
        case 90: // Z  ROTATE CCW
            const a = (k == 38) ? 3 : 1;
            const r = G.r;
            G.r = (G.r + a) % 4;
            const rk = `${r},${G.r}`;
            for (const [x, y] of ((G.t == 'I') ? KICKS_I : KICKS)[rk]) {
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
            const t = G.t;
            next_piece(G);
            G.P.push(t);
            G.swap = false;
            break;
        default:
            break;
    }
    draw(G);
};

const check = (G) => {
    const m = G.B.length;
    const n = G.B[0].length;
    const shape = rotated_piece(G.t, G.r);
    const s = shape.length;
    for (let y = 0; y < s; ++y) {
        for (let x = 0; x < s; ++x) {
            if (shape[y][x] == ' ') { continue; }
            const y_ = y + G.y;
            const x_ = x + G.x;
            if ((y_ < 0) || (y_ >= m + 4) ||
                (x_ < 0) || (x_ >= n) ||
                ((y_ < m) && (G.B[y_][x_] != 'B'))
            ) { return false; }
        }
    }
    return true;
};

const refill = (next) => {
    for (const t of "IOJLSZT") { next.push(t); }
    for (let i = next.length - 1; i >= 0; --i) {
        const j = Math.floor(Math.random()*i);
        [next[i], next[j]] = [next[j], next[i]];
    }
};

const fill_el = (el, att, sty = {}) => {
    for (const [k, v] of Object.entries(att)) { el[k] = v; }
    for (const [k, v] of Object.entries(sty)) { el.style[k] = v; }
};

const make_gui = (G) => {
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
    for (let y = 0; y < G.m; ++y) {
        for (let x = 0; x < n; ++x) {
            const cell = document.createElement("div");
            fill_el(cell, {id: `B${x},${y}`}, {
                position: "absolute",
                height: `${size}px`,
                width: `${size}px`,
                left: `${size*(1 + x)}px`,
                top: `${size*(21 - y)}px`,
            });
            document.body.appendChild(cell);
        }
    }
    for (let y = 0; y < 4; ++y) {
        for (let x = 0; x < 4; ++x) {
            const cell = document.createElement("div");
            fill_el(cell, {id: `P${x},${y}`}, {
                position: "absolute",
                height: `${size}px`,
                width: `${size}px`,
                left: `${size*(12 + x)}px`,
                top: `${size*(21 - y)}px`,
            });
            document.body.appendChild(cell);
        }
    }
};

const draw = (G) => {
    const draw_cell = (id, t) => {
        const empty = (t == 'B') || (t == 'F');
        fill_el(document.getElementById(id), {}, {
            background: COLORS[t],
            boxSizing: "border-box",
            border: empty ? "none" : `1px solid ${COLORS.X}`,
        });
    };
    const n = G.B[0].length;
    const lost = G.end && (G.lines < WIN_LINES) && (G.P.length > 0);
    for (let y = 0; y < G.m; ++y) {
        for (let x = 0; x < n; ++x) {
            const c = G.B[y][x];
            draw_cell(`B${x},${y}`, (lost && (c == 'B')) ? 'F' : c);
        }
    }
    process_piece(G, (x, y) => draw_cell(`B${x},${y}`, G.t), G.m);
    const shape = rotated_piece(G.t, G.r);
    const s = shape.length;
    for (let y = 0; y < s; ++y) {
        const y_ = G.y + y;
        if ((y_ < 0) || (y_ >= G.m)) { continue; }
        for (let x = 0; x < s; ++x) {
            if (shape[y][x] != '#') { continue; }
            const x_ = G.x + x;
            if ((x_ < 0) || (x_ >= n)) { continue; }
        }
    }
    for (const s of ["lines", "stage", "round", "score"]) {
        fill_el(document.getElementById(`${s}_val`), {innerHTML: `${G[s]}`});
    }
    fill_el(document.getElementById("end"), {innerHTML:
        (!G.end || G.P.length == 0) ? "" : (
        (G.lines < WIN_LINES) ? "GAME OVER" : (
        (G.stage + 1 == NUM_STAGES) ? (
            (G.round == NUM_ROUNDS) ? "GAME COMPLETE!" : "ROUND COMPLETE!"
        ) : "STAGE COMPLETE!"))
    }, {});
    if (G.end || (G.P.length < 1)) { return; }
    const type = G.P[G.P.length - 1];
    const shape_ = SHAPES[type];
    const s_ = shape_.length;
    for (let y = 0; y < 4; ++y) {
        for (let x = 0; x < 4; ++x) {
            const t = ((y < s_) && (x < s_)) ? shape_[y][x] : ' ';
            draw_cell(`P${x},${y}`, (t == ' ') ? 'X' : type);
        }
    }
};

const print_board = (G) => {
    const S = G.B.map((R, y) => R.map((c, x) => (c == 'B') ? '.' : c));
    process_piece(G, (x, y) => S[y][x] = G.t);
    S.reverse();
    console.log(S.map(R => R.join("")).join("\n"));
};

const clear_board = (B) => {
    const m = B.length;
    const n = B[0].length;
    for (let y = 0; y < m; ++y) {
        for (let x = 0; x < n; ++x) {
            B[y][x] = 'B';
        }
    }
};

const process_piece = (G, f, m = G.B.length) => {
    const n = G.B[0].length;
    const shape = rotated_piece(G.t, G.r);
    const s = shape.length;
    for (let y = 0; y < s; ++y) {
        const y_ = G.y + y;
        if ((y_ < 0) || (y_ >= m)) { continue; }
        for (let x = 0; x < s; ++x) {
            if (shape[y][x] != '#') { continue; }
            const x_ = G.x + x;
            if ((x_ < 0) || (x_ >= n)) { continue; }
            f(x_, y_);
        }
    }
};

const place = (G, drop = 0) => {
    process_piece(G, (x, y) => G.B[y][x] = G.t);
    const m = G.B.length;
    const n = G.B[0].length;
    let cn = 0;
    for (let y = 0; y < m; ++y) {
        let filled = true;
        for (let x = 0; x < n; ++x) {
            if (G.B[y][x] == 'B') {
                filled = false;
                break;
            }
        }
        if (filled) { ++cn; }
        const y_ = filled ? y : (y - cn);
        for (let x = 0; x < n; ++x) {
            G.B[y_][x] = filled ? 'B' : G.B[y][x];
        }
    }
    G.lines += cn;
    G.score += POINTS[cn] + drop;
    next_piece(G);
    G.swap = true;
    if ((G.lines >= WIN_LINES) || !check(G)) { G.end = true; }
};

const rotated_piece = (type, r) => {
    const S = SHAPES[type];
    const n = S.length;
    const out = Array(n).fill().map(() => Array(n).fill(' '));
    const O = Array(4);
    for (let y = 0; y < n; ++y) {
        O[1] = y; O[3] = n - 1 - y;
        for (let x = 0; x < n; ++x) {
            O[0] = x; O[2] = n - 1 - x;
            out[y][x] = S[O[(r + 1) % 4]][O[r]];
        }
    }
    return out;
};

window.onload = () => main();
