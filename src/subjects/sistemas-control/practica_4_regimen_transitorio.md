---
title: "Práctica 4: análisis de sistemas de control en régimen transitorio"
asignatura: sistemas-control
tipo: ejercicio
tema: "Laboratorio · Práctica 4"
orden: 180
resumen: "Resolución completa: preliminar (valores teóricos de las tablas 1 y 2), laboratorio con Matlab, rangos de K continuo y discreto, y explicación de cada paso."
keywords: [práctica 4, laboratorio, régimen transitorio, Matlab, tf, zpk, feedback, step, pole, polo dominante, sobreamortiguado, críticamente amortiguado, subamortiguado, inestable, oscilación sostenida, ganancia crítica, ZOH, c2d]
---

**Criterio de la práctica.** `$\lvert \ln  0{,}05\rvert  \approx  \pi$`, así que `$t_s = \pi /\lvert \sigma\rvert$` en continuo y `$k_s = \lceil -\pi /\ln \lvert p\rvert \rceil$` en discreto (`$t_s = k_s\cdot T$`). Se usan los polos dominantes sin simplificar las funciones de transferencia, y 4 decimales.

Los valores "obtenidos con Matlab" de este documento los he calculado con un simulador propio equivalente a `step` (banda del 5 %), no ejecutando Matlab. Al correr el script `practica4.m` (más abajo) deben salir iguales salvo por la lectura sobre la gráfica.

## Preliminar (antes de la sesión)

### 2.1 Sistema continuo

`$G(s) = 20/((s + 1)(s + 20))$`: ganancia significativa unitaria, `$G(0) = 20/20 = 1$`.

<details class="calc">
<summary><code>$M_1(s)$</code>, con <code>$F = 1$</code></summary>

<p class="eq" data-tex>M_1(s)=\frac{G}{1+G}=\frac{20}{s^2+21s+40}</p>

Polos: `$s = (-21 \pm  \sqrt{281})/2$` ⇒ `$s_1 = -2{,}1185$` y `$s_2 = -18{,}8815$`. Son **reales distintos**: respuesta **sobreamortiguada**.

- **Sin pico.** No hay `$t_p$`, y `$M_p = 0 \%$`.
- **Polo dominante:** `$-2{,}1185$` (el más cercano al eje imaginario). El otro es 9 veces más rápido.
- `$t_s = \pi /2{,}1185 =$` **1,4830 s**.
- Valor final: `$M_1(0) = 20/40 = 0{,}5$` (error al escalón del 50 %).

</details>

<details class="calc">
<summary><code>$M_2(s)$</code>, con <code>$F = 25$</code></summary>

<p class="eq" data-tex>M_2(s)=\frac{25G}{1+25G}=\frac{500}{s^2+21s+520}</p>

Polos: `$s = -10{,}5 \pm  j\cdot \sqrt{520 - 110{,}25} = -10{,}5 \pm  20{,}2423j$`. **Subamortiguada**.

<p class="eq" data-tex>t_p=\frac{\pi}{\omega}=\frac{\pi}{20{,}2423}=0{,}1552\ \text{s}</p>

<p class="eq" data-tex>M_p=e^{\pi\sigma/\omega}=e^{-\pi\cdot 10{,}5/20{,}2423}=e^{-1{,}6296}=19{,}60\ \%</p>

<p class="eq" data-tex>t_s=\frac{\pi}{\lvert\sigma\rvert}=\frac{\pi}{10{,}5}=0{,}2992\ \text{s}</p>

Valor final: `$M_2(0) = 500/520 = 0{,}9615$` (error 3,85 %).

</details>

**Tabla 1 (teórico).**

| | `$t_p$` (s) | `$M_p$` (%) | `$t_s$` (s) |
|---|---|---|---|
| `$M_1(s)$` | — (sin pico) | 0 | 1,4830 |
| `$M_2(s)$` | 0,1552 | 19,60 | 0,2992 |

### 2.2 Sistema discreto

`$G(z)$` con polos `$0{,}905$` y `$0{,}135$` y `$T = 0{,}1$` s. Ganancia significativa unitaria: `$G(1) = 1$`.

<p class="eq" data-tex>G(z)=\frac{k}{(z-0{,}905)(z-0{,}135)},\qquad k=(1-0{,}905)(1-0{,}135)=0{,}082175</p>

El denominador es `$z^2 - 1{,}04z + 0{,}122175$`. (Observa que `$0{,}905 = e^{-1\cdot 0{,}1}$` y `$0{,}135 = e^{-20\cdot 0{,}1}$`: son los polos de `$G(s)$` muestreados.)

<details class="calc">
<summary><code>$M_1(z)$</code>, con <code>$F = 1$</code></summary>

<p class="eq" data-tex>M_1(z)=\frac{0{,}082175}{z^2-1{,}04z+0{,}20435}</p>

Polos: `$z = (1{,}04 \pm  \sqrt{0{,}2642})/2$` ⇒ `$0{,}7770$` y `$0{,}2630$`. **Reales**: sobreamortiguada, sin pico, `$M_p = 0 \%$`.

- Dominante: `$0{,}7770$` ⇒ `$k_s = \lceil -\pi /\ln  0{,}7770\rceil  = \lceil 12{,}45\rceil  = 13$` muestras ⇒ `$t_s =$` **1,3 s**.
- Valor final: `$M_1(1) = 0{,}082175/0{,}16435 = 0{,}5$`.

</details>

<details class="calc">
<summary><code>$M_2(z)$</code>, con <code>$F = 6{,}25$</code></summary>

<p class="eq" data-tex>M_2(z)=\frac{0{,}5136}{z^2-1{,}04z+0{,}6358}</p>

Con `$6{,}25\cdot 0{,}082175 = 0{,}5136$`. Polos: `$z = 0{,}5200 \pm  0{,}6045j$` (complejos). **Subamortiguada**.

<p class="eq" data-tex>\lvert p\rvert=\sqrt{0{,}6358}=0{,}7974,\qquad \varphi=\arctan\frac{0{,}6045}{0{,}5200}=0{,}8604\ \text{rad}</p>

- **Pico:** `$k_p = \pi /\varphi  = 3{,}6515$` muestras ⇒ `$t_p = 0{,}3651\,\text{s}$`.
- **Sobreimpulso:** `$M_p = \lvert p\rvert ^{\pi /\varphi} = 0{,}7974^{3{,}6515} =$` **43,74 %**.
- **Establecimiento:** `$k_s = \lceil -\pi /\ln  0{,}7974\rceil  = \lceil 13{,}87\rceil  = 14$` ⇒ `$t_s = 1{,}4\,\text{s}$`.
- Valor final: `$M_2(1) = 0{,}5136/0{,}5958 = 0{,}8621$`.

Aquí no se suma ningún retardo a `$k_p$`: `$M_2$` ya es un segundo orden canónico, sin el `$1/z$` extra del ejercicio 5.

</details>

**Tabla 2 (teórico).**

| | `$t_p$` (s) | `$M_p$` (%) | `$t_s$` (s) |
|---|---|---|---|
| `$M_1(z)$` | — (sin pico) | 0 | 1,3 |
| `$M_2(z)$` | 0,3651 | 43,74 | 1,4 |

## Laboratorio con Matlab

El script completo es `practica4.m`. Lo esencial de cada apartado:

```matlab
G  = zpk([], [-1 -20], 20);                 % apartado 1: G(0) = 1
M1 = feedback(1*G, 1);   pole(M1)           % apartado 2
M2 = feedback(25*G, 1);  pole(M2)           % apartado 3
step(M1); step(M2)

T  = 0.1;                                    % apartado 5
Gz = zpk([], [0.905 0.135], 0.095*0.865, T);
M1z = feedback(1*Gz, 1);   M2z = feedback(6.25*Gz, 1);
step(M1z, 0:T:5); step(M2z, 0:T:5)
```

Truco: `stepinfo(M, 'SettlingTimeThreshold', 0.05)` da `PeakTime`, `Overshoot` y `SettlingTime` con la banda del 5 %, en vez de leer sobre la gráfica con el cursor.

### Tabla 1 completa (continuo)

| | `$t_p$` teór. | `$M_p$` teór. | `$t_s$` teór. | `$t_p$` Matlab | `$M_p$` Matlab | `$t_s$` Matlab |
|---|---|---|---|---|---|---|
| `$M_1(s)$` | — | 0 % | 1,4830 | — | 0 % | 1,478 |
| `$M_2(s)$` | 0,1552 | 19,60 % | 0,2992 | 0,156 | 19,6 % | 0,233 |

### Tabla 2 completa (discreto)

| | `$t_p$` teór. | `$M_p$` teór. | `$t_s$` teór. | `$t_p$` Matlab | `$M_p$` Matlab | `$t_s$` Matlab |
|---|---|---|---|---|---|---|
| `$M_1(z)$` | — | 0 % | 1,3 | — | 0 % | 1,4 |
| `$M_2(z)$` | 0,3651 | 43,74 % | 1,4 | 0,4 | 48,1 % | 1,3 |

### Preguntas del apartado 4 (continuo)

<div class="qa">

**¿Ventaja de aumentar la ganancia?**

Sí, doble:
- **Transitorio:** `$t_s$` baja de 1,48 s a unos 0,3 s: el polo dominante pasa de `$-2{,}1$` a `$-10{,}5$`.
- **Permanente:** el valor final sube de 0,5 a 0,96. El error al escalón cae del 50 % al 3,85 % (`$1/(1 + K_p)$`, con `$K_p = 25$`).
- **Coste:** aparece sobreimpulso (0 % → 19,6 %), porque los polos pasan de reales a complejos.

</div>

<div class="qa">

**¿Por qué difieren `$t_s$` medido y teórico?**

En `$M_2$` (0,233 s frente a 0,299 s): `$\pi /\lvert \sigma\rvert$` calcula cuándo la **envolvente** de la oscilación baja del 5 %, y es una cota conservadora. La respuesta real solo se queda fuera de la banda mientras un **pico** la supera. Aquí el único que lo hace es el primero (19,6 %); el siguiente valle es de unos 3,8 %, ya dentro de la banda. Además `$\pi$` es un redondeo de `$\lvert \ln  0{,}05\rvert  = 2{,}9957$`. En `$M_1$` (1,478 frente a 1,483) casi coinciden porque el segundo polo es 9 veces más rápido y apenas influye.

</div>

### Pregunta del apartado 8 (discreto)

<div class="qa">

**¿Qué cambia al subir la ganancia en discreto?**

Misma ventaja y mismo coste, pero mayor: el valor final pasa de 0,5 a 0,862 (error del 13,8 %), y el sobreimpulso se dispara hasta ≈ 44–48 %. Dos observaciones:

- El `$M_p$` medido (48,1 %) supera al teórico (43,7 %) porque el pico real de la secuencia cae en la muestra `$k = 4$`, no en `$k_p = 3{,}65$`: en discreto solo se ve la muestra, y la fórmula usa la envolvente continua.
- `$t_s$` medido (1,3 s) y teórico (1,4 s) coinciden dentro de una muestra.

</div>

## Apartado 3.3: rango de estabilidad

`$G'(s)$` con polos en `$0$`, `$-1$` y `$-10$` y ganancia significativa unitaria. Tiene un polo en el origen, así que la ganancia significativa es `$K_v = \lim  s\cdot G'(s) = 1$`:

<p class="eq" data-tex>G'(s)=\frac{10}{s\,(s+1)(s+10)}</p>

```matlab
Gp = zpk([], [0 -1 -10], 10);
```

### Continuo (apartados 9–11)

Ecuación característica: `$s^3 + 11s^2 + 10s + 10K = 0$`.

| K | Polos | Comportamiento |
|---|---|---|
| 0,18 | −10,020; −0,736; −0,244 | sobreamortiguado |
| 0,23765 | −10,026; −0,491; −0,483 | críticamente amortiguado |
| 3 | −10,312; −0,344 ± 1,671j | subamortiguado |
| 11 | −11; ± 3,162j | oscilación sostenida |
| 12 | −11,075; 0,038 ± 3,291j | inestable |

<details class="calc">
<summary>De dónde salen los límites exactos</summary>

- **Amortiguamiento crítico (polo doble):** se da en el punto de ruptura del eje real entre 0 y −1. Con `$K = -s(s + 1)(s + 10)/10$`, `$\frac{dK}{ds} = 0$` ⇒ `$3s^2 + 22s + 10 = 0$` ⇒ `$s = -0{,}4869$` (el otro, `$-6{,}8465$`, no está en el lugar de las raíces). Entonces `$K = 0{,}2377$`.
- **Límite de estabilidad (Routh):** la fila `$s^1$` es `$(11\cdot 10 - 10K)/11 \gt  0$` ⇒ `$K \lt  11$`. Con `$K = 11$` la fila `$s^2$` da `$11s^2 + 110 = 0$` ⇒ `$s = \pm  j\sqrt{10} = \pm  3{,}162j$`.
- **Periodo de la oscilación sostenida:** `$T = 2\pi /\omega  = 2\pi /3{,}162 = 1{,}987\,\text{s}$`.

</details>

**Rangos (apartado 10):**

| Comportamiento | Rango de K |
|---|---|
| Sobreamortiguado | `$0 \lt  K \lt  0{,}2377$` |
| Críticamente amortiguado | `$K = 0{,}2377$` |
| Subamortiguado | `$0{,}2377 \lt  K \lt  11$` |
| Oscilación sostenida | `$K = 11$` |
| Inestable | `$K \gt  11$` |

**Periodo (apartado 11):** `$T_{\mathrm{osc}} = 1{,}987\,\text{s}$` (con `$K = 11$`).

### Discreto (apartados 12–14)

El equivalente ZOH a `$T = 0{,}1$` s (`c2d(Gp, T, 'zoh')`) es:

<p class="eq" data-tex>BG'(z)=\frac{0{,}001287z^2+0{,}003984z+0{,}000744}{z^3-2{,}2727z^2+1{,}6056z-0{,}3329}</p>

| K | Polos | `$\lvert p\rvert$` | ∠p (rad) | Comportamiento |
|---|---|---|---|---|
| 0,16 | 0,9793; 0,9264; 0,3668 | 0,9793 | 0 | sobreamortiguado |
| 0,232 | 0,9531 ± 0,0006j; 0,3663 | 0,9531 | ≈ 0 | críticamente amortiguado |
| 2,4 | 0,9586 ± 0,1435j; 0,3524 | 0,9693 | 0,1485 | subamortiguado |
| 7,15 | 0,9680 ± 0,2509j; 0,3276 | 0,9999 | 0,2536 | oscilación sostenida |
| 8 | 0,9693 ± 0,2650j; 0,3237 | 1,0049 | 0,2669 | inestable |

**Rangos (apartado 13):**

| Comportamiento | Rango de K |
|---|---|
| Sobreamortiguado | `$0 \lt  K \lt  0{,}232$` |
| Críticamente amortiguado | `$K \approx  0{,}232$` |
| Subamortiguado | `$0{,}232 \lt  K \lt  7{,}16$` |
| Oscilación sostenida | `$K \approx  7{,}16$` |
| Inestable | `$K \gt  7{,}16$` |

**Periodo (apartado 14):** en el límite, `$\angle p = 0{,}2537$` rad, así que `$k_d = 2\pi /0{,}2537 = 24{,}8$` muestras y `$T_{\mathrm{osc}} = 24{,}8\cdot 0{,}1 =$` **2,48 s**.

Compara con el continuo: el límite baja de `$K = 11$` a `$K \approx  7{,}16$`, y el periodo sube de 1,99 s a 2,48 s. El muestreo con ZOH añade un retardo de media muestra (`$T/2$`) y resta margen.

## Explicación de la resolución

**1. El método es siempre el mismo.** Cerrar el lazo, hallar los polos de `$1 + KG = 0$`, clasificarlos y aplicar las fórmulas de la tabla de polos. Todo lo demás (`$t_p$`, `$M_p$`, `$t_s$`) sale de ahí.

| Polos de lazo cerrado | Respuesta | Qué se calcula |
|---|---|---|
| Reales distintos | Sobreamortiguada | Solo `$t_s$` (del dominante) |
| Reales iguales | Críticamente amortiguada | `$t_s$` (≈ 1,6 veces mayor), sin pico |
| Complejos | Subamortiguada | `$t_p$`, `$M_p$`, `$t_s$` |
| Sobre eje imaginario / círculo unidad | Oscilación sostenida | Periodo |
| Fuera | Inestable | Nada |

**2. Qué hace subir la ganancia con los polos.** En `$M_1$` y `$M_2$` el polo lento `$-1$` y el rápido `$-20$` se acercan al subir `$K$`, chocan y se vuelven complejos (`$-10{,}5 \pm  20{,}2j$`). En 3.3, el lugar de las raíces se va al semiplano derecho: de ahí el límite en `$K = 11$`.

**3. Por qué el discreto sobrepasa tanto más.** Con `$F = 6{,}25$` los polos discretos quedan en `$\lvert p\rvert  = 0{,}797$` y `$\varphi  = 0{,}86\,\text{rad}$`, es decir, un periodo de ≈ 7,3 muestras. Como `$M_p = \lvert p\rvert ^{\pi /\varphi}$`, el sobreimpulso es la envolvente `$\lvert p\rvert ^{k}$` evaluada en el pico, `$k_p = \pi /\varphi  = 3{,}65$`: cuanto mayor es `$\varphi$`, antes llega el pico y menos ha decaído la envolvente. Aquí solo han pasado 3,65 muestras y la envolvente aún vale 0,44.

**4. Cómo conectar con el resto del Tema 2.** `$0{,}905 = e^{-1\cdot 0{,}1}$` y `$0{,}135 = e^{-20\cdot 0{,}1}$`: son los polos de `$G(s)$` pasados por `$z = e^{sT}$`. El polo dominante de `$M_1(s)$`, `$-2{,}1185$`, se convertiría en `$e^{-0{,}2118} = 0{,}809$`, no en `$0{,}777$` como sale en `$M_1(z)$`. Es normal: `$G(z)$` de la práctica no es la discretización ZOH de `$G(s)$`: no tiene el cero que aparecería. Los polos viajan por `$e^{sT}$` solo en el sistema abierto.

**5. Errores típicos.**
- Dar `$t_p$` para `$M_1$`: con polos reales no hay pico.
- Usar el polo rápido para `$t_s$`: manda el más lento.
- Olvidar multiplicar por `$T$` al pasar de muestras a segundos.
- Mezclar K: `$F = 25$` en continuo y `$F = 6{,}25$` en discreto no son equivalentes.
- Medir `$M_p$` respecto a 1 en vez de respecto al valor final (0,9615 y 0,8621).

## Herramienta

Mueve `$K$` para ver cómo los polos recorren el plano s (o z) y cómo cambia la respuesta. Los cinco botones fijan las ganancias del código de la práctica.

<div data-widget="p4-barrido"></div>

**Qué comprobar**
- Continuo: de `$K = 0{,}18$` a `$0{,}23765$` los dos polos lentos se acercan y chocan; con `$K = 3$` forman un par complejo.
- Con `$K = 11$` los polos están en el eje imaginario y la respuesta oscila sin apagarse, con periodo 1,99 s.
- Discreto: lo mismo, pero el límite es el círculo unidad (`$\lvert p\rvert  = 1$`) y aparece antes, en `$K \approx  7{,}16$`.
