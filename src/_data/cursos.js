const URL_DEFECTO = "https://erp-app.aetel.org/custom/externalaccess/public/cursos_json.php";

let cache = null;

// Cursos con inscripción abierta, leídos de Dolibarr al construir la web.
// Si falla, el calendario sigue funcionando (los eventos "Curso…" enlazan a /curso/).
export default async function () {
	if (cache) {
		return cache;
	}
	const url = process.env.AETEL_CURSOS_URL || URL_DEFECTO;
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { Accept: "application/json" } });
		if (!res.ok) {
			throw new Error("HTTP " + res.status);
		}
		const data = await res.json();
		cache = Array.isArray(data.cursos) ? data.cursos : [];
	} catch (e) {
		console.warn("cursos: no se pudo leer " + url + " (" + e.message + ")");
		cache = [];
	}
	return cache;
}
