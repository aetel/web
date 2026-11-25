// Polos Quest: repaso gamificado del Tema 2 (misiones en los planos s y z, duelo s <-> z, XP y logros).
// El progreso se guarda en localStorage del navegador.
import { C, el, canvas, layout, plot, drawPlane, simDisc, rows, slider, setup } from "./core.js";
import { analiza } from "./lazo.js";
import { RANGOS, LOGROS, rango, leer, guardar, reiniciar } from "./progreso.js";
import { stepS } from "./sz.js";

const TIEMPO = 15000;

export { RANGOS, LOGROS, rango };

// ---------- metricas y misiones ----------
export function metricsS(sg, w) {
	if (sg >= 0) {
		return { stable: false };
	}
	const crit = w < 0.05;
	return {
		stable: true, ts: (crit ? 1.6 : 1) * Math.PI / -sg,
		mp: crit ? 0 : Math.exp(Math.PI * sg / w), tp: crit ? Infinity : Math.PI / w
	};
}

export function metricsZ(r, phi) {
	if (r >= 1) {
		return { stable: false };
	}
	const real = phi < 0.05;
	return {
		stable: true, ts: r <= 0 ? 0 : Math.ceil(-Math.PI / Math.log(r)),
		mp: real ? 0 : Math.pow(r, Math.PI / phi), tp: real ? Infinity : Math.PI / phi
	};
}

const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];

// Cada mision nace de un polo objetivo con margen, asi que siempre tiene solucion.
export function genMision(modo, rnd = Math.random) {
	const q = pick([0.5, 1, 1.5, 2], rnd);
	if (modo === "s") {
		const sg = -pick([1, 1.5, 2, 3, 4, 5], rnd);
		const wd = q * -sg;
		return {
			modo, target: [sg, wd], ts: Math.ceil(Math.PI / -sg * 12) / 10,
			mp: Math.min(99, Math.max(1, Math.ceil(Math.exp(-Math.PI / q) * 130))), tp: Math.ceil(Math.PI / wd * 12) / 10
		};
	}
	const ks = pick([6, 8, 10, 15, 20, 30], rnd);
	const r = Math.exp(-Math.PI / ks);
	const phi = pick([0.3, 0.5, 0.8, 1.2, 1.6], rnd);
	return {
		modo, target: [r, phi], ts: Math.ceil(ks * 1.2),
		mp: Math.min(99, Math.max(1, Math.ceil(Math.pow(r, Math.PI / phi) * 130))), tp: Math.ceil(Math.PI / phi * 1.2)
	};
}

export function evalMision(m, a, b) {
	const x = m.modo === "s" ? metricsS(a, b) : metricsZ(a, b);
	if (!x.stable) {
		return { ok: false, x, fallos: ["inestable"] };
	}
	const fallos = [];
	if (x.ts > m.ts) {
		fallos.push("ts");
	}
	if (x.mp * 100 > m.mp) {
		fallos.push("mp");
	}
	if (x.tp > m.tp) {
		fallos.push("tp");
	}
	return { ok: !fallos.length, x, fallos };
}

function pista(ev, m) {
	if (!ev.x.stable) {
		return "Polo inestable: en s va a la izquierda del eje imaginario; en z, dentro del círculo unidad.";
	}
	const s = m.modo === "s";
	const out = [];
	if (ev.fallos.includes("ts")) {
		out.push(s ? "demasiado lento: aleja el polo del eje imaginario" : "demasiado lento: acércalo al origen");
	}
	if (ev.fallos.includes("mp")) {
		out.push(s ? "sobreimpulso alto: baja ω" : "sobreimpulso alto: baja el ángulo");
	}
	if (ev.fallos.includes("tp")) {
		out.push(s ? "pico tardío: sube ω" : "pico tardío: sube el ángulo");
	}
	return out.join(" · ");
}

// ---------- duelo s <-> z ----------
function mezcla(a, rnd) {
	const r = a.slice();
	for (let i = r.length - 1; i > 0; i--) {
		const j = Math.floor(rnd() * (i + 1));
		[r[i], r[j]] = [r[j], r[i]];
	}
	return r;
}

const co = (x, d = 3) => x.toFixed(d).replace(".", ",");
const distintos = (txt) => new Set(txt).size === txt.length;

// ops: [[texto, trampa|null]] con la correcta en primer lugar
function pregunta(tipo, q, ops, expl, rnd, boss = false) {
	const o = mezcla(ops.map(([t, w], i) => ({ t, w, ok: i === 0 })), rnd);
	return { tipo, q, opciones: o, c: o.findIndex((x) => x.ok), expl, boss };
}

function tipoA(rnd) {
	const sg = -pick([1, 2, 3, 5, 8], rnd);
	const w = pick([2, 4, 6], rnd);
	const T = pick([0.05, 0.1, 0.2, 0.3], rnd);
	const x = sg * T;
	if (Math.abs(x) < 0.2 || Math.abs(x) > 0.9) {
		return null;
	}
	const v = [Math.exp(x), 1 + x, Math.exp(-x), Math.exp(-Math.hypot(sg, w) * T)].map((n) => co(n, 4));
	if (!distintos(v)) {
		return null;
	}
	return pregunta("A", `Polo continuo p = ${sg} ± ${w}j [1/s], muestreo T = ${co(T, 2)} s. ¿Cuánto vale |z| del polo discreto equivalente?`, [
		[v[0], null],
		[v[1], "Euler (1 + σT) solo aproxima la exponencial con T muy pequeño; el mapeo exacto es e^(σT)."],
		[v[2], "Signo cambiado: saldría |z| > 1 (fuera del círculo) y el polo continuo es estable."],
		[v[3], "Usaste |p| = √(σ²+ω²) en vez de Re[p]. El módulo en z depende solo de σ."]
	], `|z| = e^(σT) = e^(${sg}·${co(T, 2)}) = ${v[0]}. La parte imaginaria solo fija el ángulo: ∠z = ωT = ${co(w * T, 2)} rad.`, rnd);
}

function tipoB(rnd) {
	const r = pick([0.5, 0.7, 0.8, 0.9, 0.95], rnd);
	const T = pick([0.01, 0.05, 0.1, 0.5], rnd);
	const ks = Math.ceil(-Math.PI / Math.log(r));
	const f = (n) => co(n, n < 1 ? 3 : 2) + " s";
	const v = [f(ks * T), f(ks / T), f(ks), f(Math.PI / Math.abs(Math.log10(r)) * T)];
	if (!distintos(v)) {
		return null;
	}
	return pregunta("B", `Polo discreto con |z| = ${co(r, 2)} y T = ${co(T, 2)} s. ¿Cuánto vale el tiempo de establecimiento tₛ?`, [
		[v[0], null],
		[v[1], "Dividiste por T. Las muestras pasan a segundos multiplicando por T."],
		[v[2], "Eso son muestras (kₛ), falta multiplicar por T."],
		[v[3], "Usaste log₁₀ en vez de ln."]
	], `kₛ = ⌈−π/ln|z|⌉ = ⌈${co(-Math.PI / Math.log(r), 2)}⌉ = ${ks} muestras, y tₛ = kₛ·T = ${v[0]}.`, rnd);
}

function tipoC(rnd) {
	const phi = pick([0.2, 0.4, 0.6, 0.8, 1, 1.5], rnd);
	const T = pick([0.01, 0.05, 0.1, 0.2], rnd);
	const f = (n) => co(n, n < 1 ? 3 : 2);
	const v = [f(2 * Math.PI * T / phi) + " s", f(2 * Math.PI / phi) + " s", f(Math.PI * T / phi) + " s", f(phi / (2 * Math.PI * T)) + " Hz"];
	if (!distintos(v)) {
		return null;
	}
	return pregunta("C", `Polos discretos con ∠z = ${co(phi, 1)} rad y T = ${co(T, 2)} s. ¿Cuál es el periodo de oscilación Tₐ de la respuesta?`, [
		[v[0], null],
		[v[1], "Eso es kₐ en muestras: falta multiplicar por T."],
		[v[2], "Eso es el tiempo de pico (medio periodo), no el periodo."],
		[v[3], "Eso es una frecuencia, no un periodo (es la inversa)."]
	], `kₐ = 2π/∠z = ${co(2 * Math.PI / phi, 2)} muestras ⇒ Tₐ = kₐ·T = ${v[0]}.`, rnd);
}

function tipoD(rnd) {
	const ts = pick([0.5, 1, 2, 4], rnd);
	const T = ts * pick([0.1, 0.15, 0.2, 0.25, 0.3], rnd);
	const a = Math.PI * T / ts;
	const v = [Math.exp(-a), 1 - a, Math.exp(-1 / a), Math.exp(a)].map((n) => co(n, 4));
	if (!distintos(v)) {
		return null;
	}
	return pregunta("D", `Un sistema continuo tiene tₛ = ${co(ts, 1)} s (tₛ = π/|σ|). Se muestrea con T = ${co(T, 3)} s. ¿Qué módulo tiene su polo discreto?`, [
		[v[0], null],
		[v[1], "Euler: 1 − πT/tₛ aproxima la exponencial, pero no es el mapeo exacto."],
		[v[2], "Invertiste el cociente: el exponente es −πT/tₛ."],
		[v[3], "Signo cambiado: saldría un polo fuera del círculo unidad."]
	], `σ = −π/tₛ ⇒ |z| = e^(σT) = e^(−πT/tₛ) = ${v[0]}.`, rnd);
}

const CONCEPTOS = [
	["Un polo de lazo cerrado discreto está en z = −0,8. ¿Cómo es la respuesta?", "Oscila con periodo de 2 muestras y se apaga lentamente",
		["Decae sin oscilar, como un polo real positivo", "Es inestable porque es negativo", "Oscila con periodo de 8 muestras"],
		"∠z = π ⇒ kₐ = 2π/π = 2 muestras, y |z| = 0,8 < 1 la apaga. Son las oscilaciones ocultas: en continuo ni se ven entre muestras."],
	["Dos polos en z tienen el mismo módulo y distinta fase. ¿Qué comparten?", "El tiempo de establecimiento kₛ",
		["El periodo de oscilación", "El sobreimpulso", "El tiempo de pico"],
		"kₛ depende solo de |z|. La fase fija el periodo y el pico, y el sobreimpulso depende de ambos."],
	["Un polo de lazo cerrado en z = 1,05. ¿Qué pasa?", "Inestable: está fuera del círculo unidad",
		["Estable: el módulo está casi en 1", "Estable pero muy lento", "Oscila y se apaga"],
		"Estabilidad en z ⇔ |z| < 1. Con 1,05 la respuesta crece como 1,05^k."],
	["Reduces T sin tocar la planta continua. ¿Qué le pasa a su polo discreto e^(σT)?", "Se acerca a z = 1",
		["Se acerca al origen", "Cruza al semiplano izquierdo", "No cambia"],
		"σT → 0 ⇒ e^(σT) → 1. Hay más muestras por cada constante de tiempo, así que kₛ sube aunque tₛ no cambie."],
	["¿Puede un polo real continuo (σ < 0) dar un polo real negativo en z?", "No: e^(σT) es siempre positivo",
		["Sí, si T es grande", "Sí, si σ es muy negativo", "Solo si el sistema es de tipo 1"],
		"Los polos reales negativos en z vienen de ωT = π (oscilación a la mitad de la frecuencia de muestreo), nunca de un polo real."],
	["Dos polos continuos con ω y ω + 2π/T, mismo σ. ¿Qué ves en z?", "El mismo polo (aliasing)",
		["Polos distintos, el segundo oscila más rápido", "El segundo es inestable", "El segundo desaparece"],
		"e^((σ+jω)T) = e^((σ+j(ω+2π/T))T): el ángulo da otra vuelta completa. El muestreo no distingue entre ambos."],
	["El semiplano izquierdo del plano s equivale en z a:", "El interior del círculo unidad",
		["El semiplano izquierdo de z", "El semiplano derecho de z", "El exterior del círculo unidad"],
		"Re[s] < 0 ⇒ |e^(sT)| = e^(σT) < 1."]
];

export function genPregunta(n, rnd = Math.random) {
	if (n % 5 === 4) {
		const [q, ok, mal, ex] = pick(CONCEPTOS, rnd);
		return pregunta("concepto", q, [[ok, null], ...mal.map((t) => [t, ""])], ex, rnd, true);
	}
	for (let i = 0; i < 100; i++) {
		const p = pick([tipoA, tipoB, tipoC, tipoD], rnd)(rnd);
		if (p) {
			return p;
		}
	}
	return pregunta("concepto", CONCEPTOS[0][0], [[CONCEPTOS[0][1], null], ...CONCEPTOS[0][2].map((t) => [t, ""])], CONCEPTOS[0][3], rnd, true);
}

// ---------- misiones de vuelo (lazo cerrado con el motor de lazo.js) ----------
// meta = minimo para 1 estrella; s2 y s3 endurecen la meta de forma acumulativa.
export const VUELOS = [
	{
		id: "dron", ico: "🚁", nombre: "Dron de reparto", eje: "v", modo: "c",
		hist: "El dron debe subir a la altura del balcón. Un sensor y un motor ideales, pero la batería es limitada: cada punto de ganancia K gasta energía.",
		base: { modo: "c", T: 0.1, A: { tipo: "ninguno" }, G: { tipo: "o1", K: 3, tau: 0.5 }, H: { tipo: "ninguno" } },
		tipos: ["P"], K: [0.5, 15, 0.1], Ti: [1, 10, 0.1], def: { tipo: "P", K: 2, Ti: 2 },
		meta: { e: 0.05, mp: 0.05, ts: 1 }, s2: { K: 8 }, s3: { K: 7 }
	},
	{
		id: "rover", ico: "🚗", nombre: "Rover de Marte", eje: "h", modo: "c",
		hist: "El rover debe frenar justo en la línea de meta sin chocar con la roca de después. Su posición es un integrador: 1/(s(s+1)).",
		base: { modo: "c", T: 0.1, A: { tipo: "ninguno" }, G: { tipo: "int", K: 1, tau: 1 }, H: { tipo: "ninguno" } },
		tipos: ["P"], K: [0.1, 5, 0.05], Ti: [1, 10, 0.1], def: { tipo: "P", K: 2, Ti: 2 },
		meta: { e: 0.001, mp: 0.1, ts: 8 }, s2: { mp: 0.05 }, s3: { ts: 5.5 }
	},
	{
		id: "crucero", ico: "🚙", nombre: "Control de crucero", eje: "h", modo: "c",
		hist: "Velocidad objetivo sin error y sin acelerones. Con solo P siempre queda un error: necesitarás integral.",
		base: { modo: "c", T: 0.1, A: { tipo: "ninguno" }, G: { tipo: "o1", K: 2, tau: 5 }, H: { tipo: "ninguno" } },
		tipos: ["P", "PI"], K: [0.5, 10, 0.1], Ti: [0.5, 10, 0.1], def: { tipo: "P", K: 2, Ti: 5 },
		meta: { e: 0.01, mp: 0.1, ts: 8 }, s2: { mp: 0.05, ts: 6 }, s3: { ts: 4 }
	},
	{
		id: "avion", ico: "✈️", nombre: "Avión inestable", eje: "v", modo: "c",
		hist: "Un caza moderno es inestable por diseño: sin control se va de morros. Con alerones lentos y sensor con retardo, ¿cuánta ganancia aguanta?",
		base: { modo: "c", T: 0.1, A: { tipo: "o1", tau: 0.2 }, G: { tipo: "inest", K: 1, tau: 1 }, H: { tipo: "o1", tau: 0.05 } },
		tipos: ["P"], K: [0.5, 20, 0.1], Ti: [1, 10, 0.1], def: { tipo: "P", K: 0.8, Ti: 2 },
		meta: { e: 0.3, mp: 0.45, ts: 6 }, s2: { ts: 2.2 }, s3: { e: 0.27, mp: 0.42 }
	},
	{
		id: "cohete", ico: "🚀", nombre: "Cohete con ordenador", eje: "v", modo: "d",
		hist: "El control es digital. Elige regulador, ganancias y también el periodo de muestreo T del ordenador de a bordo: un T grande es barato, pero resta margen.",
		base: { modo: "d", T: 0.1, A: { tipo: "ninguno" }, G: { tipo: "o2", K: 2, wn: 3, zeta: 0.6 }, H: { tipo: "ninguno" } },
		tipos: ["P", "PI"], K: [0.1, 6, 0.1], Ti: [0.5, 5, 0.1], Ts: [0.05, 0.1, 0.2, 0.4], def: { tipo: "P", K: 1, Ti: 2, T: 0.2 },
		meta: { e: 0.05, mp: 0.2, ts: 4 }, s2: { mp: 0.1 }, s3: { ts: 2.5 }
	},
	{
		id: "latencia", ico: "🛰️", nombre: "Dron con latencia de radio", eje: "h", modo: "d",
		hist: "El mando llega con 2 muestras de retraso por la radio. Un PI agresivo hará oscilar al dron; uno tímido tardará una eternidad.",
		base: { modo: "d", T: 0.1, A: { tipo: "ret", d: 2 }, G: { tipo: "o1", K: 3, tau: 0.5 }, H: { tipo: "ninguno" } },
		tipos: ["PI"], K: [0.1, 2, 0.05], Ti: [0.2, 3, 0.05], def: { tipo: "PI", K: 1.5, Ti: 0.5 },
		meta: { e: 0.01, mp: 0.1, ts: 3 }, s2: { ts: 2 }, s3: { mp: 0.02 }
	}
];

export function limites(v, n) {
	const l = Object.assign({}, v.meta);
	for (const x of n >= 3 ? [v.s2, v.s3] : n >= 2 ? [v.s2] : []) {
		for (const k of Object.keys(x)) {
			l[k] = l[k] === undefined ? x[k] : Math.min(l[k], x[k]);
		}
	}
	return l;
}

export function fallosVuelo(r, ctl, l) {
	if (!r.estable) {
		return ["inestable"];
	}
	const f = [];
	if (l.e !== undefined && Math.abs(r.e) > l.e) {
		f.push("e");
	}
	if (l.mp !== undefined && r.mp > l.mp) {
		f.push("mp");
	}
	if (l.ts !== undefined && !(r.ts <= l.ts)) {
		f.push("ts");
	}
	if (l.K !== undefined && ctl.K > l.K) {
		f.push("K");
	}
	return f;
}

export function estrellas(v, r, ctl) {
	let n = 0;
	for (let i = 1; i <= 3; i++) {
		if (fallosVuelo(r, ctl, limites(v, i)).length) {
			break;
		}
		n = i;
	}
	return n;
}

export const cfgVuelo = (v, ctl) => ({ ...v.base, T: ctl.T || v.base.T, F: { tipo: ctl.tipo, K: ctl.K, Ti: ctl.Ti } });

const pc = (x) => (x * 100).toFixed(1).replace(".", ",") + " %";
const sg = (x) => (isFinite(x) ? x.toFixed(2).replace(".", ",") : "∞");

function textoMeta(l) {
	const o = [];
	if (l.e !== undefined) {
		o.push(`error ≤ ${pc(l.e)}`);
	}
	if (l.mp !== undefined) {
		o.push(`Mₚ ≤ ${pc(l.mp)}`);
	}
	if (l.ts !== undefined) {
		o.push(`tₛ ≤ ${sg(l.ts)} s`);
	}
	if (l.K !== undefined) {
		o.push(`K ≤ ${sg(l.K)}`);
	}
	return o.join(" · ");
}

const PISTAS = {
	inestable: "Inestable: algún polo de lazo cerrado queda fuera (semiplano derecho o fuera del círculo unidad).",
	e: "Error en régimen permanente demasiado alto: más ganancia o, si puedes, integral.",
	mp: "Sobreimpulso excesivo: menos ganancia, más Tᵢ, o menos retardo/T.",
	ts: "Demasiado lento: sube la ganancia o baja Tᵢ (sin pasarte de oscilación).",
	K: "Te pasas de ganancia (consumo)."
};

// ---------- escena animada ----------
function escena(cv, v, r, k, techo) {
	const { g, w, h } = setup(cv);
	const ys = r.y;
	const PMAX = Math.max(1.7, techo * 1.15);
	const vert = v.eje === "v";
	const px0 = 30;
	const clamp = (y) => Math.max(-0.1, Math.min(PMAX, y));
	const X = (i, y) => (vert ? px0 + i / (ys.length - 1) * (w - 2 * px0) : px0 + clamp(y) / PMAX * (w - 2 * px0));
	const Y = (y) => (vert ? h - 25 - clamp(y) / PMAX * (h - 50) : h / 2);
	g.fillStyle = "rgba(100,170,255,0.10)";
	g.fillRect(0, 0, w, h);
	g.font = "11px sans-serif";
	g.lineWidth = 1;
	g.setLineDash([5, 4]);
	for (const [val, col, lab] of [[1, C.green, "meta"], [techo, C.red, vert ? "techo" : "muro"]]) {
		g.strokeStyle = col;
		g.fillStyle = col;
		g.beginPath();
		if (vert) {
			g.moveTo(px0, Y(val)); g.lineTo(w - px0, Y(val));
		} else {
			g.moveTo(X(0, val), 20); g.lineTo(X(0, val), h - 20);
		}
		g.stroke();
		g.fillText(lab, vert ? w - px0 - 28 : X(0, val) + 4, vert ? Y(val) - 4 : 32);
	}
	g.setLineDash([]);
	g.strokeStyle = C.mut;
	g.beginPath();
	if (vert) {
		g.moveTo(px0, Y(0)); g.lineTo(w - px0, Y(0));
	} else {
		g.moveTo(px0, h / 2 + 16); g.lineTo(w - px0, h / 2 + 16);
	}
	g.stroke();
	let crash = -1;
	for (let i = 0; i <= k && crash < 0; i++) {
		if (ys[i] > techo || ys[i] > PMAX) {
			crash = i;
		}
	}
	const fin = crash >= 0 ? crash : k;
	g.strokeStyle = C.main;
	g.lineWidth = 2;
	g.beginPath();
	for (let i = 0; i <= fin; i++) {
		i ? g.lineTo(X(i, ys[i]), Y(ys[i])) : g.moveTo(X(i, ys[i]), Y(ys[i]));
	}
	g.stroke();
	g.font = "28px serif";
	g.fillText(crash >= 0 ? "💥" : v.ico, X(fin, ys[fin]) - 14, Y(ys[fin]) + (vert ? 8 : 4));
	return crash;
}

// ---------- persistencia (memoria global en progreso.js) ----------
// Vista del estado del juego sobre el almacen global: leer/escribir aqui modifica el estado compartido.
function vistaJuego() {
	const j = () => leer().juego;
	const campo = (k) => ({ get: () => j()[k], set: (v) => { j()[k] = v; }, enumerable: true });
	return Object.defineProperties({}, {
		xp: { get: () => leer().xp, set: (v) => { leer().xp = v; }, enumerable: true },
		logros: { get: () => leer().logros, enumerable: true },
		vuelo: { get: () => j().vuelo, enumerable: true },
		mejor: campo("mejor"), dias: campo("dias"), last: campo("last"), conc: campo("conc"), ms: campo("ms"), mz: campo("mz")
	});
}

const save = () => guardar(() => {});

// ---------- dibujo de zonas validas ----------
function regionS(g, geo, m) {
	const sMin = -Math.PI / m.ts;
	const wMin = Math.PI / m.tp;
	const k = Math.PI / -Math.log(m.mp / 100);
	const X = (s) => geo.cx + s * geo.sx;
	const Y = (w) => geo.cy - w * geo.sy;
	const up = [];
	for (let s = -9; s <= sMin; s += 0.05) {
		const t = Math.min(13, k * -s);
		if (t > wMin) {
			up.push([s, t]);
		}
	}
	if (!up.length) {
		return;
	}
	for (const sgn of [1, -1]) {
		g.beginPath();
		up.forEach(([s, t], i) => {
			i ? g.lineTo(X(s), Y(sgn * t)) : g.moveTo(X(s), Y(sgn * t));
		});
		for (let i = up.length - 1; i >= 0; i--) {
			g.lineTo(X(up[i][0]), Y(sgn * wMin));
		}
		g.closePath();
		g.fill();
	}
}

function regionZ(g, geo, m) {
	const rMax = Math.exp(-Math.PI / m.ts);
	const pMin = Math.PI / m.tp;
	const lnB = -Math.log(m.mp / 100);
	const P = (r, f, sgn) => [geo.cx + r * Math.cos(f) * geo.sx, geo.cy - sgn * r * Math.sin(f) * geo.sx];
	const up = [];
	for (let r = 0.01; r <= rMax; r += 0.01) {
		const f = Math.min(Math.PI, Math.PI * -Math.log(r) / lnB);
		if (f > pMin) {
			up.push([r, f]);
		}
	}
	if (!up.length) {
		return;
	}
	const [rl, fl] = up[up.length - 1];
	for (const sgn of [1, -1]) {
		g.beginPath();
		up.forEach(([r, f], i) => {
			const [x, y] = P(r, f, sgn);
			i ? g.lineTo(x, y) : g.moveTo(x, y);
		});
		for (let k = 1; k <= 10; k++) {
			const [x, y] = P(rl, fl + (pMin - fl) * k / 10, sgn);
			g.lineTo(x, y);
		}
		for (let i = up.length - 1; i >= 0; i--) {
			const [x, y] = P(up[i][0], pMin, sgn);
			g.lineTo(x, y);
		}
		g.closePath();
		g.fill();
	}
}

function marca(g, geo, m) {
	const [a, b] = m.target;
	const pts = m.modo === "s" ? [[a, b], [a, -b]] : [[a * Math.cos(b), a * Math.sin(b)], [a * Math.cos(b), -a * Math.sin(b)]];
	g.strokeStyle = C.green;
	g.lineWidth = 2;
	for (const [x, y] of pts) {
		g.beginPath();
		g.arc(geo.cx + x * geo.sx, geo.cy - y * geo.sy, 9, 0, 2 * Math.PI);
		g.stroke();
	}
	g.lineWidth = 1;
}

// ---------- widget ----------
function mount(root) {
	const { controls, view } = layout(root);
	root.classList.add("wg-game");
	const hud = el("div", "wg-hud", controls);
	const tabs = el("div", "wg-tabs", view);
	const body = el("div", "wg-body", view);
	const s = vistaJuego();
	let cur = 0;
	let aviso = "";
	let timer = null;
	let nq = 0;
	let redraw = () => {};

	function award(id) {
		if (!s.logros.includes(id)) {
			s.logros.push(id);
			aviso += ` 🏅 Logro: ${LOGROS[id][1]}.`;
		}
	}

	function gain(n) {
		const antes = rango(s.xp).i;
		s.xp += n;
		const r = rango(s.xp);
		if (r.i > antes) {
			aviso += ` ⬆ Nuevo rango: ${r.nombre}.`;
		}
		if (r.i === RANGOS.length - 1) {
			award("leyenda");
		}
	}

	function parar() {
		clearInterval(timer);
		timer = null;
		if (raf && typeof cancelAnimationFrame === "function") {
			cancelAnimationFrame(raf);
		}
		raf = null;
	}

	function renderHud() {
		hud.textContent = "";
		const r = rango(s.xp);
		el("div", "wg-rank", hud).textContent = r.nombre;
		el("div", "wg-xp", hud).appendChild(el("div", "wg-xp-bar")).style.width = r.pct + "%";
		el("div", "wg-note", hud).textContent = r.next ? `${s.xp} XP · faltan ${r.next - s.xp} para «${r.sig}»` : `${s.xp} XP · rango máximo`;
		el("div", "wg-note", hud).textContent = `🔥 Racha: ${cur} (mejor ${s.mejor}) · 📅 Días: ${s.dias}`;
		if (aviso) {
			el("div", "wg-toast", hud).textContent = aviso.trim();
		}
		const lg = el("div", "wg-badges", hud);
		for (const [id, [ico, nombre, desc]] of Object.entries(LOGROS)) {
			const b = el("span", "wg-badge" + (s.logros.includes(id) ? " on" : ""), lg);
			b.textContent = ico;
			b.title = `${nombre}: ${desc}`;
		}
		const rs = el("button", "wg-opt", hud);
		rs.textContent = "Reiniciar progreso";
		rs.addEventListener("click", () => {
			if (confirm("¿Borrar XP, logros y resultados de los tests de todo el sitio?")) {
				reiniciar();
				cur = 0;
				aviso = "";
				renderHud();
			}
		});
	}

	// ---------- misiones ----------
	function mision(plano) {
		let m = genMision(plano);
		let intentos = 0;
		let hecho = false;
		let ayuda = false;
		let polo = null;
		let geo = null;
		const card = el("div", "wg-res", body);
		const msg = el("p", "wg-note", body);
		const cp = canvas(body, 280);
		const cr = canvas(body, 240);
		const bar = el("div", "wg-row", body);
		const bNueva = el("button", "wg-opt", bar);
		bNueva.textContent = "Nueva misión";
		const bAyuda = el("button", "wg-opt", bar);
		bAyuda.textContent = "Ver zona válida (paga solo 5 XP)";
		const c2 = (x) => String(x).replace(".", ",");

		function specs() {
			rows(card, plano === "s"
				? [["Cliente exige", "polo estable con:"], ["Establecimiento", `tₛ = π/|σ| ≤ ${c2(m.ts)} s`], ["Sobreimpulso", `Mₚ ≤ ${m.mp} %`], ["Pico", `tₚ = π/ω ≤ ${c2(m.tp)} s`]]
				: [["Cliente exige", "polo estable con:"], ["Establecimiento", `kₛ ≤ ${m.ts} muestras`], ["Sobreimpulso", `Mₚ ≤ ${m.mp} %`], ["Pico", `kₚ = π/∠p ≤ ${m.tp} muestras`]]);
		}

		function grafica() {
			const N = plano === "s" ? m.ts * 2.2 : Math.max(20, Math.round(m.ts * 2.5));
			let ser = [];
			let y1 = 1.4;
			if (polo) {
				const [a, b] = polo;
				if (plano === "s") {
					const t = Array.from({ length: 301 }, (_, i) => i * N / 300);
					ser = [{ x: t, y: t.map((v) => stepS(a, b, v)), c: C.main, name: "c(t)" }];
				} else {
					const cc = 2 * a * Math.cos(b);
					const y = simDisc([1 - cc + a * a], [1, -cc, a * a], N + 1);
					ser = [{ x: y.map((_, i) => i), y, c: C.main, step: true, name: "c[k]" }];
				}
				y1 = Math.min(3, Math.max(1.4, Math.max(...ser[0].y) * 1.1));
			}
			plot(cr, ser, {
				x1: N, y0: 0, y1, xl: plano === "s" ? "t [s]" : "k",
				hlines: [{ y: 1, c: C.mut }, { y: 1.05, c: C.red }, { y: 0.95, c: C.red }],
				vlines: [{ x: m.ts, c: C.red, label: "máx. establ." }, { x: m.tp, c: C.green, label: "máx. pico" }]
			});
		}

		function dibuja() {
			let pts = [];
			if (polo) {
				const [a, b] = polo;
				if (plano === "s") {
					pts = b >= 0.05 ? [[a, b], [a, -b]] : [[a, 0]];
				} else {
					pts = b >= 0.05 ? [[a * Math.cos(b), a * Math.sin(b)], [a * Math.cos(b), -a * Math.sin(b)]] : [[a, 0]];
				}
			}
			geo = drawPlane(cp, plano, pts, { x: 9, y: 13 });
			if (ayuda) {
				const g = cp.getContext("2d");
				g.save();
				g.fillStyle = "rgba(46,139,87,0.25)";
				(plano === "s" ? regionS : regionZ)(g, geo, m);
				g.restore();
				marca(g, geo, m);
			}
			grafica();
		}

		function intenta() {
			intentos++;
			aviso = "";
			const ev = evalMision(m, polo[0], polo[1]);
			if (ev.ok && !hecho) {
				hecho = true;
				const xp = ayuda ? 5 : intentos === 1 ? 20 : intentos <= 3 ? 12 : 8;
				gain(xp);
				s[plano === "s" ? "ms" : "mz"]++;
				award("primera");
				if (s.ms >= 5) {
					award("s5");
				}
				if (s.mz >= 5) {
					award("z5");
				}
				save(s);
				msg.textContent = `✅ ¡Cumple! +${xp} XP. Pulsa «Nueva misión».`;
			} else if (ev.ok) {
				msg.textContent = "✅ Cumple (esta misión ya está cobrada).";
			} else {
				msg.textContent = "❌ " + pista(ev, m);
			}
			renderHud();
			dibuja();
		}

		cp.addEventListener("click", (ev) => {
			if (!geo) {
				return;
			}
			const r = cp.getBoundingClientRect();
			const dx = (ev.clientX - r.left - geo.cx) / geo.sx;
			const dy = (geo.cy - (ev.clientY - r.top)) / geo.sy;
			polo = plano === "s" ? [dx, Math.min(13, Math.abs(dy))] : [Math.hypot(dx, dy), Math.atan2(Math.abs(dy), dx)];
			intenta();
		});
		bNueva.addEventListener("click", () => {
			m = genMision(plano);
			intentos = 0;
			hecho = false;
			ayuda = false;
			polo = null;
			msg.textContent = "Haz clic en el plano para colocar el polo.";
			specs();
			dibuja();
		});
		bAyuda.addEventListener("click", () => {
			ayuda = true;
			msg.textContent = "Zona verde = polos válidos; el círculo es una solución de ejemplo.";
			dibuja();
		});
		msg.textContent = "Haz clic en el plano para colocar el polo.";
		specs();
		dibuja();
		redraw = dibuja;
	}

	// ---------- duelo ----------
	function duelo() {
		const card = el("div", "wg-q", body);
		const barra = el("div", "wg-xp", body);
		const fill = el("div", "wg-xp-bar", barra);
		let q = null;
		let abierta = false;
		let t0 = 0;
		let btns = [];

		function nueva() {
			parar();
			q = genPregunta(nq++);
			abierta = true;
			t0 = Date.now();
			card.textContent = "";
			el("p", "wg-boss", card).textContent = q.boss ? "👹 JEFE: pregunta de concepto (+20 XP)" : `Pregunta ${nq}`;
			el("p", "", card).textContent = q.q;
			btns = q.opciones.map((o, j) => {
				const b = el("button", "wg-opt", card);
				b.textContent = o.t;
				b.addEventListener("click", () => responde(j));
				return b;
			});
			fill.style.width = "100%";
			timer = setInterval(() => {
				const left = TIEMPO - (Date.now() - t0);
				fill.style.width = Math.max(0, left / TIEMPO * 100) + "%";
				if (left <= 0) {
					responde(-1);
				}
			}, 100);
		}

		function responde(j) {
			if (!abierta) {
				return;
			}
			abierta = false;
			parar();
			aviso = "";
			const ok = j === q.c;
			let extra = "";
			if (ok) {
				cur++;
				s.mejor = Math.max(s.mejor, cur);
				const xp = (q.boss ? 20 : 10) + 2 * Math.min(cur - 1, 10) + (Date.now() - t0 < 5000 ? 3 : 0);
				gain(xp);
				extra = `✅ +${xp} XP. `;
				if (cur >= 5) {
					award("racha5");
				}
				if (cur >= 10) {
					award("racha10");
				}
				if (q.tipo === "concepto" && ++s.conc >= 3) {
					award("teorico");
				}
			} else {
				cur = 0;
				extra = j < 0 ? "⏱ Se acabó el tiempo. " : q.opciones[j].w ? "⚠ " + q.opciones[j].w + " " : "";
			}
			save(s);
			btns.forEach((b, i) => {
				if (i === q.c) {
					b.classList.add("ok");
				} else if (i === j) {
					b.classList.add("ko");
				}
				b.disabled = true;
			});
			el("p", "wg-exp", card).textContent = extra + q.expl;
			const nx = el("button", "wg-opt", card);
			nx.textContent = "Siguiente →";
			nx.addEventListener("click", nueva);
			renderHud();
		}

		redraw = () => {};
		nueva();
	}


	// ---------- vuelo ----------
	let vidx = 0;
	let raf = null;

	function vuelo() {
		const v = VUELOS[vidx];
		const pick = el("div", "wg-tabs", body);
		VUELOS.forEach((m, i) => {
			const b = el("button", "wg-tab" + (i === vidx ? " on" : ""), pick);
			b.textContent = m.ico + " " + "★".repeat(s.vuelo[m.id] || 0) + "☆".repeat(3 - (s.vuelo[m.id] || 0));
			b.title = m.nombre;
			b.addEventListener("click", () => {
				vidx = i;
				abrir("vuelo");
			});
		});
		const card = el("div", "wg-res", body);
		rows(card, [
			["Misión", `${v.ico} ${v.nombre} (${v.modo === "c" ? "continuo" : "discreto"})`], ["Historia", v.hist],
			["★ Objetivo", textoMeta(limites(v, 1))], ["★★ Aterrizaje limpio", textoMeta(limites(v, 2))], ["★★★ Maestría", textoMeta(limites(v, 3))]
		]);
		const ctl = el("div", "wg-controls", body);
		let tipo = v.def.tipo;
		let selTipo = null;
		if (v.tipos.length > 1) {
			const lab = el("label", "wg-label", ctl, "Regulador");
			selTipo = el("select", "", lab);
			v.tipos.forEach((t) => {
				el("option", "", selTipo).textContent = t === "P" ? "P: K" : "PI: K(1 + 1/Tᵢs)";
				selTipo.lastChild.value = t;
			});
			selTipo.value = tipo;
		}
		const sK = slider(ctl, "Ganancia K", v.K[0], v.K[1], v.K[2], v.def.K, prev);
		const wTi = el("div", "", ctl);
		const sTi = slider(wTi, "Tiempo integral Tᵢ [s]", v.Ti[0], v.Ti[1], v.Ti[2], v.def.Ti, prev);
		let selT = null;
		if (v.Ts) {
			const lab = el("label", "wg-label", ctl, "Periodo de muestreo T [s]");
			selT = el("select", "", lab);
			v.Ts.forEach((t) => {
				el("option", "", selT).textContent = t;
				selT.lastChild.value = t;
			});
			selT.value = v.def.T;
			selT.addEventListener("change", prev);
		}
		if (selTipo) {
			selTipo.addEventListener("change", prev);
		}
		const res = el("div", "wg-res", body);
		const msg = el("p", "wg-note", body);
		const cv = canvas(body, 220);
		const cp = canvas(body, 200);
		const bar = el("div", "wg-row", body);
		const go = el("button", "wg-opt", bar);
		go.textContent = "🚀 Lanzar misión";

		function lee() {
			tipo = selTipo ? selTipo.value : v.def.tipo;
			return { tipo, K: sK.value, Ti: sTi.value, T: selT ? +selT.value : v.base.T };
		}

		function techoDe(r) {
			return r.estable ? Math.max(1, r.cinf) * (1 + v.meta.mp) : 1.6;
		}

		function prev() {
			cancelAnimationFrameSafe();
			const c = lee();
			wTi.hidden = tipo !== "PI";
			const r = analiza(cfgVuelo(v, c));
			const st = estrellas(v, r, c);
			rows(res, [
				["Estable", r.estable ? "sí" : "<b class='wg-warn'>NO</b>"],
				["Error / Mₚ / tₛ", r.estable ? `${pc(Math.abs(r.e))} / ${pc(r.mp)} / ${sg(r.ts)} s` : "–"],
				["Con estos ajustes", "★".repeat(st) + "☆".repeat(3 - st)]
			]);
			const hl = [{ y: 1, c: C.green }, { y: techoDe(r), c: C.red }];
			plot(cp, [{ x: r.t, y: r.y, c: C.main, step: r.d, name: "posición" }], {
				x1: r.t[r.t.length - 1], y0: Math.min(0, ...r.y), y1: Math.min(3, Math.max(1.5, techoDe(r) * 1.1)), hlines: hl,
				vlines: v.meta.ts !== undefined ? [{ x: v.meta.ts, c: C.orange, label: "tₛ máx" }] : []
			});
			escena(cv, v, r, 0, techoDe(r));
			return { r, c };
		}

		function cancelAnimationFrameSafe() {
			if (raf && typeof cancelAnimationFrame === "function") {
				cancelAnimationFrame(raf);
			}
			raf = null;
		}

		function termina(r, c) {
			aviso = "";
			const st = estrellas(v, r, c);
			const f = fallosVuelo(r, c, limites(v, 1));
			if (f.length) {
				msg.textContent = "❌ " + f.map((k) => PISTAS[k]).join(" ");
			} else {
				const antes = s.vuelo[v.id] || 0;
				const CUM = [0, 30, 55, 90];
				if (st > antes) {
					gain(CUM[st] - CUM[antes]);
					s.vuelo[v.id] = st;
					award("vuelo1");
					if (VUELOS.every((m) => s.vuelo[m.id] >= 1)) {
						award("vuelo6");
					}
					if (VUELOS.every((m) => s.vuelo[m.id] >= 3)) {
						award("estrellas");
					}
					save(s);
				}
				const sig = st < 3 ? " Para la siguiente estrella: " + textoMeta(limites(v, st + 1)) + "." : " ¡Maestría!";
				msg.textContent = `✅ Misión superada con ${"★".repeat(st)}${st > antes ? ` (+${CUM[st] - CUM[antes]} XP)` : ""}.` + sig;
			}
			renderHud();
		}

		go.addEventListener("click", () => {
			const { r, c } = prev();
			const techo = techoDe(r);
			const n = r.y.length;
			const t0 = performance.now();
			const dur = 4500;
			msg.textContent = "…";
			const paso = (ahora) => {
				const k = Math.min(n - 1, Math.floor((ahora - t0) / dur * (n - 1)));
				const crash = escena(cv, v, r, k, techo);
				if (k < n - 1 && crash < 0) {
					raf = requestAnimationFrame(paso);
				} else {
					raf = null;
					termina(r, c);
				}
			};
			if (typeof requestAnimationFrame === "function") {
				raf = requestAnimationFrame(paso);
			} else {
				escena(cv, v, r, n - 1, techo);
				termina(r, c);
			}
		});
		prev();
		redraw = prev;
	}

	const defs = [["s", "🎯 Misión plano s"], ["z", "⭕ Misión plano z"], ["duelo", "⚔️ Duelo s ↔ z"], ["vuelo", "✈️ Vuelo"]];
	const btnTabs = defs.map(([id, t]) => {
		const b = el("button", "wg-tab", tabs);
		b.textContent = t;
		b.addEventListener("click", () => abrir(id));
		return b;
	});

	function abrir(id) {
		parar();
		btnTabs.forEach((b, i) => b.classList.toggle("on", defs[i][0] === id));
		body.textContent = "";
		if (id === "duelo") {
			duelo();
		} else if (id === "vuelo") {
			vuelo();
		} else {
			mision(id);
		}
	}

	const hoy = new Date().toISOString().slice(0, 10);
	if (s.last !== hoy) {
		const dif = s.last ? (Date.parse(hoy) - Date.parse(s.last)) / 864e5 : 0;
		s.dias = dif === 1 ? s.dias + 1 : 1;
		s.last = hoy;
		if (s.dias >= 3) {
			award("constante");
		}
		save(s);
	}
	window.addEventListener("progreso", () => renderHud());
	renderHud();
	abrir("s");
	return () => redraw();
}

export const JUEGO_WIDGETS = { "juego-polos": mount };
