// Lazo realimentado por cajas: regulador F, actuador A, planta G y sensor H, en continuo o discreto (ZOH).
import { C, f2, conv, padd, roots, simulate, simDisc, plot, drawPlane, el, number, rows, canvas, layout } from "./core.js";

// ---------- polinomios y funciones de transferencia ----------
export const trim = (p, eps = 1e-12) => {
	let i = 0;
	while (i < p.length - 1 && Math.abs(p[i]) < eps) {
		i++;
	}
	return p.slice(i);
};

export const tfMul = (a, b) => ({ num: conv(a.num, b.num), den: conv(a.den, b.den) });

export const peval = (p, x) => p.reduce((s, c) => s * x + c, 0);

const SUP = { 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶" };

export function pstr(p, v) {
	const n = p.length - 1;
	let out = "";
	p.forEach((c, i) => {
		if (Math.abs(c) < 1e-9) {
			return;
		}
		const e = n - i;
		const a = Math.abs(c);
		const num = a === 1 && e > 0 ? "" : String(+a.toPrecision(4)).replace(".", ",");
		const t = num + (e === 0 ? "" : e === 1 ? v : v + (SUP[e] || "^" + e));
		out += out ? (c < 0 ? " − " : " + ") + t : (c < 0 ? "−" : "") + t;
	});
	return out || "0";
}

// ---------- discretizacion ZOH (espacio de estados + exponencial de matriz) ----------
const mm = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
const ident = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));

function expm(M) {
	const n = M.length;
	const nrm = Math.max(...M.map((r) => r.reduce((s, v) => s + Math.abs(v), 0)), 1e-12);
	const sq = Math.max(0, Math.ceil(Math.log2(nrm / 0.5)));
	const A = M.map((r) => r.map((v) => v / Math.pow(2, sq)));
	let E = ident(n);
	let term = ident(n);
	for (let k = 1; k <= 18; k++) {
		term = mm(term, A).map((r) => r.map((v) => v / k));
		E = E.map((r, i) => r.map((v, j) => v + term[i][j]));
	}
	for (let i = 0; i < sq; i++) {
		E = mm(E, E);
	}
	return E;
}

// G(s) estrictamente propia -> B0G(z) con ZOH de periodo T
export function zoh(num, den, T) {
	const a = den.map((x) => x / den[0]);
	const n = a.length - 1;
	const b = new Array(n).fill(0);
	num.map((x) => x / den[0]).reverse().forEach((v, i) => {
		b[i] = v;
	});
	const M = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));
	for (let i = 0; i < n - 1; i++) {
		M[i][i + 1] = 1;
	}
	for (let k = 0; k < n; k++) {
		M[n - 1][k] = -a[n - k];
	}
	M[n - 1][n] = 1;
	const E = expm(M.map((r) => r.map((v) => v * T)));
	const Phi = E.slice(0, n).map((r) => r.slice(0, n));
	const Gam = E.slice(0, n).map((r) => [r[n]]);
	const trace = (X) => X.reduce((s, r, i) => s + r[i], 0);
	const I = ident(n);
	const cpoly = [1];
	const numz = new Array(n).fill(0);
	let Mk = I;
	for (let k = 1; k <= n; k++) {
		if (k > 1) {
			const P = mm(Phi, Mk);
			Mk = P.map((r, i) => r.map((v, j) => v + cpoly[k - 1] * I[i][j]));
		}
		cpoly.push(-trace(mm(Phi, Mk)) / k);
		const g = mm(Mk, Gam);
		numz[n - k] = b.reduce((s, bj, j) => s + bj * g[j][0], 0);
	}
	return { num: trim(numz, 1e-13), den: cpoly };
}

// ---------- bloques ----------
function regC(f) {
	if (f.tipo === "PI") {
		return { num: [f.K * f.Ti, f.K], den: [f.Ti, 0] };
	}
	return f.tipo === "I" ? { num: [f.K], den: [1, 0] } : { num: [f.K], den: [1] };
}

function regD(f, T) {
	if (f.tipo === "PI") {
		return { num: [f.K * (1 + T / f.Ti), -f.K], den: [1, -1] };
	}
	return f.tipo === "I" ? { num: [f.K * T, 0], den: [1, -1] } : { num: [f.K], den: [1] };
}

function plantaC(p) {
	switch (p.tipo) {
		case "o2": {
			const w2 = p.wn * p.wn;
			return { num: [p.K * w2], den: [1, 2 * p.zeta * p.wn, w2] };
		}
		case "int":
			return { num: [p.K], den: conv([1, 0], [p.tau, 1]) };
		case "inest":
			return { num: [p.K], den: [p.tau, -1] };
		default:
			return { num: [p.K], den: [p.tau, 1] };
	}
}

const UNO = { num: [1], den: [1] };

// ---------- analisis ----------
function medir(t, y, yf) {
	const band = 0.05 * Math.max(Math.abs(yf), 1e-9);
	let ts = 0;
	for (let i = y.length - 1; i >= 0; i--) {
		if (Math.abs(y[i] - yf) > band) {
			ts = i === y.length - 1 ? Infinity : t[i + 1];
			break;
		}
	}
	let im = 0;
	y.forEach((v, i) => {
		if (v > y[im]) {
			im = i;
		}
	});
	return { ts, mp: Math.abs(yf) > 1e-9 ? Math.max(0, (y[im] - yf) / Math.abs(yf)) : 0, tp: t[im] };
}

export function analiza(cfg, opc = {}) {
	const d = cfg.modo === "d";
	const T = cfg.T || 0.1;
	const avisos = [];
	let Gc = plantaC(cfg.G);
	if (cfg.A.tipo === "o1") {
		Gc = tfMul(Gc, { num: [1], den: [cfg.A.tau, 1] });
	}
	let F;
	let G;
	let H = UNO;
	if (d) {
		F = regD(cfg.F, T);
		G = zoh(Gc.num, Gc.den, T);
		if (cfg.A.tipo === "ret") {
			G = tfMul(G, { num: [1], den: [1, ...new Array(Math.max(1, Math.round(cfg.A.d))).fill(0)] });
		}
		if (cfg.H.tipo === "o1") {
			H = zoh([1], [cfg.H.tau, 1], T);
		} else if (cfg.H.tipo === "ret") {
			H = { num: [1], den: [1, 0] };
		}
	} else {
		F = regC(cfg.F);
		G = Gc;
		if (cfg.H.tipo === "o1") {
			H = { num: [1], den: [cfg.H.tau, 1] };
		}
		if (cfg.A.tipo === "ret" || cfg.H.tipo === "ret") {
			avisos.push("El retardo de muestras solo existe en discreto: se ignora.");
		}
	}
	const fw = tfMul(F, G);
	const M = { num: trim(conv(fw.num, H.den)), den: trim(padd(conv(fw.den, H.den), conv(fw.num, H.num))) };
	const polos = M.den.length > 1 ? roots(M.den) : [];
	const mod = polos.map((p) => Math.hypot(p[0], p[1]));
	const estable = d ? mod.every((m) => m < 1 - 1e-6) : polos.every((p) => p[0] < -1e-7);
	const s0 = d ? 1 : 0;
	const cinf = estable ? peval(M.num, s0) / peval(M.den, s0) : NaN;

	// polo dominante y valores teoricos
	let dom = null;
	let teo = null;
	if (polos.length) {
		dom = polos.reduce((a, b) => ((d ? Math.hypot(a[0], a[1]) >= Math.hypot(b[0], b[1]) : a[0] >= b[0]) ? a : b));
		if (estable) {
			const w = Math.abs(dom[1]);
			if (d) {
				const r = Math.hypot(dom[0], dom[1]);
				const ph = Math.atan2(w, dom[0]);
				teo = { ts: r <= 1e-9 ? 0 : Math.ceil(-Math.PI / Math.log(r)) * T, mp: ph > 1e-3 ? Math.pow(r, Math.PI / ph) : 0, tp: ph > 1e-3 ? Math.PI / ph * T : Infinity };
			} else {
				const sg = -dom[0];
				const crit = w < 1e-4;
				teo = { ts: (crit ? 1.6 : 1) * Math.PI / sg, mp: crit ? 0 : Math.exp(-Math.PI * sg / w), tp: crit ? Infinity : Math.PI / w };
			}
		}
	}

	// simulacion al escalon
	const rho = Math.max(1, ...mod);
	let t;
	let y;
	if (d) {
		const N = opc.tend || (estable && teo ? Math.min(500, Math.max(30, Math.round(2.5 * teo.ts / T))) : 60);
		y = simDisc(M.num, M.den, N + 1);
		t = y.map((_, k) => k * T);
	} else {
		const tend = opc.tend || (estable && teo ? Math.min(300, Math.max(0.5, 2.4 * teo.ts)) : Math.min(20, Math.max(2, 5 / Math.max(dom ? dom[0] : 0, 0.05))));
		let dt = Math.min(tend / 3000, 0.3 / rho);
		if (tend / dt > 80000) {
			dt = tend / 80000;
		}
		({ t, y } = simulate(M.num, M.den, () => 1, tend, dt));
	}
	const me = estable ? medir(t, y, cinf) : { ts: Infinity, mp: 0, tp: NaN };

	// error ante rampa (finito solo si el error al escalon es nulo)
	let eRampa = Infinity;
	if (estable && Math.abs(1 - cinf) < 1e-6) {
		const eps = 1e-5;
		const Me = peval(M.num, s0 + eps) / peval(M.den, s0 + eps);
		eRampa = Math.abs((d ? T : 1) * (1 - Me) / eps);
	}
	return { M, polos, estable, cinf, e: estable ? 1 - cinf : NaN, eRampa, dom, teo, t, y, ts: me.ts, mp: me.mp, tp: me.tp, avisos, d, T, K: cfg.F.K };
}

// ---------- widget ----------
function caja(parent, titulo, opciones, defecto, params, onInput) {
	const box = el("div", "wg-box", parent);
	el("div", "wg-box-t", box).textContent = titulo;
	const sel = el("select", "", box);
	opciones.forEach(([v, t]) => {
		el("option", "", sel).textContent = t;
		sel.lastChild.value = v;
	});
	sel.value = defecto;
	const ps = {};
	for (const [id, label, valor, para, paso] of params) {
		const w = el("div", "wg-par", box);
		ps[id] = { w, para, n: number(w, label, valor, onInput, paso || "any") };
	}
	const vis = () => {
		for (const k of Object.keys(ps)) {
			ps[k].w.hidden = !ps[k].para.includes(sel.value);
		}
	};
	sel.addEventListener("change", () => {
		vis();
		onInput();
	});
	vis();
	return {
		get tipo() {
			return sel.value;
		},
		val: (id) => ps[id].n.value,
		set: (tipo, vals = {}) => {
			sel.value = tipo;
			for (const k of Object.keys(vals)) {
				ps[k].n.value = vals[k];
			}
			vis();
		},
		cfg: (extra) => Object.assign({ tipo: sel.value }, Object.fromEntries(Object.keys(ps).map((k) => [k, ps[k].n.value])), extra)
	};
}

// [titulo, {modo, T, F:[tipo,params], A, G, H}]
export const EJEMPLOS = [
	["Libre (valores por defecto)", { modo: "c", T: 0.1, F: ["P", { K: 2 }], A: ["ninguno", {}], G: ["o1", { K: 3, tau: 0.5 }], H: ["ninguno", {}] }],
	["Ej. 6 (a): tanque continuo, F = 2", { modo: "c", T: 0.1, F: ["P", { K: 2 }], A: ["ninguno", {}], G: ["o1", { K: 3, tau: 0.5 }], H: ["ninguno", {}] }],
	["Ej. 6 (b-c): tanque discreto, T = 50 ms, K = 6,34", { modo: "d", T: 0.05, F: ["P", { K: 6.34 }], A: ["ninguno", {}], G: ["o1", { K: 3, tau: 0.5 }], H: ["ninguno", {}] }],
	["Rover 1/(s(s+1)) con P: compromiso amortiguamiento", { modo: "c", T: 0.1, F: ["P", { K: 1 }], A: ["ninguno", {}], G: ["int", { K: 1, tau: 1 }], H: ["ninguno", {}] }],
	["Control de crucero: P deja error, PI lo anula", { modo: "c", T: 0.1, F: ["PI", { K: 2, Ti: 5 }], A: ["ninguno", {}], G: ["o1", { K: 2, tau: 5 }], H: ["ninguno", {}] }],
	["Planta inestable 1/(s−1): P la estabiliza si K > 1", { modo: "c", T: 0.1, F: ["P", { K: 3 }], A: ["ninguno", {}], G: ["inest", { K: 1, tau: 1 }], H: ["ninguno", {}] }],
	["Muestrear despacio desestabiliza (T = 0,5 s)", { modo: "d", T: 0.5, F: ["P", { K: 3 }], A: ["ninguno", {}], G: ["o2", { K: 1, wn: 4, zeta: 0.3 }], H: ["ninguno", {}] }],
	["Retardo de 2 muestras con PI (compara con Actuador = Ninguno)", { modo: "d", T: 0.1, F: ["PI", { K: 0.5, Ti: 0.5 }], A: ["ret", { d: 2 }], G: ["o1", { K: 3, tau: 0.5 }], H: ["ninguno", {}] }]
];

function lazoWidget(root) {
	const { controls, view } = layout(root);
	const modo = el("select", "", el("label", "wg-label", controls, "Tiempo"));
	[["c", "Continuo (s)"], ["d", "Discreto (z, con ZOH)"]].forEach(([v, t]) => {
		el("option", "", modo).textContent = t;
		modo.lastChild.value = v;
	});
	modo.addEventListener("change", update);
	const Tm = number(controls, "Periodo de muestreo T [s] (discreto)", 0.1, update);
	const ej = el("select", "", el("label", "wg-label", controls, "Ejemplo precargado"));
	EJEMPLOS.forEach(([t], i) => {
		el("option", "", ej).textContent = t;
		ej.lastChild.value = i;
	});
	ej.addEventListener("change", () => {
		const e = EJEMPLOS[+ej.value][1];
		modo.value = e.modo;
		Tm.value = e.T;
		bF.set(e.F[0], e.F[1]);
		bA.set(e.A[0], e.A[1]);
		bG.set(e.G[0], e.G[1]);
		bH.set(e.H[0], e.H[1]);
		update();
	});
	const res = el("div", "wg-res", controls);
	el("p", "wg-note", controls, "Elige el tipo de cada caja y sus parámetros. Discreto: la planta (actuador + planta) se discretiza con ZOH; el PI usa integración hacia atrás.");
	const bd = el("div", "wg-bd", view);
	const fila = el("div", "wg-bd-row", bd);
	const nodo = (t) => el("span", "wg-node", fila).appendChild(document.createTextNode(t));
	const flecha = () => el("span", "wg-arrow", fila, "→");
	nodo("R");
	flecha();
	el("span", "wg-sum", fila, "Σ<sup>+</sup><sub>−</sub>");
	flecha();
	const bF = caja(fila, "Regulador F", [["P", "P: K"], ["PI", "PI: K(1 + 1/Tᵢs)"], ["I", "I: K/s"]], "P", [["K", "K", 2, ["P", "PI", "I"]], ["Ti", "Tᵢ [s]", 1, ["PI"]]], update);
	flecha();
	const bA = caja(fila, "Actuador A", [["ninguno", "Ninguno"], ["o1", "1.er orden 1/(τs+1)"], ["ret", "Retardo z⁻ᵈ (discreto)"]], "ninguno", [["tau", "τ [s]", 0.2, ["o1"]], ["d", "d [muestras]", 1, ["ret"], 1]], update);
	flecha();
	const bG = caja(fila, "Planta G", [["o1", "1.er orden K/(τs+1)"], ["o2", "2.º orden"], ["int", "Integrador K/(s(τs+1))"], ["inest", "Inestable K/(τs−1)"]], "o1", [
		["K", "K", 3, ["o1", "o2", "int", "inest"]], ["tau", "τ [s]", 0.5, ["o1", "int", "inest"]], ["wn", "ωₙ [rad/s]", 4, ["o2"]], ["zeta", "ζ", 0.5, ["o2"]]
	], update);
	flecha();
	nodo("C");
	const fb = el("div", "wg-bd-row wg-bd-fb", bd);
	el("span", "wg-arrow", fb, "←");
	const bH = caja(fb, "Sensor H", [["ninguno", "Ideal (1)"], ["o1", "1.er orden 1/(τs+1)"], ["ret", "Retardo z⁻¹ (discreto)"]], "ninguno", [["tau", "τ [s]", 0.1, ["o1"]]], update);
	el("span", "wg-arrow", fb, "←");
	const cp = canvas(view, 220);
	const cr = canvas(view, 300);
	function update() {
		const cfg = { modo: modo.value, T: Tm.value, F: bF.cfg(), A: bA.cfg(), G: bG.cfg(), H: bH.cfg() };
		if (!(cfg.T > 0)) {
			return;
		}
		const r = analiza(cfg);
		const d = r.d;
		const v = d ? "z" : "s";
		const ext = { x: Math.max(2, 1.25 * Math.max(...r.polos.map((p) => Math.abs(p[0])), 0)), y: Math.max(2, 1.25 * Math.max(...r.polos.map((p) => Math.abs(p[1])), 0)) };
		drawPlane(cp, d ? "z" : "s", r.polos, ext);
		const mx = Math.max(...r.y);
		const yf = r.estable ? r.cinf : 1;
		plot(cr, [{ x: r.t, y: r.y, c: C.main, step: d, name: d ? "c[k]" : "c(t)" }], {
			x1: r.t[r.t.length - 1], y0: Math.min(0, ...r.y), y1: r.estable ? Math.max(1.3, mx * 1.1) : 2.5, xl: "t [s]",
			hlines: [{ y: 1, c: C.mut }, { y: yf * 1.05, c: C.red }, { y: yf * 0.95, c: C.red }],
			vlines: isFinite(r.ts) && r.estable ? [{ x: r.ts, c: C.red, label: "tₛ" }] : []
		});
		const fm = (x) => (isFinite(x) ? f2(x) : "–");
		const pol = r.polos.map((p) => (Math.abs(p[1]) < 1e-6 ? f2(p[0]) : `${f2(p[0])} ± ${f2(Math.abs(p[1]))}j`)).filter((x, i, a) => a.indexOf(x) === i).join(" ; ");
		const kd = d && r.estable && isFinite(r.ts) ? ` (kₛ = ${Math.round(r.ts / r.T)})` : "";
		const list = [
			["M(" + v + ")", `(${pstr(r.M.num, v)}) / (${pstr(r.M.den, v)})`],
			["Polos de lazo cerrado", pol || "–"],
			["Estable", r.estable ? "sí" : "<b class='wg-warn'>NO</b>"]
		];
		if (r.estable) {
			list.push(
				["c(∞) = M(" + (d ? "1" : "0") + ")", fm(r.cinf)],
				["Error al escalón", fm(r.e * 100) + " %"],
				["Error ante rampa", isFinite(r.eRampa) ? f2(r.eRampa) : "∞"],
				["tₛ simulado (banda 5 %)", fm(r.ts) + " s" + kd],
				["Mₚ simulado", fm(r.mp * 100) + " %"],
				["tₚ simulado", fm(r.tp) + " s"],
				["Teoría (polo dominante) tₛ / Mₚ / tₚ", r.teo ? `${fm(r.teo.ts)} s / ${fm(r.teo.mp * 100)} % / ${fm(r.teo.tp)} s` : "–"]
			);
		}
		for (const a of r.avisos) {
			list.push(["Aviso", "<b class='wg-warn'>" + a + "</b>"]);
		}
		rows(res, list);
	}
	update();
	return update;
}

export const LAZO_WIDGETS = { "lazo-cerrado": lazoWidget };
