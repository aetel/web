---
layout: post.njk
title: Configurar stm32f3 para Tau Labs Flying F3
description: >-
  En este tutorial configuraremos la placa de desarrollo stm32f3 para poder
  controlar las entradas y salidas de la placa mediante el software Tau Labs.
  Tau Labs es un…
date: '2015-10-28'
author: ocanen
lang: es
translation: 608-configure-stm32f3-for-tau-labs-flying-f3
---
<p>En este tutorial configuraremos la placa de desarrollo stm32f3 para poder controlar las entradas y salidas de la placa mediante el software Tau Labs.</p>
<p>Tau Labs es un proyecto Open Source con el objetivo de crear un stack de código de calidad para el control de multirotores y otros VANT. El desarrollo está realizado integralmente por voluntarios. No dudes visitar su <a href="http://taulabs.org" target="_blank" rel="noopener">web</a> si quieres saber más.</p>
<ol>
<li>Nos bajamos <a href="http://www.st.com/web/en/catalog/tools/FM147/SC1887/PF258168?s_searchtype=keyword" target="_blank" rel="noopener">STM32 ST-LINK Utility</a>.</li>
<li>Nos bajamos la <a href="http://taulabs_next_20151022_033609_ff82223574_linux_amd64.tar.xz" target="_blank" rel="noopener">última versión del firmware</a>. Puedes encontrar todas las versiones <a href="http://jenkins.taulabs.org/artifacts/?C=M;O=D" target="_blank" rel="noopener">aquí</a>.</li>
<li>Nos bajamos la última versión de <a href="http://taulabs.org/" target="_blank" rel="noopener">Tau Labs</a>.</li>
<li>Conectamos el conector USB ST-LINK de la placa stm32 al usb del pc.</li>
<li>Instalamos el STM32 ST-LINK Utility</li>
<li>Conectamos la placa al software con <em>target-&gt;connect</em></li>
<img src="/assets/img/noticias/601-imagen-st-link-1024x695.png" alt="imagen st link">
<li>Borramos la información de la placa mediante <em>target-&gt; erase chip</em></li>
<li>Descomprimimos el firmware.</li>
<li>En STM32 ST-LINK Utility&nbsp; open-&gt; open file y cargamos el fichero bl_discoveryf3.bin que está dentro del fichero que acabamos de descomprimir (<em>firmware-&gt; fichero</em>)</li>
<li>Cargamos el firmware en la placa por medio de STM32 ST-LINK Utility&nbsp; en <em>target-&gt; program &amp; verify</em></li>
<li>Y ya lo tenemos cargado, arrancamos Tau Labs y el resultado es el siguiente:</li>
<img src="/assets/img/noticias/601-2015-10-22.jpg" alt="2015-10-22">
</ol>
