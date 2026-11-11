import ical from "node-ical";

const ICS_DEFECTO = "https://calendar.google.com/calendar/ical/c_7f1977e13f5ed4f84210c8d6ca4c8d35d7221b022cb02c20f70935043bac9414%40group.calendar.google.com/public/basic.ics";
const CURSOS_DEFECTO = "https://erp-app.aetel.org/custom/externalaccess/public/cursos_json.php";

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
	if (fFecha.format(s) === fFecha.format(e)) {
		return fFecha.format(s) + ", " + fHora.format(s) + " – " + fHora.format(e);
	}
	return fFecha.format(s) + " " + fHora.format(s) + " – " + fFecha.format(e) + " " + fHora.format(e);
}

// evento_id de Dolibarr -> curso/sesión.
async function cargarCursos() {
	const url = process.env.AETEL_CURSOS_URL || CURSOS_DEFECTO;
	const mapa = [];

	try {
		const ctl = new AbortController();
		const t = setTimeout(() => ctl.abort(), 15000);
		const r = await fetch(url, {
			signal: ctl.signal,
			headers: { Accept: "application/json" }
		});
		clearTimeout(t);

		if (!r.ok) {
			throw new Error("HTTP " + r.status);
		}

		const datos = await r.json();

		for (const c of datos.cursos || []) {
			if (c.evento_id) {
				mapa.push({
					evento: c.evento_id,
					ref: c.ref,
					nombre: c.nombre,
					sesion: 0,
					sesionNum: 0,
					horas: 0
				});
			}

			for (const s of c.sesiones || []) {
				if (s.evento_id) {
					mapa.push({
						evento: s.evento_id,
						ref: c.ref,
						nombre: c.nombre,
						sesion: s.id,
						sesionNum: s.orden,
						horas: s.horas || 0
					});
				}
			}
		}
	} catch (err) {
		console.warn("[calendario] no se pudieron leer los cursos:", err.message);
	}

	return mapa;
}

// El UID del ICS de Google es "<id>@google.com".
function buscarCurso(mapa, uid) {
	const id = String(uid || "").replace(/@google\.com$/i, "").toLowerCase();

	if (!id) {
		return null;
	}

	return mapa.find((m) => m.evento === id || m.evento.startsWith(id + "_")) || null;
}

function mapear(ev, s, e, mapa) {
	const title = txt(ev.summary).trim() || "Evento";
	const desc = plano(txt(ev.description));
	const allDay = ev.datetype === "date";
	const enlazado = buscarCurso(mapa, ev.uid);
	const m = RE_CURSO.exec(desc);

	let ref = "";
	let sesion = 0;

	if (enlazado) {
		ref = enlazado.ref;
		sesion = enlazado.sesion;
	} else if (m) {
		ref = m[1];
	}

	return {
		title,
		start: s.toISOString(),
		end: e.toISOString(),
		allDay,
		fechaTexto: textoFecha(s, e, allDay),
		location: txt(ev.location).trim(),
		description: desc.replace(RE_CURSO, "").trim(),
		isCurso: ref !== "",
		cursoNombre: enlazado ? enlazado.nombre : "",
		sesionNum: enlazado ? enlazado.sesionNum : 0,
		horas: enlazado ? enlazado.horas : 0,
		inscUrl: ref ? "/curso/?curso=" + ref + (sesion ? "&sesion=" + sesion : "") : ""
	};
}

export default async function () {
	const url = process.env.AETEL_ICS_URL || ICS_DEFECTO;
	let datos;

	try {
		datos = await ical.async.fromURL(url);
	} catch (err) {
		console.warn("[calendario] no se pudo leer el ICS:", err.message);
		return [];
	}

	const mapa = await cargarCursos();

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
			const excluidas = ev.exdate
				? Object.values(ev.exdate).map((d) => +new Date(d))
				: [];

			const desde = new Date(ahora.getTime() - dur);

			for (const d of ev.rrule.between(desde, limite, true)) {
				if (excluidas.includes(+d)) {
					continue;
				}

				out.push(mapear(ev, d, new Date(d.getTime() + dur), mapa));
			}
		} else if (e0 >= ahora && s0 <= limite) {
			out.push(mapear(ev, s0, e0, mapa));
		}
	}

	out.sort((a, b) => new Date(a.start) - new Date(b.start));

	return out.slice(0, MAX_EVENTOS);
};
