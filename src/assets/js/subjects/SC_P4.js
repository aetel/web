// Practica 4 (RT): barrido de la ganancia K sobre G'(s) = 10/(s(s+1)(s+10)), continuo y discreto (ZOH, T = 0,1 s).
import { C, f2, roots, padd, simulate, simDisc, plot, drawPlane, el, slider, rows, canvas, layout } from "./core.js";
import { zoh, trim } from "./lazo.js";

const T = 0.1;
const BG = zoh([10], [1, 11, 10, 0], T);

export function lazoK(d, K) {
	if (d) {
		return { num: BG.num.map((v) => K * v), den: trim(padd(BG.den, BG.num.map((v) => K * v))) };
	}
	return { num: [10 * K], den: [1, 11, 10, 10 * K] };
}

const polosK = (d, K) => roots(lazoK(d, K).den);
const maxMod = (d, K) => Math.max(...polosK(d, K).map((p) => (d ? Math.hypot(p[0], p[1]) : p[0])));
const hayComplejos = (d, K) => polosK(d, K).some((p) => Math.abs(p[1]) > 1e-6);

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

// Kc: aparece el par complejo (amortiguamiento critico); Km: oscilacion sostenida; tosc en segundos
export function limitesK(d) {
	if (!d) {
		const s = (-22 + Math.sqrt(364)) / 6;
		return { Kc: -s * (s + 1) * (s + 10) / 10, Km: 11, tosc: 2 * Math.PI / Math.sqrt(10) };
	}
	const Km = biseccion((K) => maxMod(true, K) >= 1, 0.1, 30);
	const Kc = biseccion((K) => hayComplejos(true, K), 0.001, Km);
	const p = polosK(true, Km).find((q) => q[1] > 1e-6);
	return { Kc, Km, tosc: 2 * Math.PI / Math.atan2(p[1], p[0]) * T };
}

export function clasifica(d, K) {
	const L = limitesK(d);
	if (Math.abs(K - L.Km) < 0.01 * L.Km) {
		return "oscilación sostenida (límite de estabilidad)";
	}
	if (K > L.Km) {
		return "inestable";
	}
	if (Math.abs(K - L.Kc) < 0.01 * L.Kc) {
		return "críticamente amortiguado";
	}
	return K < L.Kc ? "sobreamortiguado" : "subamortiguado";
}

const KS = { c: [0.18, 0.23765, 3, 11, 12], d: [0.16, 0.232, 2.4, 7.15, 8] };

function barrido(root) {
	const { controls, view } = layout(root);
	const modo = el("select", "", el("label", "wg-label", controls, "Sistema"));
	[["c", "Continuo G'(s)"], ["d", "Discreto BG'(z), T = 0,1 s"]].forEach(([v, t]) => {
		el("option", "", modo).textContent = t;
		modo.lastChild.value = v;
	});
	const sk = slider(controls, "Ganancia K", 0, 13, 0.01, 3, update);
	const fila = el("div", "wg-row", controls);
	const botones = [];
	for (let i = 0; i < 5; i++) {
		const b = el("button", "wg-opt", fila);
		b.addEventListener("click", () => {
			sk.value = KS[modo.value][i];
			update();
		});
		botones.push(b);
	}
	modo.addEventListener("change", () => {
		sk.value = KS[modo.value][2];
		update();
	});
	const res = el("div", "wg-res", controls);
	const cp = canvas(view, 220);
	const cr = canvas(view, 300);
	function update() {
		const d = modo.value === "d";
		const K = sk.value;
		botones.forEach((b, i) => {
			b.textContent = "K = " + KS[modo.value][i];
		});
		const M = lazoK(d, K);
		const polos = roots(M.den);
		const L = limitesK(d);
		const cls = clasifica(d, K);
		const ext = { x: Math.max(2, 1.2 * Math.max(...polos.map((p) => Math.abs(p[0])))), y: Math.max(2, 1.2 * Math.max(...polos.map((p) => Math.abs(p[1])))) };
		drawPlane(cp, d ? "z" : "s", polos, ext);
		let t;
		let y;
		if (d) {
			y = simDisc(M.num, M.den, 201);
			t = y.map((_, k) => k * T);
		} else {
			const sMax = Math.max(...polos.map((p) => p[0]));
			const tend = sMax < -1e-3 ? Math.min(60, Math.max(2, 2.4 * Math.PI / -sMax)) : 20;
			({ t, y } = simulate(M.num, M.den, () => 1, tend, Math.min(tend / 3000, 0.2 / Math.max(...polos.map((p) => Math.hypot(p[0], p[1]))))));
		}
		const sinEstab = K >= L.Km * 0.99;
		plot(cr, [{ x: t, y, c: C.main, step: d, name: "c" }], {
			x1: t[t.length - 1], y0: sinEstab ? -3 : Math.min(0, ...y), y1: sinEstab ? 3 : Math.max(1.3, Math.max(...y) * 1.1), hlines: [{ y: 1, c: C.mut }]
		});
		const lista = polos.map((p) => {
			const mm = Math.hypot(p[0], p[1]);
			if (Math.abs(p[1]) < 1e-4) {
				return f2(p[0]);
			}
			return d ? `${f2(p[0])} ± ${f2(Math.abs(p[1]))}j (|p| = ${mm.toFixed(4)}, ∠ = ${Math.atan2(Math.abs(p[1]), p[0]).toFixed(4)})` : `${p[0].toFixed(3)} ± ${Math.abs(p[1]).toFixed(3)}j`;
		}).filter((x, i, a) => a.indexOf(x) === i);
		rows(res, [
			["Polos de lazo cerrado", lista.join(" ; ")],
			["Comportamiento", cls],
			["Amort. crítico en K ≈", L.Kc.toFixed(4)],
			["Límite de estabilidad K ≈", L.Km.toFixed(3)],
			["Periodo de la oscilación sostenida", L.tosc.toFixed(3) + " s"]
		]);
	}
	update();
	return update;
}

export const SC_P4_WIDGETS = { "p4-barrido": barrido };
