---
title: "Reloj, PLL y timers del STM32F429"
asignatura: sbm
tipo: apunte
tema: "Bloque 1"
orden: 10
resumen: "Cómo llega el reloj de la fuente hasta el contador de un timer, y cómo se obtiene la frecuencia de una interrupción periódica."
keywords: [reloj, PLL, HSE, HSI, SYSCLK, HCLK, APB1, APB2, prescaler, PSC, ARR, timer, interrupción periódica, M, N, P, Q, over-drive]
---

## 1. Del cristal al contador

```
HSE (8 MHz Nucleo) ─┐                     ┌─ /P ─→ SYSCLK ─ AHB ─→ HCLK ─ APB1 ─→ PCLK1 ─(×1 o ×2)─→ timers APB1
HSI (16 MHz)       ─┴→ /M ─→ ×N (VCO) ───┤                              └ APB2 ─→ PCLK2 ─(×1 o ×2)─→ timers APB2
                                          └─ /Q ─→ 48 MHz (USB, SDIO)
```

| Magnitud | Fórmula | Límite |
|----------|---------|--------|
| Entrada del VCO | `f_fuente / M` | 1–2 MHz (2 MHz recomendado) |
| VCO | `f_fuente / M · N` | 100–432 MHz |
| SYSCLK | `VCO / P`, con P ∈ {2, 4, 6, 8} | ≤ 180 MHz (≤ 168 sin Over-drive) |
| PCLK1 | `HCLK / prescaler APB1` | ≤ 45 MHz |
| PCLK2 | `HCLK / prescaler APB2` | ≤ 90 MHz |

M va de 2 a 63, N de 50 a 432, Q de 2 a 15. La Nucleo-144 entrega 8 MHz por el ST-LINK (HSE en *bypass*).

**Regla del reloj de timer**: si el prescaler APB es `/1`, el timer recibe `PCLK`. Si es cualquier otro, recibe `2·PCLK`.

Ejemplo: HCLK = 144 MHz, APB1 /4 → PCLK1 = 36 MHz → timers APB1 a **72 MHz**.

## 2. Frecuencia de un timer

`f_actualización = f_timer / ((PSC + 1) · (ARR + 1))`

- PSC y ARR son registros de 16 bits (32 en ARR de TIM2 y TIM5). Los registros guardan el valor **menos uno**.
- Periodo máximo de un timer de 16 bits: `65536 · 65536 / f_timer`.
- Un tick de 1 kHz con reloj de 90 MHz → `PSC = 89999`. Después `ARR = cuentas − 1`.

## 3. Modos habituales

| Modo | Qué hace | Frecuencia de salida |
|------|----------|----------------------|
| Base + interrupción | `HAL_TIM_PeriodElapsedCallback` en cada desbordamiento | `f_actualización` |
| OC toggle | El pin cambia una vez por periodo | `f_actualización / 2` |
| PWM | El pin sube al principio y baja en CCR | `f_actualización` |

## 4. Pines con timer en la Nucleo-144

| LED | Pin | Canal | AF |
|-----|-----|-------|----|
| LD1 | PB0 | TIM3_CH3 | AF2 |
| LD2 | PB7 | TIM4_CH2 | AF2 |
| LD3 | PB14 | TIM12_CH1 | AF9 |

## 5. Receta

1. Fija SYSCLK y los prescalers APB. Calcula el reloj del timer.
2. Elige un timer libre (TIM6/TIM7 si solo quieres base de tiempos).
3. Calcula PSC y ARR para la frecuencia deseada. Comprueba el error.
4. Habilita el reloj del timer, `HAL_TIM_Base_Init`, NVIC y `HAL_TIM_Base_Start_IT`.
5. Escribe el handler `TIMx_IRQHandler` que llama a `HAL_TIM_IRQHandler`.

Las dos herramientas siguientes hacen los pasos 1 y 3 por ti y generan el código.
