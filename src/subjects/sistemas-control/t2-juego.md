---
title: "Polos Quest: el juego del Tema 2"
asignatura: sistemas-control
tipo: herramienta
tema: Tema 2
orden: 300
resumen: "Repaso gamificado: coloca polos en los planos s y z, gana XP en el duelo s ↔ z, pilota 6 misiones de vuelo con lazo cerrado (continuo y discreto), sube de rango y desbloquea logros."
keywords: [juego, gamificación, repaso, polos, plano s, plano z, ts, Mp, tp, ks, kp, aliasing, lazo cerrado, PI, regulador, vuelo, misiones, XP, rangos, logros]
---

Eres el ingeniero de guardia. Los clientes piden especificaciones y tú colocas polos. Cada acierto da XP; cada trampa del examen te la juegan en el duelo.

<div data-widget="juego-polos"></div>

## Cómo se juega

**🎯 Misión plano s y ⭕ Misión plano z.** Una tarjeta fija `t_s`, `M_p` y `t_p` (en z: `k_s`, `M_p`, `k_p`). Haz clic en el plano para colocar el polo. La respuesta al escalón se dibuja al instante, con los límites marcados. Cada misión tiene solución, y es una zona, no un punto. Si te atascas, **Ver zona válida** la ilumina, pero la misión solo paga 5 XP.

| Intento en el que aciertas | XP |
|---|---|
| 1.º | 20 |
| 2.º o 3.º | 12 |
| Más tarde | 8 |
| Con la zona revelada | 5 |

**⚔️ Duelo s ↔ z.** Preguntas con 15 segundos. Los distractores son los errores típicos (Euler, usar `|p|` en vez de `σ`, olvidar `T`, confundir periodo y pico), y al fallar te dice cuál has cometido. Cada quinta pregunta es un **jefe** de concepto (+20 XP). Las rachas suman bonus: +2 XP por cada acierto seguido (hasta +20), y +3 si respondes en menos de 5 s.

**✈️ Vuelo.** Seis misiones con un vehículo de verdad: 🚁 dron de reparto, 🚗 rover de Marte, 🚙 control de crucero, ✈️ avión inestable, 🚀 cohete con ordenador de a bordo (aquí eliges también el periodo de muestreo `T`) y 🛰️ dron con latencia de radio. Cada una fija la planta; tú eliges regulador (P o PI), `K`, `Tᵢ` y, en discreto, `T`. Una vista previa te da al momento el error, `M_p` y `t_s`. Al pulsar **Lanzar**, el vehículo recorre la respuesta al escalón: si pasa del techo o del muro (el límite de `M_p`), se estrella 💥.

| Estrellas | Qué exige | XP acumulado |
|---|---|---|
| ★ | Cumplir error, `M_p` y `t_s` del objetivo | 30 |
| ★★ | Un aterrizaje más limpio (menos `M_p`, menos consumo o menos tiempo, según la misión) | 55 |
| ★★★ | Maestría: la meta más exigente | 90 |

Repetir una misión solo paga la diferencia si mejoras tus estrellas. Los tres puntos clave que se aprenden: más ganancia reduce el error pero sube el sobreimpulso; el integral anula el error pero cuesta amortiguamiento; y el retardo o un `T` grande te quitan margen.

## Rangos

| XP | Rango |
|---|---|
| 0 | Becario del laboratorio |
| 100 | Aprendiz de Laplace |
| 250 | Domador de polos |
| 500 | Señor del círculo unidad |
| 900 | Leyenda del Tema 2 |

Pasa el ratón sobre las insignias para ver cómo se consiguen: 🎯 primera misión, 🧭 y ⭕ cinco misiones en cada plano, 🔥 y ⚡ rachas de 5 y 10, 🎓 tres jefes, 📅 tres días seguidos, 👑 el rango máximo, 🛫 primera misión de vuelo, 🧑‍✈️ las seis superadas y 🌟 tres estrellas en todas.

El progreso se guarda **en tu navegador** (no hay cuentas ni servidor). Si cambias de dispositivo o borras los datos del sitio, empiezas de cero.

<details>
<summary>Chuleta para jugar</summary>

- `|z| = e^(σT)`, `∠z = ωT`.
- Más a la izquierda en s ⇒ más cerca del origen en z ⇒ `t_s` menor.
- Más `ω` ⇒ más ángulo ⇒ más sobreimpulso y pico más temprano.
- `k_s = ⌈−π/ln|z|⌉`, `k_d = 2π/∠z`, `k_p = π/∠z`, `M_p = |z|^(π/∠z)`.
- `t = k·T`. El sobreimpulso no depende de `T`.

Para entender de dónde salen, mira antes la página *De s a z*. Para trastear con el lazo sin puntuación, usa *Monta tu lazo*.

</details>
