// Evaluador de expresiones para las plantillas de preguntas dinamicas (sin eval ni Function).
// Soporta numeros, cadenas 'x' o "x", + - * / % ^, comparaciones, && || !, funciones y variables.

const FN = {
	sqrt: Math.sqrt, exp: Math.exp, ln: Math.log, log10: Math.log10, abs: Math.abs, ceil: Math.ceil, floor: Math.floor,
	sin: Math.sin, cos: Math.cos, atan: Math.atan, atan2: Math.atan2, pow: Math.pow, sgn: Math.sign,
	min: (...a) => Math.min(...a), max: (...a) => Math.max(...a),
	round: (x, d = 0) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d),
	// ceil tolerante a ruido numerico (13.0000000001 cuenta como 13)
	techo: (x) => Math.ceil(x - 1e-9),
	si: (c, a, b) => (c ? a : b),
	f: (x, d = 2) => (isFinite(x) ? String(+x.toFixed(d)).replace(".", ",") : x > 0 ? "infinito" : "-infinito"),
	ss: (x, d = 3) => (x < 0 ? "-" : "+") + String(+Math.abs(x).toFixed(d)).replace(".", ","),
	// numero con punto decimal (para codigo Matlab)
	pt: (x, d = 3) => String(+x.toFixed(d)),
	fr: fraccion,
	// 2.o orden unitario con polos -sg ± jw: tiempo de establecimiento (banda 5 %), instante final de la grafica y pico relativo
	ts2: (sg, w) => ts2(sg, w),
	tend2: (sg, w) => Math.max(1, Math.ceil(ts2(sg, w) * 2.35)),
	pk2: (sg, w) => (w > 0.05 ? 1 + Math.exp(-Math.PI * sg / w) : 1)
};

function resp2(sg, w, t) {
	return w < 0.05 ? 1 - Math.exp(-sg * t) * (1 + sg * t) : 1 - Math.exp(-sg * t) * (Math.cos(w * t) + sg / w * Math.sin(w * t));
}

function ts2(sg, w) {
	const N = 6000;
	const T = 14 / sg;
	for (let i = N; i >= 0; i--) {
		if (Math.abs(resp2(sg, w, i * T / N) - 1) > 0.05) {
			return (i + 1) * T / N;
		}
	}
	return 0;
}

export function fraccion(x) {
	if (!isFinite(x)) {
		return "infinito";
	}
	if (Math.abs(x) < 1e-12) {
		return "0";
	}
	if (Math.abs(x - Math.round(x)) < 1e-9) {
		return String(Math.round(x));
	}
	const sg = x < 0 ? "-" : "";
	const a = Math.abs(x);
	for (let q = 2; q <= 12; q++) {
		const p = Math.round(a * q);
		if (p > 0 && Math.abs(a - p / q) < 1e-9) {
			return `${sg}${p}/${q}`;
		}
	}
	return String(+x.toFixed(3)).replace(".", ",");
}

const CONST = { pi: Math.PI, e: Math.E, inf: Infinity, true: true, false: false };

function tokeniza(s) {
	const t = [];
	let i = 0;
	while (i < s.length) {
		const c = s[i];
		if (/\s/.test(c)) {
			i++;
		} else if (/[0-9.]/.test(c)) {
			const m = /^[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?|^[0-9]+\.?/.exec(s.slice(i));
			t.push({ k: "n", v: parseFloat(m[0]) });
			i += m[0].length;
		} else if (/[A-Za-z_]/.test(c)) {
			const m = /^[A-Za-z_][A-Za-z_0-9]*/.exec(s.slice(i));
			t.push({ k: "id", v: m[0] });
			i += m[0].length;
		} else if (c === "'" || c === '"') {
			const j = s.indexOf(c, i + 1);
			if (j < 0) {
				throw new Error("cadena sin cerrar en: " + s);
			}
			t.push({ k: "s", v: s.slice(i + 1, j) });
			i = j + 1;
		} else {
			const d = s.slice(i, i + 2);
			if (["==", "!=", "<=", ">=", "&&", "||"].includes(d)) {
				t.push({ k: "op", v: d });
				i += 2;
			} else if ("+-*/%^<>!(),".includes(c)) {
				t.push({ k: "op", v: c });
				i++;
			} else {
				throw new Error(`caracter inesperado '${c}' en: ${s}`);
			}
		}
	}
	return t;
}

function parsea(src) {
	const t = tokeniza(src);
	let p = 0;
	const op = (v) => t[p] && t[p].k === "op" && t[p].v === v;
	const bin = (sub, ops) => () => {
		let a = sub();
		while (t[p] && t[p].k === "op" && ops.includes(t[p].v)) {
			const o = t[p++].v;
			a = { o, a, b: sub() };
		}
		return a;
	};
	const unario = () => {
		if (op("-") || op("!")) {
			const o = t[p++].v;
			return { u: o, a: unario() };
		}
		return potencia();
	};
	const potencia = () => {
		const a = atomo();
		if (op("^")) {
			p++;
			return { o: "^", a, b: unario() };
		}
		return a;
	};
	const atomo = () => {
		const k = t[p++];
		if (!k) {
			throw new Error("expresion incompleta: " + src);
		}
		if (k.k === "n" || k.k === "s") {
			return { c: k.v };
		}
		if (k.k === "id") {
			if (op("(")) {
				p++;
				const args = [];
				while (!op(")")) {
					args.push(or());
					if (op(",")) {
						p++;
					}
				}
				p++;
				return { fn: k.v, args };
			}
			return { v: k.v };
		}
		if (k.v === "(") {
			const e = or();
			p++;
			return e;
		}
		throw new Error(`token inesperado '${k.v}' en: ${src}`);
	};
	const mul = bin(unario, ["*", "/", "%"]);
	const add = bin(mul, ["+", "-"]);
	const rel = bin(add, ["<", ">", "<=", ">="]);
	const eq = bin(rel, ["==", "!="]);
	const and = bin(eq, ["&&"]);
	const or = bin(and, ["||"]);
	const ast = or();
	if (p < t.length) {
		throw new Error(`sobran simbolos en: ${src}`);
	}
	return ast;
}

function evalua(n, env) {
	if ("c" in n) {
		return n.c;
	}
	if ("v" in n) {
		if (n.v in env) {
			return env[n.v];
		}
		if (n.v in CONST) {
			return CONST[n.v];
		}
		throw new Error("variable desconocida: " + n.v);
	}
	if ("fn" in n) {
		const f = FN[n.fn];
		if (!f) {
			throw new Error("funcion desconocida: " + n.fn);
		}
		return f(...n.args.map((a) => evalua(a, env)));
	}
	if ("u" in n) {
		const a = evalua(n.a, env);
		return n.u === "-" ? -a : !a;
	}
	const a = evalua(n.a, env);
	const b = evalua(n.b, env);
	switch (n.o) {
		case "+": return a + b;
		case "-": return a - b;
		case "*": return a * b;
		case "/": return a / b;
		case "%": return a % b;
		case "^": return Math.pow(a, b);
		case "<": return a < b;
		case ">": return a > b;
		case "<=": return a <= b;
		case ">=": return a >= b;
		case "==": return a === b || (typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 1e-12);
		case "!=": return !(a === b || (typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 1e-12));
		case "&&": return a && b;
		default: return a || b;
	}
}

const cache = new Map();

export function calcula(src, env) {
	let ast = cache.get(src);
	if (!ast) {
		ast = parsea(src);
		cache.set(src, ast);
	}
	return evalua(ast, env);
}

// Sustituye {expresion} dentro de un texto por su valor. Los numeros se muestran con coma decimal y hasta 3 decimales.
export function interpola(texto, env) {
	return String(texto).replace(/\{([^{}]+)\}/g, (_, e) => {
		const v = calcula(e, env);
		if (typeof v === "number") {
			return isFinite(v) ? String(+v.toFixed(3)).replace(".", ",") : "infinito";
		}
		return String(v);
	});
}
