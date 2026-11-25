// Figuras de las preguntas, dibujadas en canvas a partir de datos (no son imagenes fijas).
// tipos: step2 (respuesta con marcas estilo Matlab), sistemas3 (curvas superpuestas), polos_resp (mapas de polos + respuestas), bloques (diagrama).
import { setup } from "./core.js";
import { stepS } from "./sz.js";

const AZUL = "#0b3fd9";
const MARCA = "#fffbd0";
const sig3 = (x) => String(+Number(x).toPrecision(3));

function pasoNice(a, b, n) {
	const raw = (b - a) / n;
	const mag = Math.pow(10, Math.floor(Math.log10(raw)));
	return [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw);
}

function marcas(a, b, n) {
	const st = pasoNice(a, b, n);
	const out = [];
	for (let v = Math.ceil(a / st - 1e-9) * st; v <= b + 1e-9; v += st) {
		out.push(+v.toPrecision(10));
	}
	return out;
}

// Dibuja unos ejes en el rectangulo r={x,y,w,h}; devuelve las funciones de mapeo
function ejes(g, r, x0, x1, y0, y1, o = {}) {
	const X = (v) => r.x + (v - x0) / (x1 - x0) * r.w;
	const Y = (v) => r.y + r.h - (v - y0) / (y1 - y0) * r.h;
	g.font = "11px sans-serif";
	g.lineWidth = 1;
	g.fillStyle = "#000";
	g.strokeStyle = "#bbb";
	g.setLineDash([1, 3]);
	const xt = o.xt || marcas(x0, x1, 6);
	const yt = o.yt || marcas(y0, y1, 6);
	if (o.grid !== "y") {
		for (const v of xt) {
			g.beginPath(); g.moveTo(X(v), r.y); g.lineTo(X(v), r.y + r.h); g.stroke();
		}
	}
	for (const v of yt) {
		g.beginPath(); g.moveTo(r.x, Y(v)); g.lineTo(r.x + r.w, Y(v)); g.stroke();
	}
	g.setLineDash([]);
	g.strokeStyle = "#000";
	g.strokeRect(r.x, r.y, r.w, r.h);
	g.fillStyle = "#222";
	if (o.numeros !== false) {
		g.textAlign = "center";
		for (const v of xt) {
			g.fillText(String(v), X(v), r.y + r.h + 14);
		}
		g.textAlign = "right";
		for (const v of yt) {
			g.fillText(String(v), r.x - 5, Y(v) + 4);
		}
	}
	g.textAlign = "center";
	if (o.titulo) {
		g.font = "bold 12px sans-serif";
		g.fillText(o.titulo, r.x + r.w / 2, r.y - 7);
		g.font = "11px sans-serif";
	}
	if (o.xl) {
		g.fillText(o.xl, r.x + r.w / 2, r.y + r.h + 30);
	}
	if (o.yl) {
		g.save();
		g.translate(r.x - 40, r.y + r.h / 2);
		g.rotate(-Math.PI / 2);
		g.fillText(o.yl, 0, 0);
		g.restore();
	}
	g.textAlign = "left";
	return { X, Y };
}

function traza(g, X, Y, xs, ys, color, lw = 1.6) {
	g.save();
	g.strokeStyle = color;
	g.lineWidth = lw;
	g.beginPath();
	xs.forEach((x, i) => (i ? g.lineTo(X(x), Y(ys[i])) : g.moveTo(X(x), Y(ys[i]))));
	g.stroke();
	g.restore();
}

function linea(g, x0, y0, x1, y1, color, dash) {
	g.save();
	g.strokeStyle = color;
	g.setLineDash(dash || []);
	g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
	g.restore();
}

function tip(g, px, py, lineas, dx, dy, W) {
	g.fillStyle = "#000";
	g.fillRect(px - 3.5, py - 3.5, 7, 7);
	g.font = "10px sans-serif";
	const w = Math.max(...lineas.map((l) => g.measureText(l).width)) + 8;
	const h = lineas.length * 12 + 6;
	let bx = px + dx;
	const by = py + dy;
	bx = Math.max(2, Math.min(W - w - 2, bx));
	g.fillStyle = MARCA;
	g.fillRect(bx, by, w, h);
	g.strokeStyle = "#444";
	g.lineWidth = 1;
	g.strokeRect(bx, by, w, h);
	g.fillStyle = "#000";
	lineas.forEach((l, i) => g.fillText(l, bx + 4, by + 12 + i * 12));
	g.font = "11px sans-serif";
}

// ---------- step2: respuesta de segundo orden con marcas de pico, establecimiento y valor final ----------
export function datosStep2(f) {
	const K = f.K;
	const s = -Math.abs(f.sigma);
	const w = f.omega || 0;
	const y = (t) => K * stepS(s, w, t);
	const cx = w > 0.05;
	const tp = cx ? Math.PI / w : NaN;
	const pico = cx ? K * (1 + Math.exp(Math.PI * s / w)) : NaN;
	let ts = 0;
	const N = 6000;
	const T = 14 / Math.abs(s);
	for (let i = N; i >= 0; i--) {
		if (Math.abs(y(i * T / N) - K) > 0.05 * Math.abs(K)) {
			ts = (i + 1) * T / N;
			break;
		}
	}
	const tend = f.tfin || Math.max(1, Math.ceil(ts * 2.35));
	return { K, y, tp, pico, ts, yts: y(ts), tend, yfin: y(tend), cx };
}

function step2(cv, f) {
	const { g, w, h } = setup(cv);
	g.fillStyle = "#fff";
	g.fillRect(0, 0, w, h);
	const d = datosStep2(f);
	const r = { x: 58, y: 28, w: w - 78, h: h - 78 };
	const ymax = Math.max(d.K * 1.1, (isFinite(d.pico) ? d.pico : d.K) * 1.08);
	const { X, Y } = ejes(g, r, 0, d.tend, 0, ymax, { titulo: "Step Response", xl: "Time (seconds)", yl: "Amplitude" });
	if (f.banda !== false) {
		g.setLineDash([1, 3]);
		linea(g, r.x, Y(d.K * 1.05), r.x + r.w, Y(d.K * 1.05), "#d33", [1, 3]);
		linea(g, r.x, Y(d.K * 0.95), r.x + r.w, Y(d.K * 0.95), "#d33", [1, 3]);
		linea(g, r.x, Y(d.K), r.x + r.w, Y(d.K), "#000", [1, 3]);
		g.setLineDash([]);
	}
	const xs = Array.from({ length: 700 }, (_, i) => i * d.tend / 699);
	traza(g, X, Y, xs, xs.map(d.y), AZUL);
	const nom = f.nombre || "G";
	const pedidas = f.marcas || ["pico", "ts", "final"];
	if (pedidas.includes("pico") && d.cx) {
		tip(g, X(d.tp), Y(d.pico), [`System: ${nom}`, `Time (seconds): ${sig3(d.tp)}`, `Amplitude: ${sig3(d.pico)}`], -40, -4, w);
	}
	if (pedidas.includes("ts")) {
		tip(g, X(d.ts), Y(d.yts), [`System: ${nom}`, `Time (seconds): ${sig3(d.ts)}`, `Amplitude: ${sig3(d.yts)}`], 8, 10, w);
	}
	if (pedidas.includes("final")) {
		tip(g, X(d.tend), Y(d.yfin), [`System: ${nom}`, `Time (seconds): ${sig3(d.tend)}`, `Amplitude: ${sig3(d.yfin)}`], -118, -50, w);
	}
}

// ---------- sistemas3: varias respuestas ante un mismo escalon ----------
function sistemas3(cv, f) {
	const { g, w, h } = setup(cv);
	g.fillStyle = "#fff";
	g.fillRect(0, 0, w, h);
	const r = { x: 14, y: 10, w: w - 28, h: h - 24 };
	const t0 = 1;
	const t1 = 12;
	const y1 = 2.05;
	const { X, Y } = ejes(g, r, 0, t1, 0, y1, { numeros: false, xt: [], yt: [0, 0.5, 1, 1.5, 2], grid: "y" });
	g.strokeStyle = "#4a7fb8";
	g.lineWidth = 2.5;
	g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(t0), Y(0)); g.lineTo(X(t0), Y(1)); g.lineTo(X(t1), Y(1)); g.stroke();
	g.fillStyle = "#222";
	g.font = "11px sans-serif";
	g.fillText("Entrada", X(t0) - 50, Y(1) - 6);
	const col = { morado: "#7b4fa3", verde: "#8cb34a", rojo: "#cc4a3c" };
	for (const c of f.curvas) {
		const xs = Array.from({ length: 500 }, (_, i) => t0 + i * (t1 - t0) / 499);
		const val = (t) => (c.orden === 1 ? c.K * (1 - Math.exp(-c.sigma * (t - t0))) : c.K * stepS(-Math.abs(c.sigma), c.omega, t - t0));
		traza(g, X, Y, xs, xs.map(val), col[c.color] || c.color, 2.4);
		const tx = c.etq_t ?? t0 + 1.2;
		g.fillStyle = "#222";
		g.fillText(c.etiqueta, X(tx) + 4, Y(val(tx)) + (c.etq_dy ?? 18));
	}
}

// ---------- polos_resp: mapa de polos y respuesta de cada sistema ----------
function polosResp(cv, f) {
	const { g, w, h } = setup(cv);
	g.fillStyle = "#fff";
	g.fillRect(0, 0, w, h);
	const n = f.sistemas.length;
	const rh = (h - 12) / n;
	const xmin = f.xmin ?? -5;
	const ymax = f.ymax ?? 10;
	f.sistemas.forEach((s, i) => {
		const y0 = 24 + i * rh;
		const alto = rh - 52;
		const L = { x: 62, y: y0, w: (w - 150) / 2, h: alto };
		const R = { x: 62 + L.w + 70, y: y0, w: (w - 150) / 2, h: alto };
		const p = ejes(g, L, xmin, 0, -ymax, ymax, { titulo: s.nombre, xl: "Real Axis (seconds⁻¹)", yl: "Imag. Axis", xt: marcas(xmin, 0, 6), yt: [-ymax, -ymax / 2, 0, ymax / 2, ymax] });
		g.strokeStyle = "#1c8dd1";
		g.lineWidth = 1.4;
		for (const sg of [1, -1]) {
			const px = p.X(-Math.abs(s.sigma));
			const py = p.Y(sg * s.omega);
			g.beginPath(); g.moveTo(px - 3, py - 3); g.lineTo(px + 3, py + 3); g.moveTo(px - 3, py + 3); g.lineTo(px + 3, py - 3); g.stroke();
		}
		const t1 = f.tmax ?? 4;
		const q = ejes(g, R, 0, t1, 0, 2, { titulo: s.nombre, xl: "Time (seconds)", yl: "Amplitude", yt: [0, 0.5, 1, 1.5, 2] });
		const xs = Array.from({ length: 400 }, (_, k) => k * t1 / 399);
		traza(g, q.X, q.Y, xs, xs.map((t) => stepS(-Math.abs(s.sigma), s.omega, t)), "#4a9bd0", 1.4);
		linea(g, R.x, q.Y(1), R.x + R.w, q.Y(1), "#000", [1, 3]);
	});
}

// ---------- bloques: diagrama de lazo con perturbacion ----------
function bloques(cv, f) {
	const { g, w, h } = setup(cv);
	g.fillStyle = "#fff";
	g.fillRect(0, 0, w, h);
	const W = 840;
	const k = Math.min(w / W, h / 250);
	g.save();
	g.translate((w - W * k) / 2, 0);
	g.scale(k, k);
	g.lineWidth = 1.6;
	g.strokeStyle = "#000";
	g.fillStyle = "#000";
	g.font = "13px sans-serif";
	const flecha = (x0, y0, x1, y1) => {
		g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
		const a = Math.atan2(y1 - y0, x1 - x0);
		g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 8 * Math.cos(a - 0.4), y1 - 8 * Math.sin(a - 0.4)); g.lineTo(x1 - 8 * Math.cos(a + 0.4), y1 - 8 * Math.sin(a + 0.4)); g.closePath(); g.fill();
	};
	const caja = (cx, cy, bw, bh, txt) => {
		g.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);
		g.textAlign = "center";
		const ls = String(txt).split("\n");
		ls.forEach((l, i) => g.fillText(l, cx, cy + 4 + (i - (ls.length - 1) / 2) * 16));
		g.textAlign = "left";
	};
	const suma = (cx, cy) => {
		g.beginPath(); g.arc(cx, cy, 11, 0, 2 * Math.PI); g.stroke();
	};
	const y = 80;
	const icono = (cx, cy, tipo) => {
		g.strokeRect(cx - 18, cy - 18, 36, 36);
		g.beginPath();
		if (tipo === "rampa") {
			g.moveTo(cx - 12, cy + 10); g.lineTo(cx - 3, cy + 10); g.lineTo(cx + 12, cy - 10);
		} else {
			g.moveTo(cx - 12, cy + 10); g.lineTo(cx, cy + 10); g.lineTo(cx, cy - 10); g.lineTo(cx + 12, cy - 10);
		}
		g.stroke();
	};
	g.textAlign = "center";
	g.fillText(f.entrada || "r(t)", 50, y - 32);
	g.textAlign = "left";
	icono(50, y, f.tipoEntrada || "escalon");
	flecha(68, y, 150, y);
	suma(162, y);
	g.fillText("+", 138, y - 8);
	g.fillText("−", 168, y + 28);
	let xs = 173;
	let xc = 270;
	if (f.F) {
		flecha(xs, y, 232, y);
		caja(xc, y, 76, 44, f.F);
		xs = xc + 38;
		xc = 440;
	} else {
		xc = 350;
	}
	flecha(xs, y, xc - 70, y);
	caja(xc, y, 140, 52, f.G);
	flecha(xc + 70, y, 595, y);
	suma(606, y);
	g.fillText("+", 580, y - 8);
	g.fillText(f.pertSigno || "+", 614, y + 34);
	flecha(617, y, 760, y);
	icono(790, y, "scope");
	g.strokeRect(772, y - 14, 36, 28);
	g.textAlign = "center";
	g.fillText(f.salida || "c(t)", 700, y - 10);
	g.textAlign = "left";
	g.beginPath(); g.arc(700, y, 3, 0, 2 * Math.PI); g.fill();
	g.beginPath(); g.moveTo(700, y); g.lineTo(700, 195); g.lineTo(xc + 20, 195); g.stroke();
	g.beginPath(); g.moveTo(xc - 30, 195); g.lineTo(162, 195); flecha(162, 195, 162, y + 12);
	g.stroke();
	g.beginPath(); g.moveTo(xc + 20, 183); g.lineTo(xc - 30, 195); g.lineTo(xc + 20, 207); g.closePath(); g.stroke();
	g.textAlign = "center";
	g.fillText(f.H || "1", xc + 4, 199);
	g.fillText("Sensor", xc - 5, 222);
	if (f.pert) {
		icono(606, 150, f.tipoPert || "escalon");
		g.fillText(f.pert, 606, 185);
		flecha(606, 132, 606, y + 12);
	}
	g.restore();
}

export function dibujaFigura(cv, f) {
	({ step2, sistemas3, polos_resp: polosResp, bloques })[f.tipo](cv, f);
}
