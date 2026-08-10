---
layout: post.njk
title: LightWand Kosmonaut V1. Lightpainting con Arduino llevado al siguiente nivel
description: >-
  ¿Qué es Lightpainting? El origen de la técnica del Lightpainting está ligado
  al origen de la fotografía misma. Las primeras placas fotográficas, cuyos
  químicos eran…
date: '2015-10-28'
author: PablodMM
lang: es
translation: 637-lightwand-kosmonaut-v1-lightpainting-with-arduino-taken-a-st
---
<h2>¿Qué es Lightpainting?</h2>
<p>El origen de la técnica del <em>Lightpainting</em> está ligado al origen de la fotografía misma. Las primeras placas fotográficas, cuyos químicos eran dramáticamente poco sensibles a la luz, necesitaban de varios minutos para captar una imagen. Estas primeras fotos a menudo resultaban en figuras borrosas que poco recordaban a los clientes retratados. Sin embargo, cualquier lámpara o brillo intruso que recorriese una trayectoria durante la apertura del obturador quedaba inmortalizada en la película con una nitidez insolente.</p>
<p>Etienne-Jules Marey y Georges Demeny decidieron aprovechar esta particularidad para fundar en 1882 la <em>Station Psicologique</em> donde utilizaron distintos ingenios y la primitiva técnica del <em>Lightpainting</em> para estudiar el movimiento humano[1]. La primera imagen que se considera que hizo uso de esta técnica fue esta en la que se estudiaba el movimiento humano durante el salto:</p>
<img src="/assets/img/noticias/616-Etienne-Jules-Marey-Chronophotography-300x240.jpg" alt="Etienne-Jules-Marey-Chronophotography">

Ilustración 1: Salto de atleta, Etienne-Jules Marey y Georges Demeny (1889)
<p>Desde entonces, muchos artistas y entusiastas han desarrollado técnicas y herramientas para llevar el <em>Lightpainting</em> un paso más allá. Esferas luminosas, luces con texturas y distintas plantillas, pero nada tan avanzado como el <em>Lightwand</em>.</p>
<h2>¿Qué es el <em>Lightwand</em>?</h2>
<p>A través de la tecnología LED, y de las tiras de LED RGB indexables (acceso individual a cada LED) popularizadas por <em>Sparkfun</em>[2], el mismo concepto ha sido desarrollado por distintos desarrolladores de forma independiente.
Un <em>Lightwand</em> es una barra de LEDs controlada por un microcontrolador que emite secuencialmente las filas de pixeles de una imagen. Si mientras la cámara hace una foto con el obturador abierto y baja sensibilidad ISO durante unos segundos, el usuario desplaza el <em>Lightwand</em> por el plano, el resultado es una imagen que recuerda a un holograma y que inserta fielmente una imagen en la fotografía:</p>
<img src="/assets/img/noticias/616-10480223_10152548609487255_3453799919726229748_n.jpg" alt="10480223_10152548609487255_3453799919726229748_n">
<img src="/assets/img/noticias/616-Picture1.png" alt="Picture1">

<h2>
¿Cómo es?</h2>
<p>Esta herramienta se hizo muy popular en Internet debido a un <em>Kickstarter</em>[3] de <em>Bitbanger Labs</em> en el que presentaban <em>Pixelstick</em>[4]. <em>Pixelstick</em> alcanzó rápidamente la cantidad necesaria para su desarrollo y hoy en día es la única opción comercial para hacerse con esta herramienta. Por desgracia, su precio es alto (349$) y vende preferentemente a EEUU. Además, esta herramienta es un producto comercial y por lo tanto no es susceptible a modificaciones o cambios por parte del usuario, estando así limitado a su Firmware y Hardware original.</p>
<p>Pero previo a <em>Pixelstick</em>, Michael Ross[5] -un aficionado americano a la fotografía con educación técnica-&nbsp; ya había publicado en su blog la primitiva versión de su <em>Lightwand</em>. Esta no logró gran repercusión dado que fue pobremente promocionada y resultaba una herramienta aparatosa y en apariencia vulgar (no así sus resultados).</p>
<p>Durante el año pasado, decidí montar un <em>Lightwand</em> para experimentos privados. Tras varias versiones solventando las distintas carencias del <em>Lightwand</em> original de Michael Ross, llevé a cabo el <em>Lightwand</em> <em>Kosmonaut</em> V1 que documenté y publiqué en<em> Github</em> hace unos meses.</p>
<p>Mi objetivo a la hora de desarrollar esta versión era hacerlo barato, ligero y fácil de montar. Para ello decidí usar un <em>Arduino</em> <em>Mega 1280</em> como microcontrolador y una tira de LEDs <em>Neopixel </em>RGB con 144LED/m. El resultado es un controlador compacto basado en una PCB <em>Shield</em> de <em>Arduino</em> que incorpora una pantalla Nokia 5110 para su manejo y algunas funcionalidades menores como un <em>Buzzer</em> y conexiones externas.</p>
<p>El <em>Lightwand</em> <em>Kosmonaut</em> lee las imágenes almacenadas en una microSD en formato <em>.pnm </em>y las proyecta a través de la barra de LEDs pudiendo el usuario controlar tanto el brillo como el <em>delay </em>entre las filas de pixeles.</p>
<p>Tiene una longitud de un metro (marcada por la longitud de la tira de LEDs) aunque se puede programar para controlar tiras de LEDs de otras longitudes y densidades. Una de las dimensiones de las imágenes proyectadas está por tanto limitada por la tira de LEDs utilizada mientras que la otra dimensión puede ser de muchos metros.</p>
<img src="/assets/img/noticias/616-Lightwand_Full.jpg" alt="Lightwand_Full">
<img src="/assets/img/noticias/616-Lightwand.jpg" alt="Lightwand">


<p>El principal problema que presenta es que el resultado de la foto depende de la velocidad a la que la mueva el usuario, siendo el resultado a veces imprevisible. En la siguiente secuencia se muestran tres intentos en las mismas condiciones pero con evidente distinto resultado.</p>
<img src="/assets/img/noticias/616-Picture21.png" alt="Picture2">

<p>Posteriormente, la imagen puede mejorarse con ligeras correcciones de brillo y contraste con cualquier programa de edición de foto convencional.</p>
<p>El precio del <em>Lightwand</em> <em>Kosmonaut</em> comprando los materiales a través de Ebay es de alrededor de 70€ (Dependiendo de las fluctuaciones del € y el $), siendo una opción muy asequible y una alternativa viable a <em>Pixelstick</em> para aquellos usuarios con los conocimientos necesarios para montarlo.</p>
<h2>¿Cuáles fueron las principales dificultades?</h2>
<p>El <em>Lightwand</em> que he desarrollado ha pasado por muchas fases, desde el primer prototipo de 60LED/m cuyo resultado no era ni de lejos aceptable hasta versiones sin PCB aparatosas y poco estables.</p>
<img src="/assets/img/noticias/616-Picture3.png" alt="Picture3">

<p>Uno de los principales problemas iniciales fue usar el <em>Arduino</em> UNO, con una limitadísima <em>SRAM</em> que no era capaz de implementar las herramientas de la librería <em>Neopixel </em>junto con el control de la pantalla <em>Nokia 5110</em> y la lectura de la tarjeta microSD (Que carga en <em>SRAM</em> el archivo leído, siendo inviable una lectura secuencial). Las limitaciones de <em>Arduino</em> UNO junto con la imposibilidad de <em>Debugging</em> llevaron al uso del <em>Arduino</em> MEGA 1280 (También bastante asequible y mucho más potente).</p>
<p>Después del primer prototipo descubrí el trabajo de Michael Ross e implemente una de sus funciones así como un par de consejos que me dio acerca de sus intentos frustrados de usar <em>Arduino</em> UNO.</p>
<p>El último paso fue crear la PCB ajustando sus dimensiones a las de un <em>Shield</em> y documentar todo el trabajo junto con una guía de montaje que abarcase todo el proceso. Toda la documentación necesaria puede ser encontrada en el <em>Github</em>:</p>
<p><a href="https://github.com/PabloDMM/LightWand_KosmonautEd" target="_blank" rel="noopener">https://github.com/PabloDMM/<em>Lightwand</em>_<em>Kosmonaut</em>Ed</a></p>
<h2>¿Qué queda por hacer?</h2>
<p>Los siguientes pasos a llevar a cabo para posibles versiones posteriores del <em>Lightwand</em> <em>Kosmonaut</em> son:</p>
<ul>
<li>Implementar lectura de archivos <em>.bmp</em> (Mucho más comunes como opción de exportación que los .<em>pnm</em>)</li>
<li>Implementar un acelerómetro que controle automáticamente la secuenciación de las filas de pixeles. Esta mejora, que evitaría la incertidumbre en el resultado, resulta sin embargo ambiciosa por la velocidad de procesamiento de <em>Arduino</em>. De ser posible el precio aumentaría alrededor de 10$ pero el resultado y la fiabilidad de la herramienta mejoraría considerablemente.</li>
<li>Implementar conectividad Bluetooth (Aun no se sabe bien con qué objetivo).</li>
<li>Idear un mecanismo de pliegue para hacer el <em>Pixelstick</em> más transportable.</li>
</ul>
<p>Fuera del plano técnico, el gran objetivo a cumplir es crear una comunidad de usuarios pequeña que además de usarlo y popularizarlo lo mejore y comparta su trabajo. En este sentido, la promoción llevada a cabo hasta ahora por las redes sociales (FB, Instagram[6]) ha sido inútil. Durante el curso 2015/2016 AETEL planea llevar a cabo junto a CAT un taller en el que los asistentes compren y monten un <em>Lightwand</em>, aumentando su presencia al menos a nivel local.</p>
<p>[1] Light Painting History(2015), <em>Light Painting Photography</em>, <a href="http://lightpaintingphotography.com/light-painting-history/" target="_blank" rel="noopener">http://lightpaintingphotography.com/light-painting-history/</a></p>
<p>[2] Sparkfun Homepage(nd), <em>Sparkfun Electronics</em>, <a href="https://www.sparkfun.com/" target="_blank" rel="noopener">https://www.sparkfun.com/</a></p>
<p>[3] <em>Pixelstick </em>– Lightpainting Evolved(2013), <em>Bitbanger Labs, Kickstarter project</em>, <a href="https://www.kickstarter.com/projects/bitbangerlabs/Pixelstick-light-painting-evolved" target="_blank" rel="noopener">https://www.kickstarter.com/projects/bitbangerlabs/<em>Pixelstick</em>-light-painting-evolved</a></p>
<p><a href="https://www.kickstarter.com/projects/bitbangerlabs/Pixelstick-light-painting-evolved" target="_blank" rel="noopener">[4]</a><a href="https://www.kickstarter.com/projects/bitbangerlabs/Pixelstick-light-painting-evolved" target="_blank" rel="noopener"> <em>Pixelstick </em>Homepage(nd), <em>Bitbanger Labs</em>, http://www.the<em>Pixelstick</em>.com</a></p>
<p>[5] Michael Ross Photography and Light Painting (2014), <em>Michael Ross</em>, <a href="http://mrossphoto.com/wordpress32/" target="_blank" rel="noopener">http://mrossphoto.com/wordpress32/</a></p>
<p>[6] Instagram Profile (2015), Arsene_lupin_lightwand, <a href="https://instagram.com/arsene_lupin_lightwand/" target="_blank" rel="noopener">https://instagram.com/arsene_lupin_lightwand/</a></p>
