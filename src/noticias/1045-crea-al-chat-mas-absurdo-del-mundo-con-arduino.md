---
layout: post.njk
title: Crea al chat más absurdo del mundo con Arduino
description: >-
  ¿Te aburres y quieres entretenerte con lo que sea? ¿Quieres crear rápidamente
  un chat para no tener que levantarte a hablar con tu compañero de piso que se
  encuentra en…
date: '2016-02-25'
author: Javierma
lang: es
translation: 1099-create-the-most-absurd-chat-of-the-world-with-arduino
---
<p>¿Te aburres y quieres entretenerte con lo que sea? ¿Quieres crear rápidamente un chat para no tener que levantarte a hablar con tu compañero de piso que se encuentra en la habitación de al lado? ¿Te interesa saber un poco más acerca de los comandos AT y quieres practicar con ellos? Sea cual sea tu pregunta o interés, en este tutorial podrás aprender a crear rápidamente un chat mediante el uso de Arduino y Bluetooth.</p>
<p><strong>Materiales requeridos:</strong></p>
<ul>
<li>Dos módulos Bluetooth (por ejemplo, HC-05 y/o HC-06). Uno de ellos deberá ser HC-05 para poder establecer la comunicación.</li>
<li>Arduino o conversor USB a RS-232. Cualquiera de ambos resulta válido, siendo necesario un total de dos para poder establecer la comunicación.</li>
<li>Arduino IDE, Putty u otro que nos permita utilizar el puerto COM si hablamos de Windows o /dev/tty/USBX, /dev/tty/ACMX u otro en caso de encontrarnos en un entorno Linux.</li>
<li>Cables para prototipado para conectar los módulos Bluetooth con las placas de Arduino o conversores.</li>
<li>Cable USB – mini USB para la conexión del Arduino o conversor con el ordenador</li>
<li>Placa protoboard</li>
</ul>
<p><strong>Pasos a seguir:</strong></p>
<p>Si se dispone de un Arduino en cualquiera de los extremos, deberá subirse a la placa un programa vacío, es decir, que contenga únicamente los métodos setup y loop ya que en caso contrario dará error de compilación. Con esto, aseguramos que no se está ejecutando ningún programa en la placa que pueda interferir en lo que queremos realizar.</p>
<img src="/assets/img/noticias/1045-img1-1.png" alt="img1">

<p>Una vez realizado este paso, procedemos a realizar las conexiones:</p>
<ul>
<li>Conectamos VCC (5V) de Arduino o del conversor con el de nuestro módulo Bluetooth</li>
<li>Conectamos GND con GND.</li>
<li>Si el módulo Bluetooth es el que se realizará la conexión, deberá conectarse el pin Key con VCC (esto nos permitirá ejecutar los comandos AT).</li>
<li>Para los pines TX y RX, la conectividad dependerá del módulo utilizado y del Arduino o conversor. Normalmente se conecta TX con RX y RX con TX. En caso de duda, existen varias formas de comprobación:</li>
<li>Dependiendo del módulo Bluetooth, puedes encontrar unas flechas indicativas de si el pin es de entrada o de salida.</li>
<li>Tanto si existe como si no este indicador, puedes probar a conectar los pines y conectar tu Arduino al ordenador, abrir Serial Monitor y enviar un carácter cualquiera para comprobar si el led etiquetado como TX se enciende. Si es el caso, la conectividad es la correcta.</li>
</ul>
<p>Realizado este paso, procedemos a realizar los comandos AT que nos permitirán conectarnos a otro módulo Bluetooth y comunicarnos con él. En caso de disponer de Arduino software:</p>
<ul>
<li>Ir a Tools-&gt;Board y seleccionar la placa (si la placa a la que está conectado el módulo es un conversor, este paso no resulta necesario).</li>
<img src="/assets/img/noticias/1045-img2-1.png" alt="img2">
</ul>

<ul>
<li>Ir a Tools-&gt;Port e indicar el puerto al que está conectado.</li>
<img src="/assets/img/noticias/1045-img3-1.png" alt="img3">
</ul>

<ul>
<li>Abrir Serial Monitor y seleccionar un baudrate de 38400 y Both NL&amp;CR como final de línea.</li>
<img src="/assets/img/noticias/1045-img5-1.png" alt="img5">
<img src="/assets/img/noticias/1045-img4-1.png" alt="img4">
</ul>

<ul>
<li>Si hasta este momento no se produce problema alguno, puede procederse a la realización de la conexión mediante el uso de los comandos AT. Para ello:</li>
<li>Escribir AT y presionar el botón send o la tecla Enter. Si todo es correcto, nos llegará un OK como respuesta. Si no es así, comprobar que los pasos anteriores se han realizado correctamente (en caso de que no aparezca nada en la pantalla enviado el comando, es posible que TX y RX estén conectados al revés). En caso de error, repetir hasta recibir ‘OK’.</li>
<img src="/assets/img/noticias/1045-img6-1.png" alt="img6">
</ul>

<ul>
<li>Configuramos el módulo con el rol de maestro mediante el comando AT+ROLE=1. Al igual que en el paso anterior, deberá responder con ‘OK’.</li>
<img src="/assets/img/noticias/1045-img7-1.png" alt="img7">
</ul>

<ul>
<li>Inicializamos el perfil SPP, que nos permitirá la búsqueda y conexión con otro dispositivo. Para ello, ejecutamos el comando AT+INIT.</li>
<img src="/assets/img/noticias/1045-img8-1.png" alt="img8">
</ul>

<ul>
<li>Indicamos que el dispositivo tiene clave de acceso mediante AT+IAC=9e8b33.</li>
<img src="/assets/img/noticias/1045-img9-1.png" alt="img9">
</ul>

<ul>
<li>Indicamos el tipo de Bluetooth del dispositivo a conectarnos mediante AT+CLASS=0.</li>
<img src="/assets/img/noticias/1045-img10-1.png" alt="img10">
</ul>

<ul>
<li>Indicamos el modo de búsqueda de otros dispositivos mediante AT+INQM=1,9,48 (1-&gt;Indicación de intención RSSI, 9-&gt;Número máximo de dispositivos a añadir en la lista, 48-&gt;Multiplica por 1.28 para calcular el tiempo máximo de búsqueda).</li>
<img src="/assets/img/noticias/1045-img11-1.png" alt="img11">
</ul>

<ul>
<li>Listaremos los dispositivos encontrados mediante AT+INQ, que nos devolverá un listado con los dispositivos encontrados:</li>
<img src="/assets/img/noticias/1045-img13-1.png" alt="img13">
<img src="/assets/img/noticias/1045-img12-1.png" alt="img12">
</ul>


<ul>
<li>Emparejamos con nuestro dispositivo mediante AT+PAIR=dirección_bluetooth,tiempo_max_respuesta. Si, por ejemplo, queremos conectar con el que tiene de MAC 11:9:50114 (algunos de los ceros de la MAC no se muestran y la coma y lo posterior no forman parte de dicha dirección física), el comando será AT+PAIR=11,9,50114,20 (hay que sustituir : por , ). Si todo va bien, recibirás un ‘OK’</li>
<img src="/assets/img/noticias/1045-img15-1.png" alt="img15">
</ul>

<ul>
<li>Enlazamos mediante AT+LINK=dirección_bluetooth (recuerda aquí también sustituir : por , ). Si todo va bien, recibirás un ‘OK’ y verás que el parpadeo del LED cambia con respecto a cómo lo hacía antes</li>
<img src="/assets/img/noticias/1045-img16-1.png" alt="img16">
</ul>

<ul>
<li>¡Listo!¡Ya podemos comunicarnos a través de Bluetooth!</li>
<li>Para finalizar, abre Arduino en el otro extremo de la comunicación (Nota: si estás realizando pruebas en el mismo equipo deberás ejecutar otro software como Energia o Putty, ya que en Windows aun abriendo distintas instancias de Arduino no permite elegir en cada una de ellas un puerto distinto). En dicho extremo, abriremos el serial monitor o equivalente a 9600 bps.</li>
<img src="/assets/img/noticias/1045-img17-1.png" alt="img17">
</ul>

<p>Si quieres saber más a fondo el motivo por los que utilizaste estos comandos o saber más sobre los comandos AT, puedes consultar la guía en <a href="http://www.instructables.com/id/AT-command-mode-of-HC-05-Bluetooth-module/" target="_blank" rel="noopener">Instructables</a></p>
