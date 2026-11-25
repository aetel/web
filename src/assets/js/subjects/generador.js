// Convierte una plantilla de pregunta (JSON con parametros aleatorios y expresiones) en una instancia concreta.
// Una pregunta estatica (opciones como cadenas + "correcta") tambien es una plantilla valida.
import { calcula, interpola } from "./expr.js";

const elige = (a, rnd) => a[Math.floor(rnd() * a.length)];

function mezcla(a, rnd) {
	const r = a.slice();
	for (let i = r.length - 1; i > 0; i--) {
		const j = Math.floor(rnd() * (i + 1));
		[r[i], r[j]] = [r[j], r[i]];
	}
	return r;
}

// params: { nombre: [lista] | {elegir:[..]} | {rango:[min,max,paso]} | "=expresion" | constante }
export function muestrea(params, rnd = Math.random) {
	const env = {};
	for (const [k, s] of Object.entries(params || {})) {
		if (Array.isArray(s)) {
			env[k] = elige(s, rnd);
		} else if (s && typeof s === "object" && s.elegir) {
			env[k] = elige(s.elegir, rnd);
		} else if (s && typeof s === "object" && s.rango) {
			const [a, b, paso] = s.rango;
			const n = Math.floor((b - a) / paso + 1e-9) + 1;
			env[k] = +(a + paso * Math.floor(rnd() * n)).toFixed(9);
		} else if (typeof s === "string" && s.startsWith("=")) {
			env[k] = calcula(s.slice(1), env);
		} else {
			env[k] = s;
		}
	}
	return env;
}

// Evalua los campos "=expr" de la descripcion de una figura
function evaluaFigura(f, env) {
	if (typeof f === "string") {
		return f.startsWith("=") ? calcula(f.slice(1), env) : f;
	}
	if (Array.isArray(f)) {
		return f.map((x) => evaluaFigura(x, env));
	}
	if (f && typeof f === "object") {
		return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, evaluaFigura(v, env)]));
	}
	return f;
}

function opciones(q, env, rnd) {
	let pool;
	if (typeof q.opciones[0] === "string") {
		pool = q.opciones.map((t, i) => ({ t, ok: i === q.correcta, fijo: !!q.fijo }));
	} else {
		pool = q.opciones
			.filter((o) => o.mostrar === undefined || calcula(String(o.mostrar), env))
			.map((o) => ({ t: interpola(o.t, env), ok: !!calcula(String(o.ok), env), fijo: !!o.fijo }));
	}
	const uniq = [];
	for (const o of pool) {
		if (!uniq.some((u) => u.t === o.t)) {
			uniq.push(o);
		}
	}
	pool = uniq;
	let sel = pool;
	if (q.elegir) {
		const ok = pool.filter((o) => o.ok);
		const mal = pool.filter((o) => !o.ok);
		const nMal = q.elegir.mal || 3;
		if (!ok.length || mal.length < nMal) {
			return null;
		}
		sel = [elige(ok, rnd), ...mezcla(mal, rnd).slice(0, nMal)];
	}
	if (sel.filter((o) => o.ok).length !== 1 || sel.length < 2) {
		return null;
	}
	const libres = sel.filter((o) => !o.fijo);
	const fijas = sel.filter((o) => o.fijo);
	const fin = q.fijo ? sel : [...mezcla(libres, rnd), ...fijas];
	return { opciones: fin.map((o) => ({ t: o.t })), correcta: fin.findIndex((o) => o.ok) };
}

function construye(q, env, rnd) {
	const base = {
		id: q.id, bloque: q.bloque, tipo: q.tipo || "opcion", pregunta: interpola(q.pregunta, env),
		explicacion: interpola(q.explicacion || "", env), figura: q.figura ? evaluaFigura(q.figura, env) : null, imagen: q.imagen || null
	};
	if (base.tipo === "numerica") {
		const v = calcula(String(q.respuesta).replace(/^=/, ""), env);
		if (!isFinite(v)) {
			return null;
		}
		return Object.assign(base, { respuesta: v, tolerancia: q.tolerancia ?? 0.01, unidad: q.unidad || "" });
	}
	if (base.tipo === "completar") {
		let vals = [];
		for (const v of q.valores) {
			const t = interpola(v, env);
			if (!vals.includes(t)) {
				vals.push(t);
			}
		}
		let filas = q.filas.map((f) => ({ t: interpola(f.t, env), ok: interpola(f.ok, env) }));
		if (q.filasDistintas && new Set(filas.map((f) => f.ok)).size !== filas.length) {
			return null;
		}
		for (const f of filas) {
			if (!vals.includes(f.ok)) {
				vals.push(f.ok);
			}
		}
		if (q.barajarFilas) {
			filas = mezcla(filas, rnd);
		}
		if (q.barajarValores) {
			vals = mezcla(vals, rnd);
		}
		return Object.assign(base, { filas, valores: vals });
	}
	const o = opciones(q, env, rnd);
	return o ? Object.assign(base, o) : null;
}

export function instancia(q, rnd = Math.random) {
	for (let i = 0; i < 400; i++) {
		const env = muestrea(q.params, rnd);
		if ((q.restricciones || []).some((r) => !calcula(r, env))) {
			continue;
		}
		const r = construye(q, env, rnd);
		if (r) {
			return r;
		}
	}
	throw new Error("La plantilla no produce instancias validas: " + (q.id || q.pregunta));
}
