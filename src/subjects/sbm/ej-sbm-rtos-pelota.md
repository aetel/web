---
title: "Juego de la pelota: timer virtual y joystick"
asignatura: sbm
tipo: ejercicio
tema: "Bloque 2"
orden: 80
resumen: "Un rectángulo recorre el LCD movido por un timer virtual; el jugador debe pulsar el joystick en la última posición. La velocidad aumenta con cada punto."
keywords: [ejercicio, CMSIS-RTOS2, osTimer, timer virtual, LCD, joystick, thread, flags, pelota, juego, puntuación, rebotes]
---

**Enunciado.** Con la mbed Application Board (LCD de 128×32, 4 páginas) y CMSIS-RTOS2:

- **A.** Escribe `void pinta_pelota(int posicion)`: dibuja un rectángulo de 12 píxeles de alto y 8 de ancho a partir de la columna `posicion`, en las dos primeras páginas. Un **timer virtual** mueve el rectángulo 8 píxeles cada 600 ms. Al llegar al borde derecho vuelve a la columna 0.
- **B.** Juego: si el usuario pulsa **CENTRO** en el joystick justo cuando la pelota está en la última posición, suma un punto. La puntuación se escribe en las dos páginas inferiores: `Puntuacion x`. La lógica del juego va en un thread. Sin rebotes del joystick.
- **D.** Cada punto reduce el periodo del timer virtual en 50 ms hasta un mínimo de 100 ms.

<details>
<summary>Pista</summary>

- `osTimerNew(cb, osTimerPeriodic, NULL, NULL)`. El callback no debe dibujar: solo avisa al thread con `osThreadFlagsSet`.
- El LCD tiene 128 columnas, así que hay 16 posiciones (0, 8, …, 120). Última posición: 120.
- Para cambiar el periodo, vuelve a llamar a `osTimerStart(id, nuevo_ms)`. Con el tick del kernel a 1 kHz, los ticks son milisegundos.

</details>

<details>
<summary>Solución (esqueleto)</summary>

```c
#define FLAG_TICK  0x01U
#define POS_MAX    120

static osTimerId_t tmr;
static osThreadId_t game_id;
static osMessageQueueId_t joy_q;      /* eventos ya filtrados por el hilo del joystick */
static uint32_t periodo = 600;

static void tmr_cb(void *arg) {
	osThreadFlagsSet(game_id, FLAG_TICK);
}

static void game_th(void *arg) {
	int pos = 0;
	uint8_t puntos = 0;
	joy_event_t ev;
	osTimerStart(tmr, periodo);
	while (1) {
		osThreadFlagsWait(FLAG_TICK, osFlagsWaitAny, osWaitForever);
		pinta_pelota(pos);
		/* pintar "Puntuacion x" */
		if (osMessageQueueGet(joy_q, &ev, NULL, 0) == osOK
				&& ev == JOY_CENTER_SPULSE && pos == POS_MAX) {
			puntos++;
			if (periodo > 100) {
				periodo -= 50;
				osTimerStart(tmr, periodo);
			}
		}
		pos = (pos + 8) % 128;
	}
}
```

Cuidado con dos fallos típicos:
1. Si la pulsación llega **antes** de que el thread consulte la cola, el evento se queda esperando al siguiente tick y puede puntuar de forma errónea. Vacía la cola en cada tick o añade una marca de tiempo al evento.
2. El hilo del joystick debe filtrar rebotes con el kernel (un timer de 50–75 ms), no con `HAL_Delay`.

</details>
