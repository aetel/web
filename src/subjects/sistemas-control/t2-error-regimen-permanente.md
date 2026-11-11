---
title: "Error en régimen permanente y tipo de sistema"
asignatura: sistemas-control
tipo: herramienta
tema: Tema 2
orden: 10
resumen: "Qué error queda cuando el sistema se asienta, y cómo lo decide el número de integradores."
keywords: [tipo, orden, integrador, constante de error, Kp, Kv, Ka, escalón, rampa, parábola, régimen permanente, error estacionario]
refs:
  - { doc: resumen-t2, pagina: 4, texto: "Orden y tipo de un sistema" }
  - { doc: resumen-t2, pagina: 5, texto: "Error y constantes de error" }
---

Un sistema de control mide la salida, la compara con la referencia y corrige. La diferencia es el **error** `e = r − c`. En régimen permanente (RP) la pregunta es: *cuando todo se ha calmado, ¿cuánto error queda?*

La respuesta depende solo del **tipo** `q`: el número de integradores de la cadena abierta (polos en `s = 0` en continuo, en `z = 1` en discreto).

| Tipo | Escalón | Rampa | Parábola |
|------|---------|-------|----------|
| 0 | 1/(1+K₀) | ∞ | ∞ |
| 1 | 0 | 1/K₁ | ∞ |
| 2 | 0 | 0 | 1/K₂ |

Cada integrador "sube un escalón" la señal que el sistema puede seguir sin error. Prueba con el simulador: con tipo 1 y entrada rampa, el error se queda constante en `1/K₁`. Con tipo 0 la misma rampa lo hace crecer sin límite.

<div data-widget="error-rp"></div>

**Qué mirar**
- Sube K: el error finito baja (1/K).
- Cambia de tipo 1 a 2 con entrada rampa: el error pasa a 0.
- Con tipo 2 y K alto el sistema se vuelve inestable: el error deja de tener sentido.
