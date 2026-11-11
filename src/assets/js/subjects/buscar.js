// Buscador cliente sobre /subjects/indice.json (generado por Eleventy).
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const q = document.getElementById("buscar-q");
const fa = document.getElementById("buscar-asig");
const ft = document.getElementById("buscar-tipo");
const out = document.getElementById("buscar-res");
const boxes = document.getElementById("subjects-boxes");
const TIPOS = { apunte: "Teoría", herramienta: "Herramienta", ejercicio: "Ejemplo resuelto", test: "Test" };
let docs = [];

function score(d, terms) {
	const titulo = norm(d.titulo);
	const kw = norm((d.keywords || []).join(" "));
	const res = norm(d.resumen);
	const txt = norm(d.texto);
	let s = 0;
	for (const t of terms) {
		let hit = 0;
		if (titulo.includes(t)) { hit += 6; }
		if (kw.includes(t)) { hit += 4; }
		if (res.includes(t)) { hit += 2; }
		if (txt.includes(t)) { hit += 1; }
		if (!hit) {
			return 0;
		}
		s += hit;
	}
	return s;
}

function snippet(d, terms) {
	const txt = d.texto || "";
	const n = norm(txt);
	for (const t of terms) {
		const i = n.indexOf(t);
		if (i >= 0) {
			return (i > 40 ? "…" : "") + txt.slice(Math.max(0, i - 40), i + 120).trim() + "…";
		}
	}
	return d.resumen || "";
}

function render() {
	const terms = norm(q.value).split(/\s+/).filter(Boolean);
	const buscando = terms.length > 0 || fa.value !== "" || ft.value !== "";
	boxes.hidden = buscando;
	out.hidden = !buscando;
	if (!buscando) {
		out.textContent = "";
		return;
	}
	let list = docs.filter((d) => (!fa.value || d.asignatura === fa.value) && (!ft.value || d.tipo === ft.value));
	if (terms.length) {
		list = list.map((d) => ({ d, s: score(d, terms) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.d);
	}
	out.textContent = "";
	if (!list.length) {
		out.textContent = "Sin resultados.";
		return;
	}
	for (const d of list) {
		const li = document.createElement("li");
		const a = document.createElement("a");
		a.href = d.url;
		a.textContent = d.titulo;
		const meta = document.createElement("span");
		meta.className = "tag";
		meta.textContent = `${d.asignaturaNombre} · ${TIPOS[d.tipo] || d.tipo}`;
		const p = document.createElement("p");
		p.className = "post-excerpt";
		p.textContent = snippet(d, terms);
		li.append(a, " ", meta, p);
		out.appendChild(li);
	}
}

fetch("/subjects/indice.json").then((r) => r.json()).then((j) => {
	docs = j;
	[...new Map(docs.map((d) => [d.asignatura, d.asignaturaNombre]))].forEach(([id, n]) => fa.add(new Option(n, id)));
	[...new Set(docs.map((d) => d.tipo))].forEach((t) => ft.add(new Option(TIPOS[t] || t, t)));
	const p = new URLSearchParams(location.search).get("q");
	if (p) {
		q.value = p;
	}
	render();
});
[q, fa, ft].forEach((e) => e.addEventListener("input", render));
