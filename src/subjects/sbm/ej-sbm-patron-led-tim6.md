---
title: "Patrón periódico en LD2 con el Timer 6 a 42 MHz"
asignatura: sbm
tipo: ejercicio
tema: "Bloque 1"
orden: 50
resumen: "Proyecto desde cero: SYSCLK 42 MHz, una única base de tiempos en TIM6 y un patrón de 3 s en LD2. Con parada por B1 y con inversión por B1."
keywords: [ejercicio, TIM6, 42 MHz, PLL, LD2, patrón, EXTI, B1, interrupción, bits, inversión]
---

**Enunciado.** Placa Nucleo-144 (STM32F429). SYSCLK = 42 MHz. Cualquier temporización sale del Timer 6. LD2 repite indefinidamente esta señal con periodo de 3000 ms: encendido siempre salvo dos huecos apagados, de 600 a 800 ms y de 2100 a 2300 ms.

- **A.** Genera la señal.
- **B.** Una pulsación de B1 para la señal; la siguiente la arranca. Por interrupciones.
- **C.** Una pulsación de B1 invierte la señal (encendido ↔ apagado). Sin rebotes.

<details>
<summary>Pista 1: reloj</summary>

Con HSE 8 MHz: `M=4, N=84, P=4` → VCO 168 MHz, SYSCLK 42 MHz. APB1 /1 (42 ≤ 45 MHz): el timer recibe 42 MHz (sin ×2). Compruébalo en la [calculadora del PLL](../sbm-herramienta-pll/).

</details>

<details>
<summary>Pista 2: base de tiempos</summary>

Todos los flancos son múltiplos de 100 ms: una interrupción cada 100 ms basta. `f = 10 Hz` con reloj 42 MHz: `PSC = 41999` (tick de 1 kHz), `ARR = 99`. Compruébalo en la [calculadora de timers](../sbm-herramienta-timers/).

</details>

<details>
<summary>Solución A (esqueleto)</summary>

El periodo son 30 ranuras de 100 ms. Una máscara de 30 bits con 1 = encendido:

```c
#define SLOTS 30U
/* huecos apagados: 600-800 ms -> bits 6 y 7; 2100-2300 ms -> bits 21 y 22 */
static const uint32_t pattern = 0x3FFFFFFFU & ~((1U << 6) | (1U << 7) | (1U << 21) | (1U << 22));
static uint8_t slot = 0;
TIM_HandleTypeDef htim6;

void TIM6_DAC_IRQHandler(void) {
	HAL_TIM_IRQHandler(&htim6);
}

void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim) {
	if (htim->Instance == TIM6) {
		HAL_GPIO_WritePin(GPIOB, GPIO_PIN_7, (pattern >> slot) & 1U);
		slot = (slot + 1U) % SLOTS;
	}
}
```

`tim6_init()`: habilita el reloj, `Prescaler = 41999`, `Period = 99`, `HAL_NVIC_EnableIRQ(TIM6_DAC_IRQn)` y `HAL_TIM_Base_Start_IT`. LD2 es PB7 como salida push-pull.

</details>

<details>
<summary>Solución B y C</summary>

**B**: configura PC13 con `GPIO_MODE_IT_RISING` y `GPIO_PULLDOWN`, escribe `EXTI15_10_IRQHandler` que llama a `HAL_GPIO_EXTI_IRQHandler(GPIO_PIN_13)` y en el callback alterna:

```c
void HAL_GPIO_EXTI_Callback(uint16_t pin) {
	static uint8_t running = 1;
	if (pin == GPIO_PIN_13) {
		running ? HAL_TIM_Base_Stop_IT(&htim6) : HAL_TIM_Base_Start_IT(&htim6);
		running ^= 1U;
	}
}
```

**C**: una variable `inv` que alterna en el callback, y se escribe `((pattern >> slot) & 1U) ^ inv`. Así la señal nueva es la complementaria, con el mismo periodo.

</details>
