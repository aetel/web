---
title: "Guía de los ejercicios evaluables: qué significa cada fórmula"
asignatura: sistemas-control
tipo: apunte
tema: "Tema 2 · Ejercicios en grupo"
orden: 100
resumen: "Antes de resolver los cinco ejercicios: la idea detrás de la ganancia significativa, el tipo, el error en régimen permanente y los parámetros de la respuesta transitoria. Con el porqué de cada fórmula."
keywords: [guía, ganancia significativa, constante de error, tipo, error régimen permanente, polos, sobreimpulso, tiempo de establecimiento, EQD, bloqueador de orden cero, superposición, perturbación, receta, ejercicios evaluables]
refs:
  - { doc: resumen-t2, pagina: 4, texto: "Orden, tipo y ganancia significativa" }
  - { doc: resumen-t2, pagina: 5, texto: "Error y constantes de error" }
  - { doc: resumen-t2, pagina: 13, texto: "Parámetros de la respuesta subamortiguada" }
---

Este tema parece muchas fórmulas sueltas. En realidad son **dos preguntas** que se repiten:

1. **¿Dónde acaba la salida?** (régimen permanente, RP). Se responde con *ganancias* y *tipo*.
2. **¿Cómo llega hasta ahí?** (régimen transitorio). Se responde con los *polos*.

Todos los ejercicios del documento son una de estas dos preguntas, o una mezcla.

## 1. Régimen permanente: mirar el sistema "desde lejos"

Cuando pasa el tiempo suficiente, los términos transitorios (`e^(pt)`, `pᵏ`) se han apagado. Lo único que queda es lo que el sistema hace con una **señal que no cambia** (o que cambia a ritmo constante). Por eso en RP se puede sustituir cada bloque por **un número**: su ganancia.

- En continuo, "señal constante" es `s = 0`.
- En discreto, "secuencia constante" es `z = 1`.
- En ambos casos la ganancia buscada es **el valor de la FdeT en ese punto**: `G(0)` o `G(1)`.

<p class="eq">K₀[G] = G(γ),  con γ = 0 (continuo)  ó  γ = 1 (discreto)</p>

Un ejemplo que se usa en el ejercicio 1: el **bloqueador de orden cero** (ZOH) mantiene la entrada constante entre muestras. Con entrada constante, la planta acaba dando `G(0)·u`. Por tanto el equivalente discreto cumple `B₀G(1) = G(0)`. **Por eso "ganancia estática unitaria" significa `B₀G(1) = 1`.** El periodo de muestreo no cambia la ganancia; solo estira el eje del tiempo.

### Cuando hay integradores: el tipo

Un integrador (polo en `w = γ`) hace que la ganancia en `γ` sea infinita. Se saca ese polo fuera y se mira lo que queda:

<p class="eq">K_q[CA] = lím_{w→γ} (w−γ)^q · CA(w)</p>

- `q` es el **tipo**: cuántos polos hay exactamente en `w = γ`.
- `K_q` es la **ganancia significativa**: la ganancia que queda cuando se quita la parte infinita.
- A `K₀`, `K₁`, `K₂` también se les llama **constantes de error** `K_p`, `K_v`, `K_a`.

**Atención a la diferencia entre orden y tipo.** El orden es el total de polos. El tipo es solo los que están en `γ`.

## 2. El error en RP, explicado

El error es `e = r − c`. Con realimentación unitaria, `E = R / (1 + CA)`. Aplicando el teorema del valor final (continuo): `e(∞) = lím_{s→0} s·E(s)`.

**Escalón** `R = A/s`, tipo 0:

<p class="eq">e(∞) = A / (1 + K₀)</p>

Intuición: para que la planta dé salida hace falta error. Con `K₀` finito, la salida nunca llega a `A` porque, si lo hiciera, el error sería 0 y no habría señal para seguir empujando. El error se reparte: `K₀/(1+K₀)` sale, `1/(1+K₀)` queda.

**Rampa** de pendiente `A`, tipo 1: `e(∞) = A / K₁`.

Intuición: un integrador acumula error hasta que su salida sube a la misma velocidad que la rampa. Eso solo ocurre cuando el error **constante** es `A/K₁`.

| Tipo | Escalón | Rampa | Parábola |
|------|---------|-------|----------|
| 0 | 1/(1+K₀) | ∞ | ∞ |
| 1 | 0 | 1/K₁ | ∞ |
| 2 | 0 | 0 | 1/K₂ |

Cada integrador "sube un nivel" lo que el sistema puede seguir sin error: escalón → rampa → parábola.

### Ganancia del sistema completo (con H = 1)

<p class="eq">K₀[M] = K₀[CA] / (1 + K₀[CA])      (tipo 0)</p>

Si el tipo es 1 o más, `K₀[M] = 1`: el sistema acaba exactamente donde se le pide.

<div class="tip">Prueba la herramienta de <a href="../t2-error-regimen-permanente/">error en régimen permanente</a>: cambia de tipo y de entrada y fíjate en el error.</div>

## 3. Varios lazos y perturbaciones

- **Dos lazos**: reduce primero el de dentro, como un bloque con su ganancia, y después el de fuera.
- **Perturbaciones**: el sistema es lineal, así que se aplica **superposición**: salida = efecto de la referencia + efecto de la perturbación, cada uno con su FdeT. Si la perturbación **resta** a la salida, su efecto lleva signo negativo.
- Para una perturbación que entra a la salida, la FdeT hasta la salida es `1/(1+L)`, donde `L` es la cadena abierta. En RP vale `1/(1+K₀[L])`.

## 4. Régimen transitorio: qué dice un polo

Un polo `p` aporta una exponencial que se apaga a ritmo `p`:

- **Real** `p < 0`: sube suave, sin oscilar. `t_s ≈ 3/|p|` (en discreto `k_s = ⌈−3/ln|p|⌉`).
- **Complejo** `p = σ ± jω`: oscila.
  - `σ` (parte real) = **lo rápido que se apaga**: `t_s = π/|σ|`.
  - `ω` (parte imaginaria) = **lo rápido que oscila**: `T_d = 2π/ω`, `t_p = π/ω` (el primer pico es a media oscilación).
  - `M_p = e^(πσ/ω)`: la fracción que se pasa. Se obtiene evaluando la envolvente `e^(σt)` en `t_p`: `e^(σ·π/ω)`.

En discreto el polo se escribe en polar: `p = |p|·e^(±jφ)`.

- `|p|` hace de `σ`: cuánto se apaga **cada muestra**. Más pequeño es más rápido. Estable si `|p| < 1`.
- `φ` hace de `ω`: cuánto gira **cada muestra**. `k_d = 2π/φ`, `k_p = π/φ`, `M_p = |p|^(π/φ)`.
- Un polo en `z = 0` es un **retardo puro** de una muestra: desplaza la respuesta, sin cambiar su forma.

<div class="tip">Mueve un polo y mira el efecto: <a href="../t2-polos-continuos/">polos continuos</a>, <a href="../t2-polos-discretos/">polos discretos</a>.</div>

## 5. Receta: ¿qué hago con este enunciado?

| Si te piden… | Haz esto |
|--------------|----------|
| "ganancia significativa de la cadena abierta" | Cuenta polos en `γ` (tipo). Quítalos y evalúa en `γ`. |
| "ganancia del sistema" | `K₀[M] = CA/(1+CA)` en `γ` (tipo 0). |
| "error en RP" | Tipo + entrada → tabla. Sustituye `K`. |
| "rango de K" | Error ≤ límite → desigualdad en `K`. **Comprueba estabilidad.** |
| "salida en t = …" | Superposición: cada entrada con su retardo, cada una con su FdeT. |
| "obtén la FdeT desde la gráfica" | `c∞`, `t_p`, `M_p` → `σ`, `ω`, `K`. |
| "características de la respuesta" | Polos → `|p|`, `φ`. Fórmulas. Suma el retardo. |

## 6. Errores típicos

<div class="trap">
<ul>
<li>Calcular el error sin comprobar que el sistema es <b>estable</b>. Con ganancia grande el error teórico sale bajo, pero la salida real oscila o diverge.</li>
<li>Confundir <code>CA(1)</code> con <code>M(1)</code>. La primera es la de la cadena abierta; la segunda ya incluye la realimentación.</li>
<li>Olvidar el <b>retardo</b> (polo en <code>z=0</code>) al dar <code>k_p</code> y <code>k_s</code>.</li>
<li>Olvidar que <code>M_p</code> es un <b>porcentaje relativo a c(∞)</b>, no absoluto.</li>
<li>Usar <code>t_s</code> de la fórmula con un polo que no es el dominante.</li>
<li>Olvidar que la perturbación <b>resta</b> (o suma) según el enunciado.</li>
</ul>
</div>
