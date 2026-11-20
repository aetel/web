// Relacion entre polos continuos y discretos: z = e^(sT).
import { C, f2, el, slider, canvas, layout, plot, drawPlane, rows } from "./core.js";

// Respuesta al escalon de wn²/((s-σ)²+ω²). Con ω ≈ 0 es el polo doble (critico).
export function stepS(sg, w, t) {
	const e = Math.exp(sg * t);
	return w < 0.05 ? 1 - e * (1 - sg * t) : 1 - e * (Math.cos(w * t) - sg / w * Math.sin(w * t));
}

// Polo discreto equivalente. phi se pliega a [0, π]; alias = ωT supera π.
export function poloZ(sg, w, T) {
	const r = Math.exp(sg * T);
	const m = (w * T) % (2 * Math.PI);
	return { r, phi: m > Math.PI ? 2 * Math.PI - m : m, alias: w * T > Math.PI + 1e-9 };
}

function mapaSZ(root) {
	const { controls, view } = layout(root);
	let geo = null;
	const sg = slider(controls, "Re[p] = σ [1/s]", -8, -0.1, 0.1, -2, update);
	const om = slider(controls, "Im[p] = ω [rad/s]", 0, 24, 0.1, 4, update);
	const TT = slider(controls, "Periodo de muestreo T [s]", 0.05, 1, 0.01, 0.2, update);
	const res = el("div", "wg-res", controls);
	el("p", "wg-note", controls, "Clic en el plano s para mover el polo. Franja verde: |ω| < π/T, lo único que el muestreo distingue. Círculos naranja: polos distintos en s que dan el mismo z (alias).");
	const cs = canvas(view, 260);
	const cz = canvas(view, 240);
	const cr = canvas(view, 300);
	cs.addEventListener("click", (ev) => {
		const r = cs.getBoundingClientRect();
		sg.value = Math.min(-0.1, Math.max(-8, (ev.clientX - r.left - geo.cx) / geo.sx));
		om.value = Math.min(24, Math.abs((ev.clientY - r.top - geo.cy) / geo.sy));
		update();
	});
	function update() {
		const s = sg.value;
		const w = om.value;
		const T = TT.value;
		const z = poloZ(s, w, T);
		const crit = w < 0.05;
		const real = z.phi < 0.02;
		const wN = Math.PI / T;

		geo = drawPlane(cs, "s", crit ? [[s, 0]] : [[s, w], [s, -w]], { x: 9, y: 24 });
		const g = cs.getContext("2d");
		const Y = (v) => geo.cy - v * geo.sy;
		const top = Math.min(24, wN);
		g.fillStyle = "rgba(46,139,87,0.10)";
		g.fillRect(0, Y(top), geo.cx, Y(-top) - Y(top));
		g.strokeStyle = C.green;
		g.fillStyle = C.green;
		g.setLineDash([5, 4]);
		if (wN <= 24) {
			for (const sgn of [1, -1]) {
				g.beginPath(); g.moveTo(0, Y(sgn * wN)); g.lineTo(geo.cx, Y(sgn * wN)); g.stroke();
			}
			g.fillText("π/T", 4, Y(wN) - 4);
		}
		g.setLineDash([]);
		g.strokeStyle = C.orange;
		g.lineWidth = 2;
		if (!crit) {
			for (const wa of [w + 2 * Math.PI / T, Math.abs(w - 2 * Math.PI / T)]) {
				if (wa <= 24 && Math.abs(wa - w) > 0.3) {
					for (const sgn of [1, -1]) {
						g.beginPath(); g.arc(geo.cx + s * geo.sx, Y(sgn * wa), 6, 0, 2 * Math.PI); g.stroke();
					}
				}
			}
		}
		g.lineWidth = 1;

		const pz = real ? [[z.r, 0]] : [[z.r * Math.cos(z.phi), z.r * Math.sin(z.phi)], [z.r * Math.cos(z.phi), -z.r * Math.sin(z.phi)]];
		drawPlane(cz, "z", pz, {});

		const Tsim = Math.max(3, 3.6 / -s * 1.2);
		const mpC = crit ? 0 : Math.exp(Math.PI * s / w);
		const t = Array.from({ length: 501 }, (_, i) => i * Tsim / 500);
		const kx = [];
		for (let k = 0; k * T <= Tsim; k++) {
			kx.push(k * T);
		}
		plot(cr, [
			{ x: t, y: t.map((v) => stepS(s, w, v)), c: C.main, name: "c(t) continua" },
			{ x: kx, y: kx.map((v) => stepS(s, w, v)), c: C.orange, step: true, name: "c(kT) muestreada" }
		], {
			x1: Tsim, y0: 0, y1: Math.max(1.3, 1 + mpC * 1.2),
			hlines: [{ y: 1, c: C.mut }, { y: 1.05, c: C.red }, { y: 0.95, c: C.red }],
			vlines: [{ x: (crit ? 1.6 : 1) * Math.PI / -s, c: C.red, label: "tₛ" }]
		});

		const ks = Math.ceil(-Math.PI / Math.log(z.r));
		const euler = 1 + s * T;
		const list = [
			["Polo continuo", crit ? `${f2(s)} (doble)` : `${f2(s)} ± ${f2(w)}j`],
			["|z| = e^(σT)", z.r.toFixed(4)],
			["∠z = ωT (plegado a [0, π])", f2(z.phi) + " rad" + (z.alias ? " <b class='wg-warn'>¡alias!</b>" : "")],
			["tₛ = " + (crit ? "1,6·" : "") + "π/|σ|", f2((crit ? 1.6 : 1) * Math.PI / -s) + " s"],
			["kₛ = ⌈−π/ln|z|⌉", ks + " muestras → kₛ·T = " + f2(ks * T) + " s"]
		];
		if (!crit && !real) {
			list.push(
				["Tₐ = 2π/ω", f2(2 * Math.PI / w) + " s"],
				["kₐ = 2π/∠z", f2(2 * Math.PI / z.phi) + " muestras → kₐ·T = " + f2(2 * Math.PI / z.phi * T) + " s"],
				["Mₚ continuo / discreto", f2(mpC * 100) + " % / " + f2(Math.pow(z.r, Math.PI / z.phi) * 100) + " %"]
			);
		} else if (real && !crit) {
			list.push(["Aviso", "<b class='wg-warn'>en z es un polo real: se pierde la oscilación</b>"]);
		}
		list.push(["Euler 1 + σT (no es el mapeo)", euler.toFixed(4) + "  (error " + f2(Math.abs(euler - z.r) / z.r * 100) + " %)"]);
		rows(res, list);
	}
	update();
	return update;
}

export const SZ_WIDGETS = { "mapa-sz": mapaSZ };
