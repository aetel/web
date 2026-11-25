// Practica 4 (RT): barrido de ganancia con rastro de polos y animacion.
// Planta p31: G(s) = 20/((s+1)(s+20)) y su version discreta. Planta p33: G'(s) = 10/(s(s+1)(s+10)) y su ZOH a T = 0,1 s.
import { C, f2, roots, padd, simulate, simDisc, plot, drawPlane, el, slider, rows, canvas, layout } from "./core.js";
import { zoh, trim, peval, medir } from "./lazo.js";

const T = 0.1;
const KG = 0.095 * 0.865;
const BG = zoh([10], [1, 11, 10, 0], T);

export const PLANTAS = {
	p31: {
		nombre: "Apartado 3.1 · G(s) = 20/((s+1)(s+20)), ganancia F", etq: "F",
		c: (K) => ({ num: [20 * K], den: [1, 21, 20 + 20 * K] }),
		d: (K) => ({ num: [K * KG], den: [1, -1.04, 0.122175 + KG * K] }),
		max: { c: 30, d: 12 }, step: { c: 0.05, d: 0.02 }, ks: { c: [1, 4.5, 10, 25], d: [1, 1.8, 6.25, 10.5] }
	},
	p33: {
		nombre: "Apartado 3.3 · G'(s) = 10/(s(s+1)(s+10)), ganancia K", etq: "K",
		c: (K) => ({ num: [10 * K], den: [1, 11, 10, 10 * K] }),
		d: (K) => ({ num: BG.num.map((v) => K * v), den: trim(padd(BG.den, BG.num.map((v) => K * v))) }),
		max: { c: 13, d: 9 }, step: { c: 0.01, d: 0.01 }, ks: { c: [0.18, 0.23765, 3, 11, 12], d: [0.16, 0.232, 2.4, 7.15, 8] }
	}
};

export const lazoK = (pl, d, K) => PLANTAS[pl][d ? "d" : "c"](K);
const polosK = (pl, d, K) => roots(lazoK(pl, d, K).den);
const peor = (pl, d, K) => Math.max(...polosK(pl, d, K).map((p) => (d ? Math.hypot(p[0], p[1]) : p[0])));
const hayComplejos = (pl, d, K) => polosK(pl, d, K).some((p) => Math.abs(p[1]) > 1e-6);

function biseccion(pred, a, b) {
	for (let i = 0; i < 60; i++) {
		const m = (a + b) / 2;
		if (pred(m)) {
			b = m;
		} else {
			a = m;
		}
	}
	return (a + b) / 2;
}

const memo = {};

// Kc: aparece el par complejo; Km: limite de estabilidad (Infinity si no existe); tosc: periodo en el limite
export function limitesK(pl, d) {
	const clave = pl + d;
	if (memo[clave]) {
		return memo[clave];
	}
	const inest = (K) => (d ? peor(pl, d, K) >= 1 : peor(pl, d, K) >= 0);
	const Km = inest(1000) ? biseccion(inest, 1e-3, 1000) : Infinity;
	const Kc = biseccion((K) => hayComplejos(pl, d, K), 1e-4, isFinite(Km) ? Km : 1000);
	let tosc = NaN;
	if (isFinite(Km)) {
		const p = polosK(pl, d, Km).find((q) => q[1] > 1e-6);
		tosc = d ? 2 * Math.PI / Math.atan2(p[1], p[0]) * T : 2 * Math.PI / p[1];
	}
	memo[clave] = { Kc, Km, tosc };
	return memo[clave];
}

export function clasifica(pl, d, K) {
	const L = limitesK(pl, d);
	if (isFinite(L.Km) && Math.abs(K - L.Km) < 0.01 * L.Km) {
		return "oscilación sostenida";
	}
	if (K > L.Km) {
		return "inestable";
	}
	if (Math.abs(K - L.Kc) < 0.01 * L.Kc) {
		return "críticamente amortiguado";
	}
	return K < L.Kc ? "sobreamortiguado" : "subamortiguado";
}

const EXPLICA = {
	"sobreamortiguado": "Todos los polos son reales: la salida sube sin oscilar. No hay t<sub>p</sub> ni M<sub>p</sub>, y manda el polo más lento.",
	"críticamente amortiguado": "Dos polos reales se han fundido en uno doble: es la respuesta más rápida que todavía no rebasa el valor final.",
	"subamortiguado": "Ha aparecido un par complejo: la salida rebasa el valor final y oscila mientras se apaga. Ahora sí hay t<sub>p</sub> y M<sub>p</sub>.",
	"oscilación sostenida": "Los polos están justo sobre el eje imaginario (o sobre el círculo unidad): la oscilación ni crece ni se apaga.",
	"inestable": "Hay polos en el semiplano derecho (o fuera del círculo unidad): la respuesta crece sin límite."
};

// Teoria del polo dominante: s => t_s = π/|σ|, t_p = π/ω, M_p = e^(πσ/ω); z => k_s = ⌈−π/ln|p|⌉, k_p = π/φ, M_p = |p|^(π/φ)
export function teoria(d, polos) {
	const dom = polos.reduce((a, b) => ((d ? Math.hypot(a[0], a[1]) >= Math.hypot(b[0], b[1]) : a[0] >= b[0]) ? a : b));
	const w = Math.abs(dom[1]);
	if (d) {
		const r = Math.hypot(dom[0], dom[1]);
		const ph = Math.atan2(w, dom[0]);
		const cx = w > 1e-6 && ph > 1e-3;
		return { ts: Math.ceil(-Math.PI / Math.log(r)) * T, mp: cx ? Math.pow(r, Math.PI / ph) : 0, tp: cx ? Math.PI / ph * T : NaN };
	}
	const cx = w > 1e-4;
	return { ts: Math.PI / -dom[0], mp: cx ? Math.exp(Math.PI * dom[0] / w) : 0, tp: cx ? Math.PI / w : NaN };
}

function barrido(root) {
	const { controls, view } = layout(root);
	let pl = PLANTAS[root.dataset.planta] ? root.dataset.planta : "p31";
	let d = root.dataset.modo === "d";
	let sk = null;
	let raf = null;
	let tray = [];
	let ext = { x: 2, y: 2 };
	const sPl = el("select", "", el("label", "wg-label", controls, "Planta"));
	Object.entries(PLANTAS).forEach(([k, v]) => {
		el("option", "", sPl).textContent = v.nombre;
		sPl.lastChild.value = k;
	});
	const sModo = el("select", "", el("label", "wg-label", controls, "Tiempo"));
	[["c", "Continuo"], ["d", "Discreto (ZOH, T = 0,1 s)"]].forEach(([v, t]) => {
		el("option", "", sModo).textContent = t;
		sModo.lastChild.value = v;
	});
	sPl.value = pl;
	sModo.value = d ? "d" : "c";
	const slot = el("div", "", controls);
	const fila = el("div", "wg-row", controls);
	const bAnim = el("button", "wg-opt", fila);
	bAnim.textContent = "▶ Animar la ganancia";
	const atajos = el("div", "wg-row", controls);
	el("p", "wg-note", controls, "Los puntos que deja cada polo al subir la ganancia forman su trayectoria: verdes = reales, naranjas = par complejo, rojos = inestable.");
	const res = el("div", "wg-res", controls);
	const msg = el("p", "wg-note", controls);
	const cp = canvas(view, 240);
	const cr = canvas(view, 300);

	function parar() {
		if (raf && typeof cancelAnimationFrame === "function") {
			cancelAnimationFrame(raf);
		}
		raf = null;
		bAnim.textContent = "▶ Animar la ganancia";
	}

	function monta() {
		parar();
		pl = sPl.value;
		d = sModo.value === "d";
		const P = PLANTAS[pl];
		const k = d ? "d" : "c";
		slot.textContent = "";
		sk = slider(slot, "Ganancia " + P.etq, 0, P.max[k], P.step[k], P.ks[k][Math.min(2, P.ks[k].length - 1)], update);
		atajos.textContent = "";
		P.ks[k].forEach((v) => {
			const b = el("button", "wg-opt", atajos);
			b.textContent = P.etq + " = " + v;
			b.addEventListener("click", () => {
				parar();
				sk.value = v;
				update();
			});
		});
		tray = [];
		let mx = 0;
		let my = 0;
		for (let i = 0; i <= 300; i++) {
			const K = i / 300 * P.max[k];
			const ps = polosK(pl, d, K);
			tray.push({ K, ps, cl: clasifica(pl, d, K) });
			ps.forEach((p) => {
				mx = Math.max(mx, Math.abs(p[0]));
				my = Math.max(my, Math.abs(p[1]));
			});
		}
		ext = { x: Math.max(2, 1.15 * mx), y: Math.max(2, 1.2 * my) };
		update();
	}

	function update() {
		const K = sk.value;
		const M = lazoK(pl, d, K);
		const polos = roots(M.den);
		const L = limitesK(pl, d);
		const cls = clasifica(pl, d, K);
		const geo = drawPlane(cp, d ? "z" : "s", polos, ext);
		const g = cp.getContext("2d");
		for (const t of tray) {
			if (t.K > K) {
				break;
			}
			g.fillStyle = t.cl === "inestable" || t.cl === "oscilación sostenida" ? C.red : t.cl === "subamortiguado" ? C.orange : C.green;
			for (const p of t.ps) {
				g.beginPath();
				g.arc(geo.cx + p[0] * geo.sx, geo.cy - p[1] * geo.sy, 1.6, 0, 2 * Math.PI);
				g.fill();
			}
		}
		// simulacion
		const estable = cls !== "inestable" && cls !== "oscilación sostenida";
		const s0 = d ? 1 : 0;
		let t;
		let y;
		if (d) {
			y = simDisc(M.num, M.den, 201);
			t = y.map((_, i) => i * T);
		} else {
			const sMax = Math.max(...polos.map((p) => p[0]));
			const tend = sMax < -1e-3 ? Math.min(60, Math.max(2, 2.4 * Math.PI / -sMax)) : 20;
			({ t, y } = simulate(M.num, M.den, () => 1, tend, Math.min(tend / 3000, 0.2 / Math.max(...polos.map((p) => Math.hypot(p[0], p[1]))))));
		}
		plot(cr, [{ x: t, y, c: C.main, step: d, name: "c" }], {
			x1: t[t.length - 1], y0: estable ? Math.min(0, ...y) : -3, y1: estable ? Math.max(1.3, Math.max(...y) * 1.1) : 3, hlines: [{ y: 1, c: C.mut }]
		});
		const lista = polos.map((p) => {
			if (Math.abs(p[1]) < 1e-4) {
				return p[0].toFixed(3);
			}
			return d ? `${p[0].toFixed(3)} ± ${Math.abs(p[1]).toFixed(3)}j (|p| = ${Math.hypot(...p).toFixed(4)}, ∠ = ${Math.atan2(Math.abs(p[1]), p[0]).toFixed(4)} rad)` : `${p[0].toFixed(3)} ± ${Math.abs(p[1]).toFixed(3)}j`;
		}).filter((x, i, a) => a.indexOf(x) === i);
		const list = [["Polos de lazo cerrado", lista.join(" ; ")], ["Comportamiento", `<b>${cls}</b>`]];
		if (estable && K > 0) {
			const cinf = peval(M.num, s0) / peval(M.den, s0);
			const te = teoria(d, polos);
			const me = medir(t, y, cinf);
			const fm = (x) => (isFinite(x) ? f2(x) : "—");
			list.push(
				["Valor final", f2(cinf)],
				["Teórico  tₚ / Mₚ / tₛ", `${fm(te.tp)} s / ${f2(te.mp * 100)} % / ${fm(te.ts)} s`],
				["Medido   tₚ / Mₚ / tₛ", `${te.mp > 0 ? fm(me.tp) : "—"} s / ${f2(me.mp * 100)} % / ${fm(me.ts)} s`]
			);
		}
		list.push(["Ganancia crítica (polo doble)", L.Kc.toFixed(4)]);
		if (isFinite(L.Km)) {
			list.push(["Límite de estabilidad", L.Km.toFixed(3)], ["Periodo en el límite", L.tosc.toFixed(3) + " s"]);
		} else {
			list.push(["Límite de estabilidad", "no existe: estable para cualquier ganancia"]);
		}
		rows(res, list);
		msg.innerHTML = EXPLICA[cls];
	}

	bAnim.addEventListener("click", () => {
		if (raf) {
			parar();
			return;
		}
		if (typeof requestAnimationFrame !== "function") {
			return;
		}
		const kmax = PLANTAS[pl].max[d ? "d" : "c"];
		const dur = 12000;
		const t0 = performance.now() - Math.min(0.98, sk.value / kmax) * dur;
		bAnim.textContent = "⏸ Pausa";
		const paso = (ahora) => {
			const f = (ahora - t0) / dur;
			if (f >= 1) {
				sk.value = kmax;
				update();
				parar();
				return;
			}
			sk.value = f * kmax;
			update();
			raf = requestAnimationFrame(paso);
		};
		raf = requestAnimationFrame(paso);
	});
	sPl.addEventListener("change", monta);
	sModo.addEventListener("change", monta);
	monta();
	return update;
}

export const P4_WIDGETS = { "p4-barrido": barrido };
