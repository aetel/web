"use strict";
// CMSIS-DAP v1 probe (SWD only) over an emulated SW-DP + AHB-AP + Cortex-M
// debug registers. Runs in the page and in Node (tests).
//
// Target interface (what the emulator provides):
//   read(addr, size) -> number | null     write(addr, size, value) -> bool
//   halted() halt() resume() step()
//   reg_get(n) -> number | null           reg_set(n, value) -> bool   (n: DCRSR numbering)
//   set_breakpoints(addrs)                reset()
//   config(debug_enabled, halt_on_reset)  take_reset() -> bool
//   cycles() -> number
(function (root, factory) {
	if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.Dap = factory();
	}
})(typeof self !== "undefined" ? self : this, function () {

const ACK_OK = 1;
const ACK_FAULT = 4;
const DPIDR = 0x2ba01477;
const AP_IDR = 0x24770011;
const ROM_BASE = 0xe00ff000;
const DBGMCU_IDCODE = 0x10016419;

const ROM = new Map([
	[0x000, 0xfff0f003], [0x004, 0xfff02003], [0x008, 0xfff03003], [0x00c, 0xfff01003],
	[0x010, 0xfff41003], [0x014, 0xfff42003], [0x018, 0],
	[0xfcc, 1], [0xfd0, 0], [0xfe0, 0xc4], [0xfe4, 0xb4], [0xfe8, 0x0b], [0xfec, 0],
	[0xff0, 0x0d], [0xff4, 0x10], [0xff8, 0x05], [0xffc, 0xb1],
]);

const u32 = (b, p) => (b[p] | b[p + 1] << 8 | b[p + 2] << 16 | b[p + 3] << 24) >>> 0;

function put32(b, p, v) {
	b[p] = v & 255;
	b[p + 1] = v >>> 8 & 255;
	b[p + 2] = v >>> 16 & 255;
	b[p + 3] = v >>> 24 & 255;
}

const ok = data => ({ ack: ACK_OK, data: data >>> 0 });
const fault = () => ({ ack: ACK_FAULT, data: 0 });

class Debug {
	constructor(target) {
		this.t = target;
		this.debugen = false;
		this.maskints = false;
		this.demcr = 0;
		this.dcrdr = 0;
		this.s_retire = false;
		this.s_reset = false;
		this.fp_en = false;
		this.fp = new Array(6).fill(0);
		this.dwt = new Map();
		this.mcu = new Map();
	}

	in_debug(a) {
		return a >= 0xe0001000 && a < 0xe0003000 || a >= 0xe000edf0 && a <= 0xe000edfc || a >= 0xe00ff000 && a < 0xe0100000 || a >= 0xe0042000 && a < 0xe0043000;
	}

	read(addr, size) {
		const a = addr >>> 0;
		if (!this.in_debug(a)) {
			return this.t.read(a, size);
		}
		const w = this.reg_read((a & ~3) >>> 0);
		if (size === 4 || w === null) {
			return w;
		}
		return (w >>> 8 * (a & 3)) & (size === 1 ? 0xff : 0xffff);
	}

	write(addr, size, value) {
		const a = addr >>> 0;
		if (!this.in_debug(a) && a !== 0xe000ed0c) {
			return this.t.write(a, size, value >>> 0);
		}
		let v = value >>> 0;
		if (size !== 4) {
			const old = this.reg_read((a & ~3) >>> 0) || 0;
			const sh = 8 * (a & 3);
			const mask = (size === 1 ? 0xff : 0xffff) << sh;
			v = ((old & ~mask) | (v << sh & mask)) >>> 0;
		}
		return this.reg_write((a & ~3) >>> 0, v);
	}

	reg_read(a) {
		if (a === 0xe000edf0) {
			this.poll_reset();
			const h = this.t.halted();
			const v = (this.debugen ? 1 : 0) | (h ? 2 : 0) | (this.maskints ? 8 : 0) | 1 << 16 | (h ? 1 << 17 : 0) | (this.s_retire ? 1 << 24 : 0) | (this.s_reset ? 1 << 25 : 0);
			this.s_retire = false;
			this.s_reset = false;
			return v >>> 0;
		}
		if (a === 0xe000edf4) {
			return 0;
		}
		if (a === 0xe000edf8) {
			return this.dcrdr;
		}
		if (a === 0xe000edfc) {
			return this.demcr;
		}
		if (a === 0xe0002000) {
			return 0x260 | (this.fp_en ? 1 : 0);
		}
		if (a >= 0xe0002008 && a < 0xe0002020) {
			return this.fp[a - 0xe0002008 >> 2] >>> 0;
		}
		if (a >= 0xe0002000 && a < 0xe0003000) {
			return 0;
		}
		if (a === 0xe0001000) {
			return ((this.dwt.get(a) || 0) & 0x0fffffff | 0x40000000) >>> 0;
		}
		if (a === 0xe0001004) {
			return this.t.cycles() >>> 0;
		}
		if (a >= 0xe0001000 && a < 0xe0002000) {
			return this.dwt.get(a) || 0;
		}
		if (a >= ROM_BASE && a < 0xe0100000) {
			return ROM.get(a - ROM_BASE) || 0;
		}
		if (a === 0xe0042000) {
			return DBGMCU_IDCODE;
		}
		return this.mcu.get(a) || 0;
	}

	reg_write(a, v) {
		if (a === 0xe000edf0) {
			this.dhcsr_write(v);
		} else if (a === 0xe000edf4) {
			if (this.t.halted()) {
				const n = v & 0x7f;
				if (v & 1 << 16) {
					this.t.reg_set(n, this.dcrdr);
				} else {
					this.dcrdr = (this.t.reg_get(n) || 0) >>> 0;
				}
			}
		} else if (a === 0xe000edf8) {
			this.dcrdr = v;
		} else if (a === 0xe000edfc) {
			this.demcr = v;
			this.t.config(this.debugen, !!(v & 1));
		} else if (a === 0xe000ed0c) {
			if (v >>> 16 === 0x05fa && v & 5) {
				this.reset();
				return true;
			}
			return this.t.write(a, 4, v);
		} else if (a === 0xe0002000) {
			if (v & 2) {
				this.fp_en = !!(v & 1);
				this.sync_breakpoints();
			}
		} else if (a >= 0xe0002008 && a < 0xe0002020) {
			this.fp[a - 0xe0002008 >> 2] = v;
			this.sync_breakpoints();
		} else if (a >= 0xe0001000 && a < 0xe0002000) {
			this.dwt.set(a, v);
		} else if (a >= 0xe0042000 && a < 0xe0043000) {
			this.mcu.set(a, v);
		}
		return true;
	}

	dhcsr_write(v) {
		if (v >>> 16 !== 0xa05f) {
			return;
		}
		const halt = !!(v & 2);
		const step = !!(v & 4);
		this.debugen = !!(v & 1);
		this.maskints = !!(v & 8);
		this.t.config(this.debugen, !!(this.demcr & 1));
		this.sync_breakpoints();
		if (!this.debugen) {
			if (this.t.halted()) {
				this.t.resume();
			}
			return;
		}
		if (halt) {
			if (!this.t.halted()) {
				this.t.halt();
			}
		} else if (this.t.halted()) {
			if (step) {
				this.t.step();
				this.s_retire = true;
			} else {
				this.t.resume();
			}
		}
	}

	sync_breakpoints() {
		const list = [];
		if (this.debugen && this.fp_en) {
			for (const c of this.fp) {
				if (!(c & 1)) {
					continue;
				}
				const a = (c & 0x1ffffffc) >>> 0;
				const r = c >>> 30;
				if (r === 1 || r === 3) {
					list.push(a);
				}
				if (r === 2 || r === 3) {
					list.push(a | 2);
				}
			}
		}
		this.t.set_breakpoints(list);
	}

	poll_reset() {
		if (this.t.take_reset()) {
			this.s_reset = true;
		}
	}

	reset() {
		this.t.config(this.debugen, !!(this.demcr & 1));
		this.t.reset();
		this.s_reset = true;
	}

	detach() {
		this.debugen = false;
		this.fp_en = false;
		this.t.config(false, false);
		this.t.set_breakpoints([]);
		if (this.t.halted()) {
			this.t.resume();
		}
	}
}

class Dap {
	constructor(target, info) {
		this.dbg = new Debug(target);
		this.info = Object.assign({ vendor: "AETEL", product: "CMSIS-DAP virtual", serial: "AETEL000001", fw: "1.10", product_fw: "1.0" }, info);
		this.nreset = true;
		this.connected = false;
		this.on_connect = null;
		this.match_mask = 0xffffffff;
		this.match_retry = 0;
		this.line_reset();
	}

	line_reset() {
		this.select = 0;
		this.ctrl = 0;
		this.sticky = false;
		this.csw = 0x03000042;
		this.tar = 0;
		this.rdbuff = 0;
	}

	xfer(req, data) {
		const ap = req & 1;
		const rd = req & 2;
		const a = req & 0xc;
		if (!ap) {
			return rd ? this.dp_read(a) : this.dp_write(a, data);
		}
		if (this.sticky) {
			return fault();
		}
		if (this.select >>> 24 !== 0) {
			return ok(0);
		}
		const reg = (this.select & 0xf0) | a;
		return rd ? this.ap_read(reg) : this.ap_write(reg, data);
	}

	dp_read(a) {
		if (a === 0) {
			return ok(DPIDR);
		}
		if (a === 4) {
			if (this.select & 0xf) {
				return ok(0);
			}
			const c = this.ctrl;
			const ack = (c >>> 28 & 1) << 29 | (c >>> 30 & 1) << 31 | (c >>> 26 & 1) << 27;
			return ok((c & 0x54000f0f | ack | (this.sticky ? 0x20 : 0)) >>> 0);
		}
		return ok(a === 8 ? this.select : this.rdbuff);
	}

	dp_write(a, v) {
		if (a === 0) {
			if (v & 4) {
				this.sticky = false;
			}
		} else if (a === 4) {
			this.ctrl = v;
		} else if (a === 8) {
			this.select = v;
		}
		return ok(0);
	}

	ap_read(reg) {
		switch (reg) {
		case 0x00: return ok(this.csw | 0x40);
		case 0x04: return ok(this.tar);
		case 0x0c: return this.drw_read();
		case 0x10: case 0x14: case 0x18: case 0x1c: return this.mem_read((this.tar & ~0xf) + (reg & 0xc), 4, 0);
		case 0xf8: return ok(ROM_BASE | 3);
		case 0xfc: return ok(AP_IDR);
		default: return ok(0);
		}
	}

	ap_write(reg, v) {
		switch (reg) {
		case 0x00: this.csw = v; break;
		case 0x04: this.tar = v >>> 0; break;
		case 0x0c: return this.drw_write(v);
		case 0x10: case 0x14: case 0x18: case 0x1c: return this.mem_write((this.tar & ~0xf) + (reg & 0xc), 4, v);
		default: break;
		}
		return ok(0);
	}

	size() {
		return 1 << Math.min(this.csw & 7, 2);
	}

	step_tar(sz) {
		if (this.csw >> 4 & 3) {
			this.tar = ((this.tar & 0xfffffc00) | (this.tar + sz & 0x3ff)) >>> 0;
		}
	}

	mem_read(addr, sz, lane) {
		const v = this.dbg.read(addr >>> 0, sz);
		if (v === null) {
			this.sticky = true;
			return fault();
		}
		this.rdbuff = (v << lane) >>> 0;
		return ok(this.rdbuff);
	}

	mem_write(addr, sz, v) {
		if (!this.dbg.write(addr >>> 0, sz, v)) {
			this.sticky = true;
			return fault();
		}
		return ok(0);
	}

	drw_read() {
		const sz = this.size();
		const r = this.mem_read(this.tar, sz, sz < 4 ? 8 * (this.tar & 3) : 0);
		if (r.ack === ACK_OK) {
			this.step_tar(sz);
		}
		return r;
	}

	drw_write(v) {
		const sz = this.size();
		const val = sz === 4 ? v : v >>> 8 * (this.tar & 3) & (sz === 1 ? 0xff : 0xffff);
		const r = this.mem_write(this.tar, sz, val);
		if (r.ack === ACK_OK) {
			this.step_tar(sz);
		}
		return r;
	}

	str(out, s) {
		if (!s) {
			out[1] = 0;
			return;
		}
		out[1] = s.length + 1;
		for (let i = 0; i < s.length; i++) {
			out[2 + i] = s.charCodeAt(i);
		}
	}

	cmd_info(req, out) {
		const i = this.info;
		switch (req[1]) {
		case 0x01: this.str(out, i.vendor); break;
		case 0x02: this.str(out, i.product); break;
		case 0x03: this.str(out, i.serial); break;
		case 0x04: this.str(out, i.fw); break;
		case 0x09: this.str(out, i.product_fw); break;
		case 0xf0: out[1] = 1; out[2] = 0x01; break;
		case 0xf1: out[1] = 4; put32(out, 2, 1000000); break;
		case 0xfd: out[1] = 4; break;
		case 0xfe: out[1] = 1; out[2] = 1; break;
		case 0xff: out[1] = 2; out[2] = 64; break;
		default: out[1] = 0;
		}
	}

	cmd_transfer(req, out) {
		const count = req[2];
		let p = 3;
		let q = 3;
		let done = 0;
		let ack = ACK_OK;
		for (; done < count; done++) {
			const r = req[p++];
			const rd = r & 2;
			let data = 0;
			if (!rd || r & 0x10) {
				data = u32(req, p);
				p += 4;
			}
			if (rd && r & 0x10) {
				let hit = false;
				for (let n = 0; n <= this.match_retry && !hit; n++) {
					const x = this.xfer(r, 0);
					if (x.ack !== ACK_OK) {
						ack = x.ack;
						break;
					}
					hit = (x.data & this.match_mask) >>> 0 === (data & this.match_mask) >>> 0;
				}
				if (ack !== ACK_OK) {
					break;
				}
				if (!hit) {
					ack = ACK_OK | 0x10;
					done++;
					break;
				}
			} else if (rd) {
				const x = this.xfer(r, 0);
				if (x.ack !== ACK_OK) {
					ack = x.ack;
					break;
				}
				if (q + 4 <= out.length) {
					put32(out, q, x.data);
					q += 4;
				}
			} else if (r & 0x20) {
				this.match_mask = data;
			} else {
				const x = this.xfer(r, data);
				if (x.ack !== ACK_OK) {
					ack = x.ack;
					break;
				}
			}
		}
		out[1] = done;
		out[2] = ack;
	}

	cmd_block(req, out) {
		const count = req[2] | req[3] << 8;
		const r = req[4];
		let p = 5;
		let q = 4;
		let done = 0;
		let ack = ACK_OK;
		for (; done < count; done++) {
			let x;
			if (r & 2) {
				x = this.xfer(r, 0);
				if (x.ack === ACK_OK && q + 4 <= out.length) {
					put32(out, q, x.data);
					q += 4;
				}
			} else {
				x = this.xfer(r, u32(req, p));
				p += 4;
			}
			if (x.ack !== ACK_OK) {
				ack = x.ack;
				break;
			}
		}
		out[1] = done & 255;
		out[2] = done >> 8;
		out[3] = ack;
	}

	cmd_sequence(req) {
		const bits = req[1] || 256;
		let run = 0;
		for (let i = 0; i < bits; i++) {
			if (req[2 + (i >> 3)] >> (i & 7) & 1) {
				if (++run === 50) {
					this.line_reset();
				}
			} else {
				run = 0;
			}
		}
	}

	cmd_pins(req, out) {
		const level = !!(req[1] & 0x80);
		if (req[2] & 0x80) {
			if (!level && this.nreset) {
				this.dbg.reset();
			}
			this.nreset = level;
		}
		out[1] = (this.nreset ? 0x80 : 0) | 3;
	}

	handle(req) {
		const out = new Uint8Array(64);
		const cmd = req[0];
		out[0] = cmd;
		switch (cmd) {
		case 0x00: this.cmd_info(req, out); break;
		case 0x01: break;
		case 0x02:
			out[1] = req[1] === 2 ? 0 : 1;
			if (out[1] && !this.connected) {
				this.connected = true;
				if (this.on_connect) {
					this.on_connect(true);
				}
			}
			break;
		case 0x03:
			this.dbg.detach();
			if (this.connected) {
				this.connected = false;
				if (this.on_connect) {
					this.on_connect(false);
				}
			}
			break;
		case 0x04: case 0x09: case 0x11: case 0x13: break;
		case 0x05: this.cmd_transfer(req, out); break;
		case 0x06: this.cmd_block(req, out); break;
		case 0x07: return null;
		case 0x08:
			if (u32(req, 2) & 4) {
				this.sticky = false;
			}
			break;
		case 0x0a: break;
		case 0x10: this.cmd_pins(req, out); break;
		case 0x12: this.cmd_sequence(req); break;
		case 0x14: case 0x15: case 0x16: case 0x17: case 0x18: case 0x19: case 0x1a: case 0x1b: case 0x1c: case 0x1d:
			out[1] = 0xff;
			break;
		default:
			out[0] = 0xff;
		}
		return out;
	}
}

return { Dap, Debug };
});
