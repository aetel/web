---
layout: post.njk
title: Configure STM32F3 for Tau Labs Flying F3
description: >-
  In this tutorial we’ll configure a stm32f3 development board to control its
  GPIO with the Tau Labs software stack. Tau Labs is an Open Source project
  aimed to create…
date: '2015-10-28'
author: ocanen
lang: en
translation: 601-configurar-stm32f3-para-tau-labs-flying-f3
---
<p>In this tutorial we’ll configure a stm32f3 development board to control its GPIO with the Tau Labs software stack.</p>
<p>Tau Labs is an Open Source project aimed to create high quality code for controlling multirotors and other UAVs. The developement is driven entirely by volunteers donating their time in pursuit of this goal.&nbsp;Please see their&nbsp;<a href="http://taulabs.org/about.html" target="_blank" rel="noopener">about page</a>&nbsp;for a long description of our goals objectives.</p>
<ol>
<li>Download&nbsp;<a href="http://www.st.com/web/en/catalog/tools/FM147/SC1887/PF258168?s_searchtype=keyword" target="_blank" rel="noopener">STM32 ST-LINK Utility</a>.</li>
<li>Download&nbsp;the&nbsp;<a href="http://taulabs_next_20151022_033609_ff82223574_linux_amd64.tar.xz" target="_blank" rel="noopener">last firmware version</a>. You can find all the versions&nbsp;<a href="http://jenkins.taulabs.org/artifacts/?C=M;O=D" target="_blank" rel="noopener">here</a>.</li>
<li>Download the last&nbsp;<a href="http://taulabs.org/" target="_blank" rel="noopener">Tau Labs</a>&nbsp;version.</li>
<li>Connect&nbsp;the board to you PC via&nbsp;USB ST-LINK.</li>
<li>Install STM32 ST-LINK Utility</li>
<li>Connect to the board&nbsp;(<em>target-&gt;connect</em>)</li>
<img src="/assets/img/noticias/608-imagen-st-link-1024x695.png" alt="imagen st link">
<li>Erase all info on the microcontroller (<em>target-&gt; erase chip</em>)</li>
<li>Untar the firmware</li>
<li>In STM32 ST-LINK Utility do <em>open-&gt; open file</em> and load the file bl_discoveryf3.bin&nbsp;found inside the firmware folder</li>
<li>Load the firmware to the board via STM32 ST-LINK Utility with <em>target-&gt; program &amp; verify</em></li>
<li>And we are done. Start Tau Labs and you should get this:</li>
<img src="/assets/img/noticias/608-2015-10-22.jpg" alt="2015-10-22">
</ol>
