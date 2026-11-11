---
title: "Calculadora de timers: PSC, ARR y configuración"
asignatura: sbm
tipo: herramienta
tema: "Bloque 1"
orden: 30
resumen: "Calcula PSC y ARR para una frecuencia o periodo, o la frecuencia que da un PSC/ARR, y genera el código HAL."
keywords: [timer, PSC, ARR, prescaler, periodo, TIM2, TIM3, TIM4, TIM6, TIM7, TIM12, interrupción periódica, OC toggle, PWM, HAL_TIM_Base_Init, calculadora]
---

Indica el reloj del sistema (HCLK y prescalers APB), el timer y lo que quieres obtener. La herramienta busca el par (PSC, ARR) con menos error y te da alternativas.

<div data-widget="timer-stm32"></div>

**Ejemplos para probar**
- TIM7, interrupción cada **500 ms**, HCLK 100 MHz, APB1 /4 → reloj 50 MHz.
- LD2 parpadeando a **2 Hz** con OC toggle (TIM4_CH2): la herramienta duplica la frecuencia de actualización.
- Modo inverso: reloj 72 MHz, PSC = 35999, ARR = 124 → **16 Hz**.

También puedes calcular lo mismo **dentro del microcontrolador** con el código de la sección *Código para descargar* de la asignatura: `tim_config(&htim, TIMx, f_hz)` mira el reloj real del bus y devuelve PSC y ARR.
