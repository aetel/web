(function () {
"use strict";

// Module cards (display, RGB LED, sensors, console, probes) in a 12-column
// grid. Drag by the title to reorder, drag the right edge to change width.
// Height follows the content (so a display keeps its aspect ratio).
// Order and widths live in app.ui (saved in localStorage by emu.js).

const api = window.emu_api;
const mods = document.getElementById("emu-modules");
const work = document.getElementById("emu-work");
if (!api || !mods || !work) {
	return;
}

// width in columns (of 12): default, min, max
const SIZES = {
	st7565r: { def: 6, min: 4, max: 12 },
	st7735: { def: 6, min: 4, max: 12 },
	ssd1306: { def: 6, min: 4, max: 12 },
	rgb_led: { def: 3, min: 2, max: 6 },
	joystick: { def: 4, min: 3, max: 6 },
	potentiometer: { def: 4, min: 3, max: 12 },
	lm75b: { def: 4, min: 3, max: 12 },
	bh1750: { def: 4, min: 3, max: 12 },
	ina226: { def: 6, min: 4, max: 12 },
	sdcard: { def: 6, min: 4, max: 12 },
	console: { def: 6, min: 4, max: 12 },
	scope: { def: 6, min: 4, max: 12 },
};
const FALLBACK = { def: 6, min: 3, max: 12 };
const ROW = 8;
const GAP = 16;

const ui = () => api.app.ui;
const key = c => c.dataset.part || c.dataset.fixed;
const size_of = c => SIZES[c.dataset.kind] || FALLBACK;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

let dragging = false;
const seen = new WeakSet();

// masonry: the row span follows the card's height
const ro = new ResizeObserver(entries => {
	for (const e of entries) {
		const h = e.target.getBoundingClientRect().height;
		e.target.style.gridRowEnd = "span " + Math.ceil((h + GAP) / ROW);
	}
});

function apply_width(c) {
	const s = size_of(c);
	const w = clamp(Number(ui().w[key(c)]) || s.def, s.min, s.max);
	c.style.setProperty("--w", w);
	c.dataset.w = w;
}

function sort() {
	const order = ui().order;
	const kids = [...mods.children];
	const rank = c => {
		const i = order.indexOf(key(c));
		return i < 0 ? 1e6 : i;
	};
	const sorted = kids.map((c, i) => [c, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0]);
	if (sorted.some((c, i) => c !== kids[i])) {
		mods.append(...sorted);
	}
}

function drop_target(x, y, card) {
	const over = document.elementsFromPoint(x, y)
		.map(e => e.closest("#emu-modules > [data-kind]"))
		.find(e => e && e !== card);
	if (!over) {
		return null;
	}
	const r = over.getBoundingClientRect();
	const wide = r.width > work.clientWidth * 0.7;
	return { over, before: wide ? y < r.top + r.height / 2 : x < r.left + r.width / 2 };
}

function clear_marks() {
	for (const c of mods.children) {
		c.classList.remove("emu-drop-before", "emu-drop-after");
	}
}

// the card follows the pointer (transform only); the DOM changes once, on drop
function start_drag(card, e) {
	if (e.button > 0 || e.target.closest("button, input, select, a")) {
		return;
	}
	e.preventDefault();
	const handle = e.currentTarget;
	handle.setPointerCapture(e.pointerId);
	dragging = true;
	card.classList.add("emu-dragging");
	const px = e.pageX;
	const py = e.pageY;
	let hit = null;
	const move = ev => {
		card.style.transform = "translate(" + (ev.pageX - px) + "px," + (ev.pageY - py) + "px)";
		clear_marks();
		hit = drop_target(ev.clientX, ev.clientY, card);
		if (hit) {
			hit.over.classList.add(hit.before ? "emu-drop-before" : "emu-drop-after");
		}
	};
	const end = ev => {
		handle.removeEventListener("pointermove", move);
		handle.removeEventListener("pointerup", end);
		handle.removeEventListener("pointercancel", end);
		clear_marks();
		card.style.transform = "";
		card.classList.remove("emu-dragging");
		if (ev.type === "pointerup") {
			if (hit) {
				hit.before ? hit.over.before(card) : hit.over.after(card);
			} else {
				const others = [...mods.children].filter(c => c !== card);
				const last = others[others.length - 1];
				if (last && ev.clientY > last.getBoundingClientRect().bottom) {
					mods.append(card);
				}
			}
		}
		ui().order = [...mods.children].map(key);
		dragging = false;
		api.ui_save();
	};
	handle.addEventListener("pointermove", move);
	handle.addEventListener("pointerup", end);
	handle.addEventListener("pointercancel", end);
}

function start_resize(card, e) {
	e.preventDefault();
	e.stopPropagation();
	const handle = e.currentTarget;
	handle.setPointerCapture(e.pointerId);
	handle.classList.add("active");
	const s = size_of(card);
	const gap = parseFloat(getComputedStyle(work).columnGap) || GAP;
	const col = (work.clientWidth + gap) / 12;
	const left = card.getBoundingClientRect().left;
	const move = ev => {
		const w = clamp(Math.round((ev.clientX - left + gap) / col), s.min, s.max);
		if (w !== Number(card.dataset.w)) {
			card.style.setProperty("--w", w);
			card.dataset.w = w;
		}
	};
	const end = () => {
		handle.removeEventListener("pointermove", move);
		handle.removeEventListener("pointerup", end);
		handle.removeEventListener("pointercancel", end);
		handle.classList.remove("active");
		ui().w[key(card)] = Number(card.dataset.w);
		api.ui_save();
	};
	handle.addEventListener("pointermove", move);
	handle.addEventListener("pointerup", end);
	handle.addEventListener("pointercancel", end);
}

function adopt(c) {
	if (seen.has(c) || !c.dataset.kind) {
		return;
	}
	seen.add(c);
	apply_width(c);
	const title = c.querySelector(":scope > h3");
	if (title) {
		title.addEventListener("pointerdown", e => start_drag(c, e));
	}
	const grip = document.createElement("i");
	grip.className = "emu-resize";
	grip.title = "Arrastra para cambiar el ancho";
	grip.addEventListener("pointerdown", e => start_resize(c, e));
	c.append(grip);
	ro.observe(c);
}

function refresh() {
	for (const c of mods.children) {
		adopt(c);
	}
	if (!dragging) {
		sort();
	}
}

new MutationObserver(refresh).observe(mods, { childList: true });

// layout replaced (JSON loaded, reset)
document.addEventListener("emu-ui-load", () => {
	for (const c of mods.children) {
		if (seen.has(c)) {
			apply_width(c);
		}
	}
	refresh();
});

refresh();
})();
