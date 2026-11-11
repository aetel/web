---
title: "Secuencia de LEDs con el Timer 7 a 100 MHz"
asignatura: sbm
tipo: ejercicio
tema: "Bloque 1"
orden: 60
resumen: "Tres LEDs, una secuencia de 9 s por fases, SYSCLK a 100 MHz, sin HAL_Delay. Ampliaciones con B1 y con un LED externo gobernado por TIM4."
keywords: [ejercicio, TIM7, 100 MHz, LD1, LD2, LD3, máquina de estados, parpadeo, EXTI, TIM4, OC toggle, mbed application board]
---

**Enunciado.** SYSCLK = 100 MHz (visualízalo en `SystemCoreClock`). Tras un reset:

1. Los tres LEDs se encienden y esperan 3 s.
2. Durante 3 s, LD3 apagado y LD1-LD2 parpadean (500 ms apagados, 500 ms encendidos).
3. Durante 3 s, LD1 apagado y LD2-LD3 parpadean igual.
4. Se apagan los tres LEDs y no se hace nada más.

Todo el tiempo sale del Timer 7 por interrupciones. Prohibido `HAL_Delay`.

- **B.** Las pulsaciones de B1 solo cuentan pasados los 3 s iniciales. A la 5.ª se encienden los tres LEDs y se bloquea el sistema.
- **C.** Además, un LED externo gobernado por **hardware** del Timer 4: parpadea 250 ms/250 ms desde el reset y queda encendido al terminar la secuencia (9 s).

<details>
<summary>Pista: números</summary>

- PLL: `M=4, N=100, P=2`. APB1 /4 → PCLK1 = 25 MHz → reloj de TIM7 = **50 MHz**.
- Ranura de 500 ms: `PSC = 49999`, `ARR = 499`. Hay 18 ranuras: 0-5 espera, 6-11 fase 2, 12-17 fase 3, 18 fin.

</details>

<details>
<summary>Solución A (esqueleto)</summary>

```c
static uint8_t tick = 0;

void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim) {
	if (htim->Instance != TIM7) {
		return;
	}
	GPIO_PinState on = (tick & 1U) ? GPIO_PIN_SET : GPIO_PIN_RESET;   /* tick par: apagados, impar: encendidos */
	if (tick < 6) {
		/* espera: LD1 LD2 LD3 encendidos desde el reset */
	} else if (tick < 12) {
		HAL_GPIO_WritePin(GPIOB, GPIO_PIN_14, GPIO_PIN_RESET);        /* LD3 off */
		HAL_GPIO_WritePin(GPIOB, GPIO_PIN_0 | GPIO_PIN_7, on);        /* LD1, LD2 */
	} else if (tick < 18) {
		HAL_GPIO_WritePin(GPIOB, GPIO_PIN_0, GPIO_PIN_RESET);         /* LD1 off */
		HAL_GPIO_WritePin(GPIOB, GPIO_PIN_7 | GPIO_PIN_14, on);       /* LD2, LD3 */
	} else {
		HAL_GPIO_WritePin(GPIOB, GPIO_PIN_0 | GPIO_PIN_7 | GPIO_PIN_14, GPIO_PIN_RESET);
		HAL_TIM_Base_Stop_IT(&htim7);
	}
	tick++;
}
```

Se escribe el estado explícito en lugar de usar `Toggle`: así LD1-LD2 y luego LD2-LD3 siempre van sincronizados, aunque cambien de fase con distinto estado.

</details>

<details>
<summary>Solución B y C</summary>

**B**: en `HAL_GPIO_EXTI_Callback` ignora las pulsaciones si `tick < 6`; cuenta hasta 5; al llegar, para el timer y enciende los LEDs.

**C**: elige un pin con canal de TIM4 (PB6, PB8, PB9, PD12–PD15; PB7 ya es LD2) y comprueba en el esquema de la placa de aplicación a qué pin del conector llega el LED. Modo **OC toggle** con actualización cada 250 ms (4 Hz): la salida parpadea 250/250 ms. A los 9 s, cambia el canal a `TIM_OCMODE_FORCED_ACTIVE` con `HAL_TIM_OC_ConfigChannel` para dejarlo encendido. Calcula PSC y ARR con la [calculadora de timers](../sbm-herramienta-timers/).

</details>
