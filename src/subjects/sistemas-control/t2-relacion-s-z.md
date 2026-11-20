---
title: "De s a z: relación entre polos continuos y discretos"
asignatura: sistemas-control
tipo: herramienta
tema: Tema 2
orden: 35
resumen: "Muestrear un sistema lleva cada polo p de s a z = e^(pT): σ fija el módulo, ω el ángulo, y todo lo que ya sabes del plano s se traduce a muestras."
keywords: [z = e^(sT), mapeo s-z, polos continuos, polos discretos, módulo, fase, aliasing, Nyquist, periodo de muestreo, equivalente discreto, ZOH, Euler, oscilaciones ocultas]
---

Una sola idea sostiene todo el Tema 2: **muestrear es evaluar la exponencial**. Un polo continuo `p` genera el modo `e^(p·t)`. Si lo miras solo en `t = kT`:

<p class="eq">e^(p·kT) = ( e^(pT) )^k   ⇒   z = e^(pT)</p>

El polo discreto es la base de esa potencia. Todo lo demás son consecuencias.

## 1. Qué hace el mapeo con `p = σ ± jω`

<p class="eq">|z| = e^(σT)        ∠z = ωT</p>

- **σ (parte real) → módulo.** Cuánto se apaga la respuesta *por muestra*.
- **ω (parte imaginaria) → ángulo.** Cuánto gira por muestra.
- **T** convierte segundos en muestras. No cambia la forma de la respuesta, solo la escala de tiempo.

| Magnitud | Continuo | Discreto | Se cumple |
|---|---|---|---|
| Establecimiento | `t_s = π/\|σ\|` | `k_s = ⌈−π/ln\|z\|⌉` | `k_s·T ≈ t_s` |
| Periodo | `T_d = 2π/ω` | `k_d = 2π/∠z` | `k_d·T = T_d` |
| Pico | `t_p = π/ω` | `k_p = π/∠z` | `k_p·T = t_p` |
| Sobreimpulso | `M_p = e^(πσ/ω)` | `M_p = \|z\|^(π/∠z)` | **idénticos** |
| Estable | `σ < 0` | `\|z\| < 1` | |

El sobreimpulso no depende de `T`: `|z|^(π/∠z) = e^(σT·π/(ωT)) = e^(πσ/ω)`. La `T` se cancela.

## 2. Geometría: qué se convierte en qué

| En s | En z |
|---|---|
| Semiplano izquierdo | **Interior del círculo unidad** |
| Eje imaginario (`σ = 0`) | Círculo unidad |
| Recta vertical `σ = cte` | Círculo de radio `e^(σT)` |
| Recta horizontal `ω = cte` | Rayo con ángulo `ωT` |
| Eje real negativo | Eje real **positivo**, entre 0 y 1 |
| `s = 0` | `z = 1` |
| `σ → −∞` | `z = 0` (respuesta de un solo paso) |
| Polo doble (crítico) | Polo doble en `e^(σT)` |

Dos consecuencias que caen en examen:

- **Un polo real continuo nunca da un polo real negativo en z**, porque `e^(σT) > 0`. Los polos negativos en z salen de `ωT = π`: oscilación a la mitad de la frecuencia de muestreo, de **periodo 2 muestras**. Son las *oscilaciones ocultas* del ejercicio 6.
- **Si reduces T, los polos se pegan a `z = 1`.** El sistema es el mismo, pero hay más muestras por cada constante de tiempo y `k_s` sube.

## 3. Aliasing: la trampa de Nyquist

El ángulo `ωT` da vueltas completas sin darse cuenta:

<p class="eq">e^((σ + jω)T) = e^((σ + j(ω + 2π/T))T)</p>

Dos polos continuos con `ω` y `ω + 2π/T` producen **el mismo z**. El muestreo solo distingue `|ω| < π/T`. Si `ωT > π`, lo que ves en las muestras es una oscilación **más lenta** que la real. En la herramienta, la curva naranja (muestras) deja de seguir a la azul.

Regla práctica: para ver bien una oscilación necesitas varias muestras por periodo (`k_d` de al menos 8–10 es una referencia habitual). Con `k_d < 4` se deforma, y con `k_d = 2` solo queda el zig-zag.

## 4. Ejemplo resuelto con datos de los ejercicios

**Ejercicio 6.** Polo de la planta `s = −2`, `T = 0,05` s.

<p class="eq">z = e^(−2·0,05) = e^(−0,1) = 0,9048   ⇒   k_s = ⌈π/0,1⌉ = 32,   k_s·T = 1,6 s ≈ π/2 = 1,571 s</p>

Es el `0,9048` de `B₀G(z)`. Y la ganancia estática se conserva: `B₀G(1) = 0,2856/(1 − 0,9048) = 3 = G(0)`.

**Ejercicio 7 (a).** Polos `p = −π ± 2πj`, muestreados a `T = 0,1` s.

<p class="eq">|z| = e^(−0,1π) = 0,730,   ∠z = 0,2π = 0,628 rad</p>

<p class="eq">k_d = 2π/0,628 = 10,   k_p = π/0,628 = 5,   k_s = ⌈π/(0,1π)⌉ = 10,   M_p = 0,730⁵ = 20,8 %</p>

Todo coincide con lo continuo: `T_d = 1 s`, `t_p = 0,5 s`, `t_s = 1 s`, y el mismo 20,8 %.

## 5. Qué se conserva y qué no

- **Se conservan** los polos (vía `e^(pT)`) y, con ZOH, la ganancia estática.
- **No se conservan** los ceros: el equivalente con ZOH introduce ceros nuevos, así que la forma exacta de la respuesta cambia aunque los polos "viajen" bien.
- El equivalente con ZOH coincide con la continua **en los instantes de muestreo** (curva naranja de la herramienta), pero no entre ellos.

## 6. Errores típicos

1. **Euler:** `z = 1 + sT`. Aproxima `e^(sT)` solo con `|σT|` muy pequeño; con `σT = −0,5` da 0,5 en vez de 0,607.
2. **Usar `|p|` en vez de `σ`** para el módulo. El módulo de z depende solo de la parte real.
3. **Olvidar T:** `k_d = 2π/∠z` está en *muestras*; en segundos es `k_d·T`.
4. **Pensar que `T` cambia `M_p`.** No lo cambia; solo escala el tiempo.
5. **Convenciones de `t_s`.** El curso usa `π/|σ|` (≈ 4 %). En el ejercicio 5 aparece `L(0,05) ≈ −3`, que da `3/|σ|`. La diferencia es de un 5 %; sigue la que pida el enunciado.

## Herramienta

Mueve el polo en el plano s (con el ratón o los controles) y mira dónde cae en z. El panel de abajo compara la respuesta continua con sus muestras y calcula las magnitudes de las dos columnas de la tabla.

<div data-widget="mapa-sz"></div>

**Experimentos**
1. Fija `σ = −2`, `ω = 4` y baja `T`: el punto en z se pega a `z = 1` y `k_s` sube. `t_s` no cambia.
2. Sube `T` hasta que `π/T` quede por debajo de `ω`: aparece `¡alias!` y las muestras oscilan más lento que la curva real.
3. Sube `ω` con `T` fija: el ángulo en z crece, el módulo no.
4. Pon `ω = 0`: polo doble en s, polo doble en z sobre el eje real positivo.
5. Compara la fila de Euler con `|z|`: cuanto mayor es `|σT|`, peor aproxima.
