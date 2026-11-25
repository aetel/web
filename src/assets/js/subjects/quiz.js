// Widget de tests. El JSON puede ser una lista de preguntas o { titulo, numero, barajar, preguntas: [...] }.
// Cada pregunta es una plantilla: estatica o dinamica (parametros aleatorios, figuras generadas). Ver generador.js.
// Tipos: opcion (por defecto), numerica (respuesta escrita) y completar (una lista desplegable por fila).
// Los resultados se guardan por plantilla en la memoria global (progreso.js).
import { el, canvas } from "./core.js";
import { instancia } from "./generador.js";
import { dibujaFigura } from "./figuras.js";
import { leer, guardar, darXp, darLogro } from "./progreso.js";
import { rich, typeset } from "./rich.js";
import { Grupos } from "./grupos.js";

function mezcla(a) {
	const r = a.slice();
	for (let i = r.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[r[i], r[j]] = [r[j], r[i]];
	}
	return r;
}

// Admite coma decimal, fracciones a/b y la palabra infinito
export function leeNumero(txt) {
	const s = String(txt).trim().toLowerCase().replace(/\s+/g, "").replace(",", ".");
	if (/^[-+]?(inf|infinito|∞)$/.test(s)) {
		return s.startsWith("-") ? -Infinity : Infinity;
	}
	const m = /^([-+]?[0-9.]+)\/([0-9.]+)$/.exec(s);
	if (m) {
		return parseFloat(m[1]) / parseFloat(m[2]);
	}
	return /^[-+]?[0-9]*\.?[0-9]+(e[-+]?[0-9]+)?$/.test(s) ? parseFloat(s) : NaN;
}

export function esCorrecta(q, txt) {
	const v = leeNumero(txt);
	if (!isFinite(q.respuesta) || !isFinite(v)) {
		return v === q.respuesta;
	}
	return Math.abs(v - q.respuesta) <= q.tolerancia * Math.max(Math.abs(q.respuesta), 1e-9) + 1e-9;
}

export function quiz(root) {
	root.classList.add("wg-quiz");
	root.textContent = "";
	const redib = [];
	fetch(root.dataset.src).then((r) => r.json()).then((json) => {
		const data = Array.isArray(json) ? { preguntas: json } : json;
		const plantillas = data.preguntas.map((p, i) => ({ ...p, id: p.id !== undefined ? String(p.id) : String(i) }));
		const id = root.dataset.id || (root.dataset.src || "test").split("/").pop().replace(/\.json$/, "");
		const numero = +root.dataset.numero || data.numero || plantillas.length;
		const total = Math.min(numero, plantillas.length);
		const previo = () => (leer().tests[id] || { preguntas: {} });

		const cab = el("div", "wg-quiz-cab", root);
		if (data.titulo) {
			el("h3", "wg-bloque", cab).textContent = data.titulo;
		}
		const hist = el("p", "wg-note", cab);
		const marcador = el("p", "wg-note wg-score", cab);
		const barra = el("div", "wg-row", cab);
		const bNuevo = el("button", "wg-opt", barra);
		bNuevo.textContent = "Nuevo intento (datos y preguntas distintos)";
		const bFiltro = el("button", "wg-opt", barra);
		const bReset = el("button", "wg-opt", barra);
		bReset.textContent = "Borrar mis resultados de este test";
		const cuerpo = el("div", "wg-quiz-cuerpo", root);
		const gr = Grupos(cuerpo);
		let filtro = false;
		let ok = 0;
		let resp = 0;
		let aviso = "";
		let cajas = [];

		const pinta = () => {
			const t = previo();
			const dom = Object.values(t.preguntas).filter((p) => p.ok).length;
			hist.textContent = Object.keys(t.preguntas).length
				? `Tu histórico: ${dom} de ${plantillas.length} preguntas del banco acertadas la última vez` + (t.mejor !== undefined ? ` · mejor sesión completa: ${t.mejor}/${t.mejorDe || total}` : "")
				: "Todavía no has hecho este test. Tus resultados se guardarán en este navegador.";
			marcador.textContent = (resp < total
				? `Este intento: ${ok} aciertos de ${resp} respondidas (${total} preguntas)`
				: `Resultado del intento: ${ok} de ${total}. ` + (ok >= total * 0.85 ? "Dominas el tema." : ok >= total * 0.6 ? "Vas bien: repasa las explicaciones de las falladas." : "Conviene repasar el tema y repetir el test.")) + (aviso ? " " + aviso : "");
			bFiltro.textContent = filtro ? "Mostrar todas" : "Mostrar solo las falladas o nuevas";
			for (const [box, tid] of cajas) {
				const p = previo().preguntas[tid];
				box.hidden = filtro && !!p && p.ok;
			}
			gr.actualiza();
		};

		// Registra el resultado de una pregunta (una sola vez por instancia)
		const registra = (tid, bien) => {
			resp++;
			if (bien) {
				ok++;
			}
			let xp = 0;
			let recupera = false;
			guardar((g) => {
				const t = g.tests[id] || (g.tests[id] = { preguntas: {}, total: plantillas.length });
				t.total = plantillas.length;
				const p = t.preguntas[tid] || (t.preguntas[tid] = { n: 0, ok: false, visto: false });
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
			if (resp === total) {
				guardar((g) => {
					const t = g.tests[id];
					if ((t.mejor || 0) <= ok) {
						t.mejor = ok;
						t.mejorDe = total;
					}
					t.ultima = ok;
				});
				if (darLogro("test1")) {
					aviso += " · 🏅 Logro: Test completado";
				}
				if (ok >= total * 0.85 && darLogro("test85")) {
					aviso += " · 🏅 Logro: Test dominado";
				}
			}
			pinta();
		};

		const renderPregunta = (q, n, destino) => {
			const box = el("div", "wg-q", destino);
			const tid = q.id;
			cajas.push([box, tid]);
			const prev = previo().preguntas[tid];
			const enun = el("div", "wg-enun", box);
			el("span", "wg-n", enun).textContent = n;
			const enunT = el("div", "wg-enun-t", enun);
			if (prev) {
				el("span", "wg-prev", enunT).textContent = prev.ok ? "✅ " : "❌ ";
			}
			rich(enunT, q.pregunta);
			if (q.figura) {
				const cv = canvas(box, q.figura.alto || 300);
				cv.classList.add("wg-fig");
				dibujaFigura(cv, q.figura);
				redib.push(() => dibujaFigura(cv, q.figura));
			}
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
			const fin = (bien) => {
				hecho = true;
				box.dataset.estado = bien ? "ok" : "ko";
				exp.hidden = false;
				registra(tid, bien);
			};
			if (q.tipo === "numerica") {
				const fila = el("div", "wg-row", box);
				const inp = el("input", "wg-num", fila);
				inp.type = "text";
				inp.placeholder = "Tu respuesta" + (q.unidad ? ` (${q.unidad})` : "");
				inp.setAttribute("inputmode", "decimal");
				const b = el("button", "wg-opt", fila);
				b.textContent = "Comprobar";
				const res = el("span", "wg-res-fila", fila);
				const comprueba = () => {
					if (hecho) {
						return;
					}
					if (isNaN(leeNumero(inp.value))) {
						res.textContent = " Escribe un número (admite coma, fracciones como 1/2 y la palabra infinito).";
						return;
					}
					const bien = esCorrecta(q, inp.value);
					inp.disabled = true;
					b.disabled = true;
					const sol = isFinite(q.respuesta) ? String(+q.respuesta.toFixed(4)).replace(".", ",") : "infinito";
					res.textContent = bien ? " ✅ Correcto." : ` ❌ La respuesta era ${sol}${q.unidad ? " " + q.unidad : ""}.`;
					b.classList.add(bien ? "ok" : "ko");
					fin(bien);
				};
				b.addEventListener("click", comprueba);
				inp.addEventListener("keydown", (e) => {
					if (e.key === "Enter") {
						comprueba();
					}
				});
			} else if (q.tipo === "completar") {
				const sels = q.filas.map((f) => {
					const fila = el("div", "wg-row wg-fila-sel", box);
					rich(el("span", "wg-fila-t", fila), f.t);
					const s = el("select", "", fila);
					el("option", "", s).textContent = "— elige —";
					s.firstChild.value = "";
					for (const v of q.valores) {
						el("option", "", s).textContent = v;
						s.lastChild.value = v;
					}
					const mk = el("span", "wg-res-fila", fila);
					return { s, mk, f };
				});
				const b = el("button", "wg-opt", box);
				b.textContent = "Comprobar";
				b.addEventListener("click", () => {
					if (hecho || sels.some((x) => !x.s.value)) {
						return;
					}
					let todo = true;
					for (const x of sels) {
						const bien = x.s.value === x.f.ok;
						todo = todo && bien;
						x.mk.textContent = bien ? " ✅" : ` ❌ (era ${x.f.ok})`;
						x.s.disabled = true;
					}
					b.disabled = true;
					b.classList.add(todo ? "ok" : "ko");
					fin(todo);
				});
			} else {
				const btns = q.opciones.map((o, j) => {
					const b = el("button", "wg-opt", box);
					rich(b, o.t);
					b.addEventListener("click", () => {
						if (hecho) {
							return;
						}
						const bien = j === q.correcta;
						b.classList.add(bien ? "ok" : "ko");
						if (!bien) {
							btns[q.correcta].classList.add("ok");
						}
						fin(bien);
					});
					return b;
				});
			}
			box.appendChild(exp);
			typeset(box);
		};

		const nuevoIntento = () => {
			gr.reinicia();
			redib.length = 0;
			cajas = [];
			ok = 0;
			resp = 0;
			aviso = "";
			let sel = plantillas;
			if (total < plantillas.length) {
				sel = mezcla(plantillas).slice(0, total);
			}
			if (data.barajar) {
				sel = mezcla(sel);
			}
			let n = 0;
			let bloque = "";
			let destino = cuerpo;
			let hechas = 0;
			for (const t of sel) {
				let q;
				try {
					q = instancia(t);
				} catch (e) {
					console.error(e);
					continue;
				}
				if (!data.barajar && q.bloque && q.bloque !== bloque) {
					bloque = q.bloque;
					destino = gr.abre(bloque);
				}
				renderPregunta(q, ++n, destino);
				hechas++;
			}
			if (hechas < total) {
				marcador.textContent = "";
			}
			pinta();
		};

		bNuevo.addEventListener("click", nuevoIntento);
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
		nuevoIntento();
	}).catch((e) => {
		console.error(e);
		root.textContent = "No se pudo cargar el test.";
	});
	return () => redib.forEach((f) => f());
}
