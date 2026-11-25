// "Anatomia de la respuesta": animacion del escalon con el valor final, el pico, el sobreimpulso y el tiempo de establecimiento.
import { C, f2, simDisc, plot, el, slider, rows, canvas, layout } from "./core.js";
import { stepS } from "./sz.js";

const T = 0.1;

// Serie y valores teoricos/medidos para un polo continuo (σ, ω) o discreto (r, φ)
export function respuesta(d, a, b) {
	let x;
	let y;
	let teo;
	if (d) {
		const cc = 2 * a * Math.cos(b);
		const cx = b > 0.05;
		const ks = Math.ceil(-Math.PI / Math.log(a));
		const N = Math.min(300, Math.max(30, Math.round(2.6 * ks)));
		y = simDisc([1 - cc + a * a], [1, -cc, a * a], N + 1);
		x = y.map((_, k) => k);
		teo = { ts: ks, tp: cx ? Math.PI / b : NaN, mp: cx ? Math.pow(a, Math.PI / b) : 0 };
	} else {
		const cx = b > 0.05;
		const ts = (cx ? 1 : 1.6) * Math.PI / -a;
		const tend = 2.4 * ts;
		x = Array.from({ length: 401 }, (_, i) => i * tend / 400);
		y = x.map((t) => stepS(a, b, t));
		teo = { ts, tp: cx ? Math.PI / b : NaN, mp: cx ? Math.exp(Math.PI * a / b) : 0 };
	}
	let ip = 0;
	y.forEach((v, i) => {
		if (v > y[ip]) {
			ip = i;
		}
	});
	let its = 0;
	for (let i = y.length - 1; i >= 0; i--) {
		if (Math.abs(y[i] - 1) > 0.05) {
			its = Math.min(i + 1, y.length - 1);
			break;
		}
	}
	return { x, y, teo, ip, its, mp: Math.max(0, y[ip] - 1), hayPico: y[ip] > 1.0005 };
}

function anatomia(root) {
	const { controls, view } = layout(root);
	let raf = null;
	const sModo = el("select", "", el("label", "wg-label", controls, "Tiempo"));
	[["c", "Continuo: polo p = σ ± jω"], ["d", "Discreto: polo p = r·e^(±jφ), T = 0,1 s"]].forEach(([v, t]) => {
		el("option", "", sModo).textContent = t;
		sModo.lastChild.value = v;
	});
	const gc = el("div", "", controls);
	const sA = slider(gc, "Parte real σ (cuánto se apaga)", -8, -0.3, 0.1, -2, redibuja);
	const sB = slider(gc, "Parte imaginaria ω (cuánto oscila)", 0, 12, 0.1, 5, redibuja);
	const gd = el("div", "", controls);
	const sR = slider(gd, "Módulo r (cuánto se apaga por muestra)", 0.3, 0.97, 0.01, 0.8, redibuja);
	const sF = slider(gd, "Fase φ [rad] (cuánto gira por muestra)", 0, 2.8, 0.05, 0.8, redibuja);
	const sT = slider(controls, "Avance de la animación", 0, 1, 0.01, 1, () => {
		parar();
		dibuja();
	});
	const fila = el("div", "wg-row", controls);
	const bPlay = el("button", "wg-opt", fila);
	bPlay.textContent = "▶ Reproducir";
	const info = el("p", "wg-note", controls);
	const res = el("div", "wg-res", controls);
	const cv = canvas(view, 320);
	let r = null;

	function parar() {
		if (raf && typeof cancelAnimationFrame === "function") {
			cancelAnimationFrame(raf);
		}
		raf = null;
		bPlay.textContent = "▶ Reproducir";
	}

	function redibuja() {
		parar();
		const d = sModo.value === "d";
		gc.hidden = d;
		gd.hidden = !d;
		r = d ? respuesta(true, sR.value, sF.value) : respuesta(false, sA.value, sB.value);
		dibuja();
	}

	function dibuja() {
		if (!r) {
			return;
		}
		const d = sModo.value === "d";
		const n = Math.min(r.x.length - 1, Math.round(sT.value * (r.x.length - 1)));
		const x1 = r.x[r.x.length - 1];
		const y1 = Math.max(1.35, 1 + r.mp * 1.25);
		const alcanzaPico = r.hayPico && n >= r.ip;
		const alcanzaTs = n >= r.its && r.its > 0;
		const vl = [];
		if (alcanzaPico) {
			vl.push({ x: r.x[r.ip], c: C.orange, label: "tₚ" });
		}
		if (alcanzaTs) {
			vl.push({ x: r.x[r.its], c: C.green, label: "tₛ" });
		}
		plot(cv, [{ x: r.x.slice(0, n + 1), y: r.y.slice(0, n + 1), c: C.main, step: d, lw: 2.5 }], {
			x1, y0: 0, y1, xl: d ? "k [muestras]" : "t [s]",
			hlines: [{ y: 1, c: C.mut }, { y: 1.05, c: C.red }, { y: 0.95, c: C.red }, ...(alcanzaPico ? [{ y: r.y[r.ip], c: C.orange }] : [])],
			vlines: vl
		});
		// anotaciones sobre la grafica
		const g = cv.getContext("2d");
		const w = cv.clientWidth;
		const h = +cv.dataset.h;
		const m = { l: 42, r: 12, t: 14, b: 30 };
		const X = (v) => m.l + v / x1 * (w - m.l - m.r);
		const Y = (v) => h - m.b - v / y1 * (h - m.t - m.b);
		g.font = "12px sans-serif";
		g.fillStyle = C.mut;
		g.fillText("valor final = 1", w - m.r - 92, Y(1) - 5);
		g.fillStyle = C.red;
		g.fillText("banda ±5 %", w - m.r - 70, Y(1.05) - 4);
		if (alcanzaPico) {
			g.strokeStyle = C.orange;
			g.fillStyle = C.orange;
			g.lineWidth = 2;
			g.beginPath();
			g.moveTo(X(r.x[r.ip]) + 8, Y(1));
			g.lineTo(X(r.x[r.ip]) + 8, Y(r.y[r.ip]));
			g.stroke();
			g.lineWidth = 1;
			g.fillText("Mₚ = " + f2(r.mp * 100) + " %", X(r.x[r.ip]) + 14, (Y(1) + Y(r.y[r.ip])) / 2);
		}
		// marcador de la posicion actual
		g.fillStyle = C.main;
		g.beginPath();
		g.arc(X(r.x[n]), Y(r.y[n]), 4, 0, 2 * Math.PI);
		g.fill();

		// texto de la fase
		let t;
		if (n === 0) {
			t = "La entrada pasa de 0 a 1 de golpe, pero la salida arranca en 0: el sistema necesita tiempo para reaccionar.";
		} else if (r.hayPico && !alcanzaPico) {
			t = "La salida sube hacia el valor final. Todavía no lo ha alcanzado.";
		} else if (!r.hayPico && !alcanzaTs) {
			t = "Sin oscilación: la salida se acerca al valor final por debajo, cada vez más despacio. No habrá pico ni sobreimpulso.";
		} else if (alcanzaPico && !alcanzaTs) {
			t = "Ha llegado al primer máximo y lo pasa de largo por inercia: eso es el sobreimpulso. Después oscila alrededor del valor final, cada vez menos.";
		} else {
			t = "Ya está dentro de la banda del 5 % y no vuelve a salir. Ese instante es el tiempo de establecimiento.";
		}
		info.textContent = t;
		const fm = (v) => (isFinite(v) ? (d ? f2(v) + " muestras = " + f2(v * T) + " s" : f2(v) + " s") : "—");
		rows(res, [
			["Valor final", "1 (la salida se estabiliza aquí)"],
			["Pico tₚ", r.hayPico ? `${fm(d ? r.teo.tp : r.teo.tp)} (teoría) · ${alcanzaPico ? fm(d ? r.x[r.ip] : r.x[r.ip]) : "aún no"} (medido)` : "no existe: polos reales"],
			["Sobreimpulso Mₚ", r.hayPico ? `${f2(r.teo.mp * 100)} % (teoría) · ${alcanzaPico ? f2(r.mp * 100) + " %" : "aún no"} (medido)` : "0 %"],
			["Establecimiento tₛ", `${fm(r.teo.ts)} (teoría) · ${alcanzaTs ? fm(d ? r.x[r.its] : r.x[r.its]) : "aún no"} (medido)`]
		]);
	}

	bPlay.addEventListener("click", () => {
		if (raf) {
			parar();
			return;
		}
		if (typeof requestAnimationFrame !== "function") {
			return;
		}
		const dur = 9000;
		const t0 = performance.now() - (sT.value >= 1 ? 0 : sT.value) * dur;
		bPlay.textContent = "⏸ Pausa";
		const paso = (ahora) => {
			const f = (ahora - t0) / dur;
			if (f >= 1) {
				sT.value = 1;
				dibuja();
				parar();
				return;
			}
			sT.value = f;
			dibuja();
			raf = requestAnimationFrame(paso);
		};
		raf = requestAnimationFrame(paso);
	});
	sModo.addEventListener("change", redibuja);
	redibuja();
	return dibuja;
}

export const ANATOMIA_WIDGETS = { "anatomia-escalon": anatomia };
