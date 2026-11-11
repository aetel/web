---
title: "Productor y consumidor con cola de mensajes (CMSIS-RTOS2)"
asignatura: sbm
tipo: ejercicio
tema: "Bloque 2"
orden: 70
resumen: "Dos threads comunican dos contadores por una cola y los pintan en el LCD. Ampliaciones con B1: parpadeo de pantalla y pausa del generador."
keywords: [ejercicio, CMSIS-RTOS2, thread, cola de mensajes, osMessageQueueNew, LCD, contador, thread flags, EXTI, osTimer, B1, ISR]
---

**Enunciado.** Dos threads: `genTh` genera datos y `consTh` los consume. Comunicación por cola de mensajes. Cada mensaje contiene dos contadores.

- `genTh` actualiza cada segundo `cnt1` (ascendente de 10 a 30) y `cnt2` (descendente de 30 a 10) y envía el mensaje.
- `consTh` lee de la cola y escribe cada contador en una línea del LCD.
- Cuando los dos contadores coinciden, la aplicación se bloquea.
- **B.** Cada pulsación de B1 enciende todos los píxeles 2 s. Mientras tanto la generación y el consumo siguen igual (no se verán los contadores).
- **C.** Cada pulsación de B1 para/arranca `genTh`. Con la generación parada, LD1 parpadea con periodo de 1 s.

En B y C no se permiten variables globales para comunicar eventos. Interrupciones para el pulsador, sin eliminar rebotes.

<details>
<summary>Pista</summary>

- Los contadores coinciden en 20 y 20 (en el instante 10).
- Desde la ISR solo se pueden usar llamadas que no bloquean: `osThreadFlagsSet`, y `osMessageQueuePut` con timeout 0.
- Para B, haz que el mensaje lleve un campo `tipo` y que el timer de 2 s devuelva otro mensaje a la misma cola.

</details>

<details>
<summary>Solución A</summary>

```c
typedef struct {
	uint8_t tipo;     /* 0 = datos, 1 = boton, 2 = fin del flash */
	uint8_t cnt1;
	uint8_t cnt2;
} msg_t;

static osMessageQueueId_t q;
static osThreadId_t gen_id;

static void genTh(void *arg) {
	msg_t m = { .tipo = 0 };
	uint8_t up = 10;
	uint8_t down = 30;
	while (1) {
		m.cnt1 = up;
		m.cnt2 = down;
		osMessageQueuePut(q, &m, 0, osWaitForever);
		up++;
		down--;
		osDelay(1000);
	}
}

static void consTh(void *arg) {
	msg_t m;
	while (1) {
		osMessageQueueGet(q, &m, NULL, osWaitForever);
		/* escribir "cnt1: xx" en la linea 0 y "cnt2: xx" en la linea 1 */
		if (m.cnt1 == m.cnt2) {
			osThreadTerminate(gen_id);
			while (1) {
				osDelay(osWaitForever);
			}
		}
	}
}
```

Inicialización: `q = osMessageQueueNew(8, sizeof(msg_t), NULL);` y dos `osThreadNew`.

</details>

<details>
<summary>Solución B (parpadeo de pantalla)</summary>

La ISR envía `{ .tipo = 1 }` a la cola con timeout 0. En `consTh`, una variable **local** `blanco` controla el estado:

```c
if (m.tipo == 1) {
	blanco = 1;
	/* rellenar el buffer con 0xFF y volcarlo al LCD */
	osTimerStart(t_2s, 2000);
} else if (m.tipo == 2) {
	blanco = 0;
} else if (!blanco) {
	/* pintar contadores */
}
```

El callback de `t_2s` (one-shot) hace `osMessageQueuePut(q, &(msg_t){ .tipo = 2 }, 0, 0)`. Mientras `blanco` vale 1 se siguen consumiendo mensajes de datos pero no se pintan. Si llega otra pulsación a mitad, `osTimerStart` reinicia los 2 s.

</details>

<details>
<summary>Solución C (pausa del generador)</summary>

La ISR hace `osThreadFlagsSet(gen_id, 0x01)`. En `genTh`, sustituye `osDelay(1000)` por una espera con timeout:

```c
uint32_t f = osThreadFlagsWait(0x01, osFlagsWaitAny, 1000);
if (f == 0x01) {   /* pausa */
	while (osThreadFlagsWait(0x01, osFlagsWaitAny, 1000) == osFlagsErrorTimeout) {
		HAL_GPIO_TogglePin(GPIOB, GPIO_PIN_0);   /* LD1, una vez por segundo */
	}
}
```

La espera con timeout hace de temporizador de 1 s y de receptor del evento a la vez. Cuando llega el segundo flag, el bucle sale y se reanuda la generación.

</details>
