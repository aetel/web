// Calculos del STM32F429 (PLL y timers). Funciones puras exportadas + widgets.
import { f2, el, select, number, rows, layout, codeBox } from "./core.js";

// ---------- reloj ----------
export const APB1_MAX = 45e6;
export const APB2_MAX = 90e6;
const AHB_DIVS = [1, 2, 4, 8, 16, 64, 128, 256, 512];
const APB_DIVS = [1, 2, 4, 8, 16];

// Todas las combinaciones (M, N, P) validas para el PLL principal.
export function pllSearch(srcHz, targetHz, maxErrPct = 1) {
	const out = [];
	for (let m = 2; m <= 63; m++) {
		const vin = srcHz / m;
		if (vin < 1e6 || vin > 2e6) {
			continue;
		}
		for (let n = 50; n <= 432; n++) {
			const vco = vin * n;
			if (vco < 100e6 || vco > 432e6) {
				continue;
			}
			for (const p of [2, 4, 6, 8]) {
				const sys = vco / p;
				const err = (sys - targetHz) / targetHz * 100;
				if (Math.abs(err) <= maxErrPct && sys <= 180e6) {
					out.push({ m, n, p, vin, vco, sys, err });
				}
			}
		}
	}
	out.sort((a, b) => Math.abs(a.err) - Math.abs(b.err) || Math.abs(a.vin - 2e6) - Math.abs(b.vin - 2e6) || a.p - b.p);
	return out;
}

export function bestQ(vco) {
	let best = null;
	for (let q = 2; q <= 15; q++) {
		const f = vco / q;
		if (!best || Math.abs(f - 48e6) < Math.abs(best.f - 48e6)) {
			best = { q, f };
		}
	}
	return best;
}

export function autoApb(hclk, max) {
	return APB_DIVS.find((d) => hclk / d <= max) || 16;
}

export function flashLatency(hclk) {
	const lim = [30e6, 60e6, 90e6, 120e6, 150e6, 180e6];
	const i = lim.findIndex((l) => hclk <= l + 1);
	return i < 0 ? 5 : i;
}

// Reloj de contador de un timer: PCLK si el prescaler APB es 1, 2*PCLK si no.
export function timerClock(hclk, apbDiv) {
	const pclk = hclk / apbDiv;
	return apbDiv === 1 ? pclk : pclk * 2;
}

function pllCode(cfg) {
	const { src, m, n, p, q, ahb, apb1, apb2, hclk, hseHz } = cfg;
	const L = [];
	const pDef = { 2: "RCC_PLLP_DIV2", 4: "RCC_PLLP_DIV4", 6: "RCC_PLLP_DIV6", 8: "RCC_PLLP_DIV8" }[p];
	L.push("void SystemClock_Config(void) {");
	L.push("\tRCC_OscInitTypeDef osc = {0};");
	L.push("\tRCC_ClkInitTypeDef clk = {0};");
	L.push("");
	L.push("\t__HAL_RCC_PWR_CLK_ENABLE();");
	L.push("\t__HAL_PWR_VOLTAGESCALING_CONFIG(PWR_REGULATOR_VOLTAGE_SCALE1);");
	L.push("");
	if (src === "hsi") {
		L.push("\tosc.OscillatorType = RCC_OSCILLATORTYPE_HSI;");
		L.push("\tosc.HSIState = RCC_HSI_ON;");
		L.push("\tosc.HSICalibrationValue = RCC_HSICALIBRATION_DEFAULT;");
		L.push("\tosc.PLL.PLLSource = RCC_PLLSOURCE_HSI;");
	} else {
		L.push("\tosc.OscillatorType = RCC_OSCILLATORTYPE_HSE;");
		L.push(src === "hse-bypass" ? "\tosc.HSEState = RCC_HSE_BYPASS;   // reloj del ST-LINK (Nucleo)" : "\tosc.HSEState = RCC_HSE_ON;       // cristal externo");
		L.push("\tosc.PLL.PLLSource = RCC_PLLSOURCE_HSE;");
	}
	L.push("\tosc.PLL.PLLState = RCC_PLL_ON;");
	L.push(`\tosc.PLL.PLLM = ${m};`);
	L.push(`\tosc.PLL.PLLN = ${n};`);
	L.push(`\tosc.PLL.PLLP = ${pDef};`);
	L.push(`\tosc.PLL.PLLQ = ${q};`);
	L.push("\tif (HAL_RCC_OscConfig(&osc) != HAL_OK) {");
	L.push("\t\tError_Handler();");
	L.push("\t}");
	if (hclk > 168e6) {
		L.push("");
		L.push("\tHAL_PWREx_EnableOverDrive();   // necesario por encima de 168 MHz");
	}
	L.push("");
	L.push("\tclk.ClockType = RCC_CLOCKTYPE_SYSCLK | RCC_CLOCKTYPE_HCLK | RCC_CLOCKTYPE_PCLK1 | RCC_CLOCKTYPE_PCLK2;");
	L.push("\tclk.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;");
	L.push(`\tclk.AHBCLKDivider = RCC_SYSCLK_DIV${ahb};`);
	L.push(`\tclk.APB1CLKDivider = RCC_HCLK_DIV${apb1};`);
	L.push(`\tclk.APB2CLKDivider = RCC_HCLK_DIV${apb2};`);
	L.push(`\tif (HAL_RCC_ClockConfig(&clk, FLASH_LATENCY_${flashLatency(hclk)}) != HAL_OK) {`);
	L.push("\t\tError_Handler();");
	L.push("\t}");
	L.push("}");
	return L.join("\n");
}

function mhz(x) {
	return f2(x / 1e6) + " MHz";
}

function pllWidget(root) {
	const { controls, view } = layout(root);
	const src = select(controls, "Fuente del PLL", [["hse-bypass", "HSE bypass (Nucleo, 8 MHz del ST-LINK)"], ["hse", "HSE con cristal"], ["hsi", "HSI (16 MHz)"]], "hse-bypass", update);
	const fin = number(controls, "Frecuencia HSE [MHz]", 8, update);
	const target = number(controls, "SYSCLK objetivo [MHz]", 100, update);
	const ahbSel = select(controls, "Prescaler AHB", AHB_DIVS.map((d) => [d, "/" + d]), "1", update);
	const a1 = select(controls, "Prescaler APB1", [["0", "auto"], ...APB_DIVS.map((d) => [d, "/" + d])], "0", update);
	const a2 = select(controls, "Prescaler APB2", [["0", "auto"], ...APB_DIVS.map((d) => [d, "/" + d])], "0", update);
	el("p", "wg-note", controls, "Límites STM32F429: VCO in 1–2 MHz (2 recomendado), VCO out 100–432 MHz, SYSCLK ≤ 180 MHz, APB1 ≤ 45 MHz, APB2 ≤ 90 MHz.");
	const list = el("div", "wg-list", view);
	const res = el("div", "wg-res", view);
	const code = codeBox(view);
	let pick = 0;
	function update() {
		const s = src.value;
		fin.disabled = s === "hsi";
		const hz = s === "hsi" ? 16e6 : fin.value * 1e6;
		const t = target.value * 1e6;
		list.textContent = "";
		res.textContent = "";
		if (!(hz > 0) || !(t > 0)) {
			return;
		}
		const cands = pllSearch(hz, t, 1);
		if (!cands.length) {
			list.textContent = "Sin combinación válida (error ≤ 1 %). Prueba otro objetivo.";
			code.text = "";
			return;
		}
		pick = Math.min(pick, cands.length - 1);
		cands.slice(0, 8).forEach((c, i) => {
			const b = el("button", "wg-opt" + (i === pick ? " ok" : ""), list);
			b.textContent = `M=${c.m}  N=${c.n}  P=${c.p}  →  VCO ${mhz(c.vco)}, SYSCLK ${mhz(c.sys)}  (error ${c.err.toFixed(3)} %)`;
			b.addEventListener("click", () => { pick = i; update(); });
		});
		const c = cands[pick];
		const hclk = c.sys / +ahbSel.value;
		const d1 = +a1.value || autoApb(hclk, APB1_MAX);
		const d2 = +a2.value || autoApb(hclk, APB2_MAX);
		const q = bestQ(c.vco);
		const warns = [];
		if (hclk / d1 > APB1_MAX) {
			warns.push("APB1 supera 45 MHz");
		}
		if (hclk / d2 > APB2_MAX) {
			warns.push("APB2 supera 90 MHz");
		}
		if (c.sys > 168e6) {
			warns.push("necesita Over-drive");
		}
		if (Math.abs(c.vin - 2e6) > 1) {
			warns.push("VCO in ≠ 2 MHz (más jitter)");
		}
		rows(res, [
			["Entrada del VCO = f/M", mhz(c.vin)], ["VCO = f/M·N", mhz(c.vco)], ["SYSCLK = VCO/P", mhz(c.sys)],
			["HCLK (AHB /" + ahbSel.value + ")", mhz(hclk)], ["PCLK1 (APB1 /" + d1 + ")", mhz(hclk / d1)], ["Reloj timers APB1", mhz(timerClock(hclk, d1))],
			["PCLK2 (APB2 /" + d2 + ")", mhz(hclk / d2)], ["Reloj timers APB2", mhz(timerClock(hclk, d2))],
			["PLLQ para USB/SDIO", `Q=${q.q} → ${mhz(q.f)}${Math.abs(q.f - 48e6) < 1 ? " (exacto)" : " (no es 48 MHz)"}`],
			["Latencia Flash", flashLatency(hclk) + " WS"], ["Avisos", warns.length ? "<b class='wg-warn'>" + warns.join("; ") + "</b>" : "ninguno"]
		]);
		code.text = pllCode({ src: s, m: c.m, n: c.n, p: c.p, q: q.q, ahb: +ahbSel.value, apb1: d1, apb2: d2, hclk, hseHz: hz });
	}
	update();
	return update;
}

// ---------- timers ----------
export const TIMERS = {
	TIM1: { bus: 2, bits: 16, irq: "TIM1_UP_TIM10" }, TIM2: { bus: 1, bits: 32, irq: "TIM2" }, TIM3: { bus: 1, bits: 16, irq: "TIM3" },
	TIM4: { bus: 1, bits: 16, irq: "TIM4" }, TIM5: { bus: 1, bits: 32, irq: "TIM5" }, TIM6: { bus: 1, bits: 16, irq: "TIM6_DAC" },
	TIM7: { bus: 1, bits: 16, irq: "TIM7" }, TIM8: { bus: 2, bits: 16, irq: "TIM8_UP_TIM13" }, TIM9: { bus: 2, bits: 16, irq: "TIM1_BRK_TIM9" },
	TIM10: { bus: 2, bits: 16, irq: "TIM1_UP_TIM10" }, TIM11: { bus: 2, bits: 16, irq: "TIM1_TRG_COM_TIM11" }, TIM12: { bus: 1, bits: 16, irq: "TIM8_BRK_TIM12" },
	TIM13: { bus: 1, bits: 16, irq: "TIM8_UP_TIM13" }, TIM14: { bus: 1, bits: 16, irq: "TIM8_TRG_COM_TIM14" }
};

// LEDs de la Nucleo-144 manejables por hardware
export const LED_OUT = {
	ld1: { tim: "TIM3", ch: 3, pin: "GPIO_PIN_0", af: "GPIO_AF2_TIM3", name: "LD1 (PB0)" },
	ld2: { tim: "TIM4", ch: 2, pin: "GPIO_PIN_7", af: "GPIO_AF2_TIM4", name: "LD2 (PB7)" },
	ld3: { tim: "TIM12", ch: 1, pin: "GPIO_PIN_14", af: "GPIO_AF9_TIM12", name: "LD3 (PB14)" }
};

// Mejor (PSC, ARR) para f_update. Devuelve lista ordenada por error.
export function timSearch(clk, fUpd, bits, maxN = 5) {
	const maxArr = bits === 32 ? 4294967295 : 65535;
	const res = [];
	const total = clk / fUpd;
	for (let psc = 0; psc <= 65535; psc++) {
		const arr = Math.round(total / (psc + 1)) - 1;
		if (arr < 0) {
			break;
		}
		if (arr > maxArr) {
			continue;
		}
		const f = clk / ((psc + 1) * (arr + 1));
		res.push({ psc, arr, f, err: (f - fUpd) / fUpd * 100 });
	}
	res.sort((a, b) => Math.abs(a.err) - Math.abs(b.err) || b.arr - a.arr);
	return res.slice(0, maxN);
}

function pad(s, n) {
	return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function timCode(o) {
	const { tim, psc, arr, use, led, irq, duty } = o;
	const h = "h" + tim.toLowerCase();
	const n = tim.slice(3);
	const L = [];
	L.push(`TIM_HandleTypeDef ${h};`);
	L.push("");
	L.push(`void ${tim.toLowerCase()}_init(void) {`);
	if (use === "irq") {
		L.push(`\t__HAL_RCC_${tim}_CLK_ENABLE();`);
		L.push(`\t${h}.Instance = ${tim};`);
		L.push(`\t${h}.Init.Prescaler = ${psc};`);
		L.push(`\t${h}.Init.Period = ${arr};`);
		L.push(`\t${h}.Init.CounterMode = TIM_COUNTERMODE_UP;`);
		L.push(`\t${h}.Init.ClockDivision = TIM_CLOCKDIVISION_DIV1;`);
		L.push(`\tHAL_TIM_Base_Init(&${h});`);
		L.push(`\tHAL_NVIC_SetPriority(${irq}_IRQn, 5, 0);`);
		L.push(`\tHAL_NVIC_EnableIRQ(${irq}_IRQn);`);
		L.push(`\tHAL_TIM_Base_Start_IT(&${h});`);
		L.push("}");
		L.push("");
		L.push(`void ${irq}_IRQHandler(void) {`);
		L.push(`\tHAL_TIM_IRQHandler(&${h});`);
		L.push("}");
		L.push("");
		L.push("void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim) {");
		L.push(`\tif (htim->Instance == ${tim}) {`);
		L.push("\t\t// acción periódica");
		L.push("\t}");
		L.push("}");
		return L.join("\n");
	}
	const o2 = LED_OUT[led];
	L.push("\tGPIO_InitTypeDef gpio = {0};");
	L.push("\tTIM_OC_InitTypeDef oc = {0};");
	L.push("");
	L.push("\t__HAL_RCC_GPIOB_CLK_ENABLE();");
	L.push(`\t__HAL_RCC_${tim}_CLK_ENABLE();`);
	L.push(`\tgpio.Pin = ${o2.pin};`);
	L.push("\tgpio.Mode = GPIO_MODE_AF_PP;");
	L.push("\tgpio.Pull = GPIO_NOPULL;");
	L.push("\tgpio.Speed = GPIO_SPEED_FREQ_LOW;");
	L.push(`\tgpio.Alternate = ${o2.af};`);
	L.push("\tHAL_GPIO_Init(GPIOB, &gpio);");
	L.push("");
	L.push(`\t${h}.Instance = ${tim};`);
	L.push(`\t${h}.Init.Prescaler = ${psc};`);
	L.push(`\t${h}.Init.Period = ${arr};`);
	L.push(`\t${h}.Init.CounterMode = TIM_COUNTERMODE_UP;`);
	L.push(`\t${h}.Init.ClockDivision = TIM_CLOCKDIVISION_DIV1;`);
	if (use === "oc") {
		L.push("");
		L.push("\toc.OCMode = TIM_OCMODE_TOGGLE;   // la salida cambia en cada coincidencia (1 por periodo)");
		L.push("\toc.Pulse = 0;");
		L.push("\toc.OCPolarity = TIM_OCPOLARITY_HIGH;");
		L.push(`\tHAL_TIM_OC_Init(&${h});`);
		L.push(`\tHAL_TIM_OC_ConfigChannel(&${h}, &oc, TIM_CHANNEL_${o2.ch});`);
		L.push(`\tHAL_TIM_OC_Start(&${h}, TIM_CHANNEL_${o2.ch});`);
	} else {
		L.push("");
		L.push("\toc.OCMode = TIM_OCMODE_PWM1;");
		L.push(`\toc.Pulse = ${Math.round((arr + 1) * duty / 100)};   // CCR = (ARR+1)·duty`);
		L.push("\toc.OCPolarity = TIM_OCPOLARITY_HIGH;");
		L.push(`\tHAL_TIM_PWM_Init(&${h});`);
		L.push(`\tHAL_TIM_PWM_ConfigChannel(&${h}, &oc, TIM_CHANNEL_${o2.ch});`);
		L.push(`\tHAL_TIM_PWM_Start(&${h}, TIM_CHANNEL_${o2.ch});`);
	}
	L.push("}");
	return L.join("\n");
}

function timerWidget(root) {
	const { controls, view } = layout(root);
	const modo = select(controls, "Qué quieres calcular", [["find", "PSC y ARR para una frecuencia"], ["inv", "Frecuencia a partir de PSC y ARR"]], "find", update);
	const tsel = select(controls, "Timer", Object.keys(TIMERS).map((k) => [k, `${k} (APB${TIMERS[k].bus}, ${TIMERS[k].bits} bit)`]), "TIM7", update);
	const use = select(controls, "Uso", [["irq", "Interrupción periódica"], ["oc", "Salida OC toggle en un LED"], ["pwm", "PWM en un LED"]], "irq", update);
	const led = select(controls, "LED (si OC/PWM)", Object.keys(LED_OUT).map((k) => [k, `${LED_OUT[k].name} → ${LED_OUT[k].tim}_CH${LED_OUT[k].ch}`]), "ld2", update);
	const unit = select(controls, "Unidad del objetivo", [["hz", "Hz"], ["ms", "ms (periodo)"], ["s", "s (periodo)"]], "hz", update);
	const val = number(controls, "Objetivo", 2, update);
	const duty = number(controls, "Ciclo de trabajo PWM [%]", 50, update);
	const psc = number(controls, "PSC (modo inverso)", 35999, update, 1);
	const arr = number(controls, "ARR (modo inverso)", 124, update, 1);
	const hclk = number(controls, "HCLK [MHz]", 180, update);
	const a1 = select(controls, "Prescaler APB1", APB_DIVS.map((d) => [d, "/" + d]), "4", update);
	const a2 = select(controls, "Prescaler APB2", APB_DIVS.map((d) => [d, "/" + d]), "2", update);
	el("p", "wg-note", controls, "Reloj de timer = PCLK si el prescaler APB es /1; si no, 2·PCLK. Con OC toggle, la salida cambia una vez por periodo: su frecuencia es la mitad de la de actualización.");
	const res = el("div", "wg-res", view);
	const alt = el("div", "wg-list", view);
	const code = codeBox(view);
	function update() {
		const inv = modo.value === "inv";
		let tim = tsel.value;
		if (use.value !== "irq") {
			tim = LED_OUT[led.value].tim;
		}
		const T = TIMERS[tim];
		const clk = timerClock(hclk.value * 1e6, +(T.bus === 1 ? a1.value : a2.value));
		alt.textContent = "";
		const maxArr = T.bits === 32 ? 4294967296 : 65536;
		const maxPeriod = 65536 * maxArr / clk;
		if (inv) {
			const f = clk / ((psc.value + 1) * (arr.value + 1));
			rows(res, [["Timer", tim], ["Reloj del timer", mhz(clk)], ["Tick = clk/(PSC+1)", f2(clk / (psc.value + 1)) + " Hz"],
				["f actualización", f2(f) + " Hz"], ["Periodo", f2(1000 / f) + " ms"], ["Periodo máximo del timer", f2(maxPeriod) + " s"]]);
			code.text = "";
			return;
		}
		let f = unit.value === "hz" ? val.value : unit.value === "ms" ? 1000 / val.value : 1 / val.value;
		if (!(f > 0)) {
			return;
		}
		let fu = f;
		let nota = "";
		if (use.value === "oc") {
			fu = 2 * f;
			nota = "OC toggle: f_act = 2·f_salida";
		}
		const found = timSearch(clk, fu, T.bits, 5);
		if (!found.length) {
			rows(res, [["Resultado", "<b class='wg-warn'>no alcanzable con este timer</b>"], ["Periodo máximo", f2(maxPeriod) + " s"]]);
			code.text = "";
			return;
		}
		const b = found[0];
		rows(res, [["Timer", tim + (use.value !== "irq" ? " (fijado por el LED)" : "")], ["Reloj del timer", mhz(clk)], ["f actualización necesaria", f2(fu) + " Hz" + (nota ? " (" + nota + ")" : "")],
			["PSC (registro)", b.psc], ["ARR (registro)", b.arr], ["f real", f2(b.f) + " Hz"], ["Error", b.err.toFixed(4) + " %"],
			["Resolución (tick)", f2((b.psc + 1) / clk * 1e6) + " µs"], ["Periodo máximo del timer", f2(maxPeriod) + " s"],
			["Comprobación", `${mhz(clk)} / (${b.psc + 1} · ${b.arr + 1}) = ${f2(b.f)} Hz`]]);
		el("p", "wg-note", alt, "Alternativas:");
		found.slice(1).forEach((c) => el("div", "wg-alt", alt, `PSC=${c.psc}  ARR=${c.arr}  →  ${f2(c.f)} Hz  (error ${c.err.toFixed(4)} %)`));
		code.text = timCode({ tim, psc: b.psc, arr: b.arr, use: use.value, led: led.value, irq: T.irq, duty: duty.value });
	}
	update();
	return update;
}

export const SBM_WIDGETS = { "pll-stm32": pllWidget, "timer-stm32": timerWidget };
