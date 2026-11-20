(function () {
"use strict";

// Virtual oscilloscope: each probe window has up to 4 channels (pin + colour),
// drawn in stacked lanes with a shared time base, plus a table of measurements.
//
// Exact mode (frequency, pulse widths down to the clock) needs three exports
// in the wasm (feature-detected):
//   cm_gpio_trace(port, pin, on)             start/stop recording edges of a pin;
//                                            on start, emit the current level as an event
//   cm_gpio_events(port, pin, ptr, max) -> n   pop up to n pending events into memory at ptr,
//                                            each 16 bytes: f64 time_us (emulated), f64 level (0/1)
//   cm_now_us() -> f64                       emulated time in µs (else cm_now_ms() * 1000)
//
// Without them it samples cpu.gpio_duty once per frame (~60 Hz): enough for
// button presses and slow blinking, not for fast PWM.

const api = window.emu_api;
const mods = document.getElementById("emu-modules");
if (!api || !mods) {
	return;
}
const { app, el } = api;

const VDD = 3.3;
const READ = 4096;
const KEEP_US = 4e6;
const KEEP_N = 20000;
const MAX_CH = 4;
// time per division, in µs
const BASES = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000];
const COLORS = {
	green: ["Verde", "#3ddc84"],
	blue: ["Azul", "#4ea1ff"],
	red: ["Rojo", "#ff5a5a"],
	yellow: ["Amarillo", "#ffd84a"],
};

const probes = [];
let next_id = 1;

function fmt_time(us) {
	if (us === null || us === undefined || !isFinite(us)) {
		return "—";
	}
	const a = Math.abs(us);
	if (a >= 1e6) {
		return (us / 1e6).toFixed(3) + " s";
	}
	if (a >= 1e3) {
		return (us / 1e3).toFixed(3) + " ms";
	}
	if (a >= 1) {
		return us.toFixed(3) + " µs";
	}
	return (us * 1e3).toFixed(1) + " ns";
}

function fmt_freq(hz) {
	if (hz >= 1e6) {
		return (hz / 1e6).toFixed(3) + " MHz";
	}
	if (hz >= 1e3) {
		return (hz / 1e3).toFixed(3) + " kHz";
	}
	return hz.toFixed(2) + " Hz";
}

const pct = d => (d * 100).toFixed(1) + " %";
const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
const has_trace = cpu => !!cpu && typeof cpu.wasm.cm_gpio_events === "function";

function now_us(cpu) {
	const w = cpu.wasm;
	return typeof w.cm_now_us === "function" ? w.cm_now_us() : w["cm_now_ms"]() * 1000;
}

function save() {
	app.ui.probes = probes.map(p => ({ id: p.id, tb: p.tb, ch: p.ch.map(c => ({ pin: c.pin, color: c.color })) }));
	api.ui_save();
}

// ---- channels ----

function make_channel(color, pin) {
	const c = { color, pin: "", port: -1, pin_n: -1, err: "", ptr: 0, ok: false, cpu: null, t: [], v: [], lv: -1, duty: 0, mid: false, meas: null };
	set_pin(c, pin || "");
	return c;
}

function release(c) {
	if (c.ok && c.cpu && c.cpu === app.cpu && c.ptr) {
		c.cpu.wasm.cm_gpio_trace(c.port, c.pin_n, 0);
		c.cpu.wasm.cm_free(c.ptr, READ * 16);
	}
	c.ok = false;
	c.ptr = 0;
	c.cpu = null;
}

function set_pin(c, value) {
	release(c);
	c.pin = value.trim().toUpperCase();
	c.err = "";
	c.port = -1;
	c.t.length = 0;
	c.v.length = 0;
	c.lv = -1;
	if (c.pin) {
		try {
			const q = api.parse_pin(c.pin);
			c.port = q.port;
			c.pin_n = q.pin;
		} catch (e) {
			c.err = e.message;
		}
	}
}

function attach(c, cpu) {
	c.cpu = cpu;
	c.t.length = 0;
	c.v.length = 0;
	c.lv = -1;
	if (c.port < 0 || !has_trace(cpu)) {
		return;
	}
	c.ptr = cpu.wasm.cm_alloc(READ * 16);
	cpu.wasm.cm_gpio_trace(c.port, c.pin_n, 1);
	c.ok = true;
}

function trim(c, now) {
	let k = Math.max(0, c.t.length - KEEP_N);
	while (k + 1 < c.t.length && c.t[k + 1] < now - KEEP_US) {
		k++;
	}
	if (k > 0) {
		c.t.splice(0, k);
		c.v.splice(0, k);
	}
}

function pump(c, cpu, now) {
	const w = cpu.wasm;
	for (let round = 0; round < 4; round++) {
		const n = w.cm_gpio_events(c.port, c.pin_n, c.ptr, READ);
		if (!n) {
			break;
		}
		const dv = new DataView(cpu.wasm_memory.buffer, c.ptr, n * 16);
		for (let i = 0; i < n; i++) {
			c.t.push(dv.getFloat64(i * 16, true));
			c.v.push(dv.getFloat64(i * 16 + 8, true) ? 1 : 0);
		}
		if (n < READ) {
			break;
		}
	}
	trim(c, now);
}

// no edge trace: threshold (with hysteresis) the averaged level once per frame
function sample(c, cpu, now) {
	const d = cpu.gpio_duty(c.port, c.pin_n);
	c.duty = d;
	c.mid = d > 0.15 && d < 0.85;
	let lv = c.lv;
	if (lv < 0) {
		lv = d >= 0.5 ? 1 : 0;
	} else if (lv === 0 && d > 0.7) {
		lv = 1;
	} else if (lv === 1 && d < 0.3) {
		lv = 0;
	}
	if (lv !== c.lv) {
		c.lv = lv;
		c.t.push(now);
		c.v.push(lv);
	}
	trim(c, now);
}

function measure(c, now) {
	const t = c.t;
	const v = c.v;
	const n = t.length;
	if (!n) {
		return null;
	}
	const periods = [];
	const highs = [];
	const lows = [];
	let last_rise = -1;
	let last_fall = -1;
	for (let i = Math.max(1, n - 512); i < n; i++) {
		if (v[i] === v[i - 1]) {
			continue;
		}
		if (v[i]) {
			if (last_rise >= 0) {
				periods.push(t[i] - last_rise);
			}
			if (last_fall >= 0) {
				lows.push(t[i] - last_fall);
			}
			last_rise = t[i];
		} else {
			if (last_rise >= 0) {
				highs.push(t[i] - last_rise);
			}
			last_fall = t[i];
		}
	}
	const level = v[n - 1];
	if (!periods.length) {
		return { level };
	}
	const per = avg(periods);
	if (now - t[n - 1] > Math.max(3 * per, 50000)) {
		return { level };
	}
	const hi = highs.length ? avg(highs) : null;
	const lo = lows.length ? avg(lows) : null;
	let duty = null;
	if (hi !== null && lo !== null) {
		duty = hi / (hi + lo);
	} else if (hi !== null) {
		duty = Math.min(1, hi / per);
	}
	return { level, per, freq: 1e6 / per, hi, lo, duty };
}

function pick_base(per) {
	if (!per) {
		return 1000;
	}
	const want = per * 4 / 10;
	return BASES.find(b => b >= want) || BASES[BASES.length - 1];
}

// ---- drawing ----

function fit(canvas) {
	const r = canvas.getBoundingClientRect();
	const d = window.devicePixelRatio || 1;
	const w = Math.max(1, Math.round(r.width * d));
	const h = Math.max(1, Math.round(r.height * d));
	if (canvas.width !== w || canvas.height !== h) {
		canvas.width = w;
		canvas.height = h;
	}
}

function font(g, px) {
	g.font = Math.round(px * (window.devicePixelRatio || 1)) + "px ui-monospace, Menlo, Consolas, monospace";
}

function draw(p, now, span, label) {
	fit(p.canvas);
	const g = p.canvas.getContext("2d");
	const d = window.devicePixelRatio || 1;
	const W = p.canvas.width;
	const H = p.canvas.height;
	const n = Math.max(1, p.ch.length);
	const lane = H / n;
	g.fillStyle = "#0b1410";
	g.fillRect(0, 0, W, H);
	g.strokeStyle = "rgba(120, 200, 140, 0.22)";
	g.lineWidth = 1;
	g.beginPath();
	for (let i = 1; i < 10; i++) {
		const x = Math.round(W * i / 10) + 0.5;
		g.moveTo(x, 0);
		g.lineTo(x, H);
	}
	for (let j = 1; j < n; j++) {
		const y = Math.round(lane * j) + 0.5;
		g.moveTo(0, y);
		g.lineTo(W, y);
	}
	g.stroke();
	font(g, 11);
	g.fillStyle = "rgba(200, 255, 210, 0.8)";
	g.fillText(label, 6 * d, H - 5 * d);
	if (!span) {
		return;
	}
	// trigger: latest rising edge of the first channel that leaves a whole window
	let start = now - span;
	const first = p.ch[0];
	for (let i = first.t.length - 1; i > 0; i--) {
		if (first.v[i] && !first.v[i - 1] && first.t[i] + span <= now) {
			start = first.t[i];
			break;
		}
	}
	const end = start + span;
	p.ch.forEach((c, k) => {
		const top = lane * k;
		const y = lv => top + lane * 0.8 - lv * lane * 0.6;
		const col = COLORS[c.color][1];
		g.fillStyle = col;
		font(g, 11);
		g.fillText(c.pin || "—", 6 * d, top + 12 * d);
		if (!c.t.length) {
			return;
		}
		const t = c.t;
		const v = c.v;
		let i0 = -1;
		while (i0 + 1 < t.length && t[i0 + 1] <= start) {
			i0++;
		}
		let level = i0 >= 0 ? v[i0] : v[0];
		let count = 0;
		for (let i = i0 + 1; i < t.length && t[i] <= end; i++) {
			count++;
		}
		if (count > W) {
			const duty = c.meas && c.meas.duty !== null && c.meas.duty !== undefined ? c.meas.duty : 0.5;
			g.globalAlpha = 0.15 + 0.5 * duty;
			g.fillRect(0, y(1), W, y(0) - y(1));
			g.globalAlpha = 1;
			return;
		}
		g.strokeStyle = col;
		g.lineWidth = 2 * d;
		g.lineJoin = "round";
		g.beginPath();
		g.moveTo(0, y(level));
		for (let i = i0 + 1; i < t.length && t[i] <= end; i++) {
			const x = (t[i] - start) / span * W;
			g.lineTo(x, y(level));
			level = v[i];
			g.lineTo(x, y(level));
		}
		g.lineTo(W, y(level));
		g.stroke();
	});
}

function put(b, text) {
	if (b.textContent !== text) {
		b.textContent = text;
	}
}

function show(c) {
	const r = c.cells;
	const m = c.meas;
	if (c.port < 0) {
		for (const k of Object.keys(r)) {
			put(r[k], "—");
		}
		return;
	}
	if (!c.ok && c.mid) {
		put(r.freq, "rápida (n/d)");
		put(r.per, "—");
		put(r.hi, "—");
		put(r.lo, "—");
		put(r.duty, pct(c.duty));
		put(r.vavg, (c.duty * VDD).toFixed(2) + " V");
		return;
	}
	if (!m) {
		for (const k of Object.keys(r)) {
			put(r[k], "—");
		}
		return;
	}
	if (m.freq === undefined) {
		put(r.freq, "0 Hz");
		put(r.per, "—");
		put(r.hi, "—");
		put(r.lo, "—");
		put(r.duty, m.level ? "100 %" : "0 %");
		put(r.vavg, (m.level * VDD).toFixed(2) + " V");
		return;
	}
	put(r.freq, fmt_freq(m.freq));
	put(r.per, fmt_time(m.per));
	put(r.hi, fmt_time(m.hi));
	put(r.lo, fmt_time(m.lo));
	put(r.duty, m.duty === null ? "—" : pct(m.duty));
	put(r.vavg, m.duty === null ? "—" : (m.duty * VDD).toFixed(2) + " V");
}

function tick(p, cpu) {
	if (!cpu) {
		draw(p, 0, 0, "Sin máquina en marcha");
		return;
	}
	let now = 0;
	let sampling = false;
	for (const c of p.ch) {
		if (c.port < 0) {
			c.meas = null;
			show(c);
			continue;
		}
		if (cpu !== c.cpu) {
			attach(c, cpu);
		}
		now = now_us(cpu);
		if (c.ok) {
			pump(c, cpu, now);
		} else {
			sampling = true;
			sample(c, cpu, now);
		}
		c.meas = measure(c, now);
		show(c);
	}
	put(p.note, sampling ? "Sin traza de flancos en el emulador: se muestrea a ~60 Hz. Vale para pulsaciones y parpadeos lentos; el PWM rápido sale como nivel medio." : "");
	if (!now) {
		now = now_us(cpu);
	}
	let per = null;
	for (const c of p.ch) {
		if (c.meas && c.meas.per) {
			per = c.meas.per;
			break;
		}
	}
	const base = p.tb === "auto" ? pick_base(per) : Number(p.tb);
	draw(p, now, base * 10, fmt_time(base) + "/div" + (p.tb === "auto" ? " (auto)" : ""));
}

function frame() {
	requestAnimationFrame(frame);
	if (!probes.length) {
		return;
	}
	const cpu = app.ready ? app.cpu : null;
	for (const p of probes) {
		tick(p, cpu);
	}
}

// ---- cards ----

function datalist() {
	if (!document.getElementById("emu-probe-pins")) {
		const d = el("datalist", { id: "emu-probe-pins" });
		d.append(...api.ALL_PINS.map(x => el("option", { value: x })));
		document.getElementById("emu").append(d);
	}
}

function free_color(p) {
	const used = new Set(p.ch.map(c => c.color));
	return Object.keys(COLORS).find(k => !used.has(k)) || "green";
}

function color_select(c, on_change) {
	const s = el("select", { "aria-label": "Color del canal", class: "emu-colorsel" });
	for (const [k, [name]] of Object.entries(COLORS)) {
		s.append(el("option", { value: k }, name));
	}
	s.value = c.color;
	s.style.borderColor = COLORS[c.color][1];
	s.addEventListener("change", () => {
		c.color = s.value;
		s.style.borderColor = COLORS[c.color][1];
		on_change();
	});
	return s;
}

function build_rows(p) {
	p.chbox.replaceChildren();
	p.tbody.replaceChildren();
	p.ch.forEach((c, i) => {
		const pin = el("input", { type: "text", list: "emu-probe-pins", class: "emu-pin", size: 5, placeholder: "PA5", autocomplete: "off", spellcheck: "false", value: c.pin });
		pin.addEventListener("change", () => {
			set_pin(c, pin.value);
			pin.value = c.pin;
			pin.title = c.err;
			save();
		});
		const del = el("button", { type: "button", class: "emu-mini", title: "Quitar canal" }, "✕");
		del.addEventListener("click", () => {
			release(c);
			p.ch.splice(i, 1);
			if (!p.ch.length) {
				p.ch.push(make_channel("green", ""));
			}
			build_rows(p);
			save();
		});
		const swatch = el("i", { class: "emu-swatch" });
		const refresh = () => {
			swatch.style.background = COLORS[c.color][1];
			c.label.textContent = c.pin || "—";
		};
		const row = el("div", { class: "emu-chrow" }, color_select(c, () => {
			refresh();
			save();
		}), el("label", { class: "emu-field" }, "Pin", pin), del);
		p.chbox.append(row);
		c.cells = {};
		const tr = el("tr", {}, el("td", {}, swatch, " ", c.label = el("span", {}, "")));
		for (const k of ["freq", "per", "hi", "lo", "duty", "vavg"]) {
			c.cells[k] = el("td", {}, "—");
			tr.append(c.cells[k]);
		}
		p.tbody.append(tr);
		pin.addEventListener("change", refresh);
		refresh();
	});
	p.add.disabled = p.ch.length >= MAX_CH;
}

function add_probe(saved) {
	datalist();
	const m = /^probe-(\d+)$/.exec(saved.id || "");
	if (m) {
		next_id = Math.max(next_id, Number(m[1]) + 1);
	}
	const specs = Array.isArray(saved.ch) && saved.ch.length ? saved.ch : saved.pin ? [{ pin: saved.pin, color: "green" }] : [{ pin: "", color: "green" }];
	const p = { id: saved.id || "probe-" + next_id++, tb: saved.tb || "auto", ch: [], chbox: null, tbody: null, note: null, add: null, canvas: null, card: null };
	for (const s of specs.slice(0, MAX_CH)) {
		p.ch.push(make_channel(COLORS[s.color] ? s.color : "green", s.pin));
	}
	const close = el("button", { type: "button", class: "emu-mini emu-x", title: "Quitar sonda" }, "✕");
	const tb = el("select", { "aria-label": "Base de tiempos" }, el("option", { value: "auto" }, "Auto"));
	for (const b of BASES) {
		tb.append(el("option", { value: b }, fmt_time(b) + "/div"));
	}
	tb.value = p.tb;
	p.add = el("button", { type: "button", class: "emu-mini" }, "＋ Canal");
	p.chbox = el("div", { class: "emu-chlist" });
	p.canvas = el("canvas", { class: "emu-scope" });
	p.tbody = el("tbody", {});
	p.note = el("p", { class: "emu-info" }, "");
	const table = el("table", { class: "emu-meastable" },
		el("thead", {}, el("tr", {}, ...["Canal", "Frecuencia", "Periodo", "Ancho alto", "Ancho bajo", "Duty", "V media"].map(x => el("th", {}, x)))),
		p.tbody);
	p.card = el("section", { class: "card emu-card", "data-fixed": p.id, "data-kind": "scope" },
		el("h3", {}, "Osciloscopio", close),
		el("div", { class: "emu-cfgbar" }, el("label", { class: "emu-field" }, "Base de tiempos", tb), p.add),
		p.chbox,
		p.canvas,
		el("div", { class: "emu-tablewrap" }, table),
		p.note);
	p.add.addEventListener("click", () => {
		if (p.ch.length < MAX_CH) {
			p.ch.push(make_channel(free_color(p), ""));
			build_rows(p);
			save();
		}
	});
	tb.addEventListener("change", () => {
		p.tb = tb.value;
		save();
	});
	close.addEventListener("click", () => {
		for (const c of p.ch) {
			release(c);
		}
		p.card.remove();
		probes.splice(probes.indexOf(p), 1);
		save();
	});
	build_rows(p);
	probes.push(p);
	mods.append(p.card);
	return p;
}

function rebuild() {
	for (const p of probes.splice(0)) {
		for (const c of p.ch) {
			release(c);
		}
		p.card.remove();
	}
	for (const s of app.ui.probes) {
		add_probe(s);
	}
}

// the machine is gone, and its wasm memory with it
document.addEventListener("emu-stop", () => {
	for (const p of probes) {
		for (const c of p.ch) {
			c.ok = false;
			c.ptr = 0;
			c.cpu = null;
			c.t.length = 0;
			c.v.length = 0;
			c.lv = -1;
		}
	}
});
document.addEventListener("emu-ui-load", rebuild);

const bar = document.querySelector("#emu .emu-actions");
if (bar) {
	const add = el("button", { type: "button", class: "btn btn-outline" }, "＋ Osciloscopio");
	add.addEventListener("click", () => {
		add_probe({});
		save();
	});
	bar.prepend(add);
}

// double click on a board pin: new channel on the last scope (or a new scope)
const svg = document.getElementById("emu-svg");
if (svg) {
	svg.addEventListener("dblclick", e => {
		const pin = e.target.closest && e.target.closest(".pin[data-stm]");
		if (!pin) {
			return;
		}
		let p = probes[probes.length - 1];
		if (!p) {
			add_probe({ pin: pin.dataset.stm });
		} else {
			const empty = p.ch.find(c => !c.pin);
			if (empty) {
				set_pin(empty, pin.dataset.stm);
			} else if (p.ch.length < MAX_CH) {
				p.ch.push(make_channel(free_color(p), pin.dataset.stm));
			} else {
				add_probe({ pin: pin.dataset.stm });
				save();
				return;
			}
			build_rows(p);
		}
		save();
	});
}

rebuild();
requestAnimationFrame(frame);
})();
