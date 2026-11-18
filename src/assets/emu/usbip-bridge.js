#!/usr/bin/env node
"use strict";
// Local bridge: a USB/IP server exporting one virtual CMSIS-DAP (HID) probe,
// whose reports go over a WebSocket to the emulator page.
//
//   node usbip-bridge.js [--usbip-port 3240] [--ws-port 3241] [--origin URL]...
//
// The page connects to ws://127.0.0.1:3241 (binary messages: one 64-byte DAP
// report each way; text messages: JSON control). Windows (usbip-win2):
//   usbip attach -r 127.0.0.1 -b 1-1
const net = require("net");
const http = require("http");
const crypto = require("crypto");
const { spawn } = require("child_process");

const VID = 0x0d28;
const PID = 0x0204;
const BUSID = "1-1";
const DEVID = 1 << 16 | 2;
const REPORT = Buffer.from([
	0x06, 0x00, 0xff, 0x09, 0x01, 0xa1, 0x01, 0x15, 0x00, 0x26, 0xff, 0x00, 0x75, 0x08,
	0x95, 0x40, 0x09, 0x01, 0x81, 0x02, 0x95, 0x40, 0x09, 0x01, 0x91, 0x02,
	0x95, 0x01, 0x09, 0x01, 0xb1, 0x02, 0xc0,
]);
const HID = Buffer.from([9, 0x21, 0x11, 0x01, 0, 1, 0x22, REPORT.length & 255, REPORT.length >> 8]);
const CONFIG = Buffer.concat([
	Buffer.from([9, 2, 0, 0, 1, 1, 0, 0x80, 50]),
	Buffer.from([9, 4, 0, 0, 2, 3, 0, 0, 0]),
	HID,
	Buffer.from([7, 5, 0x81, 3, 64, 0, 1]),
	Buffer.from([7, 5, 0x01, 3, 64, 0, 1]),
]);
CONFIG.writeUInt16LE(CONFIG.length, 2);
const DEVICE = Buffer.from([18, 1, 0, 2, 0, 0, 0, 64, VID & 255, VID >> 8, PID & 255, PID >> 8, 0, 1, 1, 2, 3, 1]);

function str(s) {
	const t = Buffer.from(s, "utf16le");
	return Buffer.concat([Buffer.from([2 + t.length, 3]), t]);
}

const STRINGS = [Buffer.from([4, 3, 9, 4]), str("AETEL"), str("AETEL CMSIS-DAP virtual"), str("AETEL000001")];

function device_struct() {
	const b = Buffer.alloc(312);
	b.write("/sys/devices/pci0000:00/0000:00:01.1/usb1/" + BUSID, 0);
	b.write(BUSID, 256);
	b.writeUInt32BE(1, 288);
	b.writeUInt32BE(2, 292);
	b.writeUInt32BE(2, 296);
	b.writeUInt16BE(VID, 300);
	b.writeUInt16BE(PID, 302);
	b.writeUInt16BE(0x0100, 304);
	b[309] = 1;
	b[310] = 1;
	b[311] = 1;
	return b;
}

function op_header(code, status) {
	const h = Buffer.alloc(8);
	h.writeUInt16BE(0x0111, 0);
	h.writeUInt16BE(code, 2);
	h.writeUInt32BE(status, 4);
	return h;
}

function parse_args(argv) {
	const o = { usbip_port: 3240, ws_port: 3241, origins: [], host: "127.0.0.1" };
	for (let i = 0; i < argv.length; i++) {
		const v = argv[i + 1];
		if (argv[i] === "--usbip-port") {
			o.usbip_port = +v;
			i++;
		} else if (argv[i] === "--ws-port") {
			o.ws_port = +v;
			i++;
		} else if (argv[i] === "--origin") {
			o.origins.push(v);
			i++;
		}
	}
	return o;
}

function frame(op, payload) {
	const n = payload.length;
	let h;
	if (n < 126) {
		h = Buffer.from([0x80 | op, n]);
	} else if (n < 65536) {
		h = Buffer.alloc(4);
		h[0] = 0x80 | op;
		h[1] = 126;
		h.writeUInt16BE(n, 2);
	} else {
		h = Buffer.alloc(10);
		h[0] = 0x80 | op;
		h[1] = 127;
		h.writeBigUInt64BE(BigInt(n), 2);
	}
	return Buffer.concat([h, payload]);
}

function start(opts) {
	const o = Object.assign(parse_args([]), opts);
	let page = null;
	let host = null;
	const inq = [];

	const say = (event, extra) => {
		if (page) {
			page.write(frame(1, Buffer.from(JSON.stringify(Object.assign({ event }, extra)))));
		}
	};

	const allowed = origin => {
		if (!origin) {
			return true;
		}
		try {
			const u = new URL(origin);
			return u.hostname === "localhost" || u.hostname === "127.0.0.1" || o.origins.includes(u.origin);
		} catch (e) {
			return false;
		}
	};

	const to_page = report => {
		if (page) {
			page.write(frame(2, report));
		} else {
			inq.push(Buffer.concat([Buffer.from([0xff]), Buffer.alloc(63)]));
			if (host) {
				host.flush();
			}
		}
	};

	function serve(sock) {
		let buf = Buffer.alloc(0);
		let urb = false;
		const pending = [];
		sock.setNoDelay(true);

		const ret_submit = (seq, status, actual, payload) => {
			const h = Buffer.alloc(48);
			h.writeUInt32BE(3, 0);
			h.writeUInt32BE(seq, 4);
			h.writeInt32BE(status, 20);
			h.writeInt32BE(actual, 24);
			h.writeInt32BE(-1, 32);
			sock.write(payload && payload.length ? Buffer.concat([h, payload]) : h);
		};

		const ret_unlink = (seq, status) => {
			const h = Buffer.alloc(48);
			h.writeUInt32BE(4, 0);
			h.writeUInt32BE(seq, 4);
			h.writeInt32BE(status, 20);
			sock.write(h);
		};

		const flush = () => {
			while (pending.length && inq.length) {
				const u = pending.shift();
				const d = inq.shift().subarray(0, u.len);
				ret_submit(u.seq, 0, d.length, d);
			}
		};

		const control = (seq, dir, len, data, setup) => {
			const t = setup[0];
			const r = setup[1];
			const v = setup.readUInt16LE(2);
			let out = null;
			if (t === 0x80 && r === 6) {
				const type = v >> 8;
				const idx = v & 255;
				out = type === 1 ? DEVICE : type === 2 ? CONFIG : type === 3 ? STRINGS[idx] || null : null;
			} else if (t === 0x81 && r === 6) {
				out = v >> 8 === 0x22 ? REPORT : v >> 8 === 0x21 ? HID : null;
			} else if (t === 0x00 && r === 9 || t === 0x01 && r === 11 || (t === 0x00 || t === 0x02) && (r === 1 || r === 3)) {
				out = Buffer.alloc(0);
			} else if (t === 0x80 && r === 8) {
				out = Buffer.from([1]);
			} else if ((t === 0x80 || t === 0x81 || t === 0x82) && r === 0) {
				out = Buffer.alloc(2);
			} else if (t === 0x21 && (r === 0x0a || r === 0x0b)) {
				out = Buffer.alloc(0);
			} else if (t === 0xa1 && r === 0x01) {
				out = inq.shift() || Buffer.alloc(64);
			} else if (t === 0xa1 && (r === 0x02 || r === 0x03)) {
				out = Buffer.from([r === 3 ? 1 : 0]);
			} else if (t === 0x21 && r === 0x09) {
				to_page(data);
				out = Buffer.alloc(0);
			}
			if (out === null) {
				return ret_submit(seq, -32, 0);
			}
			if (dir === 1) {
				const d = out.subarray(0, len);
				ret_submit(seq, 0, d.length, d);
			} else {
				ret_submit(seq, 0, data.length);
			}
		};

		const submit = (seq, dir, ep, len, data, setup) => {
			if (ep === 0) {
				return control(seq, dir, len, data, setup);
			}
			if (ep === 1 && dir === 0) {
				to_page(data);
				return ret_submit(seq, 0, data.length);
			}
			if (ep === 1 && dir === 1) {
				pending.push({ seq, len });
				return flush();
			}
			ret_submit(seq, -32, 0);
		};

		const pump = () => {
			for (;;) {
				if (!urb) {
					if (buf.length < 8) {
						return;
					}
					const code = buf.readUInt16BE(2);
					if (code === 0x8005) {
						buf = buf.subarray(8);
						const n = Buffer.alloc(4);
						n.writeUInt32BE(1);
						sock.write(Buffer.concat([op_header(0x0005, 0), n, device_struct(), Buffer.from([3, 0, 0, 0])]));
					} else if (code === 0x8003) {
						if (buf.length < 40) {
							return;
						}
						const id = buf.toString("latin1", 8, 40).replace(/\0.*$/, "");
						buf = buf.subarray(40);
						if (id !== BUSID) {
							sock.write(op_header(0x0003, 1));
							continue;
						}
						sock.write(Buffer.concat([op_header(0x0003, 0), device_struct()]));
						if (host && host.sock !== sock) {
							host.sock.destroy();
						}
						host = { sock, flush };
						urb = true;
						say("usbip", { attached: true });
					} else {
						sock.destroy();
						return;
					}
					continue;
				}
				if (buf.length < 48) {
					return;
				}
				const cmd = buf.readUInt32BE(0);
				const seq = buf.readUInt32BE(4);
				if (cmd === 1) {
					const dir = buf.readUInt32BE(12);
					const ep = buf.readUInt32BE(16);
					const len = buf.readUInt32BE(24);
					const total = 48 + (dir === 0 ? len : 0);
					if (buf.length < total) {
						return;
					}
					const setup = Buffer.from(buf.subarray(40, 48));
					const data = Buffer.from(buf.subarray(48, total));
					buf = buf.subarray(total);
					submit(seq, dir, ep, len, data, setup);
				} else if (cmd === 2) {
					const target = buf.readUInt32BE(20);
					buf = buf.subarray(48);
					const i = pending.findIndex(u => u.seq === target);
					if (i >= 0) {
						pending.splice(i, 1);
					}
					ret_unlink(seq, i >= 0 ? -104 : 0);
				} else {
					sock.destroy();
					return;
				}
			}
		};

		sock.on("data", d => {
			buf = Buffer.concat([buf, d]);
			pump();
		});
		sock.on("error", () => {});
		sock.on("close", () => {
			if (host && host.sock === sock) {
				host = null;
				inq.length = 0;
				say("usbip", { attached: false });
			}
		});
	}

	function run_attach() {
		const exe = process.env.USBIP || (process.platform === "win32" ? "C:\\Program Files\\USBip\\usbip.exe" : "usbip");
		let text = "";
		let p;
		try {
			p = spawn(exe, ["attach", "-r", "127.0.0.1", "-b", BUSID]);
		} catch (e) {
			return say("attach", { ok: false, message: String(e.message) });
		}
		p.stdout.on("data", d => text += d);
		p.stderr.on("data", d => text += d);
		p.on("error", e => say("attach", { ok: false, message: "No se pudo ejecutar " + exe + ": " + e.message }));
		p.on("close", code => say("attach", { ok: code === 0, message: text.trim() }));
	}

	const usbip = net.createServer(serve);
	const ws = http.createServer((q, r) => {
		r.writeHead(426);
		r.end("websocket only");
	});

	ws.on("upgrade", (req, sock) => {
		const key = req.headers["sec-websocket-key"];
		if (!key || !allowed(req.headers.origin)) {
			sock.end("HTTP/1.1 403 Forbidden\r\n\r\n");
			return;
		}
		const accept = crypto.createHash("sha1").update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11").digest("base64");
		sock.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + accept + "\r\n\r\n");
		if (page) {
			page.destroy();
		}
		page = sock;
		sock.setNoDelay(true);
		let buf = Buffer.alloc(0);
		say("hello", { attached: !!host });
		sock.on("data", d => {
			buf = Buffer.concat([buf, d]);
			for (;;) {
				if (buf.length < 2) {
					return;
				}
				const op = buf[0] & 15;
				const masked = buf[1] & 0x80;
				let len = buf[1] & 0x7f;
				let p = 2;
				if (len === 126) {
					if (buf.length < 4) {
						return;
					}
					len = buf.readUInt16BE(2);
					p = 4;
				} else if (len === 127) {
					if (buf.length < 10) {
						return;
					}
					len = Number(buf.readBigUInt64BE(2));
					p = 10;
				}
				const need = p + (masked ? 4 : 0) + len;
				if (buf.length < need) {
					return;
				}
				const payload = Buffer.from(buf.subarray(p + (masked ? 4 : 0), need));
				if (masked) {
					const m = buf.subarray(p, p + 4);
					for (let i = 0; i < payload.length; i++) {
						payload[i] ^= m[i & 3];
					}
				}
				buf = buf.subarray(need);
				if (op === 2) {
					inq.push(payload);
					if (host) {
						host.flush();
					}
				} else if (op === 1) {
					try {
						if (JSON.parse(payload.toString()).cmd === "attach") {
							run_attach();
						}
					} catch (e) {
						// ignore
					}
				} else if (op === 9) {
					sock.write(frame(10, payload));
				} else if (op === 8) {
					sock.end(frame(8, Buffer.alloc(0)));
					return;
				}
			}
		});
		sock.on("error", () => {});
		sock.on("close", () => {
			if (page === sock) {
				page = null;
			}
		});
	});

	return new Promise(resolve => {
		usbip.listen(o.usbip_port, o.host, () => ws.listen(o.ws_port, o.host, () => resolve({
			usbip_port: usbip.address().port,
			ws_port: ws.address().port,
			close() {
				usbip.close();
				ws.close();
				if (page) {
					page.destroy();
				}
				if (host) {
					host.sock.destroy();
				}
			},
		})));
	});
}

module.exports = { start };

if (require.main === module) {
	const o = parse_args(process.argv.slice(2));
	start(o).then(s => {
		console.log("USB/IP en 127.0.0.1:" + s.usbip_port + ", WebSocket en 127.0.0.1:" + s.ws_port);
		console.log("Windows: usbip attach -r 127.0.0.1 -b " + BUSID);
	});
}
