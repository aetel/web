---
layout: post.njk
title: LightWand Kosmonaut V1. Lightpainting with Arduino taken a step further
description: >-
  ¿What is Lightpainting? The origin of the Lightpainting technique is linked to
  the origin of photography itself. The first photographic panels, whose
  chemicals were…
date: '2015-10-28'
author: PablodMM
lang: en
translation: 616-lightwand-kosmonaut-v1-lightpainting-con-arduino-llevado-al
---
<h2>¿What is Lightpainting?</h2>
<p>The origin of the <em>Lightpainting</em> technique is linked to the origin of photography itself. The first photographic panels, whose chemicals were extremely little sensitive to light, needed several minutes to properly capture an image. These first photographs often resulted in blurry figures that little resembled the customers portrayed. On contrast, any lamp or intruder light that travelled a path while the shutter was open, got immortalized in the photograph with great sharpness.</p>
<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Etienne-Jules Marey and George Demeny decided to take advantage of this circumstance and in 1882 they inaugurated the <em>Station Psicologique</em> where they used different inventions and a primitive <em>Lightpainting</em> technique to study the human movement. The first image that made use of this technique is this one in which the human movement during a jump was studied:</p>
<img src="/assets/img/noticias/637-Etienne-Jules-Marey-Chronophotography-300x240.jpg" alt="Etienne-Jules-Marey-Chronophotography">

Figure 1: Athleth’s jump, Etienne-Jules Marey and Georges Demeny (1889)
<p>Since then, a lot of enthusiasts and artists have developed techniques and tools to get the <em>Lightpaint</em> a step forward. <em>Light Spheres</em>, texturized light and different stencils, but nothing as advanced as the <em>LightWand</em>.</p>
<h2>¿What’s the <em>LightWand</em>?</h2>
<p>Through LED technology and the indexed RGB LED stripes (individual control of each LED) made popular by <em>Sparkfun</em>, the same concept has been developed by different developers independently.</p>
<p>A <em>LightWand </em>is a LED bar controlled through a microcontroller that sequentially emit the pixel rows of an image. If, while the camera has the shutter open and a low ISO sensibility, the user displaces the <em>LightWand </em>&nbsp;through the frame, it results in an image that resembles a hologram and inserts the image into the photograph:</p>
<img src="/assets/img/noticias/637-10480223_10152548609487255_3453799919726229748_n.jpg" alt="10480223_10152548609487255_3453799919726229748_n">
<img src="/assets/img/noticias/637-Picture1.png" alt="Picture1">


<p>This tool went popular in the Internet due to a <em>Kickstarter</em>[1]&nbsp;by&nbsp;<em>Bitbanger Labs</em> in which they presented <em>Pixelstick</em>[2]. <em>Pixelstick</em> quickly achieved the amount of investment necessary for its development and nowadays is the only commercial option to get this tool. Sadly, its price is high (349$) and sells preferably to the US. Additionally, it is a commercial product and therefore it is not suitable for modifications or changes by the user, being limited to its original Firmware and Hardware.</p>
<p>But before <em>Pixelstick</em>, Michael Ross[3] -an American photography enthusiast with technique education – had already publish in his blog a primitive version of his <em>LightWand </em>. This tool didn’t achieve great repercussion due to its poor publicity and it resulted a little&nbsp;unattractive and hard to handle tool – But the idea and the program were great -.</p>
<p>During last year, I decided to build a <em>LightWand </em>for private uses. After several versions solving the different lacks of Michael Ross’s <em>LightWand</em>, I developed the <em>LightWand Kosmonaut</em> V1 that I documented and publishes in Github some months ago.</p>
<h2>¿How is it?</h2>
<p>My objective in this project was to make this version cheap, light and easy to build. For this reason I decided to use an <em>Arduino Mega 1280</em> as the microcontroller and a <em>Neopixel </em>144LED/m LED stripe. The result is a compact controlled based on an <em>Arduino Shield PCB</em> that includes a Nokia 5110 screen for monitoring and some minor extra functionalities as a <em>Buzzer</em> and external connections.</p>
<p>The <em>LightWand Kosmonaut</em> reads the images stored in a microSD card in .<em>pnm</em> format and projects them through the LED stripe, allowing the user the control over the brightness and the delay between each pixel row.</p>
<p>It has a 1m length (defined by the LED stripe longitude) but it can programed to control multiple LED stripe with different lengths and densities. One of the dimensions of the projected images is the limited by the LED stripe used while the other dimension can have several meters.</p>
<img src="/assets/img/noticias/637-Lightwand_Full.jpg" alt="Lightwand_Full">
<img src="/assets/img/noticias/637-Lightwand.jpg" alt="Lightwand">

<p>The main problem this tool has is that the result of the photograph depends on the speed at which the user makes the movement, being the result sometimes unpredictable. In the following sequence three examples are shown of the shots in the same conditions but with different results.</p>
<img src="/assets/img/noticias/637-Picture21.png" alt="Picture2">

<p>Afterwards, the photograph can be improved with slight brightness and contrast corrections with any photo edition software.</p>
<p>The price of the <em>LigthWand Kosmonaut</em> purchasing the material through <em>Ebay</em> or <em>Aliexpress </em>is of around 50€ (Depending on the €/$ fluctuations), being a very economic and reliable alternative to <em>Pixelstick</em> for those users with enough knowledge to build it.</p>
<h2>¿Which were the main difficulties?</h2>
<p>The <em>LightWand </em>I have developed has gone through many stages, from the first 60LED/m version whose results were not acceptable to not stable non-PCB versions.</p>
<img src="/assets/img/noticias/637-Picture3.png" alt="Picture3">

<p>One of the main initial problems was to use <em>Arduino UNO</em>, with a very limited <em>SRAM</em> that was not able to handle the <em>Neopixel</em> library, the Nokia 5110 screen and the microSD (That loads in the <em>RAM</em> the whole file, not allowing a sequential read). The limitations of the <em>Arduino UNO</em> and the lack of debugging lead to the use of the <em>Arduino MEGA 1280</em> (Also cheap and a lot more powerful).</p>
<p>After the first prototype I discovered the work of Michael Ross and I implemented one of his functions and a couple advises regarding his failed experiments with the <em>Arduino UNO</em>.</p>
<p>The last step was to create the PCB reducing its dimensions to a <em>Arduino Shield</em> and documenting the whole project along with a guide that covered the whole process. All the necessary documentation can be found in <em>Github</em>:</p>
<p><a href="https://github.com/PabloDMM/LightWand_KosmonautEd" target="_blank" rel="noopener">https://github.com/PabloDMM/LightWand_KosmonautEd</a></p>
<h2>¿What is left to be done?</h2>
<p>The next steps to be done for posterior versions of the <em>LightWand Kosmonaut</em> are:</p>
<ul>
<li>Implement the reading of <em>.bmp</em> files (A lot more common than <em>.pnm</em>)</li>
<li>Implement an accelerometer to automatically control the sequence of pixel rows. This would inhibit the human mistake of the process.</li>
<li>Implement <em>Bluetooth</em> connectivity (Not with a specific objective yet).</li>
<li>Develop a mechanism to make the <em>LightWand </em>more portable.</li>
</ul>
<p>Away from the technics, the main objective is to create a small community of users using it and developing upgrades and share them through the web. In this direction, the publicity made thorough the social networks (FB, Instagram[4]) have been useless. During the 2015/2016 academic year AETEL plans to make a workshop with CAT in which assistants can buy and build a <em>LightWand</em>, expanding its presence at least in a local spectre.</p>
<p>[1] <em>Pixelstick </em>– Lightpainting Evolved(2013), <em>Bitbanger Labs, Kickstarter project</em>, https://www.kickstarter.com/projects/bitbangerlabs/<em>Pixelstick</em>-light-painting-evolved</p>
<p>[2] <em>Pixelstick </em>Homepage(nd), <em>Bitbanger Labs</em>, http://www.the<em>Pixelstick</em>.com</p>
<p>[3] Michael Ross Photography and Light Painting (2014), <em>Michael Ross</em>, <a href="http://mrossphoto.com/wordpress32/" target="_blank" rel="noopener">http://mrossphoto.com/wordpress32/</a></p>
<p>[4] Instagram Profile (2015), Arsene_lupin_<em>LightWand </em>, <a href="https://instagram.com/arsene_lupin_lightwand/" target="_blank" rel="noopener">https://instagram.com/arsene_lupin_<em>LightWand </em>/</a></p>
