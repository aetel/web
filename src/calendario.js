const ical = require("node-ical");

const ICS_DEFECTO = "https://calendar.google.com/calendar/ical/c_7f1977e13f5ed4f84210c8d6ca4c8d35d7221b022cb02c20f70935043bac9414%40group.calendar.google.com/public/basic.ics";

const ZONA = "Europe/Madrid";
const MESES_VENTANA = 12;
const MAX_EVENTOS = 60;

const plano = (s) => s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
const RE_CURSO = /^\s*curso\s*:\s*([a-z0-9-]+)\s*$/im;

const txt = (v) => {
	if (v && typeof v === "object" && "val" in v) {
		return String(v.val || "");
	}
	return v ? String(v) : "";
};

const fFecha = new Intl.DateTimeFormat("es-ES", {
	weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: ZONA
});
const fHora = new Intl.DateTimeFormat("es-ES", {
	hour: "2-digit", minute: "2-digit", timeZone: ZONA
});

function mediodiaLocal(d) {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
}

function textoFecha(s, e, allDay) {
	if (allDay) {
		const ini = mediodiaLocal(s);
		const fin = new Date(mediodiaLocal(e).getTime() - 86400000);
		if (fin <= ini) {
			return fFecha.format(ini);
		}
		return fFecha.format(ini) + " – " + fFecha.format(fin);
	}
	const mismoDia = fFecha.format(s) === fFecha.format(e);
	if (mismoDia) {
		return fFecha.format(s) + ", " + fHora.format(s) + " – " + fHora.format(e);
	}
	return fFecha.format(s) + " " + fHora.format(s) + " – " + fFecha.format(e) + " " + fHora.format(e);
}

function mapear(ev, s, e) {
	const title = txt(ev.summary).trim() || "Evento";
	const desc = plano(txt(ev.description));
	const m = RE_CURSO.exec(desc);
	const allDay = ev.datetype === "date";
	return {
		title,
		start: s.toISOString(),
		end: e.toISOString(),
		allDay,
		fechaTexto: textoFecha(s, e, allDay),
		location: txt(ev.location).trim(),
		description: desc.replace(RE_CURSO, "").trim(),
		isCurso: /^curso\b/i.test(title),
		cursoUrl: m ? "/curso/?curso=" + m[1] : "/curso/"
	};
}

module.exports = async function () {
	const url = process.env.AETEL_ICS_URL || ICS_DEFECTO;
	let datos;
	try {
		datos = await ical.async.fromURL(url);
	} catch (err) {
		console.warn("[calendario] no se pudo leer el ICS:", err.message);
		return [];
	}

	const ahora = new Date();
	const limite = new Date(ahora);
	limite.setMonth(limite.getMonth() + MESES_VENTANA);

	const out = [];
	for (const ev of Object.values(datos)) {
		if (ev.type !== "VEVENT" || !ev.start || ev.status === "CANCELLED") {
			continue;
		}
		const s0 = new Date(ev.start);
		const e0 = ev.end ? new Date(ev.end) : new Date(s0);
		const dur = e0 - s0;

		if (ev.rrule) {
			const excluidas = ev.exdate ? Object.values(ev.exdate).map((d) => +new Date(d)) : [];
			const desde = new Date(ahora.getTime() - dur);
			for (const d of ev.rrule.between(desde, limite, true)) {
				if (excluidas.includes(+d)) {
					continue;
				}
				out.push(mapear(ev, d, new Date(d.getTime() + dur)));
			}
		} else if (e0 >= ahora && s0 <= limite) {
			out.push(mapear(ev, s0, e0));
		}
	}

	out.sort((a, b) => new Date(a.start) - new Date(b.start));
	return out.slice(0, MAX_EVENTOS);
};
