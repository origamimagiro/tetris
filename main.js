// https://tetris.wiki/Tetromino
const COLORS = {
    B: "white",
    X: "lightgray",
    F: "pink",
    I: "cyan",
    O: "yellow",
    J: "blue",
    L: "orange",
    S: "green",
    Z: "red",
    T: "purple",
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
const START_X = 6;

const main = () => {
    document.body.style.background = COLORS.X;
    const G = {
        B: Array(24).fill().map(() => Array(10).fill()),
        P: [], t: 'I', x: 0, y: START_Y, r: 0, m: 20,
        end: true, i: 0, swap: true,
        round: 1, stage: 0, lines: 0, score: 0, drop: 0,
    };
    make_gui(G);
    document.onkeydown = (e) => process(G, e.keyCode);
    clear_board(G.B);
    draw(G);
};

const next_piece = (G) => {
    G.t = G.P.pop();
    G.x = START_X - (SHAPES[G.t].length >> 1);
    G.y = START_Y;
    G.r = 0;
    if (G.P.length == 0) { refill(G.P); }
};

const update = (G, i) => {
    if ((G.i != i) || G.end) { return; }
    if (G.P.length == 0) { refill(G.P); }
    G.y--;
    if (!check(G)) {
        G.y++;
        place(G);
    }
    draw(G);
    if (G.end) { return; }
    window.setTimeout(() => update(G, i), STEPS[G.stage]);
};

const process = (G, k) => {
    if (G.end) {
        for (const c of [32, 37, 38, 39, 40, 67, 90]) {
            if (c == k) { return; }
        }
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
        G.i = 0;
        draw(G);
        window.setTimeout(() => update(G, 0), STEPS[G.stage]);
        return;
    }
    switch (k) {
        case 37: // LEFT
            --G.x;
            if (!check(G)) { ++G.x; }
            break;
        case 39: // RIGHT
            ++G.x;
            if (!check(G)) { --G.x; }
            break;
        case 40: // DOWN
            --G.y;
            if (!check(G)) {
                ++G.y;
                place(G);
            }
            break;
        case 38: // UP
            const r = G.r;
            G.r = (G.r + 3) % 4;
            const rk = `${r},${G.r}`;
            for (const [x, y] of ((G.t == 'I') ? KICKS_I : KICKS)[rk]) {
                G.x += x;
                G.y += y;
                if (check(G)) { break; }
                G.x -= x;
                G.y -= y;
            }
            if (!check(G)) { G.r = (G.r + 1) % 4; }
            break;
        case 90: // Z
            G.r = (G.r + 1) % 4;
            if (!check(G)) { G.r = (G.r + 3) % 4; }
            break;
        case 32: // DROP
            G.drop = G.y + 1;
            while (check(G)) { --G.y; }
            ++G.y;
            G.drop -= G.y;
            place(G);
            G.drop = 0;
            break;
        case 67: // SWAP
            if (!G.swap) { return; }
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
            ) {
                return false;
            }
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

const make_gui = (G) => {
    for (const [id, text, x, y] of [
        ["title", "Tetris", 20, 10],
        ["score", "Score:", 240, 10],
        ["score_val", "0", 300, 10],
        ["round", "Round:", 240, 50],
        ["round_val", "1", 300, 50],
        ["stage", "Stage:", 240, 75],
        ["stage_val", "1", 300, 75],
        ["lines", "Lines:", 240, 100],
        ["lines_val", "0", 300, 100],
        ["end", "", 240, 150],
        ["next", "Next:", 240, 340],
        ["copyright", `
© Jason S. Ku 2025
<a href="https://origamimagiro.github.io/tetris/">
Code on Github</a>`, 20, 350],
    ]) {
        const el = document.createElement("div");
        el.style.position = "absolute";
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.innerHTML = text;
        el.style.fontFamily = "monospace";
        el.id = id;
        document.body.appendChild(el);
    }
    const n = G.B[0].length;
    const size = 20;
    for (let y = 0; y < G.m; ++y) {
        for (let x = 0; x < n; ++x) {
            const cell = document.createElement("div");
            cell.id = `B${x},${y}`;
            cell.style.position = "absolute";
            cell.style.height
                = cell.style.width
                = `${size}px`;
            cell.style.left = `${size*(1 + x)}px`;
            cell.style.top = `${size*(21 - y)}px`;
            document.body.appendChild(cell);
        }
    }
    for (let y = 0; y < 4; ++y) {
        for (let x = 0; x < 4; ++x) {
            const cell = document.createElement("div");
            cell.id = `P${x},${y}`;
            cell.style.position = "absolute";
            cell.style.height
                = cell.style.width
                = `${size}px`;
            cell.style.left = `${size*(12 + x)}px`;
            cell.style.top = `${size*(21 - y)}px`;
            document.body.appendChild(cell);
        }
    }
};

const print_board = (G) => {
    const S = G.B.map((R, y) => R.map((c, x) => (c == 'B') ? '.' : c));
    const m = G.B.length;
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
            S[y_][x_] = G.t;
        }
    }
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

const draw = (G) => {
    const n = G.B[0].length;
    const lost = G.end && (G.lines < WIN_LINES) && (G.P.length > 0);
    for (let y = 0; y < G.m; ++y) {
        for (let x = 0; x < n; ++x) {
            const c = G.B[y][x];
            draw_cell(`B${x},${y}`, (lost && (c == 'B')) ? 'F' : c);
        }
    }
    const shape = rotated_piece(G.t, G.r);
    const s = shape.length;
    for (let y = 0; y < s; ++y) {
        const y_ = G.y + y;
        if ((y_ < 0) || (y_ >= G.m)) { continue; }
        for (let x = 0; x < s; ++x) {
            if (shape[y][x] != '#') { continue; }
            const x_ = G.x + x;
            if ((x_ < 0) || (x_ >= n)) { continue; }
            draw_cell(`B${x_},${y_}`, G.t);
        }
    }
    for (const s of ["lines", "stage", "round", "score"]) {
        const el = document.getElementById(`${s}_val`);
        el.innerHTML = `${G[s]}`;
    }
    document.getElementById("end").innerHTML =
        (!G.end || G.P.length == 0) ? "" : (
        (G.lines < WIN_LINES) ? "GAME OVER" : (
        (G.stage + 1 == NUM_STAGES) ? (
            (G.round == NUM_ROUNDS) ? "GAME COMPLETE!" : "ROUND COMPLETE!"
        ) : "STAGE COMPLETE!"
    ));
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

const draw_cell = (id, t) => {
    const cell = document.getElementById(id);
    cell.style.background = COLORS[t];
    cell.style.boxSizing = "border-box";
    cell.style.border = ((t == 'B') || (t == 'F'))
        ? "none"
        : `1px solid ${COLORS.X}`;
};

const place = (G) => {
    const m = G.B.length;
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
            G.B[y_][x_] = G.t;
        }
    }
    let cn = 0;
    for (let y = 0; y < m; ++y) {
        let filled = true;
        for (let x = 0; x < n; ++x) {
            if (G.B[y][x] == 'B') {
                filled = false;
                break;
            }
        }
        if (filled) { ++cn; continue; }
        for (let x = 0; x < n; ++x) {
            G.B[y - cn][x] = G.B[y][x];
        }
    }
    for (let y = m - cn; y < m; ++y) {
        for (let x = 0; x < n; ++x) {
            G.B[y][x] = 'B';
        }
    }
    G.lines += cn;
    G.score += POINTS[cn] + G.drop;
    next_piece(G);
    G.swap = true;
    if (G.lines >= WIN_LINES) { G.end = true; }
    if (!check(G)) { G.end = true; return; }
    ++G.i;
    const i = G.i;
    window.setTimeout(() => update(G, i), STEPS[G.stage]);
};

const rotate = (x, y, r, ox, oy) => {
    switch (r) {
        case 0: return [x, y];
        case 1: return [y - oy + ox, -(x - ox) + oy];
        case 2: return [-x + 2*ox, -y + 2*oy];
        case 3: return [-(y - oy) + ox, (x - ox) + oy];
    }
};

const rotated_piece = (type, r) => {
    const shape = SHAPES[type];
    const n = shape.length;
    const out = Array(n).fill().map(() => Array(n).fill(' '));
    const o = (n - 1)/2;
    for (let y = 0; y < n; ++y) {
        for (let x = 0; x < n; ++x) {
            const [x_, y_] = rotate(x, y, r, o, o);
            out[y][x] = shape[y_][x_];
        }
    }
    return out;
};

window.onload = () => main();
