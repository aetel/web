// Monta todos los [data-widget] de la pagina y los redibuja al cambiar de ancho.
import { REGISTRY } from "./widgets.js";
import { typeset } from "./rich.js";

document.querySelectorAll("[data-widget]").forEach((root) => {
	const mount = REGISTRY[root.dataset.widget];
	if (!mount) {
		root.textContent = "Widget desconocido: " + root.dataset.widget;
		return;
	}
	const update = mount(root);
	let w = root.clientWidth;
	new ResizeObserver(() => {
		if (root.clientWidth !== w) {
			w = root.clientWidth;
			update();
		}
	}).observe(root);
});

// Formulas ($...$ y .eq) y cajas de codigo de la propia pagina; los widgets lo hacen por su cuenta.
typeset(document.querySelector(".asig-body") || document);
