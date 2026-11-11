// Registro de widgets. Para añadir uno: escribir mount(root) y registrarlo en REGISTRY.
// Uso en una pagina: <div data-widget="polos-s"></div>
import { SBM_WIDGETS } from "./sbm.js";
import { SIST_CONT_WIDGETS } from "./sist_cont.js";
import { el } from "./core.js";

// ---------- test (preguntas en JSON: data-src="/assets/data/quiz/x.json") ----------
function quiz(root) {
	root.classList.add("wg-quiz");
	fetch(root.dataset.src).then((r) => r.json()).then((qs) => {
		qs.forEach((q, i) => {
			const box = el("div", "wg-q", root);
			el("p", "", box).textContent = `${i + 1}. ${q.pregunta}`;
			const exp = el("p", "wg-exp", box);
			exp.textContent = q.explicacion;
			exp.hidden = true;
			q.opciones.forEach((o, j) => {
				const b = el("button", "wg-opt", box);
				b.textContent = o;
				b.addEventListener("click", () => {
					b.classList.add(j === q.correcta ? "ok" : "ko");
					exp.hidden = false;
				});
			});
		});
	}).catch(() => { root.textContent = "No se pudo cargar el test."; });
	return () => {};
}

export const REGISTRY = {
	"quiz": quiz,
	...SBM_WIDGETS,
	...SIST_CONT_WIDGETS
};
