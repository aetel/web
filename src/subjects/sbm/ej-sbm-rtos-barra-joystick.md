---
title: "Barra horizontal controlada con el joystick"
asignatura: sbm
tipo: ejercicio
tema: "Bloque 2"
orden: 90
resumen: "La barra crece y decrece píxel a píxel con las pulsaciones. Si no hay actividad en 4 s se enciende un LED. Usa un timer one-shot como temporizador de inactividad."
keywords: [ejercicio, CMSIS-RTOS2, joystick, LCD, barra, timer one-shot, inactividad, osTimerStart, watchdog software, flags]
---

**Enunciado.** Con CMSIS-RTOS2 y la mbed Application Board:

- Tras un reset el LCD está en blanco.
- Una pulsación **DERECHA** muestra y hace crecer una barra horizontal 1 píxel por pulsación. **IZQUIERDA** la reduce 1 píxel.
- La barra ocupa las páginas 0 y 1.
- Si pasan 4 s sin ninguna de las dos pulsaciones, se enciende el LED constantemente. *Variante B*: se hace un destello de 100 ms.
- *Variante C*: una pulsación ABAJO cambia la barra a las páginas 2 y 3.
- Elimina rebotes con recursos del RTOS. Mantén visibles las variables: pulsaciones de cada tipo y anchura.

<details>
<summary>Idea clave</summary>

El aviso de 4 s es un **temporizador de inactividad**: un timer one-shot que se **rearma** en cada pulsación. Si llega a expirar, es que no hubo actividad.

</details>

<details>
<summary>Solución (esqueleto)</summary>

```c
static osTimerId_t t_idle;
static uint16_t n_der, n_izq, ancho;

static void idle_cb(void *arg) {
	HAL_GPIO_WritePin(GPIOB, GPIO_PIN_0, GPIO_PIN_SET);       /* LD1 fijo */
}

static void barra_th(void *arg) {
	joy_event_t ev;
	osTimerStart(t_idle, 4000);
	while (1) {
		osMessageQueueGet(joy_q, &ev, NULL, osWaitForever);
		if (ev == JOY_RIGHT_SPULSE && ancho < 128) {
			n_der++;
			ancho++;
		} else if (ev == JOY_LEFT_SPULSE && ancho > 0) {
			n_izq++;
			ancho--;
		} else {
			continue;
		}
		HAL_GPIO_WritePin(GPIOB, GPIO_PIN_0, GPIO_PIN_RESET);
		dibuja_barra(ancho);
		osTimerStart(t_idle, 4000);   /* rearma: reinicia la cuenta */
	}
}
```

- `t_idle = osTimerNew(idle_cb, osTimerOnce, NULL, NULL)`.
- Para la variante B, el callback enciende el LED y arranca otro one-shot de 100 ms que lo apaga.
- `dibuja_barra`: para las columnas `< ancho`, escribe `0xFF` en las páginas 0 y 1 del buffer y 0x00 en el resto. Después vuelca el buffer entero.
- Ten en cuenta que el timer one-shot del RTOS se ejecuta en el contexto del thread de timers del kernel. Evita llamadas bloqueantes dentro del callback.

</details>
