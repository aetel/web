import ical from "node-ical";
import cursos from "./cursos.js";

const ICS_DEFECTO = "https://calendar.google.com/calendar/ical/c_7f1977e13f5ed4f84210c8d6ca4c8d35d7221b022cb02c20f70935043bac9414%40group.calendar.google.com/public/basic.ics";
const DIAS_VISTA = 180;
const TZ = "Europe/Madrid";

const plano = (s) => s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
const RE_CURSO = /^\s*curso\s*:\s*([a-z0-9-]+)\s*$/im;
const txt = (v) => (v && typeof v === "object" ? v.val : v) || "";

const fmtFecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "full", timeZone: TZ });
const fmtFechaHora = new Intl.DateTimeFormat("es-ES", { dateStyle: "full", timeStyle: "short", timeZone: TZ });
const fmtHora = new Intl.DateTimeFormat("es-ES", { timeStyle: "short", timeZone: TZ });

function fechaTexto(s, e, todoElDia) {
	if (todoElDia) {
		const ultimo = new Date(e.getTime() - 864e5);
		return ultimo > s ? fmtFecha.format(s) + " – " + fmtFecha.format(ultimo) : fmtFecha.format(s);
	}
	if (fmtFecha.format(s) === fmtFecha.format(e)) {
		return fmtFechaHora.format(s) + " – " + fmtHora.format(e);
	}
	return fmtFechaHora.format(s) + " – " + fmtFechaHora.format(e);
}

export default async function () {
	const url = process.env.AETEL_ICS_URL || ICS_DEFECTO;

	// Si el calendario no se puede leer, la construcción falla a propósito:
	// así la web publicada antes se mantiene en lugar de quedarse vacía.
	const data = await ical.async.fromURL(url);
	const listaCursos = await cursos();

	const ahora = new Date();
	const limite = new Date(ahora.getTime() + DIAS_VISTA * 864e5);
	const out = [];

	for (const ev of Object.values(data)) {
		if (ev.type !== "VEVENT" || !ev.start) {
			continue;
		}
		const fin = ev.end || ev.start;
		const dur = fin - ev.start;
		const inicios = ev.rrule ? ev.rrule.between(ahora, limite, true) : [ev.start];

		for (const s of inicios) {
			if (ev.exdate && ev.exdate[s.toISOString().slice(0, 10)]) {
				continue;
			}
			const e = new Date(s.getTime() + dur);
			if (e < ahora || s > limite) {
				continue;
			}
			const title = txt(ev.summary).trim();
			const desc = plano(txt(ev.description));
			const m = RE_CURSO.exec(desc);
			const uid = String(ev.uid || "").split("@")[0].toLowerCase();
			const curso = listaCursos.find((c) => c.evento_id && c.evento_id.toLowerCase() === uid);
			const ref = curso ? curso.ref : (m ? m[1] : "");
			const todoElDia = ev.datetype === "date";

			out.push({
				title,
				start: s.toISOString(),
				end: e.toISOString(),
				allDay: todoElDia,
				fechaTexto: fechaTexto(s, e, todoElDia),
				location: txt(ev.location),
				description: desc.replace(RE_CURSO, "").trim(),
				isCurso: Boolean(curso || m || /^curso\b/i.test(title)),
				cursoNombre: curso ? curso.nombre : "",
				cursoUrl: ref ? "/curso/?curso=" + encodeURIComponent(ref) : "/curso/"
			});
		}
	}
	return out.sort((a, b) => a.start.localeCompare(b.start));
}
