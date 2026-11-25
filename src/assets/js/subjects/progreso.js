// Memoria global del estudiante: XP, logros, juego y resultados de los tests, en el localStorage del navegador.
// Es compartida por todos los widgets del sitio (mismo origen), asi que lo que haces en una pagina se ve en las demas.
import { el, rows } from "./core.js";

const KEY = "aetel-sc-progreso-v1";
const LEGACY = "aetel-sc-t2-polos-quest";

export const RANGOS = [
	[0, "Becario del laboratorio"], [100, "Aprendiz de Laplace"], [250, "Domador de polos"],
	[500, "Señor del círculo unidad"], [900, "Leyenda del Tema 2"]
];

export const LOGROS = {
	primera: ["🎯", "Primera sangre", "Supera tu primera misión"],
	s5: ["🧭", "Cartógrafo del plano s", "5 misiones superadas en el plano s"],
	z5: ["⭕", "Cartógrafo del círculo", "5 misiones superadas en el plano z"],
	racha5: ["🔥", "En racha", "5 aciertos seguidos en el duelo"],
	racha10: ["⚡", "Imparable", "10 aciertos seguidos en el duelo"],
	teorico: ["🎓", "Teórico de guardia", "Acierta 3 preguntas de concepto (jefes)"],
	constante: ["📅", "Constancia", "Vuelve 3 días seguidos"],
	leyenda: ["👑", "Leyenda", "Alcanza el rango máximo"],
	vuelo1: ["🛫", "Despegue", "Supera tu primera misión de vuelo"],
	vuelo6: ["🧑‍✈️", "Piloto de pruebas", "Supera las 6 misiones de vuelo"],
	estrellas: ["🌟", "Matrícula de honor", "3 estrellas en las 6 misiones de vuelo"],
	test1: ["📝", "Test completado", "Responde todas las preguntas de un test"],
	test85: ["🏆", "Test dominado", "Saca al menos un 85 % en un test"],
	repasador: ["🔁", "Repasador", "Acierta una pregunta que habías fallado antes"]
};

export function rango(xp) {
	let i = 0;
	RANGOS.forEach(([v], k) => {
		if (xp >= v) {
			i = k;
		}
	});
	const sig = RANGOS[i + 1];
	return {
		i, nombre: RANGOS[i][1], next: sig ? sig[0] : 0, sig: sig ? sig[1] : "",
		pct: sig ? (xp - RANGOS[i][0]) / (sig[0] - RANGOS[i][0]) * 100 : 100
	};
}

const vacio = () => ({ v: 1, xp: 0, logros: [], juego: { mejor: 0, dias: 0, last: "", conc: 0, ms: 0, mz: 0, vuelo: {} }, tests: {} });

function normaliza(g) {
	const v = vacio();
	const r = Object.assign(v, g);
	r.juego = Object.assign(v.juego, g && g.juego);
	r.juego.vuelo = r.juego.vuelo || {};
	r.tests = r.tests || {};
	r.logros = Array.isArray(r.logros) ? r.logros : [];
	return r;
}

let cache = null;

function almacen() {
	try {
		return typeof localStorage !== "undefined" ? localStorage : null;
	} catch (e) {
		return null;
	}
}

export function leer() {
	if (cache) {
		return cache;
	}
	const ls = almacen();
	let g = vacio();
	try {
		const raw = ls && ls.getItem(KEY);
		if (raw) {
			g = normaliza(JSON.parse(raw));
		} else if (ls && ls.getItem(LEGACY)) {
			const o = JSON.parse(ls.getItem(LEGACY));
			g = normaliza({ xp: o.xp, logros: o.logros, juego: { mejor: o.mejor, dias: o.dias, last: o.last, conc: o.conc, ms: o.ms, mz: o.mz, vuelo: o.vuelo } });
		}
	} catch (e) {
		g = vacio();
	}
	cache = g;
	return g;
}

// Modifica el estado dentro de fn(g) y lo guarda. Avisa a los widgets de la misma pagina.
export function guardar(fn) {
	const g = leer();
	fn(g);
	const ls = almacen();
	try {
		if (ls) {
			ls.setItem(KEY, JSON.stringify(g));
		}
	} catch (e) {
		/* sin almacenamiento: el progreso dura lo que la pagina */
	}
	avisa();
	return g;
}

function avisa() {
	if (typeof window !== "undefined" && typeof window.CustomEvent === "function") {
		window.dispatchEvent(new window.CustomEvent("progreso"));
	}
}

if (typeof window !== "undefined" && window.addEventListener) {
	window.addEventListener("storage", (e) => {
		if (e.key === KEY) {
			cache = null;
			avisa();
		}
	});
}

// Suma XP. Devuelve el nombre del nuevo rango si ha subido.
export function darXp(n) {
	let nuevo = null;
	guardar((g) => {
		const antes = rango(g.xp).i;
		g.xp += n;
		const r = rango(g.xp);
		if (r.i > antes) {
			nuevo = r.nombre;
		}
		if (r.i === RANGOS.length - 1 && !g.logros.includes("leyenda")) {
			g.logros.push("leyenda");
		}
	});
	return nuevo;
}

// Concede un logro. Devuelve true si es nuevo.
export function darLogro(id) {
	let nuevo = false;
	guardar((g) => {
		if (!g.logros.includes(id)) {
			g.logros.push(id);
			nuevo = true;
		}
	});
	return nuevo;
}

export function exportar() {
	return JSON.stringify(leer(), null, 1);
}

export function importar(texto) {
	const g = normaliza(JSON.parse(texto));
	cache = g;
	guardar(() => {});
}

export function reiniciar() {
	cache = vacio();
	guardar(() => {});
}

// ---------- panel "Mi progreso" ----------
const VUELOS_IDS = [["dron", "🚁 Dron"], ["rover", "🚗 Rover"], ["crucero", "🚙 Crucero"], ["avion", "✈️ Avión"], ["cohete", "🚀 Cohete"], ["latencia", "🛰️ Latencia"]];

function panel(root) {
	root.classList.add("wg", "wg-progreso");
	const cuerpo = el("div", "wg-body", root);
	function pinta() {
		const g = leer();
		const r = rango(g.xp);
		cuerpo.textContent = "";
		el("div", "wg-rank", cuerpo).textContent = r.nombre;
		el("div", "wg-xp", cuerpo).appendChild(el("div", "wg-xp-bar")).style.width = r.pct + "%";
		el("div", "wg-note", cuerpo).textContent = r.next ? `${g.xp} XP · faltan ${r.next - g.xp} para «${r.sig}»` : `${g.xp} XP · rango máximo`;

		el("h3", "wg-bloque", cuerpo).textContent = "Logros";
		const lg = el("div", "wg-logros", cuerpo);
		for (const [id, [ico, nombre, desc]] of Object.entries(LOGROS)) {
			const t = el("div", "wg-logro" + (g.logros.includes(id) ? " on" : ""), lg);
			el("span", "wg-badge on", t).textContent = ico;
			el("span", "", t).textContent = ` ${nombre} · ${desc}`;
		}

		el("h3", "wg-bloque", cuerpo).textContent = "Juego";
		const j = g.juego;
		rows(el("div", "wg-res", cuerpo), [
			["Misiones superadas (plano s / plano z)", `${j.ms} / ${j.mz}`], ["Mejor racha en el duelo", j.mejor],
			["Jefes de concepto acertados", j.conc], ["Días seguidos", j.dias],
			...VUELOS_IDS.map(([id, t]) => [t, "★".repeat(j.vuelo[id] || 0) + "☆".repeat(3 - (j.vuelo[id] || 0))])
		]);

		el("h3", "wg-bloque", cuerpo).textContent = "Tests";
		const ids = Object.keys(g.tests);
		if (!ids.length) {
			el("p", "wg-note", cuerpo).textContent = "Todavía no has hecho ningún test.";
		}
		rows(el("div", "wg-res", cuerpo), ids.map((id) => {
			const t = g.tests[id];
			const dom = Object.values(t.preguntas || {}).filter((p) => p.ok).length;
			return [id, `${dom} de ${t.total || "?"} acertadas la última vez · mejor resultado ${t.mejor ?? "–"}/${t.total || "?"}`];
		}));

		el("h3", "wg-bloque", cuerpo).textContent = "Copia de seguridad";
		el("p", "wg-note", cuerpo).textContent = "El progreso se guarda en este navegador. Para llevarlo a otro dispositivo, expórtalo y vuelve a importarlo allí.";
		const fila = el("div", "wg-row", cuerpo);
		const bE = el("button", "wg-opt", fila);
		bE.textContent = "Exportar progreso";
		bE.addEventListener("click", () => {
			const a = el("a", "", document.body);
			a.href = URL.createObjectURL(new Blob([exportar()], { type: "application/json" }));
			a.download = "progreso-sistemas-control.json";
			a.click();
			a.remove();
		});
		const bI = el("button", "wg-opt", fila);
		bI.textContent = "Importar progreso";
		const fi = el("input", "", fila);
		fi.type = "file";
		fi.accept = "application/json";
		fi.hidden = true;
		bI.addEventListener("click", () => fi.click());
		fi.addEventListener("change", () => {
			const f = fi.files[0];
			if (f) {
				f.text().then((t) => {
					try {
						importar(t);
					} catch (e) {
						el("p", "wg-note", cuerpo).textContent = "El archivo no es un progreso válido.";
					}
				});
			}
		});
		const bR = el("button", "wg-opt", fila);
		bR.textContent = "Borrar todo";
		bR.addEventListener("click", () => {
			if (confirm("¿Borrar XP, logros, juego y resultados de los tests?")) {
				reiniciar();
			}
		});
	}
	window.addEventListener("progreso", pinta);
	pinta();
	return pinta;
}

export const PROGRESO_WIDGETS = { "progreso": panel };
