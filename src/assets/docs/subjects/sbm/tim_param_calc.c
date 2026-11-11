#include "tim_param_calc.h"
#include <math.h>

uint32_t tim_get_clock(const TIM_TypeDef *instance) {
	RCC_ClkInitTypeDef clk;
	uint32_t latency;
	uint32_t pclk;
	uint32_t apb_div;

	HAL_RCC_GetClockConfig(&clk, &latency);
	if (instance == TIM1 || instance == TIM8 || instance == TIM9 || instance == TIM10 || instance == TIM11) {
		pclk = HAL_RCC_GetPCLK2Freq();
		apb_div = clk.APB2CLKDivider;
	} else {
		pclk = HAL_RCC_GetPCLK1Freq();
		apb_div = clk.APB1CLKDivider;
	}
	return (apb_div == RCC_HCLK_DIV1) ? pclk : pclk * 2U;
}

int tim_calc(uint32_t timer_clock, float desired_hz, uint32_t max_arr, tim_calc_t *out) {
	if (out == NULL || timer_clock == 0 || desired_hz <= 0.0f) {
		return -1;
	}
	const float total = (float)timer_clock / desired_hz;		/* (PSC+1)*(ARR+1) ideal */
	float best_err = 1e9f;
	int found = 0;

	for (uint32_t psc = 1; psc <= 65536U; psc++) {
		float ideal = total / (float)psc;
		if (ideal < 1.0f) {
			break;
		}
		uint32_t arr = (uint32_t)(ideal + 0.5f);
		if (arr == 0 || arr - 1U > max_arr) {
			continue;
		}
		float f = (float)timer_clock / ((float)psc * (float)arr);
		float err = fabsf(f - desired_hz) / desired_hz * 100.0f;	/* en float: no hay resta de unsigned */
		if (err < best_err || (err == best_err && arr > out->period + 1U)) {
			best_err = err;
			out->prescaler = psc - 1U;
			out->period = arr - 1U;
			out->actual_freq = f;
			out->error_pct = err;
			found = 1;
			if (err == 0.0f && arr > 1000U) {		/* exacto y con buena resolucion */
				break;
			}
		}
	}
	out->timer_clock = timer_clock;
	return found ? 0 : -2;
}

int tim_config(TIM_HandleTypeDef *htim, TIM_TypeDef *instance, float desired_hz) {
	tim_calc_t r;
	uint32_t max_arr = (instance == TIM2 || instance == TIM5) ? 0xFFFFFFFFU : 0xFFFFU;

	if (htim == NULL || instance == NULL) {
		return -1;
	}
	int rc = tim_calc(tim_get_clock(instance), desired_hz, max_arr, &r);
	if (rc != 0) {
		return rc;
	}
	htim->Instance = instance;
	htim->Init.Prescaler = r.prescaler;
	htim->Init.Period = r.period;
	htim->Init.CounterMode = TIM_COUNTERMODE_UP;
	htim->Init.ClockDivision = TIM_CLOCKDIVISION_DIV1;
	htim->Init.RepetitionCounter = 0;
	return 0;
}
