(function () {
"use strict";

const root = document.getElementById("emu");
if (!root) {
	return;
}

const BASE = root.dataset.base || "/assets/emu/";
const BOARD_ID = root.dataset.board || "nucleo-f429zi";
const BOARD_URL = BASE + "boards/" + BOARD_ID + "/";
const STORE_KEY = "emu-config:" + BOARD_ID;
const NS = "http://www.w3.org/2000/svg";

const $ = id => document.getElementById(id);

const scope = () => ({ widgets: [], inputs: [], keys: new Map() });

const app = {
	board: null,
	buses: {},
	config: { parts: [] },
	preset: "custom",
	emulator: null,
	cpu: null,
	ready: false,
	firmware: null,
	fixed: scope(),
	dyn: scope(),
	pin_els: new Map(),
	marked: [],
	started: 0,
	last: null,
	wiring: new Map(),
	editing: -1,
};

// where the parts being built register their inputs and keys
let cur = app.fixed;

// page layout (card widths and order, open panels, probes), kept in the browser
const UI_KEY = "emu-ui:" + BOARD_ID;

const valid_macro = m => !!m && typeof m.name === "string" && typeof m.data === "string";

function ui_load() {
	let s = null;
	try {
		s = JSON.parse(localStorage.getItem(UI_KEY));
	} catch (e) {
		// (nothing saved, or damaged)
	}
	s = s && typeof s === "object" ? s : {};
	return {
		w: s.w || {},
		order: Array.isArray(s.order) ? s.order : [],
		open: s.open || {},
		probes: Array.isArray(s.probes) ? s.probes : [],
		macros: Array.isArray(s.macros) ? s.macros.filter(valid_macro) : null,
	};
}

function ui_save() {
	try {
		localStorage.setItem(UI_KEY, JSON.stringify(app.ui));
	} catch (e) {
		// (storage may be off)
	}
}

app.ui = ui_load();

// a <details data-panel> that remembers whether it was open
function panel(d) {
	const k = d.dataset.panel;
	if (k in app.ui.open) {
		d.open = !!app.ui.open[k];
	}
	d.addEventListener("toggle", () => {
		app.ui.open[k] = d.open;
		ui_save();
	});
}

const ALL_PINS = [];
for (const port of "ABCDEFG") {
	for (let n = 0; n < 16; n++) {
		ALL_PINS.push("P" + port + n);
	}
}
ALL_PINS.push("PH0", "PH1");

// what a fresh page starts with (and "Restablecer" returns to)
const DEFAULT_PRESET = {
	"id": "default",
	"name": "Predeterminada",
	"parts": [
		{
			"id": "lcd",
			"type": "st7565r",
			"bus": "spi1",
			"pins": {
				"SCK": "PA5",
				"MOSI": "PA7",
				"CS": "PD14",
				"A0": "PF13",
				"RST": "PA6"
			}
		},
		{
			"id": "rgb",
			"type": "rgb_led",
			"active": "high",
			"pins": {
				"R": "PD13",
				"G": "PD12",
				"B": "PD11"
			}
		},
		{
			"id": "joy",
			"type": "joystick",
			"active": "high",
			"pins": {
				"UP": "PB10",
				"DOWN": "PE12",
				"LEFT": "PE14",
				"RIGHT": "PB11",
				"CENTER": "PE15"
			}
		},
		{
			"id": "lm75b",
			"type": "lm75b",
			"bus": "i2c1",
			"addr": "0x48",
			"value": 25,
			"pins": {
				"SCL": "PB8",
				"SDA": "PB9"
			}
		},
		{
			"id": "ina226",
			"type": "ina226",
			"bus": "i2c1",
			"addr": "0x40",
			"bus_v": 5,
			"current_ma": 509,
			"shunt_mohm": 100,
			"pins": {
				"SCL": "PB8",
				"SDA": "PB9"
			}
		}
	],
	"layout": {
		"w": {
			"joy": 6,
			"lcd": 12,
			"rgb": 6,
			"lm75b": 6,
			"ina226": 6,
			"probe-2": 12,
			"console-2": 12
		},
		"order": [
			"lcd",
			"joy",
			"ina226",
			"rgb",
			"lm75b",
			"console-2",
			"probe-2"
		]
	},
	"probes": [
		{
			"id": "probe-2",
			"tb": "50000",
			"ch": [
				{
					"pin": "PB0",
					"color": "green"
				},
				{
					"pin": "PB14",
					"color": "red"
				}
			]
		}
	]
};

// ---- what can be connected ----

const SPI_PINS = { SCK: "PA5", MOSI: "PA7", CS: "PD14", DC: "PF13", RST: "PA6" };
const I2C_PINS = { SCL: "PB8", SDA: "PB9" };

const CATALOG = {
	st7565r: {
		label: "Pantalla LCD ST7565R 128×32 (SPI)",
		bus: "spi",
		signals: ["SCK", "MOSI", "CS", "A0", "RST"],
		size: [128, 32],
		defaults: { id: "lcd", type: "st7565r", bus: "spi1", pins: { SCK: "PA5", MOSI: "PA7", CS: "PD14", A0: "PF13", RST: "PA6" } },
	},
	st7735: {
		label: "Pantalla TFT ST7735 160×80 en color (SPI)",
		bus: "spi",
		signals: ["SCK", "MOSI", "CS", "DC", "RST"],
		size: [160, 80],
		defaults: { id: "tft", type: "st7735", bus: "spi1", pins: { ...SPI_PINS } },
	},
	"ssd1306-i2c": {
		label: "Pantalla OLED SSD1306 128×64 (I2C)",
		bus: "i2c",
		signals: ["SCL", "SDA"],
		size: [128, 64],
		addr: "0x3c",
		defaults: { id: "oled", type: "ssd1306", bus: "i2c1", addr: "0x3c", pins: { ...I2C_PINS } },
	},
	"ssd1306-spi": {
		label: "Pantalla OLED SSD1306 128×64 (SPI)",
		bus: "spi",
		signals: ["SCK", "MOSI", "CS", "DC", "RST"],
		size: [128, 64],
		defaults: { id: "oled", type: "ssd1306", bus: "spi1", pins: { ...SPI_PINS } },
	},
	lm75b: {
		label: "Sensor de temperatura LM75B (I2C)",
		bus: "i2c",
		signals: ["SCL", "SDA"],
		addr: "0x48",
		defaults: { id: "lm75b", type: "lm75b", bus: "i2c1", addr: "0x48", value: 25, pins: { ...I2C_PINS } },
	},
	ina226: {
		label: "Monitor de corriente INA226 (I2C)",
		bus: "i2c",
		signals: ["SCL", "SDA"],
		addr: "0x40",
		defaults: { id: "ina226", type: "ina226", bus: "i2c1", addr: "0x40", bus_v: 5, current_ma: 100, shunt_mohm: 100, pins: { ...I2C_PINS } },
	},
	bh1750: {
		label: "Sensor de luz BH1750 (I2C)",
		bus: "i2c",
		signals: ["SCL", "SDA"],
		addr: "0x23",
		defaults: { id: "bh1750", type: "bh1750", bus: "i2c1", addr: "0x23", value: 100, pins: { ...I2C_PINS } },
	},
	"sdcard-sdio": {
		label: "Tarjeta SD (SDIO)",
		bus: "sdio",
		signals: ["CK", "CMD", "D0", "D1", "D2", "D3", "CD"],
		optional: ["D1", "D2", "D3", "CD"],
		card: true,
		defaults: { id: "sd", type: "sdcard", bus: "sdio1", size_mb: 16, pins: { CK: "PC12", CMD: "PD2", D0: "PC8", D1: "PC9", D2: "PC10", D3: "PC11" } },
	},
	"sdcard-spi": {
		label: "Tarjeta SD (SPI)",
		bus: "spi",
		signals: ["SCK", "MISO", "MOSI", "CS", "CD"],
		optional: ["CD"],
		card: true,
		defaults: { id: "sd", type: "sdcard", bus: "spi4", size_mb: 16, pins: { SCK: "PE2", MISO: "PE5", MOSI: "PE6", CS: "PE4" } },
	},
	potentiometer: {
		label: "Potenciómetro 0–3,3 V (ADC)",
		pin: true,
		defaults: { id: "pot", type: "potentiometer", pin: "PA3", value: 1.65 },
	},
	led: {
		label: "LED",
		pin: true,
		color: true,
		active: true,
		defaults: { id: "led", type: "led", pin: "PB0", color: "#ef4444", active: "high" },
	},
	rgb_led: {
		label: "LED RGB",
		signals: ["R", "G", "B"],
		active: true,
		defaults: { id: "rgb", type: "rgb_led", active: "high", pins: { R: "PD13", G: "PD12", B: "PD11" } },
	},
	button: {
		label: "Pulsador",
		pin: true,
		active: true,
		defaults: { id: "button", type: "button", pin: "PC13", active: "high" },
	},
	joystick: {
		label: "Joystick de 5 posiciones",
		signals: ["UP", "DOWN", "LEFT", "RIGHT", "CENTER"],
		active: true,
		defaults: { id: "joy", type: "joystick", active: "high", pins: { UP: "PB10", DOWN: "PE12", LEFT: "PE14", RIGHT: "PB11", CENTER: "PE15" } },
	},
};

function catalog_key(part) {
	if (part.type === "ssd1306") {
		const i2c = (part.pins && part.pins.SCL) || String(part.bus || "").toLowerCase().startsWith("i2c");
		return i2c ? "ssd1306-i2c" : "ssd1306-spi";
	}
	if (part.type === "sdcard") {
		const spi = (part.pins && (part.pins.MISO || part.pins.SCK)) || String(part.bus || "").toLowerCase().startsWith("spi");
		return spi ? "sdcard-spi" : "sdcard-sdio";
	}
	return part.type;
}

function wires_of(part) {
	const w = {};
	if (part.pin) {
		w.pin = part.pin;
	}
	Object.assign(w, part.pins || {});
	return w;
}

function bus_options(kind, bus, signal) {
	const b = app.buses[kind] && app.buses[kind][bus];
	return b && b[signal] ? b[signal].map(p => p.split(":")[0]) : [];
}

// ---- small helpers ----

function log(message, kind = "") {
	const row = document.createElement("div");
	row.className = kind;
	const time = document.createElement("time");
	time.textContent = new Date().toLocaleTimeString("es-ES");
	row.append(time, " " + message);
	$("emu-log").prepend(row);
	while ($("emu-log").children.length > 80) {
		$("emu-log").lastChild.remove();
	}
}

function set_state(text, kind) {
	$("emu-state").textContent = text;
	$("emu-state").className = "emu-state " + (kind || "");
}

function el(tag, attrs, ...children) {
	const e = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs || {})) {
		if (k === "class") {
			e.className = v;
		} else {
			e.setAttribute(k, v);
		}
	}
	e.append(...children);
	return e;
}

function svg_el(tag, attrs) {
	const e = document.createElementNS(NS, tag);
	for (const [k, v] of Object.entries(attrs || {})) {
		e.setAttribute(k, v);
	}
	return e;
}

function parse_pin(name) {
	const m = /^P([A-K])(\d{1,2})$/.exec(String(name).trim().toUpperCase());
	if (!m || +m[2] > 15) {
		throw new Error("pin no válido: " + name);
	}
	return { port: m[1].charCodeAt(0) - 65, pin: +m[2] };
}

const clone = v => JSON.parse(JSON.stringify(v));

// ---- pins the host drives (buttons, joystick) ----

function make_input(pin_name, active) {
	const { port, pin } = parse_pin(pin_name);
	const pressed = active === "low" ? 0 : 1;
	const input = {
		down: false,
		listeners: [],
		rest() {
			if (app.cpu) {
				app.cpu.gpio_in(port, pin, 1 - pressed);
			}
		},
		set(down) {
			if (down === input.down) {
				return;
			}
			input.down = down;
			if (app.cpu) {
				app.cpu.gpio_in(port, pin, down ? pressed : 1 - pressed);
			}
			for (const f of input.listeners) {
				f(down);
			}
		},
	};
	cur.inputs.push(input);
	return input;
}

function bind_press(target, input) {
	target.addEventListener("pointerdown", e => {
		e.preventDefault();
		target.setPointerCapture(e.pointerId);
		input.set(true);
	});
	const up = () => input.set(false);
	target.addEventListener("pointerup", up);
	target.addEventListener("pointercancel", up);
	input.listeners.push(down => target.classList.toggle("down", down));
}

const all_inputs = () => app.fixed.inputs.concat(app.dyn.inputs);
const all_widgets = () => app.fixed.widgets.concat(app.dyn.widgets);
const key_input = key => app.dyn.keys.get(key) || app.fixed.keys.get(key);

// ---- the board's drawing ----

function scope_svg_style(svg) {
	const style = svg.querySelector("style");
	if (!style) {
		return;
	}
	style.textContent = style.textContent.replace(/(^|})\s*([^{}@]+)\{/g, (m, a, sel) => {
		return a + "\n" + sel.split(",").map(s => "#emu " + s.trim()).join(", ") + " {";
	});
}

async function load_svg(board) {
	const text = await (await fetch(BOARD_URL + board.svg)).text();
	const holder = $("emu-svg");
	holder.innerHTML = text;
	const svg = holder.querySelector("svg");
	svg.removeAttribute("width");
	svg.removeAttribute("height");
	svg.setAttribute("role", "img");
	svg.setAttribute("aria-label", "Placa " + board.name);
	scope_svg_style(svg);
	for (const pin of svg.querySelectorAll(".pin[data-stm]")) {
		app.pin_els.set(pin.dataset.stm, pin);
	}
	const overlay = svg_el("g", { id: "emu-overlay" });
	svg.append(overlay);
	svg.addEventListener("mouseover", e => {
		const pin = e.target.closest && e.target.closest(".pin");
		if (!pin) {
			return;
		}
		const funcs = (pin.dataset.funcs || "").split(" | ").filter(Boolean).join(" · ");
		$("emu-pininfo").textContent = (pin.dataset.stm || "") + " (" + (pin.dataset.zio || "") + ", " + pin.id + ")" + (funcs ? " — " + funcs : "");
	});
	return overlay;
}

function mark_wires(label, wires) {
	const pins = [];
	for (const [signal, name] of Object.entries(wires || {})) {
		const pin = app.pin_els.get(String(name).toUpperCase());
		if (!pin) {
			continue;
		}
		pin.classList.add("emu-wired");
		const title = svg_el("title", {});
		title.textContent = name + " · " + label + " " + signal;
		pin.append(title);
		app.marked.push({ pin, title });
		pins.push(pin);
	}
	return pins;
}

function unmark_wires() {
	for (const { pin, title } of app.marked) {
		title.remove();
		if (!pin.querySelector("title")) {
			pin.classList.remove("emu-wired", "emu-hl");
		}
	}
	app.marked = [];
}

function wires_list(wires) {
	const list = el("p", { class: "emu-wires" });
	for (const [signal, name] of Object.entries(wires || {})) {
		list.append(el("span", {}, (signal === "pin" ? "" : signal + " → ") + name));
	}
	return list;
}

function card(part, ...body) {
	const wires = wires_of(part);
	const pins = mark_wires(part.label || part.id, wires);
	const c = el("section", { class: "card emu-card", "data-part": part.id, "data-kind": part.type }, el("h3", {}, part.label || part.id));
	if (part.info) {
		c.append(el("p", { class: "emu-info" }, part.info));
	}
	c.append(...body);
	if (Object.keys(wires).length) {
		c.append(wires_list(wires));
	}
	const light = on => pins.forEach(p => p.classList.toggle("emu-hl", on));
	c.addEventListener("mouseenter", () => light(true));
	c.addEventListener("mouseleave", () => light(false));
	$("emu-modules").append(c);
	return c;
}

// ---- parts of the board itself (drawn on it) ----

const FIXED = {
	led(part, overlay) {
		const { port, pin } = parse_pin(part.pin);
		const [cx, cy] = part.at;
		const halo = svg_el("circle", { cx, cy, r: 5.5, fill: part.color, opacity: 0, "pointer-events": "none" });
		const dot = svg_el("circle", { cx, cy, r: 2.1, fill: part.color, opacity: 0, stroke: "#fff", "stroke-width": 0.3, "pointer-events": "none" });
		overlay.append(halo, dot);
		const lamp = el("i", { style: "--c:" + part.color });
		$("emu-chips").append(el("span", { class: "emu-chip" }, lamp, part.label));
		let shown = -1;
		return {
			tick(cpu) {
				const v = cpu.gpio_duty(port, pin);
				if (Math.abs(v - shown) < 0.01) {
					return;
				}
				shown = v;
				halo.setAttribute("opacity", (v * 0.6).toFixed(2));
				dot.setAttribute("opacity", (0.08 + 0.92 * v).toFixed(2));
				lamp.style.opacity = (0.15 + 0.85 * v).toFixed(2);
			},
		};
	},

	button(part, overlay) {
		const input = make_input(part.pin, part.active);
		const [cx, cy] = part.at;
		const hit = svg_el("circle", { cx, cy, r: part.r || 3, class: "emu-button" });
		overlay.append(hit);
		bind_press(hit, input);
		const chip = el("button", { type: "button", class: "emu-chipbtn" }, part.label + (part.key ? " (" + part.key + ")" : ""));
		bind_press(chip, input);
		$("emu-chips").append(chip);
		if (part.key) {
			cur.keys.set(part.key.toLowerCase(), input);
		}
		return {};
	},
};

// ---- parts the configuration says are connected ----

function display_widget(part, index) {
	const [w, h] = CATALOG[catalog_key(part)].size;
	const canvas = el("canvas", { class: "emu-lcd", width: w, height: h });
	canvas.style.aspectRatio = w + " / " + h;
	card(part, el("div", { class: "emu-bezel" }, canvas));
	const ctx = canvas.getContext("2d");
	let image = ctx.createImageData(w, h);
	let seen = -1;
	let p = -1;
	return {
		boot(cpu) {
			p = cpu.panel_of_part(index);
			seen = -1;
		},
		tick(cpu) {
			if (p < 0) {
				return;
			}
			const d = cpu.panel(p, seen);
			if (d.frame === seen) {
				return;
			}
			seen = d.frame;
			if (d.frame === 0) {
				ctx.fillStyle = "#1d241d";
				ctx.fillRect(0, 0, canvas.width, canvas.height);
			} else if (d.pixels) {
				if (canvas.width !== d.width || canvas.height !== d.height) {
					canvas.width = d.width;
					canvas.height = d.height;
					canvas.style.aspectRatio = d.width + " / " + d.height;
					image = ctx.createImageData(d.width, d.height);
				}
				image.data.set(d.pixels);
				ctx.putImageData(image, 0, 0);
			}
		},
	};
}

function led_widget(part) {
	const { port, pin } = parse_pin(part.pin);
	const low = part.active === "low";
	const lamp = el("i", { style: "--c:" + (part.color || "#ef4444") });
	$("emu-chips").append(el("span", { class: "emu-chip" }, lamp, (part.id || "LED") + " · " + part.pin));
	mark_wires(part.id, { pin: part.pin });
	let shown = -1;
	return {
		tick(cpu) {
			const d = cpu.gpio_duty(port, pin);
			const v = low ? 1 - d : d;
			if (Math.abs(v - shown) < 0.01) {
				return;
			}
			shown = v;
			lamp.style.opacity = (0.15 + 0.85 * v).toFixed(2);
		},
	};
}

function button_widget(part) {
	const input = make_input(part.pin, part.active);
	const b = el("button", { type: "button", class: "emu-chipbtn" }, (part.id || "Pulsador") + " · " + part.pin);
	bind_press(b, input);
	$("emu-chips").append(b);
	mark_wires(part.id, { pin: part.pin });
	return {};
}

function rgb_widget(part) {
	const pins = {};
	for (const c of ["R", "G", "B"]) {
		pins[c] = parse_pin(part.pins[c]);
	}
	const low = part.active === "low";
	const lamp = el("div", { class: "emu-rgb" });
	const vals = {};
	const row = el("div", { class: "emu-rgbvals" });
	for (const c of ["R", "G", "B"]) {
		vals[c] = el("b", {}, "0 %");
		row.append(el("span", {}, c + " ", vals[c]));
	}
	const info = low ? "Ánodo común: se enciende con nivel bajo." : "Cátodo común: se enciende con nivel alto. PWM con TIM4 (PD12, PD13) o por software.";
	card({ ...part, info: part.info || info }, lamp, row);
	let last = "";
	return {
		tick(cpu) {
			const v = {};
			for (const c of ["R", "G", "B"]) {
				const d = cpu.gpio_duty(pins[c].port, pins[c].pin);
				v[c] = low ? 1 - d : d;
			}
			const color = "rgb(" + Math.round(v.R * 255) + "," + Math.round(v.G * 255) + "," + Math.round(v.B * 255) + ")";
			if (color === last) {
				return;
			}
			last = color;
			lamp.style.setProperty("--c", color);
			lamp.classList.toggle("lit", v.R + v.G + v.B > 0.02);
			for (const c of ["R", "G", "B"]) {
				vals[c].textContent = Math.round(v[c] * 100) + " %";
			}
		},
	};
}

function joystick_widget(part) {
	const keys = { UP: "ArrowUp", DOWN: "ArrowDown", LEFT: "ArrowLeft", RIGHT: "ArrowRight", CENTER: "c" };
	const layout = { UP: "u", LEFT: "l", CENTER: "c", RIGHT: "r", DOWN: "d" };
	const glyph = { UP: "▲", LEFT: "◀", CENTER: "●", RIGHT: "▶", DOWN: "▼" };
	const grid = el("div", { class: "emu-dpad" });
	for (const dir of ["UP", "LEFT", "CENTER", "RIGHT", "DOWN"]) {
		const input = make_input(part.pins[dir], part.active);
		const b = el("button", { type: "button", class: "emu-dir emu-dir-" + layout[dir], "aria-label": dir }, glyph[dir]);
		bind_press(b, input);
		grid.append(b);
		cur.keys.set(((part.keys && part.keys[dir]) || keys[dir]).toLowerCase(), input);
	}
	const info = (part.active === "low" ? "Pulsadores a masa (nivel bajo al pulsar)" : "Pulsadores a nivel alto al pulsar") + "; teclas: flechas y C.";
	card({ ...part, info: part.info || info }, grid);
	return {};
}

function potentiometer_widget(part, index) {
	const volts = el("input", { type: "range", min: 0, max: 3.3, step: 0.01, value: part.value === undefined ? 1.65 : part.value });
	const out = el("b", {}, "");
	const code = el("p", { class: "emu-read" }, "");
	const channel = (app.buses.adc.adc12 || []).indexOf(String(part.pin).toUpperCase());
	const apply = () => {
		const v = Number(volts.value);
		out.textContent = v.toFixed(2) + " V";
		code.textContent = "Lectura de 12 bits: " + Math.round(v / 3.3 * 4095) + (channel >= 0 ? " · canal " + channel : "");
		part.value = v;
		if (app.cpu) {
			app.cpu.part_set(index, 0, v);
		}
	};
	volts.addEventListener("input", () => {
		apply();
		save_config();
	});
	card({ ...part, info: part.info || "Entre GND y 3,3 V: el ADC lee la tensión del cursor." }, el("label", { class: "emu-label" }, "Tensión ", out, volts), code);
	apply();
	return { boot: apply };
}

function lm75b_widget(part, index) {
	const out = el("b", {}, "");
	const slider = el("input", { type: "range", min: -55, max: 125, step: 0.125, value: part.value === undefined ? 25 : part.value });
	const apply = () => {
		part.value = Number(slider.value);
		out.textContent = part.value.toFixed(3).replace(/0$/, "") + " °C";
		if (app.cpu) {
			app.cpu.part_set(index, 0, part.value);
		}
	};
	slider.addEventListener("input", () => {
		apply();
		save_config();
	});
	card({ ...part, info: part.info || "I2C, dirección " + (part.addr || "0x48") + ". Resolución 0,125 °C." }, el("label", { class: "emu-label" }, "Temperatura ", out, slider));
	apply();
	return { boot: apply };
}

function bh1750_widget(part, index) {
	const out = el("b", {}, "");
	const lux = v => Math.max(0, Math.round(Math.pow(10, v / 10) - 1));
	const pos = l => Math.log10(l + 1) * 10;
	const slider = el("input", { type: "range", min: 0, max: 48.2, step: 0.1, value: pos(part.value === undefined ? 100 : part.value) });
	const apply = () => {
		part.value = lux(Number(slider.value));
		out.textContent = part.value + " lx";
		if (app.cpu) {
			app.cpu.part_set(index, 0, part.value);
		}
	};
	slider.addEventListener("input", () => {
		apply();
		save_config();
	});
	card({ ...part, info: part.info || "I2C, dirección " + (part.addr || "0x23") + " (0x5C con ADDR a 3,3 V). Escala logarítmica." }, el("label", { class: "emu-label" }, "Luz ", out, slider));
	apply();
	return { boot: apply };
}

function ina226_widget(part, index) {
	const volts = el("input", { type: "range", min: 0, max: 36, step: 0.05, value: part.bus_v === undefined ? 5 : part.bus_v });
	const amps = el("input", { type: "range", min: -1000, max: 1000, step: 1, value: part.current_ma === undefined ? 100 : part.current_ma });
	const shunt = el("input", { type: "number", min: 1, max: 1000, step: 1, value: part.shunt_mohm === undefined ? 100 : part.shunt_mohm, class: "emu-num" });
	const v_out = el("b", {}, "");
	const i_out = el("b", {}, "");
	const s_out = el("b", {}, "");
	const warn = el("p", { class: "emu-warn", hidden: "" }, "El INA226 satura con ±81,92 mV en el shunt: reduce la corriente o la resistencia.");
	const apply = () => {
		const v = Number(volts.value);
		const i = Number(amps.value);
		const r = Math.max(1, Number(shunt.value) || 1);
		part.bus_v = v;
		part.current_ma = i;
		part.shunt_mohm = r;
		v_out.textContent = v.toFixed(2) + " V";
		i_out.textContent = i + " mA";
		const mv = i * r / 1000;
		s_out.textContent = mv.toFixed(3) + " mV";
		warn.hidden = Math.abs(mv) <= 81.92;
		if (app.cpu) {
			app.cpu.part_set(index, 0, v);
			app.cpu.part_set(index, 1, i);
			app.cpu.part_set(index, 2, r);
		}
	};
	for (const e of [volts, amps, shunt]) {
		e.addEventListener("input", () => {
			apply();
			save_config();
		});
	}
	card({ ...part, info: part.info || "I2C, dirección " + (part.addr || "0x40") + ". El firmware escribe el registro de calibración." },
		el("label", { class: "emu-label" }, "Tensión del bus ", v_out, volts),
		el("label", { class: "emu-label" }, "Corriente ", i_out, amps),
		el("label", { class: "emu-label" }, "Shunt (mΩ) ", shunt),
		el("p", { class: "emu-read" }, "Tensión en el shunt: ", s_out),
		warn);
	apply();
	return { boot: apply };
}

// what the page keeps of each SD card across reboots: its image and whether
// it's out of the slot (by the part's name)
const sd_store = new Map();

function bytes_text(n) {
	return n >= 1 << 20 ? (n / (1 << 20)).toFixed(n % (1 << 20) ? 1 : 0) + " MB" : (n / 1024).toFixed(0) + " KB";
}

function sdcard_widget(part, index) {
	const keep = sd_store.get(part.id) || { image: null, out: false, name: "" };
	sd_store.set(part.id, keep);
	let cpu = null;
	let slot = -1;
	let seen = -1;
	let base = 0;
	let pending = 0;
	const status = el("p", { class: "emu-read" }, "");
	const file = el("input", { type: "file", hidden: "" });
	const load = el("label", { class: "btn btn-outline" }, "Cargar imagen", file);
	const save = el("button", { type: "button", class: "btn btn-outline" }, "Descargar imagen");
	const eject = el("button", { type: "button", class: "btn btn-outline" }, "");
	const show = () => {
		eject.textContent = keep.out ? "Meter tarjeta" : "Sacar tarjeta";
		if (!cpu || slot < 0) {
			status.textContent = "Sin tarjeta: revisa el conexionado.";
			return;
		}
		const size = bytes_text(cpu.sd_len(slot));
		status.textContent = (keep.out ? "Fuera de la ranura" : "En la ranura") + " · " + size + (keep.name ? " · " + keep.name : "") + (seen !== base ? " · modificada" : "");
	};
	card(part, el("div", { class: "emu-cfgbar" }, load, save, eject), status);
	file.addEventListener("change", async () => {
		const f = file.files[0];
		file.value = "";
		if (!f) {
			return;
		}
		if (f.size > 256 << 20) {
			log("La imagen " + f.name + " pasa de 256 MB", "bad");
			return;
		}
		keep.image = new Uint8Array(await f.arrayBuffer());
		keep.name = f.name;
		if (cpu && slot >= 0) {
			cpu.sd_load(slot, keep.image);
			seen = base = cpu.sd_changes(slot);
		}
		log("Tarjeta " + part.id + ": imagen " + f.name + " (" + bytes_text(keep.image.length) + ")", "ok");
		show();
	});
	save.addEventListener("click", () => {
		const bytes = cpu && slot >= 0 ? cpu.sd_image(slot) : keep.image;
		if (!bytes) {
			return;
		}
		const a = el("a", { href: URL.createObjectURL(new Blob([bytes])), download: (part.id || "sd") + ".img" });
		document.body.append(a);
		a.click();
		a.remove();
	});
	eject.addEventListener("click", () => {
		keep.out = !keep.out;
		if (cpu && slot >= 0) {
			cpu.sd_insert(slot, !keep.out);
		}
		show();
	});
	return {
		boot(c) {
			cpu = c;
			slot = cpu.sd_of_part(index);
			if (slot >= 0) {
				if (keep.image) {
					cpu.sd_load(slot, keep.image);
				}
				if (keep.out) {
					cpu.sd_insert(slot, false);
				}
				seen = base = cpu.sd_changes(slot);
			}
			pending = 0;
			show();
		},
		tick(c) {
			if (slot < 0) {
				return;
			}
			const n = c.sd_changes(slot);
			if (n !== seen) {
				seen = n;
				pending = performance.now();
				show();
			} else if (pending && performance.now() - pending > 1500) {
				// the firmware stopped writing: keep the card for the next boot
				pending = 0;
				keep.image = c.sd_image(slot);
			}
		},
	};
}

const DYNAMIC = {
	st7565r: display_widget,
	st7735: display_widget,
	ssd1306: display_widget,
	led: led_widget,
	button: button_widget,
	rgb_led: rgb_widget,
	joystick: joystick_widget,
	potentiometer: potentiometer_widget,
	lm75b: lm75b_widget,
	bh1750: bh1750_widget,
	ina226: ina226_widget,
	sdcard: sdcard_widget,
};

// ---- serial macros ----
// Text of a frame: bytes as 0x01 or 01, quoted ASCII "15:20:15", and {LEN}
// for the total length in bytes (SOH and EOT included).
const DEFAULT_MACROS = [
	{ name: "Puesta en hora 15:20:15 [0x20]", data: "0x01 0x20 {LEN} \"15:20:15\" 0xFE" },
	{ name: "Ax_r = 0.75 [0x25]", data: "0x01 0x25 {LEN} \"0.75\" 0xFE" },
	{ name: "Ay_r = 0.50 [0x26]", data: "0x01 0x26 {LEN} \"0.50\" 0xFE" },
	{ name: "Az_r = 0.25 [0x27]", data: "0x01 0x27 {LEN} \"0.25\" 0xFE" },
];

function macro_bytes(text) {
	const items = [];
	const re = /"([^"]*)"|(\{LEN\})|(\S+)/g;
	let m;
	while ((m = re.exec(text))) {
		if (m[1] !== undefined) {
			for (const ch of m[1]) {
				const c = ch.codePointAt(0);
				if (c > 255) {
					throw new Error("carácter fuera de Latin-1: " + ch);
				}
				items.push(c);
			}
		} else if (m[2]) {
			items.push(null);
		} else {
			const h = /^(?:0x)?([0-9a-f]{1,2})$/i.exec(m[3]);
			if (!h) {
				throw new Error("byte no válido: " + m[3]);
			}
			items.push(parseInt(h[1], 16));
		}
	}
	if (items.length > 255) {
		throw new Error("la trama pasa de 255 bytes");
	}
	return items.map(x => x === null ? items.length : x);
}

const hex_byte = b => b.toString(16).padStart(2, "0").toUpperCase();
const hex_text = bytes => Array.from(bytes, hex_byte).join(" ");

function console_part(part) {
	const out = el("pre", { class: "emu-term" });
	const input = el("input", { type: "text", autocomplete: "off", placeholder: "Enviar al puerto serie (Enter)" });
	const form = el("form", { class: "emu-termin" }, input, el("button", { type: "submit", class: "btn btn-outline" }, "Enviar"));
	const hex = el("input", { type: "checkbox" });
	const sel = el("select", { "aria-label": "Macro" });
	const send = el("button", { type: "button", class: "btn btn-outline" }, "Enviar macro");
	const rows = el("div", { class: "emu-macros" });
	const add = el("button", { type: "button", class: "emu-mini" }, "＋ Macro");
	const restore = el("button", { type: "button", class: "emu-mini" }, "Restaurar ejemplos");
	const macros = () => app.ui.macros;

	const fill_select = () => {
		const keep = sel.selectedIndex;
		sel.replaceChildren(...macros().map(m => el("option", {}, m.name || "(sin nombre)")));
		sel.selectedIndex = Math.min(Math.max(keep, 0), macros().length - 1);
		send.disabled = !macros().length;
	};
	const render_rows = () => {
		rows.replaceChildren();
		macros().forEach((m, i) => {
			const name = el("input", { type: "text", value: m.name, class: "emu-macro-name", "aria-label": "Nombre de la macro" });
			const data = el("input", { type: "text", value: m.data, class: "emu-macro-data", spellcheck: "false", "aria-label": "Bytes de la macro" });
			const prev = el("div", { class: "emu-sum" }, "");
			const del = el("button", { type: "button", class: "emu-mini", title: "Quitar macro" }, "✕");
			const preview = () => {
				try {
					prev.textContent = hex_text(macro_bytes(data.value));
					prev.classList.remove("bad");
				} catch (e) {
					prev.textContent = "⚠ " + e.message;
					prev.classList.add("bad");
				}
			};
			name.addEventListener("input", () => {
				m.name = name.value;
				fill_select();
				ui_save();
			});
			data.addEventListener("input", () => {
				m.data = data.value;
				preview();
				ui_save();
			});
			del.addEventListener("click", () => {
				macros().splice(i, 1);
				render_rows();
				fill_select();
				ui_save();
			});
			preview();
			rows.append(el("div", { class: "emu-macrorow" }, name, data, del, prev));
		});
	};
	const all = () => {
		render_rows();
		fill_select();
	};
	add.addEventListener("click", () => {
		macros().push({ name: "Nueva macro", data: "0x01 0x00 {LEN} 0xFE" });
		all();
		sel.selectedIndex = macros().length - 1;
		ui_save();
	});
	restore.addEventListener("click", () => {
		app.ui.macros = clone(DEFAULT_MACROS);
		all();
		ui_save();
	});
	send.addEventListener("click", () => {
		const m = macros()[sel.selectedIndex];
		if (!m || !app.cpu) {
			return;
		}
		try {
			const bytes = macro_bytes(m.data);
			app.cpu.uart_input(part.uart, new Uint8Array(bytes));
			log("Macro «" + m.name + "»: " + hex_text(bytes));
		} catch (e) {
			log("Macro «" + m.name + "»: " + e.message, "bad");
		}
	});
	document.addEventListener("emu-ui-load", all);
	all();

	$("emu-modules").append(el("section", { class: "card emu-card", "data-fixed": "console-" + part.uart, "data-kind": "console" },
		el("h3", {}, part.label),
		out,
		form,
		el("label", { class: "emu-check" }, hex, " Ver lo recibido en hexadecimal"),
		el("div", { class: "emu-cfgbar" }, sel, send),
		el("details", { class: "emu-log" }, el("summary", {}, "Editar macros"),
			el("p", { class: "emu-info" }, "Bytes en hex (0x01 o 01), texto entre comillas y {LEN} para la longitud total de la trama."),
			rows,
			el("div", { class: "emu-cfgbar" }, add, restore))));
	form.addEventListener("submit", e => {
		e.preventDefault();
		if (app.cpu) {
			app.cpu.uart_input(part.uart, new TextEncoder().encode(input.value + "\r"));
		}
		input.value = "";
	});
	const decoder = new TextDecoder();
	return {
		boot(cpu, emulator) {
			out.textContent = "";
			emulator.add_listener("cortex-m-uart" + part.uart, bytes => {
				const stick = out.scrollTop + out.clientHeight >= out.scrollHeight - 4;
				if (hex.checked) {
					out.append(Array.from(bytes, b => hex_byte(b) + (b === 0xfe ? "\n" : " ")).join(""));
				} else {
					out.append(decoder.decode(bytes, { stream: true }));
				}
				if (stick) {
					out.scrollTop = out.scrollHeight;
				}
			});
		},
	};
}

// ---- the configuration: what's connected ----

// what the "Guardar JSON" file holds: the wiring plus the page layout
function export_text() {
	return JSON.stringify({ mcu: app.board.mcu, parts: app.config.parts, layout: { w: app.ui.w, order: app.ui.order }, probes: app.ui.probes, macros: app.ui.macros }, null, "\t");
}

function config_text(pretty) {
	return JSON.stringify({ mcu: app.board.mcu, parts: app.config.parts }, null, pretty ? "\t" : 0);
}

function save_config() {
	try {
		localStorage.setItem(STORE_KEY, JSON.stringify({ preset: app.preset, parts: app.config.parts }));
	} catch (e) {
		// (storage may be off)
	}
}

function load_saved() {
	try {
		const s = JSON.parse(localStorage.getItem(STORE_KEY));
		if (s && Array.isArray(s.parts)) {
			return s;
		}
	} catch (e) {
		// (nothing saved, or damaged)
	}
	return null;
}

function unique_id(base) {
	const ids = new Set(app.config.parts.map(p => p.id));
	let id = base;
	for (let n = 2; ids.has(id); n++) {
		id = base + n;
	}
	return id;
}

function build_dynamic() {
	for (const c of $("emu-modules").querySelectorAll(":scope > [data-part]")) {
		c.remove();
	}
	for (const c of $("emu-chips").querySelectorAll("[data-dyn]")) {
		c.remove();
	}
	unmark_wires();
	for (const part of app.board.onboard || []) {
		mark_wires(part.label, { pin: part.pin });
	}
	app.dyn = scope();
	cur = app.dyn;
	const before = $("emu-chips").children.length;
	app.config.parts.forEach((part, index) => {
		const make = DYNAMIC[part.type];
		if (!make) {
			log("Módulo sin modelo en la web: " + part.type, "warn");
			return;
		}
		try {
			const w = make(part, index);
			if (w) {
				app.dyn.widgets.push(w);
			}
		} catch (e) {
			log("Módulo " + part.id + ": " + e.message, "bad");
		}
	});
	for (const c of [...$("emu-chips").children].slice(before)) {
		c.setAttribute("data-dyn", "");
	}
	cur = app.fixed;
	render_config();
}

function summary(part) {
	const bits = [];
	if (part.bus) {
		bits.push(String(part.bus).toUpperCase());
	}
	if (part.addr) {
		bits.push(part.addr);
	}
	const wires = wires_of(part);
	bits.push(Object.entries(wires).map(([s, p]) => (s === "pin" ? "" : s + " ") + p).join(", "));
	return bits.filter(Boolean).join(" · ");
}

function datalist(id, options) {
	let d = $(id);
	if (!d) {
		d = el("datalist", { id });
		root.append(d);
	}
	d.replaceChildren(...options.map(o => el("option", { value: o })));
	return id;
}

function pin_options(entry, part, signal) {
	if (entry.bus && signal !== "pin" && part.bus) {
		const valid = bus_options(entry.bus, part.bus, signal);
		if (valid.length) {
			return valid;
		}
	}
	return ALL_PINS;
}

function pin_input(part, entry, signal, form) {
	const list = datalist("emu-pins-" + (entry.bus || "gpio") + "-" + signal, pin_options(entry, part, signal));
	const current = signal === "pin" ? part.pin : (part.pins && part.pins[signal]) || "";
	const input = el("input", { type: "text", list, value: current || "", class: "emu-pin", "data-signal": signal, size: 5, autocomplete: "off", spellcheck: "false" });
	form.append(el("label", { class: "emu-field" }, signal === "pin" ? "Pin" : signal, input));
	return input;
}

function edit_form(index) {
	const part = app.config.parts[index];
	const entry = CATALOG[catalog_key(part)];
	const form = el("form", { class: "emu-form" });
	const id = el("input", { type: "text", value: part.id, size: 10 });
	form.append(el("label", { class: "emu-field" }, "Nombre", id));
	let bus = null;
	if (entry.bus) {
		bus = el("select", {});
		bus.append(el("option", { value: "" }, "automático"));
		for (let i = 1; i <= { spi: 6, i2c: 3, sdio: 1 }[entry.bus]; i++) {
			bus.append(el("option", { value: entry.bus + i }, (entry.bus + i).toUpperCase()));
		}
		bus.value = part.bus || "";
		form.append(el("label", { class: "emu-field" }, "Bus", bus));
	}
	const inputs = [];
	if (entry.pin) {
		inputs.push(pin_input(part, entry, "pin", form));
	}
	for (const s of entry.signals || []) {
		inputs.push(pin_input(part, entry, s, form));
	}
	if (bus) {
		// the pins that fit the bus
		bus.addEventListener("change", () => {
			const shown = { ...part, bus: bus.value };
			for (const i of inputs) {
				datalist(i.getAttribute("list"), pin_options(entry, shown, i.dataset.signal));
			}
		});
	}
	let addr = null;
	if (entry.addr) {
		addr = el("input", { type: "text", value: part.addr || entry.addr, size: 6 });
		form.append(el("label", { class: "emu-field" }, "Dirección I2C", addr));
	}
	let active = null;
	if (entry.active) {
		active = el("select", {}, el("option", { value: "high" }, "Nivel alto"), el("option", { value: "low" }, "Nivel bajo"));
		active.value = part.active || "high";
		form.append(el("label", { class: "emu-field" }, "Activo con", active));
	}
	let size = null;
	let cd_active = null;
	if (entry.card) {
		size = el("input", { type: "number", min: 1, max: 256, step: 1, value: part.size_mb || 16, size: 5 });
		form.append(el("label", { class: "emu-field" }, "Capacidad (MB)", size));
		cd_active = el("select", {}, el("option", { value: "low" }, "Detección con nivel bajo"), el("option", { value: "high" }, "Detección con nivel alto"));
		cd_active.value = part.cd_active || "low";
		form.append(el("label", { class: "emu-field" }, "Pin CD", cd_active));
	}
	let color = null;
	if (entry.color) {
		color = el("input", { type: "color", value: part.color || "#ef4444" });
		form.append(el("label", { class: "emu-field" }, "Color", color));
	}
	form.append(el("div", { class: "emu-formbtns" },
		el("button", { type: "submit", class: "btn" }, "Aplicar"),
		el("button", { type: "button", class: "btn btn-outline", "data-cancel": "" }, "Cancelar")));
	form.addEventListener("submit", e => {
		e.preventDefault();
		part.id = id.value.trim() || part.id;
		if (bus) {
			if (bus.value) {
				part.bus = bus.value;
			} else {
				delete part.bus;
			}
		}
		for (const i of inputs) {
			const v = i.value.trim().toUpperCase();
			if (!v && (entry.optional || []).includes(i.dataset.signal)) {
				if (part.pins) {
					delete part.pins[i.dataset.signal];
				}
			} else if (i.dataset.signal === "pin") {
				part.pin = v;
			} else {
				part.pins = { ...(part.pins || {}), [i.dataset.signal]: v };
			}
		}
		if (addr) {
			part.addr = addr.value.trim();
		}
		if (active) {
			part.active = active.value;
		}
		if (color) {
			part.color = color.value;
		}
		if (size) {
			part.size_mb = Math.min(256, Math.max(1, Math.round(Number(size.value)) || 16));
			part.cd_active = cd_active.value;
		}
		app.editing = -1;
		changed();
	});
	form.querySelector("[data-cancel]").addEventListener("click", () => {
		app.editing = -1;
		render_config();
	});
	return form;
}

function render_config() {
	const list = $("emu-partlist");
	list.replaceChildren();
	app.config.parts.forEach((part, index) => {
		const entry = CATALOG[catalog_key(part)];
		const msgs = app.wiring.get(part.id) || [];
		const row = el("li", { class: "emu-partrow" + (msgs.length ? " warn" : "") });
		const edit = el("button", { type: "button", class: "emu-mini", title: "Editar pines" }, "Editar");
		const del = el("button", { type: "button", class: "emu-mini", title: "Quitar" }, "✕");
		row.append(
			el("div", { class: "emu-partname" }, el("strong", {}, part.id), " ", el("span", { class: "emu-muted" }, entry ? entry.label : part.type)),
			el("div", { class: "emu-sum" }, summary(part)),
			el("div", { class: "emu-rowbtns" }, edit, del));
		for (const m of msgs) {
			row.append(el("div", { class: "emu-rowwarn" }, "⚠ " + m));
		}
		edit.addEventListener("click", () => {
			app.editing = app.editing === index ? -1 : index;
			render_config();
		});
		del.addEventListener("click", () => {
			app.config.parts.splice(index, 1);
			app.editing = -1;
			changed();
		});
		list.append(row);
		if (app.editing === index && entry) {
			list.append(el("li", { class: "emu-formrow" }, edit_form(index)));
		}
	});
	if (!app.config.parts.length) {
		list.append(el("li", { class: "emu-muted" }, "No hay ningún módulo conectado."));
	}
	$("emu-preset").value = app.preset;
}

function show_warnings(warnings) {
	const box = $("emu-warnings");
	box.replaceChildren();
	box.hidden = !warnings.length;
	if (warnings.length) {
		box.append(el("strong", {}, "Avisos del conexionado"));
		const ul = el("ul", {});
		for (const w of warnings) {
			ul.append(el("li", {}, w));
		}
		box.append(ul);
	}
}

// a change in what's connected: draw it again and start the machine anew
function changed(keep_preset) {
	if (!keep_preset) {
		app.preset = "custom";
	}
	save_config();
	build_dynamic();
	if (app.firmware) {
		log("Módulos cambiados: reinicio de la máquina");
		boot();
	}
}

function set_preset(id) {
	const p = (app.board.presets || []).find(x => x.id === id);
	if (!p) {
		return;
	}
	app.config.parts = clone(p.parts);
	app.preset = id;
	if (p.layout) {
		app.ui.w = clone(p.layout.w || {});
		app.ui.order = clone(p.layout.order || []);
		app.ui.probes = clone(p.probes || []);
		ui_save();
		document.dispatchEvent(new CustomEvent("emu-ui-load"));
	}
	app.editing = -1;
	changed(true);
}

function setup_config_card() {
	const presets = el("select", { id: "emu-preset" }, el("option", { value: "custom" }, "Personalizada"));
	for (const p of app.board.presets || []) {
		presets.append(el("option", { value: p.id }, p.name));
	}
	const add_type = el("select", { id: "emu-add-type" });
	for (const [k, v] of Object.entries(CATALOG)) {
		add_type.append(el("option", { value: k }, v.label));
	}
	const add = el("button", { type: "button", class: "btn btn-outline" }, "Añadir módulo");
	const exp = el("button", { type: "button", class: "btn btn-outline" }, "Guardar JSON");
	const file = el("input", { type: "file", accept: ".json,application/json", hidden: "" });
	const load = el("label", { class: "btn btn-outline" }, "Cargar JSON", file);
	const reset = el("button", { type: "button", class: "btn btn-outline" }, "Restablecer");
	const panel_el = el("details", { class: "card emu-card emu-panel", id: "emu-config", "data-panel": "config" },
		el("summary", {}, "Módulos conectados"),
		el("p", { class: "emu-info" }, "Elige qué hay conectado a la placa y a qué pines. Al cambiarlo, la máquina se reinicia con el nuevo conexionado."),
		el("div", { class: "emu-cfgbar" }, presets),
		el("ul", { class: "emu-parts", id: "emu-partlist" }),
		el("div", { class: "emu-cfgbar" }, add_type, add),
		el("div", { class: "emu-cfgbar" }, exp, load, reset),
		el("div", { class: "emu-warnbox", id: "emu-warnings", hidden: "" }));
	$("emu-addons").prepend(panel_el);
	panel(panel_el);
	presets.addEventListener("change", () => {
		if (presets.value !== "custom") {
			set_preset(presets.value);
		}
	});
	add.addEventListener("click", () => {
		const part = clone(CATALOG[add_type.value].defaults);
		part.id = unique_id(part.id);
		app.config.parts.push(part);
		app.editing = app.config.parts.length - 1;
		changed();
	});
	exp.addEventListener("click", () => {
		const blob = new Blob([export_text() + "\n"], { type: "application/json" });
		const a = el("a", { href: URL.createObjectURL(blob), download: "conexionado-" + BOARD_ID + ".json" });
		document.body.append(a);
		a.click();
		a.remove();
	});
	file.addEventListener("change", async () => {
		const f = file.files[0];
		file.value = "";
		if (!f) {
			return;
		}
		try {
			const j = JSON.parse(await f.text());
			const parts = Array.isArray(j) ? j : Array.isArray(j.parts) ? j.parts : j.config && j.config.parts;
			if (!Array.isArray(parts)) {
				throw new Error("falta la lista \"parts\"");
			}
			app.config.parts = clone(parts);
			if (!Array.isArray(j) && (j.layout || j.probes || j.macros)) {
				if (j.layout) {
					app.ui.w = j.layout.w || {};
					app.ui.order = Array.isArray(j.layout.order) ? j.layout.order : [];
				}
				if (Array.isArray(j.probes)) {
					app.ui.probes = j.probes;
				}
				if (Array.isArray(j.macros)) {
					app.ui.macros = j.macros.filter(valid_macro);
				}
				ui_save();
				document.dispatchEvent(new CustomEvent("emu-ui-load"));
			}
			app.editing = -1;
			log("Conexionado cargado de " + f.name + " (" + parts.length + " módulos)", "ok");
			changed();
		} catch (e) {
			log("No se pudo leer " + f.name + ": " + e.message, "bad");
			show_warnings(["No se pudo leer " + f.name + ": " + e.message]);
		}
	});
	reset.addEventListener("click", () => {
		app.ui.w = {};
		app.ui.order = [];
		app.ui.probes = [];
		ui_save();
		document.dispatchEvent(new CustomEvent("emu-ui-load"));
		const first = (app.board.presets || [])[0];
		if (first) {
			set_preset(first.id);
		}
	});
}

// ---- the machine ----

function boot() {
	const board = app.board;
	app.ready = false;
	app.last = null;
	app.wiring = new Map();
	set_state("Arrancando", "");
	document.dispatchEvent(new CustomEvent("emu-stop"));
	if (app.emulator) {
		app.emulator.destroy();
		app.emulator = null;
		app.cpu = null;
	}
	const emulator = new V86({
		arch: board.arch,
		wasm_path: BASE + board.wasm,
		bios: { buffer: app.firmware.slice(0) },
		// the modules wired to the board, for the machine
		spi_flash: { buffer: new TextEncoder().encode(config_text(false)).buffer },
		autostart: false,
		disable_keyboard: true,
		disable_mouse: true,
		disable_speaker: true,
	});
	app.emulator = emulator;
	emulator.add_listener("cortex-m-init-error", why => {
		app.ready = false;
		log("No se pudo crear la máquina: " + why, "bad");
		show_warnings([String(why)]);
		set_state("Error en la configuración", "bad");
	});
	emulator.add_listener("emulator-ready", () => {
		const cpu = emulator.v86.cpu;
		if (cpu.failed) {
			return;
		}
		app.cpu = cpu;
		for (const input of all_inputs()) {
			input.down = false;
			input.rest();
		}
		for (const w of all_widgets()) {
			if (w.boot) {
				w.boot(app.cpu, emulator);
			}
		}
		const warnings = cpu.board_warnings();
		show_warnings(warnings);
		for (const w of warnings) {
			log("Conexionado: " + w, "warn");
		}
		app.ready = true;
		app.started = performance.now();
		window.emu_app = app;
		document.dispatchEvent(new CustomEvent("emu-ready", { detail: app }));
		emulator.run();
		log("Máquina en marcha: " + board.mcu, "ok");
		set_state("En marcha", "ok");
	});
	emulator.add_listener("cortex-m-halted", () => {
		log("La CPU se ha parado (lockup): revisa el firmware", "bad");
		set_state("CPU parada", "bad");
	});
}

function load_firmware(buffer, name) {
	app.firmware = buffer;
	$("emu-fwname").textContent = name;
	$("emu-fwsize").textContent = (buffer.byteLength / 1024).toFixed(1) + " KB";
	log("Firmware: " + name + " (" + buffer.byteLength + " bytes)");
	boot();
}

// ---- refresh, keyboard and statistics ----

function frame() {
	if (app.ready) {
		for (const w of all_widgets()) {
			if (w.tick) {
				w.tick(app.cpu);
			}
		}
	}
	requestAnimationFrame(frame);
}

const typing = target => target instanceof Element && target.matches("input, textarea, select");

root.addEventListener("keydown", e => {
	const input = key_input(e.key.toLowerCase());
	if (!input || e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) {
		return;
	}
	e.preventDefault();
	input.set(true);
});
root.addEventListener("keyup", e => {
	const input = key_input(e.key.toLowerCase());
	if (input) {
		input.set(false);
	}
});
const release_all = () => all_inputs().forEach(i => i.set(false));
root.addEventListener("focusout", e => {
	if (!root.contains(e.relatedTarget)) {
		release_all();
	}
});
window.addEventListener("blur", release_all);

function clock_text(secs) {
	const pad = v => String(v).padStart(2, "0");
	return [Math.floor(secs / 3600), Math.floor(secs / 60) % 60, secs % 60].map(pad).join(":");
}

// what the firmware did with the wired pins, against the wiring
function check_wiring(cpu) {
	const map = new Map();
	for (const [part, message] of cpu.wiring_report()) {
		if (!map.has(part)) {
			map.set(part, []);
		}
		map.get(part).push(message);
	}
	if (JSON.stringify([...map]) !== JSON.stringify([...app.wiring])) {
		app.wiring = map;
		render_config();
	}
}

setInterval(() => {
	if (!app.ready) {
		return;
	}
	const cpu = app.cpu;
	const now = { t: performance.now(), c: cpu.get_instruction_counter(), m: cpu.wasm["cm_now_ms"]() };
	const prev = app.last;
	app.last = now;
	$("emu-uptime").textContent = clock_text(Math.round((now.t - app.started) / 1000));
	if (now.t - app.started > 2000) {
		check_wiring(cpu);
	}
	if (!prev) {
		return;
	}
	const dt = (now.t - prev.t) / 1000;
	$("emu-mips").textContent = (((now.c - prev.c) >>> 0) / dt / 1e6).toFixed(1) + " MIPS";
	const speed = (now.m - prev.m) / (now.t - prev.t);
	$("emu-speed").textContent = "×" + speed.toFixed(2);
	if (app.debug_halted) {
		set_state("Detenida por el depurador", "warn");
	} else if (document.hidden) {
		set_state("Pestaña en segundo plano", "warn");
	} else if (speed < 0.9) {
		set_state("Emulador lento", "warn");
	} else {
		set_state("En marcha", "ok");
	}
}, 1000);

// ---- start ----

async function main() {
	const board = app.board = await (await fetch(BOARD_URL + "board.json")).json();
	app.buses = await (await fetch(BASE + "buses.json")).json();
	const overlay = await load_svg(board);
	cur = app.fixed;
	for (const part of board.onboard || []) {
		try {
			const w = FIXED[part.type](part, overlay);
			if (w) {
				app.fixed.widgets.push(w);
			}
		} catch (e) {
			log("Pieza " + part.id + ": " + e.message, "bad");
		}
	}
	board.presets = [DEFAULT_PRESET].concat((board.presets || []).filter(p => p.id !== DEFAULT_PRESET.id));
	if (!app.ui.macros) {
		app.ui.macros = clone(DEFAULT_MACROS);
	}
	const saved = load_saved();
	const first = board.presets[0];
	if (saved) {
		app.config.parts = saved.parts;
		app.preset = saved.preset || "custom";
	} else if (first) {
		app.config.parts = clone(first.parts);
		app.preset = first.id;
	}
	let fresh = true;
	try {
		fresh = localStorage.getItem(UI_KEY) === null;
	} catch (e) {
		// (storage may be off)
	}
	if (fresh && first.layout) {
		app.ui.w = clone(first.layout.w || {});
		app.ui.order = clone(first.layout.order || []);
		app.ui.probes = clone(first.probes || []);
		ui_save();
	}
	setup_config_card();
	for (const d of root.querySelectorAll("details[data-panel]")) {
		panel(d);
	}
	for (const part of board.consoles || []) {
		app.fixed.widgets.push(console_part(part));
	}
	build_dynamic();
	$("emu-fw").addEventListener("change", async e => {
		const file = e.target.files[0];
		if (file) {
			load_firmware(await file.arrayBuffer(), file.name);
		}
		e.target.value = "";
	});
	$("emu-restart").addEventListener("click", () => {
		if (app.firmware) {
			log("Reinicio completo de la máquina");
			boot();
		}
	});
	requestAnimationFrame(frame);
	if (board.firmware) {
		try {
			const r = await fetch(BOARD_URL + board.firmware);
			if (!r.ok) {
				throw new Error("HTTP " + r.status);
			}
			load_firmware(await r.arrayBuffer(), board.firmware);
			return;
		} catch (e) {
			log("No hay firmware de demostración (" + e.message + ")", "warn");
		}
	}
	set_state("Carga un firmware", "warn");
}

window.emu_api = { app, $, el, log, clone, parse_pin, ui_save, panel, ALL_PINS };

main().catch(e => {
	log("Error: " + e.message, "bad");
	set_state("Error", "bad");
});
})();
