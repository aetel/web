#ifndef __TIM_PARAM_CALC_H__
#define __TIM_PARAM_CALC_H__

#include <stdint.h>
#include "stm32f4xx_hal.h"

typedef struct {
	uint32_t prescaler;			/* valor a escribir en TIMx->PSC (ya restado 1) */
	uint32_t period;			/* valor a escribir en TIMx->ARR (ya restado 1) */
	uint32_t timer_clock;		/* reloj de contador del timer [Hz] */
	float actual_freq;			/* frecuencia de actualizacion real [Hz] */
	float error_pct;			/* error relativo [%] */
} tim_calc_t;

/* Reloj de contador de un timer: PCLK si el prescaler APB es /1, 2*PCLK si no. */
uint32_t tim_get_clock(const TIM_TypeDef *instance);

/* Busca PSC y ARR para una frecuencia de actualizacion. max_arr: 0xFFFF (16 bit) o 0xFFFFFFFF (TIM2/TIM5). */
int tim_calc(uint32_t timer_clock, float desired_hz, uint32_t max_arr, tim_calc_t *out);

/* Rellena htim->Init con la mejor configuracion. Devuelve 0 o un valor negativo. */
int tim_config(TIM_HandleTypeDef *htim, TIM_TypeDef *instance, float desired_hz);

#endif
