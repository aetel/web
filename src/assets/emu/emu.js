(function () {
"use strict";

const root = document.getElementById("emu");
if (!root) {
	return;
}

const BASE = root.dataset.base || "/assets/emu/";
const BOARD_ID = root.dataset.board || "nucleo-f429zi";
const BOARD_URL = BASE + "boards/" + BOARD_ID + "/";
const NS = "http://www.w3.org/2000/svg";

const $ = id => document.getElementById(id);

const app = {
	board: null,
	emulator: null,
	cpu: null,
	ready: false,
	firmware: null,
	widgets: [],
	inputs: [],
	keys: new Map(),
	pin_els: new Map(),
	started: 0,
	last: null,
};

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
		} else if (k === "style") {
			e.setAttribute("style", v);
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
	const m = /^P([A-K])(\d{1,2})$/.exec(name);
	if (!m || +m[2] > 15) {
		throw new Error("pin no válido: " + name);
	}
	return { port: m[1].charCodeAt(0) - 65, pin: +m[2] };
}

// ---- pins the host drives (buttons, joystick) ----

function make_input(pin_name, active) {
	const { port, pin } = parse_pin(pin_name);
	const pressed = active === "low" ? 0 : 1;
	const input = {
		down: false,
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
		listeners: [],
	};
	app.inputs.push(input);
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
		const pin = app.pin_els.get(name);
		if (!pin) {
			continue;
		}
		pin.classList.add("emu-wired");
		const title = svg_el("title", {});
		title.textContent = name + " · " + label + " " + signal;
		pin.append(title);
		pins.push(pin);
	}
	return pins;
}

function wires_list(wires) {
	const list = el("p", { class: "emu-wires" });
	for (const [signal, name] of Object.entries(wires || {})) {
		list.append(el("span", {}, signal + " → " + name));
	}
	return list;
}

function card(part, ...body) {
	const pins = mark_wires(part.label, part.wires);
	const c = el("section", { class: "card emu-card", "data-part": part.id }, el("h3", {}, part.label));
	if (part.info) {
		c.append(el("p", { class: "emu-info" }, part.info));
	}
	c.append(...body);
	if (part.wires) {
		c.append(wires_list(part.wires));
	}
	const light = on => pins.forEach(p => p.classList.toggle("emu-hl", on));
	c.addEventListener("mouseenter", () => light(true));
	c.addEventListener("mouseleave", () => light(false));
	$("emu-addons").append(c);
	return c;
}

// ---- parts ----

const FACTORIES = {
	led(part, overlay) {
		const { port, pin } = parse_pin(part.pin);
		const low = part.active === "low";
		const [cx, cy] = part.at;
		const halo = svg_el("circle", { cx, cy, r: 5.5, fill: part.color, opacity: 0, "pointer-events": "none" });
		const dot = svg_el("circle", { cx, cy, r: 2.1, fill: part.color, opacity: 0, stroke: "#fff", "stroke-width": 0.3, "pointer-events": "none" });
		overlay.append(halo, dot);
		const lamp = el("i", { style: "--c:" + part.color });
		$("emu-chips").append(el("span", { class: "emu-chip" }, lamp, part.label));
		let shown = -1;
		return {
			tick(cpu) {
				const d = cpu.gpio_duty(port, pin);
				const v = low ? 1 - d : d;
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
			app.keys.set(part.key.toLowerCase(), input);
		}
		return {};
	},

	display(part) {
		const canvas = el("canvas", { class: "emu-lcd", width: part.w, height: part.h });
		card(part, el("div", { class: "emu-bezel" }, canvas));
		const ctx = canvas.getContext("2d");
		const image = ctx.createImageData(part.w, part.h);
		let seen = -1;
		return {
			tick(cpu) {
				const d = cpu.display(seen);
				if (d.frame === seen) {
					return;
				}
				seen = d.frame;
				if (d.frame === 0) {
					ctx.fillStyle = "#1d241d";
					ctx.fillRect(0, 0, part.w, part.h);
				} else if (d.pixels && d.width === part.w && d.height === part.h) {
					image.data.set(d.pixels);
					ctx.putImageData(image, 0, 0);
				}
			},
		};
	},

	rgb_led(part) {
		const pins = {};
		for (const c of ["R", "G", "B"]) {
			pins[c] = parse_pin(part.wires[c]);
		}
		const low = part.active === "low";
		const lamp = el("div", { class: "emu-rgb" });
		const bars = {};
		const row = el("div", { class: "emu-rgbvals" });
		for (const c of ["R", "G", "B"]) {
			bars[c] = el("b", {}, "0 %");
			row.append(el("span", {}, c + " ", bars[c]));
		}
		card(part, lamp, row);
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
					bars[c].textContent = Math.round(v[c] * 100) + " %";
				}
			},
		};
	},

	joystick(part) {
		const grid = el("div", { class: "emu-dpad" });
		const layout = { UP: "u", LEFT: "l", CENTER: "c", RIGHT: "r", DOWN: "d" };
		const glyph = { UP: "▲", LEFT: "◀", CENTER: "●", RIGHT: "▶", DOWN: "▼" };
		for (const dir of ["UP", "LEFT", "CENTER", "RIGHT", "DOWN"]) {
			const input = make_input(part.wires[dir], part.active);
			const b = el("button", { type: "button", class: "emu-dir emu-dir-" + layout[dir], "aria-label": dir }, glyph[dir]);
			bind_press(b, input);
			grid.append(b);
			const key = part.keys && part.keys[dir];
			if (key) {
				app.keys.set(key.toLowerCase(), input);
			}
		}
		card(part, grid);
		return {};
	},

	temp_sensor(part) {
		const out = el("b", {}, "");
		const slider = el("input", { type: "range", min: part.min, max: part.max, step: part.step, value: part.value });
		const apply = () => {
			out.textContent = Number(slider.value).toFixed(3).replace(/0$/, "") + " °C";
			if (app.cpu) {
				app.cpu.sensor_set(part.sensor, Number(slider.value));
			}
		};
		slider.addEventListener("input", apply);
		card(part, el("label", { class: "emu-label" }, "Temperatura ", out, slider));
		apply();
		return { boot: apply };
	},

	power_monitor(part) {
		const volts = el("input", { type: "range", min: 0, max: 36, step: 0.05, value: part.bus_v });
		const amps = el("input", { type: "range", min: -1000, max: 1000, step: 1, value: part.current_ma });
		const shunt = el("input", { type: "number", min: 1, max: 1000, step: 1, value: part.shunt_mohm, class: "emu-num" });
		const v_out = el("b", {}, "");
		const i_out = el("b", {}, "");
		const s_out = el("b", {}, "");
		const warn = el("p", { class: "emu-warn", hidden: "" }, "");
		const apply = () => {
			const v = Number(volts.value);
			const i = Number(amps.value);
			const r = Math.max(1, Number(shunt.value) || 1);
			v_out.textContent = v.toFixed(2) + " V";
			i_out.textContent = i + " mA";
			const mv = i * r / 1000;
			s_out.textContent = mv.toFixed(3) + " mV";
			warn.hidden = Math.abs(mv) <= 81.92;
			warn.textContent = "El INA226 satura con ±81,92 mV en el shunt: reduce la corriente o la resistencia.";
			if (app.cpu) {
				app.cpu.sensor_set(1, v);
				app.cpu.sensor_set(2, i);
				app.cpu.sensor_set(3, r);
			}
		};
		for (const e of [volts, amps, shunt]) {
			e.addEventListener("input", apply);
		}
		card(part,
			el("label", { class: "emu-label" }, "Tensión del bus ", v_out, volts),
			el("label", { class: "emu-label" }, "Corriente ", i_out, amps),
			el("label", { class: "emu-label" }, "Shunt (mΩ) ", shunt),
			el("p", { class: "emu-read" }, "Tensión en el shunt: ", s_out),
			warn);
		apply();
		return { boot: apply };
	},
};

function console_part(part) {
	const out = el("pre", { class: "emu-term" });
	const input = el("input", { type: "text", autocomplete: "off", placeholder: "Enviar al puerto serie (Enter)" });
	const form = el("form", { class: "emu-termin" }, input, el("button", { type: "submit", class: "btn btn-outline" }, "Enviar"));
	card({ id: part.id, label: part.label }, out, form);
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
				out.append(decoder.decode(bytes, { stream: true }));
				if (stick) {
					out.scrollTop = out.scrollHeight;
				}
			});
		},
	};
}

// ---- the machine ----

function boot() {
	const board = app.board;
	app.ready = false;
	app.last = null;
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
		autostart: false,
		disable_keyboard: true,
		disable_mouse: true,
		disable_speaker: true,
	});
	app.emulator = emulator;
	emulator.add_listener("emulator-ready", () => {
		app.cpu = emulator.v86.cpu;
		for (const input of app.inputs) {
			input.down = false;
			input.rest();
		}
		for (const w of app.widgets) {
			if (w.boot) {
				w.boot(app.cpu, emulator);
			}
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
		for (const w of app.widgets) {
			if (w.tick) {
				w.tick(app.cpu);
			}
		}
	}
	requestAnimationFrame(frame);
}

function typing(target) {
	return target instanceof Element && target.matches("input, textarea, select");
}

root.addEventListener("keydown", e => {
	const input = app.keys.get(e.key.toLowerCase());
	if (!input || e.repeat || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) {
		return;
	}
	e.preventDefault();
	input.set(true);
});
root.addEventListener("keyup", e => {
	const input = app.keys.get(e.key.toLowerCase());
	if (input) {
		input.set(false);
	}
});
const release_all = () => app.inputs.forEach(i => i.set(false));
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

setInterval(() => {
	if (!app.ready) {
		return;
	}
	const cpu = app.cpu;
	const now = { t: performance.now(), c: cpu.get_instruction_counter(), m: cpu.wasm["cm_now_ms"]() };
	const prev = app.last;
	app.last = now;
	$("emu-uptime").textContent = clock_text(Math.round((now.t - app.started) / 1000));
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
	const overlay = await load_svg(board);
	const make = (part, factory, ...args) => {
		try {
			const w = factory(part, ...args);
			if (w) {
				app.widgets.push(w);
			}
		} catch (e) {
			log("Pieza " + part.id + ": " + e.message, "bad");
		}
	};
	for (const part of board.onboard || []) {
		make(part, FACTORIES[part.type], overlay);
	}
	for (const part of board.addons || []) {
		if (FACTORIES[part.type]) {
			make(part, FACTORIES[part.type], overlay);
		} else {
			log("Módulo sin modelo: " + part.type, "warn");
		}
	}
	for (const part of board.consoles || []) {
		make(part, console_part);
	}
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

main().catch(e => {
	log("Error: " + e.message, "bad");
	set_state("Error", "bad");
});
})();
