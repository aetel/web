// Motor numerico y de dibujo compartido por todos los widgets de subjects.

const cssVar = (n, fb) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || fb;

export const C = {
	get main() { return cssVar("--color-primary-dark", "#007d75"); },
	get fg() { return cssVar("--color-text", "#1b1b1b"); },
	get mut() { return cssVar("--color-muted", "#5a5a5a"); },
	get grid() { return cssVar("--color-border", "#e6e6e6"); },
	blue: "#1f4e9c",
	red: "#c0392b",
	green: "#2e8b57",
	orange: "#e67e22"
};

export const f2 = (x) => (isFinite(x) ? x.toFixed(2) : "–");

// ---------- polinomios ----------
export function conv(a, b) {
	const r = new Array(a.length + b.length - 1).fill(0);
	for (let i = 0; i < a.length; i++) {
		for (let j = 0; j < b.length; j++) {
			r[i + j] += a[i] * b[j];
		}
	}
	return r;
}

export function padd(a, b) {
	const n = Math.max(a.length, b.length);
	const r = new Array(n).fill(0);
	a.forEach((v, i) => { r[n - a.length + i] += v; });
	b.forEach((v, i) => { r[n - b.length + i] += v; });
	return r;
}

// Raices por Durand-Kerner. Devuelve [[re, im], ...]
export function roots(p) {
	const n = p.length - 1;
	const q = p.map((x) => x / p[0]);
	const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
	const div = (a, b) => {
		const d = b[0] * b[0] + b[1] * b[1];
		return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
	};
	let r = [];
	for (let i = 0; i < n; i++) {
		const ang = 2 * Math.PI * i / n + 0.4;
		r.push([Math.cos(ang) * 1.5, Math.sin(ang) * 1.5]);
	}
	for (let it = 0; it < 500; it++) {
		r = r.map((z, i) => {
			let h = [1, 0];
			for (let k = 1; k <= n; k++) {
				h = mul(h, z);
				h = [h[0] + q[k], h[1]];
			}
			let den = [1, 0];
			for (let j = 0; j < n; j++) {
				if (j !== i) {
					den = mul(den, [z[0] - r[j][0], z[1] - r[j][1]]);
				}
			}
			const d = div(h, den);
			return [z[0] - d[0], z[1] - d[1]];
		});
	}
	return r;
}

// ---------- simulacion ----------
// Continua: num/den en potencias descendentes de s; u(t) entrada. RK4.
export function simulate(num, den, u, T, dt) {
	const lead = den[0];
	const a = den.map((x) => x / lead).reverse();
	const b = new Array(a.length).fill(0);
	num.map((x) => x / lead).reverse().forEach((v, i) => { b[i] = v; });
	const n = a.length - 1;
	const c = [];
	for (let k = 0; k < n; k++) {
		c.push(b[k] - b[n] * a[k]);
	}
	const f = (x, t) => {
		const d = new Array(n);
		for (let i = 0; i < n - 1; i++) {
			d[i] = x[i + 1];
		}
		let s = u(t);
		for (let k = 0; k < n; k++) {
			s -= a[k] * x[k];
		}
		d[n - 1] = s;
		return d;
	};
	let x = new Array(n).fill(0);
	const ts = [];
	const ys = [];
	const steps = Math.round(T / dt);
	const every = Math.max(1, Math.floor(steps / 600));
	for (let i = 0; i <= steps; i++) {
		const t = i * dt;
		if (i % every === 0) {
			let y = b[n] * u(t);
			for (let k = 0; k < n; k++) {
				y += c[k] * x[k];
			}
			ts.push(t);
			ys.push(y);
		}
		const k1 = f(x, t);
		const k2 = f(x.map((v, j) => v + dt / 2 * k1[j]), t + dt / 2);
		const k3 = f(x.map((v, j) => v + dt / 2 * k2[j]), t + dt / 2);
		const k4 = f(x.map((v, j) => v + dt * k3[j]), t + dt);
		x = x.map((v, j) => v + dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
	}
	return { t: ts, y: ys };
}

// Discreta: escalon unitario. num/den en potencias descendentes de z.
export function simDisc(num, den, N) {
	const n = den.length - 1;
	const a = den.map((x) => x / den[0]);
	const b = new Array(den.length - num.length).fill(0).concat(num.map((x) => x / den[0]));
	const y = new Array(N).fill(0);
	for (let k = 0; k < N; k++) {
		let s = 0;
		for (let i = 0; i <= n; i++) {
			if (k - i >= 0) {
				s += b[i];
			}
		}
		for (let i = 1; i <= n; i++) {
			if (k - i >= 0) {
				s -= a[i] * y[k - i];
			}
		}
		y[k] = s;
	}
	return y;
}

// tiempo de establecimiento real (ultima salida de la banda del 5 %) y sobreimpulso
export function measure(t, y) {
	const yf = y[y.length - 1];
	let ts = 0;
	for (let i = y.length - 1; i >= 0; i--) {
		if (Math.abs(y[i] - yf) > 0.05 * Math.abs(yf)) {
			ts = t[Math.min(i + 1, t.length - 1)];
			break;
		}
	}
	return { ts, mp: Math.max(0, (Math.max(...y) - yf) / yf), yf };
}

// ---------- dibujo ----------
export function setup(cv) {
	const w = cv.clientWidth;
	const h = +cv.getAttribute("height");
	const d = window.devicePixelRatio || 1;
	cv.width = w * d;
	cv.height = h * d;
	const g = cv.getContext("2d");
	g.setTransform(d, 0, 0, d, 0, 0);
	g.clearRect(0, 0, w, h);
	return { g, w, h };
}

function ticks(a, b, n) {
	const raw = (b - a) / n;
	const mag = Math.pow(10, Math.floor(Math.log10(raw)));
	const st = [1, 2, 5, 10].map((s) => s * mag).find((s) => s >= raw);
	const out = [];
	for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) {
		out.push(v);
	}
	return out;
}

export function plot(cv, series, opt) {
	const { g, w, h } = setup(cv);
	const m = { l: 42, r: 12, t: 14, b: 30 };
	const x0 = opt.x0 ?? 0;
	const { x1, y0, y1 } = opt;
	const X = (x) => m.l + (x - x0) / (x1 - x0) * (w - m.l - m.r);
	const Y = (y) => h - m.b - (y - y0) / (y1 - y0) * (h - m.t - m.b);
	g.font = "11px sans-serif";
	g.fillStyle = C.mut;
	g.strokeStyle = C.grid;
	for (const v of ticks(x0, x1, 8)) {
		g.beginPath(); g.moveTo(X(v), m.t); g.lineTo(X(v), h - m.b); g.stroke();
		g.fillText(+v.toPrecision(3), X(v) - 8, h - m.b + 14);
	}
	for (const v of ticks(y0, y1, 6)) {
		g.beginPath(); g.moveTo(m.l, Y(v)); g.lineTo(w - m.r, Y(v)); g.stroke();
		g.fillText(+v.toPrecision(3), 4, Y(v) + 4);
	}
	g.fillText(opt.xl || "t [s]", w - m.r - 40, h - 4);
	for (const l of opt.hlines || []) {
		g.strokeStyle = l.c; g.setLineDash([5, 4]);
		g.beginPath(); g.moveTo(m.l, Y(l.y)); g.lineTo(w - m.r, Y(l.y)); g.stroke();
	}
	for (const l of opt.vlines || []) {
		g.strokeStyle = l.c; g.setLineDash([5, 4]);
		g.beginPath(); g.moveTo(X(l.x), m.t); g.lineTo(X(l.x), h - m.b); g.stroke();
		if (l.label) {
			g.setLineDash([]);
			g.fillStyle = l.c;
			g.fillText(l.label, X(l.x) + 3, m.t + 10);
		}
	}
	g.setLineDash([]);
	g.save();
	g.beginPath(); g.rect(m.l, m.t, w - m.l - m.r, h - m.t - m.b); g.clip();
	for (const s of series) {
		g.strokeStyle = s.c; g.lineWidth = s.lw || 2; g.setLineDash(s.dash || []);
		g.beginPath();
		s.x.forEach((xv, i) => {
			if (s.step && i > 0) {
				g.lineTo(X(xv), Y(s.y[i - 1]));
			}
			i === 0 ? g.moveTo(X(xv), Y(s.y[i])) : g.lineTo(X(xv), Y(s.y[i]));
		});
		g.stroke();
	}
	g.restore();
	g.setLineDash([]); g.lineWidth = 1;
	let off = 0;
	for (const s of series) {
		if (s.name) {
			g.fillStyle = s.c;
			g.fillText("■ " + s.name, m.l + 8 + off, m.t + 12);
			off += g.measureText("■ " + s.name).width + 16;
		}
	}
}

// Plano complejo. kind "s" o "z". Devuelve la geometria para clics.
export function drawPlane(cv, kind, poles, ext) {
	const { g, w, h } = setup(cv);
	const cx = kind === "s" ? w * 0.7 : w / 2;
	const cy = h / 2;
	const sx = kind === "s" ? (cx - 20) / ext.x : Math.min(w, h) / 2 / 1.3;
	const sy = kind === "s" ? (h / 2 - 14) / ext.y : sx;
	g.strokeStyle = C.mut; g.fillStyle = C.mut; g.font = "11px sans-serif";
	g.beginPath(); g.moveTo(8, cy); g.lineTo(w - 8, cy); g.moveTo(cx, 8); g.lineTo(cx, h - 8); g.stroke();
	g.fillText("Re", w - 22, cy - 5);
	g.fillText("Im", cx + 5, 16);
	if (kind === "s") {
		g.fillStyle = "rgba(192,57,43,0.08)";
		g.fillRect(cx, 0, w - cx, h);
		g.fillStyle = C.red;
		g.fillText("inestable", cx + 6, h - 8);
	} else {
		g.strokeStyle = C.fg;
		g.beginPath(); g.arc(cx, cy, sx, 0, 2 * Math.PI); g.stroke();
		g.fillStyle = C.mut;
		g.fillText("1", cx + sx + 3, cy + 12);
	}
	g.strokeStyle = C.main; g.lineWidth = 2;
	for (const p of poles) {
		const px = cx + p[0] * sx;
		const py = cy - p[1] * sy;
		g.beginPath();
		g.moveTo(px - 5, py - 5); g.lineTo(px + 5, py + 5);
		g.moveTo(px - 5, py + 5); g.lineTo(px + 5, py - 5);
		g.stroke();
	}
	g.lineWidth = 1;
	return { cx, cy, sx, sy };
}

// ---------- DOM ----------
export function el(tag, cls, parent, html) {
	const e = document.createElement(tag);
	if (cls) {
		e.className = cls;
	}
	if (html !== undefined) {
		e.innerHTML = html;
	}
	if (parent) {
		parent.appendChild(e);
	}
	return e;
}

export function slider(parent, label, min, max, step, value, onInput) {
	const lab = el("label", "wg-label", parent, `${label}: <b></b>`);
	const out = lab.querySelector("b");
	const inp = el("input", "", lab);
	Object.assign(inp, { type: "range", min, max, step, value });
	const upd = () => { out.textContent = (+inp.value).toFixed(step < 0.1 ? 2 : 1); };
	inp.addEventListener("input", () => { upd(); onInput(); });
	upd();
	return {
		get value() { return +inp.value; },
		set value(v) { inp.value = v; upd(); }
	};
}

export function select(parent, label, options, value, onInput) {
	const lab = el("label", "wg-label", parent, label);
	const sel = el("select", "", lab);
	options.forEach(([v, t]) => {
		const o = el("option", "", sel, t);
		o.value = v;
	});
	sel.value = value;
	sel.addEventListener("change", onInput);
	return { get value() { return sel.value; } };
}

export function rows(box, list) {
	box.innerHTML = list.map(([k, v]) => `<div><span>${k}</span><span>${v}</span></div>`).join("");
}

export function canvas(parent, height) {
	const cv = el("canvas", "wg-canvas", parent);
	cv.setAttribute("height", height);
	return cv;
}

export function layout(root) {
	root.classList.add("wg");
	const controls = el("div", "wg-controls", root);
	const view = el("div", "wg-view", root);
	return { controls, view };
}

// ---------- utilidades extra (formularios y codigo) ----------
export function number(parent, label, value, onInput, step = "any") {
	const lab = el("label", "wg-label", parent, label);
	const inp = el("input", "wg-num", lab);
	Object.assign(inp, { type: "number", value, step });
	inp.addEventListener("input", onInput);
	return {
		get value() { return parseFloat(inp.value); },
		set value(v) { inp.value = v; },
		set disabled(d) { inp.disabled = d; }
	};
}

export function codeBox(parent) {
	const wrap = el("div", "wg-code", parent);
	const btn = el("button", "wg-copy", wrap, "Copiar");
	const pre = el("pre", "", wrap);
	btn.addEventListener("click", () => {
		navigator.clipboard.writeText(pre.textContent).then(() => {
			btn.textContent = "Copiado";
			setTimeout(() => { btn.textContent = "Copiar"; }, 1200);
		});
	});
	return { set text(t) { pre.textContent = t; } };
}
