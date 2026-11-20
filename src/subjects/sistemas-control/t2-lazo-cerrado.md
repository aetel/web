---
title: "Monta tu lazo: regulador, actuador, planta y sensor"
asignatura: sistemas-control
tipo: herramienta
tema: Tema 2
orden: 38
resumen: "Construye un sistema realimentado con cajas, en continuo o discreto, y mira polos, tₛ, Mₚ, tₚ y errores en régimen permanente al instante."
keywords: [lazo cerrado, diagrama de bloques, regulador, PI, planta, sensor, actuador, ZOH, polos, estabilidad, error, tiempo de establecimiento, sobreimpulso, discreto]
---

Hasta ahora has mirado un polo suelto. Aquí montas el sistema entero y ves qué pasa con sus polos cuando cierras el lazo.

El lazo tiene cuatro cajas: **regulador** `F`, **actuador** `A`, **planta** `G` y **sensor** `H` en la realimentación. La función de transferencia de lazo cerrado es:

<p class="eq">M = F·A·G / (1 + F·A·G·H)</p>

Sus **polos** son las raíces de `1 + F·A·G·H = 0`. Todo lo demás (estabilidad, `t_s`, `M_p`, `t_p`) sale de ellos, con las fórmulas de las páginas anteriores.

## Cómo se pasa a discreto

- La planta y el actuador (continuos) se discretizan juntos con **ZOH** a periodo `T`. Es el mismo `B₀G(z)` que se calcula en los ejercicios.
- El regulador se escribe directamente en z. El PI usa integración hacia atrás: `K·((1 + T/Tᵢ)·z − 1)/(z − 1)`.
- El **retardo** de `d` muestras es `z⁻ᵈ`: añade `d` polos en `z = 0` al lazo.
- En discreto, `t_s`, `t_p` y el resto se leen en muestras y se pasan a segundos con `·T`.

## Herramienta

Elige un ejemplo precargado o monta el tuyo. Cambia cualquier caja y todo se recalcula.

<div data-widget="lazo-cerrado"></div>

## Ejemplos para empezar

1. **Ej. 6 (a), continuo.** Tanque con `F = 2`: error `1/(1 + 3·2) = 14,3 %` sin la fuga. Sube `K` y el error baja, pero no llega a cero: el sistema es de tipo 0.
2. **Ej. 6 (b-c), discreto.** `T = 50 ms`, `K = 6,34`: el polo cae en `z ≈ −0,905` y la respuesta hace zig-zag (oscilaciones ocultas), con `k_s ≈ 32`. Sube `K` hasta pasar `6,67` y se vuelve inestable.
3. **Rover `1/(s(s+1))` con P.** Cierra el lazo con `K = 1`: `s² + s + 1`, `ζ = 0,5`, `M_p ≈ 16 %`. Sube `K` y `M_p` crece, pero `t_s` casi no cambia: ya lo viste en el plano s (`σ` fija, `ω` creciente). El error al escalón es cero (tipo 1).
4. **Crucero con PI.** Con P queda error `1/(1 + K·G(0))`. Con PI el error al escalón es 0 y aparece el del tipo 1 ante rampa.
5. **Planta inestable `1/(s − 1)`.** Con `K < 1` el polo sigue en el semiplano derecho; con `K > 1` el lazo estabiliza lo que era inestable. Fíjate en el error: con `K = 3`, `c(∞) = 1,5`.
6. **Muestrear despacio.** Una planta de segundo orden estable en continuo se vuelve **inestable** con `T = 0,5 s`. Baja `T` y vuelve a estabilizarse: el lazo digital pierde margen.
7. **Retardo.** Con PI, pasa el actuador de *Ninguno* a *Retardo 2 muestras*: `M_p` salta de 0 a casi 28 % y `t_s` casi se duplica. Cada muestra de retardo cuesta amortiguamiento.

## Qué comprobar

- **Tipo y error.** Planta con integrador ⇒ error al escalón 0; PI sobre planta de tipo 0 ⇒ lo mismo. Cuando el error al escalón no es cero, el de rampa es infinito (aparece `∞`).
- **Tₛ simulado vs teórico.** El teórico usa solo el polo dominante y `π/|σ|`; el simulado usa la banda del 5 % real. Si hay ceros, un segundo polo cercano o un polo negativo en z, no coinciden.
- **Polo negativo en z** (zig-zag): `M_p` simulado sale enorme porque el pico de la oscilación alterna mide mucho respecto al valor final, aunque se apague rápido.
- **El sensor lento también cuenta.** Pon un sensor de 1.er orden y observa cómo sube `M_p` sin tocar el regulador.
