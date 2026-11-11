---
title: "Calculadora del PLL y del árbol de reloj"
asignatura: sbm
tipo: herramienta
tema: "Bloque 1"
orden: 20
resumen: "Dado un SYSCLK objetivo, busca los valores M, N y P válidos, calcula los relojes de los buses y genera SystemClock_Config."
keywords: [PLL, M, N, P, Q, VCO, SYSCLK, HCLK, PCLK1, PCLK2, RCC_OscInitTypeDef, RCC_ClkInitTypeDef, SystemClock_Config, over-drive, latencia flash, 48 MHz, calculadora]
---

Elige la fuente, escribe el SYSCLK que quieres y pulsa una de las combinaciones. Las primeras de la lista son las que tienen error cero y VCO de entrada más cercano a 2 MHz.

<div data-widget="pll-stm32"></div>

**Cómo usarla**
- Con **HSE bypass 8 MHz** y **100 MHz** sale `M=4, N=100, P=2`.
- Con **42 MHz** sale `M=4, N=84, P=4`: VCO 168 MHz y APB1 sin dividir (42 MHz ≤ 45 MHz).
- Con **180 MHz** verás el aviso de Over-drive y que PLLQ no da 48 MHz exactos.
- Cambia el prescaler APB para ver cómo se mueve el reloj de timers.

El código generado usa la API HAL y puede pegarse en `main.c`. Define tu propio `Error_Handler()` o sustitúyelo por un bucle.
