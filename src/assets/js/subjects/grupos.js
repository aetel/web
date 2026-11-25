// Agrupa las preguntas de un test por bloque: cada bloque es una seccion con cabecera, contador
// y chip en un indice superior que lleva a ella.
import { el } from "./core.js";

export function Grupos(cuerpo) {
	const nav = document.createElement("nav");
	nav.className = "wg-indice";
	nav.setAttribute("aria-label", "Bloques del test");
	nav.hidden = true;
	cuerpo.before(nav);
	let lista = [];

	return {
		reinicia() {
			cuerpo.textContent = "";
			nav.textContent = "";
			nav.hidden = true;
			lista = [];
		},
		// Abre un bloque nuevo y devuelve el contenedor donde van sus preguntas
		abre(titulo) {
			const m = /^(\d+)\s*·\s*(.*)$/.exec(titulo);
			const sec = el("section", "wg-grupo", cuerpo);
			const cab = el("header", "wg-grupo-cab", sec);
			if (m) {
				el("span", "wg-grupo-num", cab).textContent = m[1];
			}
			el("h3", "wg-bloque", cab).textContent = m ? m[2] : titulo;
			const cont = el("span", "wg-grupo-n", cab);
			const cuerpoG = el("div", "wg-grupo-cuerpo", sec);
			const chip = el("button", "wg-chip", nav);
			chip.type = "button";
			el("span", "wg-chip-t", chip).textContent = m ? `${m[1]} · ${m[2]}` : titulo;
			const chipN = el("span", "wg-chip-n", chip);
			chip.addEventListener("click", () => sec.scrollIntoView({ behavior: "smooth", block: "start" }));
			lista.push({ sec, cuerpoG, cont, chip, chipN });
			nav.hidden = lista.length < 2;
			return cuerpoG;
		},
		// Recalcula contadores y oculta bloques sin preguntas visibles (filtro de falladas)
		actualiza() {
			for (const g of lista) {
				const qs = [...g.cuerpoG.querySelectorAll(".wg-q")];
				const resp = qs.filter((q) => q.dataset.estado).length;
				const ok = qs.filter((q) => q.dataset.estado === "ok").length;
				const t = resp ? `${ok}/${qs.length} acertadas` : `${qs.length} ${qs.length === 1 ? "pregunta" : "preguntas"}`;
				g.cont.textContent = t;
				g.chipN.textContent = resp ? `${ok}/${qs.length}` : String(qs.length);
				const estado = resp === qs.length && resp ? (ok === qs.length ? "ok" : "ko") : resp ? "en-curso" : "";
				g.sec.dataset.estado = estado;
				g.chip.dataset.estado = estado;
				g.sec.hidden = qs.every((q) => q.hidden);
				g.chip.hidden = g.sec.hidden;
			}
		}
	};
}
