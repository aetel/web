// Registro de widgets. Para añadir uno: escribir mount(root) y registrarlo en REGISTRY.
// Uso en una pagina: <div data-widget="polos-s"></div>
import { SBM_WIDGETS } from "./sbm.js";
import { SIST_CONT_WIDGETS } from "./sist_cont.js";
import { EJ67_WIDGETS } from "./sist_cont_ej67.js";
import { SZ_WIDGETS } from "./sz.js";
import { LAZO_WIDGETS } from "./lazo.js";
import { P4_WIDGETS } from "./practica4.js";
import { P4_EXAMEN_WIDGETS } from "./p4_examen.js";
import { quiz as quizDinamico } from "./quiz.js";
import { ANATOMIA_WIDGETS } from "./anatomia.js";
import { PROGRESO_WIDGETS, leer, guardar, darXp, darLogro } from "./progreso.js";
import { JUEGO_WIDGETS } from "./juego.js";
import { el } from "./core.js";
import { rich, typeset } from "./rich.js";
import { Grupos } from "./grupos.js";

// ---------- test (preguntas en JSON: data-src="/assets/data/quiz/x.json", data-id opcional) ----------
// Cada pregunta: { pregunta, opciones: [...], correcta: indice, explicacion, bloque?, fijo?, imagen?: { src, alt } }
// Los resultados se guardan en la memoria global (progreso.js): sobreviven a recargas y se ven en todo el sitio.
function mezcla(a) {
	const r = a.slice();
	for (let i = r.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[r[i], r[j]] = [r[j], r[i]];
	}
	return r;
}

function quiz(root) {
	root.classList.add("wg-quiz");
	const id = root.dataset.id || (root.dataset.src || "test").split("/").pop().replace(/\.json$/, "");
	root.textContent = "";
	fetch(root.dataset.src).then((r) => r.json()).then((qs) => {
		let ok = 0;
		let resp = 0;
		let aviso = "";
		const previo = () => (leer().tests[id] || { preguntas: {} });
		const cab = el("div", "wg-quiz-cab", root);
		const hist = el("p", "wg-note", cab);
		const marcador = el("p", "wg-note wg-score", cab);
		const barra = el("div", "wg-row", cab);
		const bFiltro = el("button", "wg-opt", barra);
		const bReset = el("button", "wg-opt", barra);
		bReset.textContent = "Borrar mis resultados de este test";
		const cuerpo = el("div", "wg-quiz-cuerpo", root);
		const gr = Grupos(cuerpo);
		let filtro = false;
		const cajas = [];

		const pinta = () => {
			const t = previo();
			const dom = Object.values(t.preguntas).filter((p) => p.ok).length;
			hist.textContent = Object.keys(t.preguntas).length
				? `Tu histórico: ${dom} de ${qs.length} preguntas acertadas la última vez · mejor resultado en una sesión completa: ${t.mejor ?? "–"}/${qs.length}`
				: "Todavía no has hecho este test. Tus resultados se guardarán en este navegador.";
			marcador.textContent = (resp < qs.length
				? `Esta sesión: ${ok} aciertos de ${resp} respondidas (${qs.length} preguntas)`
				: `Resultado de la sesión: ${ok} de ${qs.length}. ` + (ok >= qs.length * 0.85 ? "Dominas la práctica." : ok >= qs.length * 0.6 ? "Vas bien: repasa las explicaciones de las que has fallado." : "Conviene volver a las secciones de la práctica y repetir la prueba.")) + (aviso ? " " + aviso : "");
			bFiltro.textContent = filtro ? "Mostrar todas" : "Mostrar solo las falladas o nuevas";
			cajas.forEach(([box, i]) => {
				const p = previo().preguntas[i];
				box.hidden = filtro && !!p && p.ok;
			});
			gr.actualiza();
		};
		bFiltro.addEventListener("click", () => {
			filtro = !filtro;
			pinta();
		});
		bReset.addEventListener("click", () => {
			if (confirm("¿Borrar tus resultados de este test?")) {
				guardar((g) => { delete g.tests[id]; });
				quiz(root);
			}
		});

		let bloque = "";
		let destino = cuerpo;
		qs.forEach((q, i) => {
			if (q.bloque && q.bloque !== bloque) {
				bloque = q.bloque;
				destino = gr.abre(bloque);
			}
			const box = el("div", "wg-q", destino);
			cajas.push([box, i]);
			const prev = previo().preguntas[i];
			const enun = el("div", "wg-enun", box);
			el("span", "wg-n", enun).textContent = i + 1;
			const enunT = el("div", "wg-enun-t", enun);
			if (prev) {
				el("span", "wg-prev", enunT).textContent = prev.ok ? "✅ " : "❌ ";
			}
			rich(enunT, q.pregunta);
			if (q.imagen) {
				const im = el("img", "wg-img", box);
				im.src = q.imagen.src;
				im.alt = q.imagen.alt || "";
				im.loading = "lazy";
			}
			const exp = el("div", "wg-exp", box);
			rich(exp, q.explicacion);
			exp.hidden = true;
			let hecho = false;
			const orden = q.fijo ? q.opciones.map((_, j) => j) : mezcla(q.opciones.map((_, j) => j));
			const btns = orden.map((j) => {
				const b = el("button", "wg-opt", box);
				rich(b, q.opciones[j]);
				b.addEventListener("click", () => {
					if (hecho) {
						return;
					}
					hecho = true;
					box.dataset.estado = j === q.correcta ? "ok" : "ko";
					resp++;
					const bien = j === q.correcta;
					if (bien) {
						ok++;
						b.classList.add("ok");
					} else {
						b.classList.add("ko");
						btns[orden.indexOf(q.correcta)].classList.add("ok");
					}
					exp.hidden = false;
					let xp = 0;
					let recupera = false;
					guardar((g) => {
						const t = g.tests[id] || (g.tests[id] = { preguntas: {}, total: qs.length });
						t.total = qs.length;
						const p = t.preguntas[i] || (t.preguntas[i] = { n: 0, ok: false, visto: false });
						if (bien && !p.visto) {
							xp = 5;
						} else if (bien && !p.ok) {
							xp = 2;
							recupera = true;
						}
						p.n++;
						p.ok = bien;
						p.visto = p.visto || bien;
					});
					aviso = "";
					if (xp) {
						const nuevo = darXp(xp);
						aviso = `+${xp} XP` + (nuevo ? ` · ⬆ Nuevo rango: ${nuevo}` : "");
					}
					if (recupera && darLogro("repasador")) {
						aviso += " · 🏅 Logro: Repasador";
					}
					if (resp === qs.length) {
						guardar((g) => {
							const t = g.tests[id];
							t.mejor = Math.max(t.mejor || 0, ok);
							t.ultima = ok;
						});
						if (darLogro("test1")) {
							aviso += " · 🏅 Logro: Test completado";
						}
						if (ok >= qs.length * 0.85 && darLogro("test85")) {
							aviso += " · 🏅 Logro: Test dominado";
						}
					}
					pinta();
				});
				return b;
			});
			box.appendChild(exp);
			typeset(box);
		});
		pinta();
	}).catch(() => { root.textContent = "No se pudo cargar el test."; });
	return () => {};
}

export const REGISTRY = {
	"quiz": quiz,
	"quiz-dinamico": quizDinamico,
	...SBM_WIDGETS,
	...SIST_CONT_WIDGETS,
	...EJ67_WIDGETS,
	...SZ_WIDGETS,
	...LAZO_WIDGETS,
	...P4_WIDGETS,
	...P4_EXAMEN_WIDGETS,
	...ANATOMIA_WIDGETS,
	...PROGRESO_WIDGETS,
	...JUEGO_WIDGETS
};
