(function () {
"use strict";

const root = document.getElementById("emu");
if (!root || !window.Dap) {
	return;
}

const WS_URL = root.dataset.debugBridge || "ws://127.0.0.1:3241";
const state = { bridge: false, usbip: false, probe: false, halted: false, note: "" };
let dap = null;
let target = null;
let ws = null;

function el(tag, attrs, ...children) {
	const e = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs || {})) {
		e.setAttribute(k, v);
	}
	e.append(...children);
	return e;
}

function wasm_target(cpu) {
	const w = cpu.wasm;
	const bytes = list => new Uint8Array(new Uint32Array(list).buffer);
	return {
		read(a, s) {
			const v = w.cm_dbg_read(a, s);
			return w.cm_dbg_fault() ? null : v >>> 0;
		},
		write(a, s, v) {
			w.cm_dbg_write(a, s, v);
			return !w.cm_dbg_fault();
		},
		halted: () => w.cm_dbg_halted() !== 0,
		halt: () => w.cm_dbg_halt(),
		resume() {
			w.cm_dbg_resume();
			cpu.stop_idling();
		},
		step: () => w.cm_dbg_step(),
		reg_get(n) {
			const v = w.cm_dbg_reg_get(n);
			return w.cm_dbg_fault() ? null : v >>> 0;
		},
		reg_set(n, v) {
			w.cm_dbg_reg_set(n, v);
			return !w.cm_dbg_fault();
		},
		set_breakpoints(list) {
			const b = bytes(list);
			const p = w.cm_alloc(b.length + 4);
			new Uint8Array(cpu.wasm_memory.buffer, p, b.length).set(b);
			w.cm_dbg_set_breakpoints(p, list.length);
			w.cm_free(p, b.length + 4);
		},
		reset() {
			w.cm_dbg_reset();
			cpu.stop_idling();
		},
		config: (d, h) => w.cm_dbg_config(d ? 1 : 0, h ? 1 : 0),
		take_reset: () => w.cm_dbg_take_reset() !== 0,
		cycles: () => w.cm_instructions(),
	};
}

// ---- card ----

const dot = el("span", { class: "emu-state" }, "");
const detail = el("p", { class: "emu-info" }, "");
const attach = el("button", { type: "button", class: "btn btn-outline" }, "Conectar Keil (usbip attach)");
const card = el("details", { class: "card emu-card emu-panel", "data-panel": "debug" },
	el("summary", {}, "Depurador (Keil, CMSIS-DAP)"),
	dot,
	detail,
	attach,
	el("details", { class: "emu-log" },
		el("summary", {}, "Cómo conectar"),
		el("ol", { class: "emu-info" },
			el("li", {}, "Una sola vez: instala el controlador usbip-win2 y el puente (usbip-bridge)."),
			el("li", {}, "Arranca el puente y mantén esta página abierta."),
			el("li", {}, "Pulsa «Conectar Keil» (o ejecuta: usbip attach -r 127.0.0.1 -b 1-1)."),
			el("li", {}, "En Keil: Options for Target › Debug › Use: CMSIS-DAP Debugger. Debug › Start."))));
document.getElementById("emu-addons").prepend(card);
if (window.emu_api) {
	window.emu_api.panel(card);
}

function render() {
	let text;
	let kind;
	if (!state.bridge) {
		text = "Puente no encontrado";
		kind = "";
	} else if (state.probe) {
		text = state.halted ? "Keil conectado · CPU detenida" : "Keil conectado";
		kind = state.halted ? "warn" : "ok";
	} else if (state.usbip) {
		text = "Sonda USB/IP lista · Keil sin conectar";
		kind = "ok";
	} else {
		text = "Puente conectado · falta usbip attach";
		kind = "warn";
	}
	dot.textContent = text;
	dot.className = "emu-state " + kind;
	detail.textContent = state.note;
	attach.disabled = !state.bridge;
	if (window.emu_app) {
		window.emu_app.debug_halted = state.probe && state.halted;
	}
}

attach.addEventListener("click", () => {
	state.note = "Ejecutando usbip attach…";
	render();
	if (ws) {
		ws.send(JSON.stringify({ cmd: "attach" }));
	}
});

// ---- bridge ----

function connect() {
	if (ws) {
		return;
	}
	let sock;
	try {
		sock = new WebSocket(WS_URL);
	} catch (e) {
		setTimeout(connect, 5000);
		return;
	}
	ws = sock;
	sock.binaryType = "arraybuffer";
	sock.onopen = () => {
		state.bridge = true;
		render();
	};
	sock.onmessage = e => {
		if (typeof e.data === "string") {
			const m = JSON.parse(e.data);
			if (m.event === "usbip" || m.event === "hello") {
				state.usbip = !!m.attached;
				if (!m.attached) {
					state.probe = false;
				}
			} else if (m.event === "attach") {
				state.note = m.ok ? "" : "usbip attach ha fallado: " + m.message;
			}
			render();
			return;
		}
		const req = new Uint8Array(e.data);
		const out = dap ? dap.handle(req) : new Uint8Array([0xff]);
		if (out) {
			sock.send(out);
		}
	};
	sock.onclose = () => {
		ws = null;
		state.bridge = state.usbip = state.probe = false;
		render();
		setTimeout(connect, 5000);
	};
}

document.addEventListener("emu-ready", e => {
	const cpu = e.detail.cpu;
	if (!cpu.wasm.cm_dbg_halted) {
		state.note = "Este emulador no incluye el puerto de depuración.";
		render();
		return;
	}
	target = wasm_target(cpu);
	dap = new Dap.Dap(target);
	dap.on_connect = c => {
		state.probe = c;
		render();
	};
	render();
});

document.addEventListener("emu-stop", () => {
	dap = null;
	target = null;
	state.halted = false;
	render();
});

setInterval(() => {
	if (target) {
		const h = target.halted();
		if (h !== state.halted) {
			state.halted = h;
			render();
		}
	}
}, 250);

render();
connect();
})();
