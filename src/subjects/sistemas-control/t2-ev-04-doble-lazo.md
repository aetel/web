---
title: "Ejercicio 4: doble lazo con entrada rampa"
asignatura: sistemas-control
tipo: ejercicio
tema: "Tema 2 · Ejercicios en grupo"
orden: 140
resumen: "Un sistema con dos lazos y entrada rampa 2/s²: tipo, error del lazo externo y valores o pendientes de todas las señales en régimen permanente."
keywords: [ejercicio 4, doble lazo, dos lazos, rampa, tipo, integrador, error e1, pendiente, régimen permanente, ganancia significativa, a1, a2, v1, v2]
refs:
  - { doc: resumen-t2, pagina: 16, texto: "Ejercicios resueltos del tema" }
---

**Enunciado (resumen).** Entrada `R(s) = 2/s²`. Lazo externo: `E₁ = R − V₁`, integrador `1/s` hasta `A₁`. Lazo interno: `E₂ = A₁ − V₂`, bloque `1` hasta `A₂`, planta `2/(s+1)` hasta `C`. Realimentaciones: `V₂ = 1·C`, `V₁ = 2·C`. Se pide: (a) tipo, (b) `e₁(∞)`, (c) tabla con `a₁, a₂, c, v₁, v₂` (valor o pendiente).

## Qué te están preguntando

La idea de RP aplicada a un diagrama: **cada bloque se sustituye por su ganancia**, y cada señal es o bien una constante o bien una **rampa con una pendiente**. Hay que decidir cuál es cuál y calcular el número.

<details>
<summary>Solución paso a paso</summary>

**1. Reducir el lazo interno** (planta `2/(s+1)`, realimentación 1):

<p class="eq">M₂ = [2/(s+1)] / [1 + 2/(s+1)] = 2/(s+3),   K₀[M₂] = 2/3</p>

**2. Cadena abierta del lazo externo.** Integrador, lazo interno, realimentación `H₁ = 2`:

<p class="eq">CA = (1/s) · M₂ · 2 = 4 / (s(s+3))</p>

**(a) Tipo.** Hay **un** polo en `s = 0`, así que es **tipo 1**. (El `2` de la realimentación no cambia el tipo.)

**3. Constante de error.** `K₁ = lím s·CA = 4/3`.

**(b) Error del lazo externo.** Entrada rampa de pendiente `m = 2` y tipo 1:

<p class="eq">e₁(∞) = m / K₁ = 2 / (4/3) = 1,5 V</p>

Observa que `e₁ = r − v₁`, con `v₁ = 2c`. No es `r − c`.

**(c) Tabla.** Se parte de lo que se sabe y se propaga hacia atrás con las ganancias:

- `v₁ = r − e₁`: rampa de pendiente **2** (la de `r`, porque `e₁` es constante).
- `v₁ = 2c` ⇒ `c` es una rampa de pendiente **1**.
- `v₂ = 1·c` ⇒ pendiente **1**.
- `c = M₂(0)·a₁ = (2/3) a₁` ⇒ `a₁` tiene pendiente **1,5**. (Comprobación: la salida de un integrador con entrada constante `e₁ = 1,5` es una rampa de pendiente 1,5.)
- `a₂ = e₂ = a₁ − v₂` ⇒ pendiente `1,5 − 1 = ` **0,5**. (Comprobación: `c = 2·a₂` ⇒ `1 = 2·0,5`.)

| | a₁(∞) | a₂(∞) | c(∞) | v₁(∞) | v₂(∞) |
|---|---|---|---|---|---|
| **VALOR** | X | X | X | X | X |
| **Pendiente** | 1,5 | 0,5 | 1 | 2 | 1 |

Todas son rampas, así que no tienen un valor final: se rellena con **X** y se da la pendiente.

</details>

## Herramienta

Simula el sistema completo con entrada rampa. Compara las pendientes teóricas con las medidas en la simulación. Mantén los valores por defecto para ver el ejercicio.

<div data-widget="ej4-doble-lazo"></div>

**Qué comprobar**
- Con los valores por defecto: `e₁ = 1,5` y pendientes `1,5; 0,5; 1; 2; 1`.
- Sube `H₁`: `K₁` sube y `e₁` baja. La salida `c` tiene pendiente `m/H₁`.
- Con `H₁ = 1` (realimentación unitaria) `c` sigue a `r` con la misma pendiente.
- Cambia la vista a *lazo interno* o *externo* para ver menos señales.
