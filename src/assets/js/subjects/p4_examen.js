// Practica 4 (preparacion de la prueba): lazo con planta inestable G(s) = p·q/((s−p)(s+q)) y regulador proporcional K.
// Tabla de la prueba: para cada K, estabilidad, polos, amortiguamiento, tₛ, tₚ y Mₚ.
import { C, f2, roots, simulate, plot, drawPlane, el, slider, select, rows, canvas, layout } from "./core.js";

const PLANTAS = {
	p1q9: { p: 1, q: 9 },
	p2q10: { p: 2, q: 10 },
	p1q7: { p: 1, q: 7 },
	p3q11: { p: 3, q: 11 }
};

const fmt = (x, d = 3) => String(+x.toFixed(d)).replace(".", ",");

export function analiza(p, q, K) {
	const pq = p * q;
	const den = [1, q - p, pq * (K - 1)];
	const num = [pq * K];
	const polos = roots(den);
	const D = ((q - p) / 2) ** 2 - pq * (K - 1);
	const eps = 1e-3;
	const complejos = D < -eps;
	const doble = Math.abs(D) <= eps;
	const estable = polos.every((z) => z[0] < -1e-9);
	const sg = (q - p) / 2;
	const wd = complejos ? Math.sqrt(-D) : 0;
	return {
		num, den, polos, D, estable, complejos, doble, sg, wd,
		clase: complejos ? "Subamortiguado" : doble ? "Críticamente amortiguado" : "Sobreamortiguado",
		final: K === 1 ? NaN : pq * K / (pq * (K - 1))
	};
}

function tablaInestable(root) {
	const { controls, view } = layout(root);
	let sk = null;
	const sel = select(controls, "Planta G(s) = pq/((s−p)(s+q))", [
		["p1q9", "9/((s−1)(s+9))  (la de la prueba)"],
		["p2q10", "20/((s−2)(s+10))"],
		["p1q7", "7/((s−1)(s+7))"],
		["p3q11", "33/((s−3)(s+11))"]
	], "p1q9", () => update());
	const slot = el("div", "", controls);
	const atajos = el("div", "wg-row", controls);
	el("p", "wg-note", controls, "Fíjate en que tₛ = π/σ no depende de K: σ = (q−p)/2 es fijo. Lo único que cambia con K es si los polos son reales o complejos y si cruzan al semiplano derecho.");
	const res = el("div", "wg-res", controls);
	const msg = el("p", "wg-note", controls);
	const cp = canvas(view, 230);
	const cr = canvas(view, 280);
	sk = slider(slot, "Ganancia K", 0, 7, 0.01, 4.6, () => update());

	function pintaAtajos() {
		atajos.textContent = "";
		[0.01, 1, 2.8, 4.6].forEach((v) => {
			const b = el("button", "wg-opt", atajos);
			b.textContent = "K = " + v;
			b.addEventListener("click", () => {
				sk.value = v;
				update();
			});
		});
	}

	function update() {
		const { p, q } = PLANTAS[sel.value];
		const K = sk.value;
		const a = analiza(p, q, K);
		const ext = { x: Math.max(12, q * 1.25), y: Math.max(4, a.wd * 1.3) };
		drawPlane(cp, "s", a.polos, ext);

		const pol = a.polos.map((z) => [z[0], Math.abs(z[1]) < 1e-4 ? 0 : z[1]]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
		const txtPolos = a.complejos
			? `${fmt(-a.sg)}+j${fmt(a.wd)} ; ${fmt(-a.sg)}−j${fmt(a.wd)}`
			: pol.map((z) => fmt(z[0])).join(" ; ");

		const tend = a.estable ? Math.min(8, Math.max(1.5, 2.4 * Math.PI / a.sg)) : 1.5;
		const { t, y } = simulate(a.num, a.den, () => 1, tend, tend / 3000);
		const cota = a.estable ? null : 3;
		const yy = cota ? y.map((v) => Math.max(-cota, Math.min(cota, v))) : y;
		plot(cr, [{ x: t, y: yy, c: a.estable ? C.main : C.red, name: "c" }], {
			x1: tend,
			y0: cota ? -cota : Math.min(0, ...y),
			y1: cota ? cota : Math.max(1.3, Math.max(...y) * 1.1),
			hlines: isFinite(a.final) && a.estable ? [{ y: a.final, c: C.mut }] : []
		});

		const list = [
			["Polos (de menor a mayor parte real)", txtPolos],
			["¿Estable?", a.estable ? "Sí" : (Math.abs(K - 1) < 0.005 ? "No (polo en el origen)" : "No (polo en el semiplano derecho)")],
			["Amortiguamiento", `<b>${a.clase}</b>`]
		];
		if (a.estable) {
			list.push(["tₛ = π/σ", fmt(Math.PI / a.sg) + " s"]);
			if (a.complejos) {
				list.push(["tₚ = π/ω", fmt(Math.PI / a.wd) + " s"], ["Mₚ = e^(−πσ/ω)", f2(Math.exp(-Math.PI * a.sg / a.wd) * 100) + " %"]);
			} else {
				list.push(["tₚ, Mₚ", "no procede (polos reales)"]);
			}
		} else {
			list.push(["tₛ, tₚ, Mₚ", "no proceden (sistema no estable)"]);
		}
		rows(res, list);
		const kc = 1 + ((q - p) / 2) ** 2 / (p * q);
		msg.innerHTML = `Estable si K &gt; 1. Polo doble en K = ${fmt(kc, 4)} (K = 1 + (q−p)²/(4pq)).`;
	}

	pintaAtajos();
	update();
	return update;
}

export const P4_EXAMEN_WIDGETS = { "p4-tabla-inestable": tablaInestable };
