// Widgets de los ejercicios 6 (tanque) y 7 (identificacion y error) del Tema 2.
import { C, f2, simDisc, simulate, plot, el, slider, select, rows, canvas, layout } from "./core.js";
import { stepS } from "./sz.js";

// ---------- Ejercicio 6 ----------
const G0 = 3;
const TAU = 0.5;
const A6 = 0.9048;
const B6 = 0.2856;

// Regimen permanente continuo: la fuga P entra restando tras el regulador, asi que llega a la salida a traves de G(0).
export function ej6Continuo(F, R, P) {
	const k0 = F * G0;
	return { k0, eR: R / (1 + k0), eP: G0 * P / (1 + k0), e: (R + G0 * P) / (1 + k0), cfin: (k0 * R - G0 * P) / (1 + k0) };
}

export function ej6Discreto(K) {
	const p = A6 - B6 * K;
	const estable = Math.abs(p) < 1;
	return { p, estable, ks: estable ? Math.ceil(-Math.PI / Math.log(Math.abs(p))) : Infinity, e: 1 / (1 + 3 * K) };
}

function simTanque(F, R, P, T) {
	const n = 1500;
	const dt = T / n;
	const t = [];
	const c = [];
	const e = [];
	let y = 0;
	for (let i = 0; i <= n; i++) {
		const p = i * dt >= T / 2 ? P : 0;
		t.push(i * dt);
		c.push(y);
		e.push(R - y);
		y += dt * (-(1 + G0 * F) * y + G0 * F * R - G0 * p) / TAU;
	}
	return { t, c, e };
}

function ej6(root) {
	const { controls, view } = layout(root);
	const F = slider(controls, "Apartado a) · ganancia F del regulador", 0.5, 10, 0.5, 2, update);
	const K = slider(controls, "Apartados b-c) · ganancia K discreta", 0, 7, 0.01, 6.34, update);
	const res = el("div", "wg-res", controls);
	el("p", "wg-note", controls, "Continuo: R = 2 V; fuga P = 0,5 V desde la mitad del ensayo (resta a la entrada de la planta). Discreto: T = 50 ms, B₀G(z) = 0,2856/(z − 0,9048), escalón unitario.");
	const c1 = canvas(view, 270);
	const c2 = canvas(view, 270);
	function update() {
		const R = 2;
		const P = 0.5;
		const T = 3;
		const a = ej6Continuo(F.value, R, P);
		const s = simTanque(F.value, R, P, T);
		plot(c1, [
			{ x: s.t, y: s.c.map(() => R), c: C.mut, dash: [5, 4], name: "R" },
			{ x: s.t, y: s.c, c: C.main, name: "c(t)" },
			{ x: s.t, y: s.e, c: C.red, name: "e = R − c" }
		], { x1: T, y0: -0.2, y1: 2.4, vlines: [{ x: T / 2, c: C.orange, label: "fuga" }] });

		const d = ej6Discreto(K.value);
		const N = 70;
		const y = d.estable ? simDisc([B6 * K.value], [1, -d.p], N) : new Array(N).fill(0);
		const cinf = B6 * K.value / (1 - d.p);
		plot(c2, [{ x: y.map((_, i) => i), y, c: C.main, step: true, name: "c[k]" }], {
			x1: N - 1, y0: Math.min(0, ...y) * 1.1, y1: d.estable ? Math.max(1.2, Math.max(...y) * 1.1) : 1.2, xl: "k",
			hlines: [{ y: cinf, c: C.mut }, { y: cinf * 1.05, c: C.red }, { y: cinf * 0.95, c: C.red }],
			vlines: [{ x: 32, c: C.green, label: "kₛ = 32" }, { x: Math.min(d.ks, N - 1), c: C.red, label: "kₛ real" }]
		});
		rows(res, [
			["K₀[CA] = F·G(0)", f2(a.k0)],
			["e por la referencia R/(1+K₀)", f2(a.eR) + " V"],
			["e por la fuga G(0)·P/(1+K₀)", f2(a.eP) + " V"],
			["e total en RP", f2(a.e) + " V  (c(∞) = " + f2(a.cfin) + " V)"],
			["e simulado al final", f2(s.e[s.e.length - 1]) + " V"],
			["Polo discreto a − bK", d.p.toFixed(4) + (d.estable ? "" : " <b class='wg-warn'>inestable</b>")],
			["kₛ del lazo cerrado", d.estable ? d.ks + " muestras (objetivo 32)" : "–"],
			["Error al escalón 1/(1+3K)", f2(d.e * 100) + " %"],
			["Límite de estabilidad", "K < " + f2((1 + A6) / B6)]
		]);
	}
	update();
	return update;
}

// ---------- Ejercicio 7 ----------
export function ej7Ident(cinf, tp, cpico) {
	const mp = (cpico - cinf) / cinf;
	return { mp, wd: Math.PI / tp, sigma: Math.log(mp) / tp };
}

// Cadena abierta discreta 0,36/((z-0,19)(z-1)) con T = 0,1: constante de velocidad y error ante rampa.
export function ej7Rampa() {
	const T = 0.1;
	const kv = 1 / T * 0.36 / (1 - 0.19);
	return { kv, e: 1 / kv };
}

export function ej7SimRampa(N) {
	const T = 0.1;
	const r = [];
	const y = [];
	for (let k = 0; k < N; k++) {
		r.push(k * T);
		y.push(1.19 * (y[k - 1] || 0) - 0.55 * (y[k - 2] || 0) + 0.36 * (r[k - 2] || 0));
	}
	return { r, y };
}

function ej7(root) {
	const { controls, view } = layout(root);
	const modo = select(controls, "Apartado", [["a", "a) identificar G(s) desde la gráfica"], ["b", "b) error continuo con K"], ["c", "c) error discreto ante rampa"]], "a", update);
	const ga = el("div", "", controls);
	const sg = slider(ga, "Re[p] = σ", -8, -0.1, 0.01, -3.14, update);
	const om = slider(ga, "Im[p] = ω", 1, 12, 0.01, 6.28, update);
	const g0 = slider(ga, "Ganancia estática G(0)", 0.5, 4, 0.01, 2, update);
	const gb = el("div", "", controls);
	const K = slider(gb, "Ganancia K del regulador", 0, 2, 0.01, 0.82, update);
	const res = el("div", "wg-res", controls);
	const nota = el("p", "wg-note", controls);
	const cv = canvas(view, 330);
	function update() {
		const m = modo.value;
		ga.hidden = m !== "a";
		gb.hidden = m !== "b";
		if (m === "a") {
			const s = sg.value;
			const w = om.value;
			const G = g0.value;
			const x1 = Math.max(2, 4.5 / -s);
			const t = Array.from({ length: 501 }, (_, i) => i * x1 / 500);
			const mp = Math.exp(Math.PI * s / w);
			plot(cv, [
				{ x: t, y: t.map((v) => G * stepS(s, w, v)), c: C.main, name: "modelo" },
				{ x: [0.48, 0.52], y: [2.416, 2.416], c: C.red, lw: 6, name: "pico medido" }
			], { x1, y0: 0, y1: Math.max(2.6, G * (1 + mp) * 1.1), hlines: [{ y: 2, c: C.mut }], vlines: [{ x: 0.5, c: C.green, label: "tₚ = 0,5 s" }] });
			const wn2 = s * s + w * w;
			rows(res, [
				["tₚ = π/ω", f2(Math.PI / w) + " s"], ["Mₚ = e^(πσ/ω)", f2(mp * 100) + " %  (medido 20,8 %)"],
				["Pico del modelo G(0)(1+Mₚ)", f2(G * (1 + mp)) + " m  (medido 2,416)"], ["tₛ = π/|σ|", f2(Math.PI / -s) + " s"],
				["G(s)", `${f2(G * wn2)} / (s² + ${f2(-2 * s)}s + ${f2(wn2)})`]
			]);
			nota.textContent = "Objetivo: tₚ = 0,5 s, pico 2,416 m, valor final 2 m. Con σ = −3,14, ω = 6,28 y G(0) = 2 todo encaja.";
		} else if (m === "b") {
			const k = K.value;
			const T = 3;
			const out = simulate([150 * k], [1, 6, 50 + 150 * k], () => 1, T, 0.003);
			const cinf = 3 * k / (1 + 3 * k);
			plot(cv, [{ x: out.t, y: out.y, c: C.main, name: "c(t)" }], { x1: T, y0: 0, y1: 1.2, hlines: [{ y: 1, c: C.mut }, { y: cinf, c: C.red }] });
			const e = 1 / (1 + 3 * k);
			rows(res, [
				["Cadena abierta K·150/(s²+6s+50)", "tipo 0"], ["K_p = 3K", f2(3 * k)], ["e_rpp = 1/(1+K_p)", f2(e * 100) + " %"],
				["c(∞) = K_p/(1+K_p)", f2(cinf)], ["e simulado", f2((1 - out.y[out.y.length - 1]) * 100) + " %"],
				["Mínimo en 0 ≤ K ≤ 0,82", f2(100 / (1 + 3 * 0.82)) + " % (en K = 0,82)"]
			]);
			nota.textContent = "s² + 6s + 50 + 150K tiene todos los coeficientes positivos para K ≥ 0: estable en todo el rango.";
		} else {
			const N = 70;
			const sim = ej7SimRampa(N);
			const e = sim.r.map((v, i) => v - sim.y[i]);
			const k = ej7Rampa();
			plot(cv, [
				{ x: sim.r, y: sim.r, c: C.mut, dash: [5, 4], name: "r (rampa)" },
				{ x: sim.r, y: sim.y, c: C.main, step: true, name: "c[k]" },
				{ x: sim.r, y: e, c: C.red, step: true, name: "e[k]" }
			], { x1: sim.r[N - 1], y0: 0, y1: sim.r[N - 1] * 1.05, xl: "t [s]", hlines: [{ y: k.e, c: C.orange }] });
			rows(res, [
				["Tipo (polo en z = 1)", "1"], ["K_v = (1/T)·0,36/(1−0,19)", f2(k.kv) + " 1/s"], ["e_rpv = 1/K_v", f2(k.e)],
				["e simulado (k = " + (N - 1) + ")", f2(e[N - 1])], ["Polos del lazo cerrado", "z² − 1,19z + 0,55: |p| = " + f2(Math.sqrt(0.55)) + " (estable)"]
			]);
			nota.textContent = "Rampa r(t) = t, T = 0,1 s. Ante escalón el error es 0: la rampa es la entrada significativa.";
		}
	}
	update();
	return update;
}

export const EJ67_WIDGETS = { "ej6-tanque": ej6, "ej7-identificacion": ej7 };
