// Widgets de Sistemas de Control (Tema 2): herramientas generales y ejercicios en grupo.
import { C, f2, conv, padd, roots, simulate, simDisc, measure, plot, drawPlane, el, slider, select, rows, canvas, layout, number } from "./core.js";

// ---------- polos continuos ----------
function polosS(root) {
	const { controls, view } = layout(root);
	let geo = null;
	const sig = slider(controls, "Re[p] = σ", -8, -0.1, 0.1, -2, update);
	const om = slider(controls, "Im[p] = ω", 0, 12, 0.1, 4, update);
	const res = el("div", "wg-res", controls);
	el("p", "wg-note", controls, "Clic en el plano para colocar el polo. Con ω = 0 el polo es doble (crítico).");
	const cp = canvas(view, 220);
	const cr = canvas(view, 300);
	cp.addEventListener("click", (ev) => {
		const r = cp.getBoundingClientRect();
		sig.value = Math.min(-0.1, Math.max(-8, (ev.clientX - r.left - geo.cx) / geo.sx));
		om.value = Math.min(12, Math.abs((ev.clientY - r.top - geo.cy) / geo.sy));
		update();
	});
	function update() {
		const s = sig.value;
		const w = om.value;
		const wn2 = s * s + w * w;
		const crit = w < 0.05;
		const T = Math.max(3, 3.4 / Math.abs(s) * (crit ? 2 : 1.2));
		const r = simulate([wn2], [1, -2 * s, wn2], () => 1, T, T / 4000);
		const ms = measure(r.t, r.y);
		geo = drawPlane(cp, "s", crit ? [[s, 0]] : [[s, w], [s, -w]], { x: 9, y: 13 });
		const vl = [];
		let th;
		let list;
		if (crit) {
			th = { mp: 0, ts: 1.6 * Math.PI / Math.abs(s) };
			vl.push({ x: th.ts, c: C.red, label: "tₛ" });
			list = [["Tipo", "crítico (polo doble)"], ["tₛ ≈ 1,6·π/|σ|", f2(th.ts) + " s"], ["tₛ real (banda 5 %)", f2(ms.ts) + " s"], ["Mₚ", "0 %"]];
		} else {
			th = { Td: 2 * Math.PI / w, tp: Math.PI / w, mp: Math.exp(Math.PI * s / w), ts: Math.PI / Math.abs(s) };
			vl.push({ x: th.tp, c: C.green, label: "tₚ" }, { x: th.ts, c: C.red, label: "tₛ" });
			list = [["Tipo", "subamortiguado"], ["ζ", f2(-s / Math.sqrt(wn2))], ["Tₐ = 2π/ω", f2(th.Td) + " s"], ["tₚ = π/ω", f2(th.tp) + " s"],
				["Mₚ = e^(πσ/ω)", f2(th.mp * 100) + " %"], ["Mₚ real", f2(ms.mp * 100) + " %"], ["tₛ = π/|σ|", f2(th.ts) + " s"], ["tₛ real (banda 5 %)", f2(ms.ts) + " s"]];
		}
		plot(cr, [{ x: r.t, y: r.y, c: C.main, name: "c(t)" }], {
			x1: T, y0: 0, y1: Math.max(1.3, 1 + th.mp * 1.2),
			hlines: [{ y: 1, c: C.mut }, { y: 1.05, c: C.red }, { y: 0.95, c: C.red }], vlines: vl
		});
		rows(res, list);
	}
	update();
	return update;
}

// ---------- polos discretos ----------
function polosZ(root) {
	const { controls, view } = layout(root);
	const rr = slider(controls, "Módulo |p|", 0.2, 0.99, 0.01, 0.9, update);
	const ph = slider(controls, "Fase ∠p [rad]", 0.05, 3.1, 0.01, 0.4, update);
	const TT = slider(controls, "Periodo T [s]", 0.01, 1, 0.01, 0.1, update);
	const res = el("div", "wg-res", controls);
	const cp = canvas(view, 240);
	const cr = canvas(view, 300);
	function update() {
		const r = rr.value;
		const f = ph.value;
		const T = TT.value;
		const c = 2 * r * Math.cos(f);
		const ks = Math.ceil(-Math.PI / Math.log(r));
		const N = Math.min(600, Math.max(40, Math.round(ks * 2.2)));
		const y = simDisc([1 - c + r * r], [1, -c, r * r], N);
		drawPlane(cp, "z", [[r * Math.cos(f), r * Math.sin(f)], [r * Math.cos(f), -r * Math.sin(f)]], {});
		const mp = Math.pow(r, Math.PI / f);
		const kp = Math.PI / f;
		plot(cr, [{ x: y.map((_, i) => i), y, c: C.main, step: true, name: "c[k]" }], {
			x1: N - 1, y0: 0, y1: Math.max(1.3, 1 + mp * 1.2), xl: "k",
			hlines: [{ y: 1, c: C.mut }, { y: 1.05, c: C.red }, { y: 0.95, c: C.red }],
			vlines: [{ x: ks, c: C.red, label: "kₛ" }, { x: kp, c: C.green, label: "kₚ" }]
		});
		let real = 0;
		for (let i = N - 1; i >= 0; i--) {
			if (Math.abs(y[i] - 1) > 0.05) {
				real = i + 1;
				break;
			}
		}
		rows(res, [["kₐ = 2π/∠p", f2(2 * Math.PI / f) + " muestras"], ["kₚ = π/∠p", f2(kp) + " muestras"],
			["Mₚ = |p|^(π/∠p)", f2(mp * 100) + " %"], ["kₛ = ⌈−π/ln|p|⌉", ks + " muestras"], ["kₛ real", real + " muestras"],
			["tₛ = kₛ·T", f2(ks * T) + " s"], ["tₚ = kₚ·T", f2(kp * T) + " s"]]);
	}
	update();
	return update;
}

// ---------- polo dominante ----------
function dominante(root) {
	const { controls, view } = layout(root);
	const pa = slider(controls, "Polo lento a (en −a)", 0.2, 5, 0.1, 1, update);
	const pb = slider(controls, "Polo rápido b (en −b)", 0.2, 50, 0.1, 20, update);
	const res = el("div", "wg-res", controls);
	el("p", "wg-note", controls, "Regla práctica: b ≥ 10·a. Acerca b a a y mira cómo falla.");
	const cv = canvas(view, 320);
	function update() {
		const a = pa.value;
		const b = pb.value;
		const T = Math.max(3, 5 / a);
		const full = simulate([a * b], conv([1, a], [1, b]), () => 1, T, T / 4000);
		const simp = simulate([a], [1, a], () => 1, T, T / 4000);
		const mf = measure(full.t, full.y);
		plot(cv, [{ x: full.t, y: full.y, c: C.main, lw: 3, name: "completo" }, { x: simp.t, y: simp.y, c: C.orange, dash: [6, 4], name: "simplificado" }],
			{ x1: T, y0: 0, y1: 1.1, hlines: [{ y: 0.95, c: C.red }] });
		rows(res, [["b / a", f2(b / a)], ["tₛ completo", f2(mf.ts) + " s"], ["tₛ simplificado (3/a)", f2(3 / a) + " s"],
			["Error relativo", f2(Math.abs(mf.ts - 3 / a) / mf.ts * 100) + " %"],
			["¿Válida?", b / a >= 10 ? "sí" : "<b class='wg-warn'>no</b>"]]);
	}
	update();
	return update;
}

// ---------- error en regimen permanente ----------
function errorRP(root) {
	const { controls, view } = layout(root);
	const q = select(controls, "Tipo q", [["0", "0 (sin integrador)"], ["1", "1"], ["2", "2"]], "1", update);
	const inp = select(controls, "Entrada", [["0", "Escalón"], ["1", "Rampa"], ["2", "Parábola"]], "1", update);
	const K = slider(controls, "Ganancia K", 0.5, 40, 0.5, 10, update);
	const res = el("div", "wg-res", controls);
	el("p", "wg-note", controls, "CA = K(s+2) / (s^q (s+1)(s+5)), realimentación unitaria.");
	const cv = canvas(view, 340);
	function update() {
		const qq = +q.value;
		const m = +inp.value;
		let den0 = [1, 6, 5];
		for (let i = 0; i < qq; i++) {
			den0 = conv(den0, [1, 0]);
		}
		const num = conv([K.value], [1, 2]);
		const den = padd(den0, num);
		const stable = roots(den).every((z) => z[0] < -1e-6);
		const u = (t) => (m === 0 ? 1 : m === 1 ? t : t * t / 2);
		const T = 25;
		const out = simulate(num, den, u, T, 0.005);
		const e = out.y.map((y, i) => u(out.t[i]) - y);
		const Kq = K.value * 0.4;
		const th = qq > m ? "0" : qq === m ? f2(qq === 0 ? 1 / (1 + Kq) : 1 / Kq) : "∞";
		plot(cv, [
			{ x: out.t, y: out.t.map(u), c: C.mut, dash: [5, 4], name: "entrada r" },
			{ x: out.t, y: out.y, c: C.main, name: "salida c" },
			{ x: out.t, y: e, c: C.red, name: "error e" }
		], { x1: T, y0: Math.min(0, ...e), y1: stable ? Math.max(1.2, Math.max(...e, ...out.y) * 1.05) : Math.max(1, u(T) * 1.1) });
		rows(res, [["K_q = 0,4·K", f2(Kq)], ["Estable", stable ? "sí" : "<b class='wg-warn'>NO</b>"], ["Error teórico", th],
			["Error simulado", stable ? f2(e[e.length - 1]) : "–"]]);
	}
	update();
	return update;
}


// =====================================================================
// Ejercicios en grupo del Tema 2
// =====================================================================

// Puntos de datos como marcas cortas (plot() solo dibuja lineas)
function dots(points, c, name, dx = 0.07) {
	return points.map(([x, y], i) => ({ x: [x - dx, x + dx], y: [y, y], c, lw: 6, name: i === 0 ? name : undefined }));
}

// ---------- Ejercicio 1: sistema hibrido, ganancias y rango de K ----------
const KBG = 0.08 / 1.5;      // de B0G(1) = 1  ->  KBG·1.5 / (0.1·0.8) = 1

export function ej1Lazo(K) {
	const c = K * KBG;
	return { c, num: [c, 0.5 * c], den: [1, c - 1.1, 0.18 + 0.5 * c] };
}

export function estable2(a1, a0) {
	return Math.abs(a0) < 1 && 1 + a1 + a0 > 0 && 1 - a1 + a0 > 0;
}

export function ej1Rango(errMax) {
	const kmin = 1 / errMax - 1;
	let kmax = 0;
	for (let K = 0; K <= 300; K += 0.01) {
		const l = ej1Lazo(K);
		if (estable2(l.den[1], l.den[2])) {
			kmax = K;
		} else if (K > 1) {
			break;
		}
	}
	return { kmin, kmax };
}

function ej1(root) {
	const { controls, view } = layout(root);
	const Ks = slider(controls, "Ganancia K del controlador", 0.5, 40, 0.5, 2, update);
	const em = number(controls, "Error máximo admitido [%]", 20, update);
	const res = el("div", "wg-res", controls);
	el("p", "wg-note", controls, "K_BG sale de exigir ganancia estática 1 en la planta: B₀G(1) = K_BG·1,5 / (0,1·0,8) = 1.");
	const c1 = canvas(view, 270);
	const c2 = canvas(view, 270);
	function update() {
		const K = Ks.value;
		const l = ej1Lazo(K);
		const stable = estable2(l.den[1], l.den[2]);
		const N = 40;
		const y = simDisc(l.num, l.den, N);
		const k0 = K * 1;                    // CA(1) = K·B0G(1) = K
		const e = 1 / (1 + k0);
		const { kmin, kmax } = ej1Rango(em.value / 100);
		plot(c1, [{ x: y.map((_, i) => i * 0.5), y, c: C.main, step: true, name: "c[k]" }], {
			x1: (N - 1) * 0.5, y0: 0, y1: Math.max(1.2, Math.max(...y) * 1.1), xl: "t [s]",
			hlines: [{ y: 1, c: C.mut }, { y: k0 / (1 + k0), c: C.red }]
		});
		const ks = [];
		const es = [];
		for (let k = 0; k <= 40; k += 0.5) {
			ks.push(k);
			es.push(100 / (1 + k));
		}
		plot(c2, [{ x: ks, y: es, c: C.blue, name: "error RP [%] = 100/(1+K)" }], {
			x1: 40, y0: 0, y1: 100, xl: "K",
			hlines: [{ y: em.value, c: C.orange }],
			vlines: [{ x: kmin, c: C.green, label: "K mín" }, { x: Math.min(kmax, 40), c: C.red, label: "límite de estabilidad" }, { x: K, c: C.blue }]
		});
		rows(res, [
			["K_BG", f2(KBG * 1000) + "·10⁻³ (= 0,08/1,5)"], ["Tipo de la cadena abierta", "0 (ningún polo en z = 1)"],
			["K₀[CA] = CA(1) = K·B₀G(1)", f2(k0) + "  → es K_p"], ["K₀[M] = K_p/(1+K_p)", f2(k0 / (1 + k0))],
			["Error RP al escalón", f2(e * 100) + " %"], ["¿Estable con este K?", stable ? "sí" : "<b class='wg-warn'>NO</b>"],
			["K mínimo (error ≤ " + em.value + " %)", f2(kmin)], ["K máximo (estabilidad)", f2(kmax)]
		]);
	}
	update();
	return update;
}

// ---------- Ejercicio 2: cinta transportadora ----------
export function cintaSim(K, pAmp = 0.5, N = 151) {
	const T = 0.1;
	const a = Math.exp(-T / 0.4);       // polo del EQD: e^(-T/tau)
	const b = 0.2 * (1 - a);            // B0G(z) = b/(z-a)
	const r = [];
	const p = [];
	const c = [];
	let y = 0;
	for (let k = 0; k < N; k++) {
		const rk = k >= 20 ? 1 : 0;
		const pk = k >= 60 ? pAmp : 0;
		const ck = y - pk;
		r.push(rk);
		p.push(pk);
		c.push(ck);
		y = a * y + b * K * (rk - ck);
	}
	return { r, p, c, a, b };
}

export function cintaSolveK(target) {
	let lo = 0.01;
	let hi = 40;
	for (let i = 0; i < 60; i++) {
		const mid = (lo + hi) / 2;
		if (cintaSim(mid, 0.5, 60).c[59] < target) {
			lo = mid;
		} else {
			hi = mid;
		}
	}
	return (lo + hi) / 2;
}

function ej2(root) {
	const { controls, view } = layout(root);
	const Ks = slider(controls, "Ganancia K [V/(m/s)]", 0.5, 60, 0.5, 20, update);
	const pa = slider(controls, "Amplitud de la perturbación [m/s]", 0, 1, 0.05, 0.5, update);
	const tg = number(controls, "Salida deseada en t = 5,9 s [m/s]", 0.8, update);
	const res = el("div", "wg-res", controls);
	el("p", "wg-note", controls, "Muestreo T = 0,1 s. Entrada: escalón en t = 2 s (k = 20). Perturbación: escalón en t = 6 s (k = 60), resta a la salida.");
	const cv = canvas(view, 340);
	function update() {
		const K = Ks.value;
		const s = cintaSim(K, pa.value);
		const t = s.c.map((_, i) => i * 0.1);
		plot(cv, [
			{ x: t, y: s.r, c: C.mut, dash: [5, 4], name: "r (referencia)" },
			{ x: t, y: s.p, c: C.orange, dash: [5, 4], name: "p (perturbación)" },
			{ x: t, y: s.c, c: C.main, step: true, name: "c (velocidad)" }
		], {
			x1: 15, y0: Math.min(-0.2, ...s.c), y1: Math.max(1.2, ...s.c) * 1.05,
			vlines: [{ x: 5.9, c: C.green, label: "5,9 s" }, { x: 10, c: C.red, label: "10 s" }]
		});
		const kdc = K / (5 + K);
		const kt = tg.value;
		rows(res, [
			["Polo del EQD a = e^(−T/τ)", s.a.toFixed(4)], ["B₀G(z) = b/(z−a), b", (s.b).toFixed(5)],
			["Polo del lazo cerrado a − bK", (s.a - s.b * K).toFixed(3)], ["Ganancia del lazo K/(5+K)", f2(kdc)],
			["c(5,9 s)", f2(s.c[59]) + " m/s"], ["c(10 s)", f2(s.c[100]) + " m/s"],
			["K para c(5,9) = " + kt, f2(cintaSolveK(kt)) + " (analítico 5c/(1−c) = " + f2(5 * kt / (1 - kt)) + ")"]
		]);
	}
	update();
	return update;
}

// ---------- Ejercicio 3: identificar un sistema de 2.º orden ----------
export function identificar(cinf, tp, cpico) {
	const mp = (cpico - cinf) / cinf;
	const wd = Math.PI / tp;
	const sigma = Math.log(mp) / tp;          // Mp = e^(pi·sigma/wd)  ->  sigma = ln(Mp)/tp
	return { mp, wd, sigma, K: cinf * (sigma * sigma + wd * wd) };
}

const DATOS3 = [[1.54, 0.363], [3.16, 0.198], [4.28, 0.264], [4.74, 0.274], [5.29, 0.261], [6.3, 0.239], [7.84, 0.255], [10, 0.249]];

function ej3(root) {
	const { controls, view } = layout(root);
	const ci = number(controls, "c(∞) leído en la gráfica", 0.25, update);
	const tpi = number(controls, "Instante del primer pico t_p [s]", 1.54, update);
	const cpi = number(controls, "Valor del primer pico", 0.363, update);
	const modelo = select(controls, "Modelo mostrado", [["fit", "Calculado con los datos"], ["round", "Redondeado: −0,5 ± 2j"], ["manual", "Manual (sliders)"]], "round", setModel);
	const sg = slider(controls, "σ = Re[p]", -2, -0.05, 0.01, -0.5, update);
	const om = slider(controls, "ω = Im[p]", 0.5, 4, 0.01, 2, update);
	const Kk = slider(controls, "Ganancia K del numerador", 0.2, 3, 0.01, 1.0625, update);
	const res = el("div", "wg-res", controls);
	const cv = canvas(view, 340);
	function setModel() {
		const f = identificar(ci.value, tpi.value, cpi.value);
		if (modelo.value === "fit") {
			sg.value = f.sigma;
			om.value = f.wd;
			Kk.value = f.K;
		} else if (modelo.value === "round") {
			sg.value = -0.5;
			om.value = 2;
			Kk.value = 1.0625;
		}
		update();
	}
	function update() {
		const s = sg.value;
		const w = om.value;
		const k = Kk.value;
		const wn2 = s * s + w * w;
		const r = simulate([k], [1, -2 * s, wn2], () => 1, 10, 0.01);
		const f = identificar(ci.value, tpi.value, cpi.value);
		let sse = 0;
		for (const [x, y] of DATOS3) {
			sse += Math.pow(r.y[Math.min(r.y.length - 1, Math.round(x / 10 * (r.y.length - 1)))] - y, 2);
		}
		plot(cv, [{ x: r.t, y: r.y, c: C.main, name: "modelo" }, ...dots(DATOS3, C.red, "datos de la gráfica")], {
			x1: 10, y0: 0, y1: 0.4, hlines: [{ y: ci.value, c: C.mut }, { y: ci.value * 1.05, c: C.orange }, { y: ci.value * 0.95, c: C.orange }]
		});
		rows(res, [
			["M_p = (pico − c∞)/c∞", f2(f.mp * 100) + " %"], ["ω = π/t_p", f2(f.wd) + " rad/s"],
			["σ = ln(M_p)/t_p", f2(f.sigma) + " 1/s"], ["K = c∞(σ²+ω²)", f2(f.K)],
			["Polos del modelo mostrado", `${f2(s)} ± ${f2(w)}j`], ["t_s = π/|σ|", f2(Math.PI / Math.abs(s)) + " s"],
			["M(s) = K/(s² − 2σs + σ²+ω²)", `${f2(k)} / (s² + ${f2(-2 * s)}s + ${f2(wn2)})`], ["Error RMS vs datos", f2(Math.sqrt(sse / DATOS3.length) * 1000) + "·10⁻³"]
		]);
	}
	update();
	return update;
}

// ---------- Ejercicio 4: doble lazo con rampa ----------
export function lazoDoble(g, h1, h2) {
	const D = [1, 1 + h2 * g, h1 * g];
	return {
		D,
		c: { num: [g], den: D },
		v1: { num: [h1 * g], den: D },
		v2: { num: [h2 * g], den: D },
		e1: { num: [1, 1 + h2 * g, 0], den: D },
		a1: { num: [1, 1 + h2 * g], den: D },
		a2: { num: [1, 1], den: D }
	};
}

function ej4(root) {
	const { controls, view } = layout(root);
	const sl = slider(controls, "Pendiente de la entrada r(t) = m·t", 0.5, 5, 0.5, 2, update);
	const gg = slider(controls, "Ganancia de la planta g (g/(s+1))", 0.5, 5, 0.5, 2, update);
	const h1 = slider(controls, "Realimentación externa H₁", 0.5, 4, 0.5, 2, update);
	const h2 = slider(controls, "Realimentación interna H₂", 0, 3, 0.5, 1, update);
	const vista = select(controls, "Señales", [["all", "Todas"], ["ext", "Lazo externo: r, v1, e1"], ["int", "Lazo interno: a1, a2, v2, c"]], "all", update);
	const res = el("div", "wg-res", controls);
	const cv = canvas(view, 340);
	function update() {
		const m = sl.value;
		const g = gg.value;
		const H1 = h1.value;
		const H2 = h2.value;
		const L = lazoDoble(g, H1, H2);
		const T = 14;
		const u = (t) => m * t;
		const sim = (tf) => simulate(tf.num, tf.den, u, T, 0.004);
		const S = { r: null, v1: sim(L.v1), e1: sim(L.e1), a1: sim(L.a1), a2: sim(L.a2), v2: sim(L.v2), c: sim(L.c) };
		const t = S.c.t;
		S.r = { t, y: t.map(u) };
		const col = { r: C.mut, v1: C.blue, e1: C.red, a1: C.orange, a2: C.green, v2: "#8e44ad", c: C.main };
		const set = vista.value === "ext" ? ["r", "v1", "e1"] : vista.value === "int" ? ["a1", "a2", "v2", "c"] : ["r", "v1", "e1", "a1", "a2", "v2", "c"];
		const all = set.flatMap((k) => S[k].y);
		plot(cv, set.map((k) => ({ x: t, y: S[k].y, c: col[k], name: k, dash: k === "r" ? [5, 4] : undefined })), {
			x1: T, y0: Math.min(0, ...all), y1: Math.max(1, ...all) * 1.05
		});
		const slope = (k) => (S[k].y[S[k].y.length - 1] - S[k].y[S[k].y.length - 1 - Math.floor(S[k].y.length * 2 / T)]) / 2;
		const kv = H1 * g / (1 + H2 * g);
		const cs = m / H1;
		rows(res, [
			["Tipo del sistema", "1 (un integrador)"], ["K₁ de la cadena externa = H₁g/(1+H₂g)", f2(kv)],
			["e₁(∞) = m/K₁", f2(m / kv) + " V   (simulado " + f2(S.e1.y[S.e1.y.length - 1]) + ")"],
			["pendiente c", f2(cs) + " (sim " + f2(slope("c")) + ")"], ["pendiente v₁ = H₁·c", f2(H1 * cs) + " (sim " + f2(slope("v1")) + ")"],
			["pendiente v₂ = H₂·c", f2(H2 * cs) + " (sim " + f2(slope("v2")) + ")"], ["pendiente a₂ = c/g", f2(cs / g) + " (sim " + f2(slope("a2")) + ")"],
			["pendiente a₁ = c(1+H₂g)/g", f2(cs * (1 + H2 * g) / g) + " (sim " + f2(slope("a1")) + ")"]
		]);
	}
	update();
	return update;
}

// ---------- Ejercicio 5: discreto con polos complejos y retardo ----------
export function discCar(r, phi, d, K) {
	const kd = 2 * Math.PI / phi;
	const kp = Math.PI / phi + d;
	const mp = Math.pow(r, Math.PI / phi);
	const ks = Math.ceil(-3 / Math.log(r)) + d;
	const cinf = K / (1 - 2 * r * Math.cos(phi) + r * r);
	return { kd, kp, mp, ks, cinf };
}

function ej5(root) {
	const { controls, view } = layout(root);
	const r = number(controls, "Módulo |p|", 0.7071, update, "0.0001");
	const ph = number(controls, "Fase ∠p [rad]", 0.7854, update, "0.0001");
	const dl = select(controls, "Retardo (polos en z = 0)", [["0", "0"], ["1", "1  (z en el denominador)"], ["2", "2"], ["3", "3"]], "1", update);
	const kk = number(controls, "Numerador K", 1, update);
	const res = el("div", "wg-res", controls);
	el("p", "wg-note", controls, "M(z) = K / ( zᵈ · (z² − 2|p|cos∠p · z + |p|²) ).  Ejercicio: |p| = 0,7071, ∠p = π/4, d = 1, K = 1.");
	const cv = canvas(view, 330);
	function update() {
		const R = r.value;
		const F = ph.value;
		const d = +dl.value;
		const K = kk.value;
		if (!(R > 0 && R < 1 && F > 0 && F < Math.PI)) {
			return;
		}
		const ch = discCar(R, F, d, K);
		let den = [1, -2 * R * Math.cos(F), R * R];
		for (let i = 0; i < d; i++) {
			den = conv(den, [1, 0]);
		}
		const N = Math.max(30, Math.round(ch.ks * 2.2));
		const y = simDisc([K], den, N);
		plot(cv, [{ x: y.map((_, i) => i), y, c: C.main, step: true, name: "c[k]" }], {
			x1: N - 1, y0: 0, y1: Math.max(ch.cinf * 1.4, ch.cinf * (1 + ch.mp) * 1.1), xl: "k",
			hlines: [{ y: ch.cinf, c: C.mut }, { y: ch.cinf * 1.05, c: C.red }, { y: ch.cinf * 0.95, c: C.red }],
			vlines: [{ x: ch.kp, c: C.green, label: "kp" }, { x: ch.ks, c: C.red, label: "ks" }]
		});
		rows(res, [
			["k_d = 2π/∠p", f2(ch.kd) + " muestras"], ["k_p = π/∠p + d", f2(ch.kp) + " (π/∠p = " + f2(Math.PI / F) + ", + " + d + " de retardo)"],
			["M_p = |p|^(π/∠p)", f2(ch.mp * 100) + " %"], ["k_s = ⌈−3/ln|p|⌉ + d", ch.ks + " (⌈" + f2(-3 / Math.log(R)) + "⌉ + " + d + ")"],
			["c(∞) = M(1)", f2(ch.cinf) + "  = K/(1 − 2|p|cos∠p + |p|²)"]
		]);
	}
	update();
	return update;
}

export const SIST_CONT_WIDGETS = {
	"polos-s": polosS,
	"polos-z": polosZ,
	"dominante": dominante,
	"error-rp": errorRP,
	"ej1-hibrido": ej1,
	"ej2-cinta": ej2,
	"ej3-identificar": ej3,
	"ej4-doble-lazo": ej4,
	"ej5-discreto": ej5
};
