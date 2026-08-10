---
layout: post.njk
title: Create the most absurd chat of the world with Arduino
description: >-
  Are you bored and looking for some entertainment? Would you like to fastly
  create a chat to avoid leaving your chair or sofa to talk with your flatmate?
  Would you like…
date: '2016-02-25'
author: Javierma
lang: en
translation: 1045-crea-al-chat-mas-absurdo-del-mundo-con-arduino
---
<p>Are you bored and looking for some entertainment? Would you like to fastly create a chat to avoid leaving your chair or sofa to talk with your flatmate? Would you like to know more about AT commands and practice with them? Whatever your question or interest, in this tutorial you can learn to create a chat using Arduino and Bluetooth.</p>
<p><strong>Required materials:</strong></p>
<ul>
<li>Two Bluetooth modules(e.g. HC-05 and/or HC-06). One of them must be HC-05 in order to be able to stablish the communication.</li>
<li>Arduino or&nbsp; USB to RS-232 converter. Any of them are valid, being necessary a total of 2.</li>
<li>Arduino software, putty or other software that allows using Windows COM port or /dev/tty/USBX, /dev/tty/ACMX or similar in case of Linux environment.</li>
<li>Prototyping cables to connect the Bluetooth modules with the Arduino board or converter.</li>
<li>USB – USB&nbsp;mini/micro cable to connect the Arduino or converter with your computer.</li>
<li>Protoboard</li>
</ul>
<p><strong>Steps to follow:</strong></p>
<p>If you are using an Arduino, make sure that you upload and empty program. That is, a program containing both setup and loop methods to avoid compilation errors. This way, you make sure that nothing interferes in what you pretend to do.</p>
<img src="/assets/img/noticias/1099-img1-1.png" alt="img1">

<p>Once the step is done, proceed to connect the different parts:</p>
<ul>
<li>Connect VCC (5V) with Bluetooth’s VCC</li>
<li>Connect GND with GND.</li>
<li>In the Bluetooth module which will create the connection, connect Key pin with VCC (that will allow to execute the AT commands).</li>
<li>For TX and RX pins, connectivity will depend on the module use and the Arduino or converter, usually&nbsp; TX to RX and RX to TX. In case of doubt, there are several ways to check:</li>
<li>Depending on the Bluetooth module, you may find arrows indicating if it is input or output.</li>
<li>With or without indication, you can connect your Arduino or converter to Arduino software, open Serial Monitor and send a ramdon character to see if TX LED flashes. If that is the case, the connectivity was done well.</li>
</ul>
<p>Done this step, you will start executing the AT commands that will allow connecting to the other Bluetooth module and communicate with it. In case of using Arduino software:</p>
<ul>
<li>Go to Tools-&gt;Board and select the board (in case of using a converter, this step is not necessary).</li>
<img src="/assets/img/noticias/1099-img2-1.png" alt="img2">
</ul>

<ul>
<li>Go to Tools-&gt;Port to indicate the port where the device is connected.</li>
<img src="/assets/img/noticias/1099-img3-1.png" alt="img3">
</ul>

<ul>
<li>Open Serial Monitor and select a baudrate of 38400 and Both NL&amp;CR as line ending.</li>
<img src="/assets/img/noticias/1099-img5-1.png" alt="img5">
<img src="/assets/img/noticias/1099-img4-1.png" alt="img4">
</ul>

<p>If these steps were done without problems, you can proceed to create the connection using the AT commands. To do so:</p>
<ul>
<li>Write AT and press send or Enter key. If everything was ok, you will receive an OK as an answer. If you receive an error, repeat until you get an OK (if nothing appears in the screen, check that RX and TX pins are well connected).</li>
<img src="/assets/img/noticias/1099-img6-1.png" alt="img6">
</ul>

<ul>
<li>Configure the module as master with AT+ROLE=1. As in the previous step, you should receive ‘OK’.</li>
<img src="/assets/img/noticias/1099-img7-1.png" alt="img7">
</ul>

<ul>
<li>Initialize the SPP profile. That will allow the search and connection with another Bluetooth device. To do so, execute AT+INIT.</li>
<img src="/assets/img/noticias/1099-img8-1.png" alt="img8">
</ul>

<ul>
<li>Indicate that the device has an access key with AT+IAC=9e8b33.</li>
<img src="/assets/img/noticias/1099-img9-1.png" alt="img9">
</ul>

<ul>
<li>Indicate that the Bluetooth device you are going to connect with is class 0 with AT+CLASS=0.</li>
<img src="/assets/img/noticias/1099-img10-1.png" alt="img10">
</ul>

<ul>
<li>Search for device with AT+INQM=1,9,48 (1-&gt;RSSI intention indication, 9-&gt;Maximum number of devices to add to the list, 48-&gt;Multiplied by 1.28 to calculate the maximum search time).</li>
<img src="/assets/img/noticias/1099-img11-1.png" alt="img11">
</ul>

<ul>
<li>List the found devices with AT+INQ:</li>
<img src="/assets/img/noticias/1099-img13-1.png" alt="img13">
<img src="/assets/img/noticias/1099-img12-1.png" alt="img12">
</ul>


<ul>
<li>Pair with the target device with AT+PAIR=bluetooth_address,max_response_time. For example, if you desire to connect with the one with MAC address 11:9:50114 (some of the zeros are not shown and the rest you can see in the line is not part of the physical address), the command is AT+PAIR=11,9,50114,20 (you have to substitute : by , ). If the pair was done, you will receive ‘OK’.</li>
<img src="/assets/img/noticias/1099-img15-1.png" alt="img15">
</ul>

<ul>
<li>Link with the target device with AT+LINK=bluetooth_address (remember to substitute : by , ). If the link is done, you will receive an OK and the blink of the LED will change.</li>
<img src="/assets/img/noticias/1099-img16-1.png" alt="img16">
</ul>

<p>Ready! Now you can communicate through Bluetooth!</p>
<p>To finish, open Arduino Software in the other communication side (Note: in case of testing in the same computer both sides of the communication, you must run other software like Energia or Putty, as though Windows opens other Arduino instances, it doesn’t allow to choose another port in that instance). In that side, open the serial monitor or equivalent with a baudrate of 9600 bps.</p>
<img src="/assets/img/noticias/1099-img18-1.png" alt="img18">

<p>If you want to know more about the AT commands, you can have a look at the guide available at <a href="http://www.instructables.com/id/AT-command-mode-of-HC-05-Bluetooth-module/" target="_blank" rel="noopener">Instructables</a></p>
