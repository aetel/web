// Texto enriquecido para tests y paginas: `codigo`, ```bloques```, $formulas$ (KaTeX) y cajas de codigo.
// KaTeX lo carga subject.njk. Si no esta disponible, las formulas se quedan como texto LaTeX.
import { el } from "./core.js";

const SUB = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "ₚ": "p", "ₛ": "s", "ₖ": "k", "ₙ": "n", "ₜ": "t" };
const TOKEN_SUB = /([A-Za-z])([₀-₉ₚₛₖₙₜ]+)(\([sz]\))?/g;

function mates(parent, tex, bloque) {
	const s = el("span", bloque ? "tex tex-block" : "tex", parent);
	s.dataset.tex = tex;
	s.textContent = tex;
	return s;
}

// Texto suelto: reconoce identificadores con subindice unicode (tₛ, Mₚ, M₂(s)) y los pasa a formula.
function plano(parent, txt) {
	let ult = 0;
	for (const m of txt.matchAll(TOKEN_SUB)) {
		if (m.index > ult) {
			parent.append(txt.slice(ult, m.index));
		}
		const sub = [...m[2]].map((c) => SUB[c]).join("");
		mates(parent, `${m[1]}_{${sub}}${m[3] || ""}`);
		ult = m.index + m[0].length;
	}
	if (ult < txt.length) {
		parent.append(txt.slice(ult));
	}
}

// Anade al elemento el texto con formato. Devuelve el propio elemento.
export function rich(parent, texto) {
	const rx = /```(\w*)\n?([\s\S]*?)```|`([^`\n]+)`|\$\$([\s\S]+?)\$\$|\$([^$\n]+)\$/g;
	let ult = 0;
	let tras = false;
	const s = String(texto);
	for (const m of s.matchAll(rx)) {
		if (m.index > ult) {
			// el salto de linea pegado a un bloque de codigo no cuenta como linea en blanco
			let seg = s.slice(ult, m.index);
			if (tras) {
				seg = seg.replace(/^\n/, "");
			}
			if (m[2] !== undefined) {
				seg = seg.replace(/\n$/, "");
			}
			if (seg) {
				plano(parent, seg);
			}
		}
		tras = m[2] !== undefined;
		if (m[2] !== undefined) {
			cajaCodigo(parent, m[2].replace(/\n$/, ""), m[1]);
		} else if (m[3] !== undefined) {
			el("code", "", parent).textContent = m[3];
		} else if (m[4] !== undefined) {
			mates(parent, m[4], true);
		} else {
			mates(parent, m[5]);
		}
		ult = m.index + m[0].length;
	}
	if (ult < s.length) {
		plano(parent, tras ? s.slice(ult).replace(/^\n/, "") : s.slice(ult));
	}
	return parent;
}

// ---------- resaltado minimo (Matlab) ----------
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const RX_MATLAB = /(%.*$)|((?<![\w)\]'.])'(?:[^'\n]|'')*')|\b(for|end|if|else|elseif|while|function|return|break|continue)\b|(\b\d+\.?\d*(?:e[-+]?\d+)?\b)/gm;

function resalta(codigo, lang) {
	if (lang === "text") {
		return esc(codigo);
	}
	return esc(codigo).replace(RX_MATLAB, (m, com, str, kw, num) => {
		const c = com ? "c" : str ? "s" : kw ? "k" : "n";
		return `<span class="hl-${c}">${m}</span>`;
	});
}

const NOMBRES = { matlab: "Matlab", text: "Salida", python: "Python", c: "C", "": "Código" };

// Caja de codigo con etiqueta de lenguaje y boton de copiar
export function cajaCodigo(parent, codigo, lang) {
	const l = (lang || "").toLowerCase();
	const caja = el("div", "codebox", parent);
	const cab = el("div", "codebox-cab", caja);
	el("span", "codebox-lang", cab).textContent = NOMBRES[l] || l;
	if (l !== "text") {
		const b = el("button", "codebox-copy", cab);
		b.type = "button";
		b.textContent = "Copiar";
		b.addEventListener("click", () => {
			navigator.clipboard?.writeText(codigo).then(() => {
				b.textContent = "Copiado";
				setTimeout(() => { b.textContent = "Copiar"; }, 1500);
			});
		});
	}
	const pre = el("pre", "", caja);
	const code = el("code", "", pre);
	code.innerHTML = resalta(codigo, l);
	return caja;
}

// Los bloques ``` de las paginas markdown ya vienen como <pre><code class="language-x">: los envuelve igual.
function decoraCodigo(root) {
	root.querySelectorAll("pre > code").forEach((code) => {
		const pre = code.parentElement;
		if (pre.closest(".codebox")) {
			return;
		}
		const lang = ((code.className.match(/language-(\w+)/) || [])[1] || "").toLowerCase();
		const txt = code.textContent.replace(/\n$/, "");
		const nueva = cajaCodigo(document.createElement("div"), txt, lang);
		pre.replaceWith(nueva);
	});
}

// ---------- formulas ----------
function render(nodo, tex, bloque) {
	try {
		window.katex.render(tex, nodo, { displayMode: bloque, throwOnError: false, strict: "ignore" });
		nodo.dataset.done = "1";
	} catch (e) {
		console.error(e);
	}
}

export function typeset(root = document) {
	decoraCodigo(root);
	if (!window.katex) {
		return;
	}
	// <code>$...$</code> de las paginas markdown (fuera de bloques de codigo)
	root.querySelectorAll("code").forEach((c) => {
		if (c.closest("pre") || c.dataset.done) {
			return;
		}
		const t = c.textContent.trim();
		if (t.length < 3 || !t.startsWith("$") || !t.endsWith("$")) {
			return;
		}
		const bloque = t.startsWith("$$");
		const tex = t.slice(bloque ? 2 : 1, bloque ? -2 : -1);
		const s = document.createElement("span");
		s.className = bloque ? "tex tex-block" : "tex";
		c.replaceWith(s);
		render(s, tex, bloque);
	});
	// ecuaciones en pantalla: <p class="eq" data-tex>LATEX</p>
	root.querySelectorAll(".eq[data-tex]").forEach((n) => {
		if (!n.dataset.done) {
			render(n, n.textContent, true);
		}
	});
	// formulas generadas por rich()
	root.querySelectorAll("span.tex[data-tex]").forEach((n) => {
		if (!n.dataset.done) {
			render(n, n.dataset.tex, n.classList.contains("tex-block"));
		}
	});
}
