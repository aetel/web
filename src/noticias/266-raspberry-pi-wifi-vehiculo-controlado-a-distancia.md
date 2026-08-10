---
layout: post.njk
title: 'Raspberry Pi WIFI, vehículo controlado a distancia'
description: >-
  Hola, gracias a Ricardo Hernández, a Óscar Canencia en AETEL y en la semana de
  la ciencia «taller de robotica» en la E.U.I.T.Telecomunicaciones de la UPM,
  conseguimos un…
date: '2013-10-16'
author: ocanen
lang: es
translation: 505-raspberry-pi-wifi-remotely-controlled-vehicle
---
<p>Hola, gracias a Ricardo Hernández, a Óscar Canencia en AETEL y en la semana de la ciencia «taller de robotica» en la E.U.I.T.Telecomunicaciones de la UPM, conseguimos un coche teledirigido con webcam y controlado por PC con Wifi, teneis un ejemplo en la siguiente foto:</p>
<img src="/assets/img/noticias/266-DSC_1131.jpg" alt="vehiculorpi">

<h3>El código que se ha utilizado para controlarlo desde el PC (creado en Python) es el siguiente:</h3>
#!/usr/bin/env python
# -*- coding: utf-8 -*-
#script inicial
#creacion: 01-11-12
#ultima modificacion: 03-11-12
#version:0.0.6
# File:client.py
import pygame
from pygame.locals import *
import socket # Import socket module
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM) # Create a socket object
host = '192.168.2.1' #socket.gethostname() # Get local machine name
port = 5556 # Reserve a port for your service.
print 'Connecting to ', host, port
s.connect((host, port))
def sendcommand(tecla):
byte1 = chr(tecla)
#byte2 = chr(camera*8+laser_set*4+int(infrared_set)*2+int(light_set))
s.send(byte1)
opcion='y'
import msvcrt
print "press 'escape' to quit..."
while 1:
char = msvcrt.getch()
if char == chr(27):
break
print char,
if char == chr(97):
print "pulsó a"
sendcommand(97)
elif char == chr(119):
print "pulsó w"
sendcommand(119)
elif char == chr(115):
print "pulsó s"
sendcommand(115)
elif char == chr(100):
print "pulsó d"
sendcommand(100)
elif char == chr(112):
print "pulsó d"
sendcommand(112)
elif char == chr(113):
#cerrar la conexion y salir
print "Goodbye"
import sys
sys.exit(0)
<h3>Ejecutar dos sesiones ssh, cada una ejecutando el comando de control y de video.</h3>
<h3>Comando para cargar el servidor para controlar el coche:</h3>
sudo./server2.py
<h3>Código de server2:</h3>
#!/usr/bin/python
import socket # Import socket module
s = socket.socket() # Create a socket object
host = '' # Get local machine name
port = 5556 # Reserve a port for your service.
import serial
DEVICE = '/dev/ttyACM0' # the arduino serial interface (use dmesg when connectin$
BAUD = 9600
ser = serial.Serial(DEVICE, BAUD,timeout=1)
print 'Server started!'
print 'Waiting for clients...'
s.bind((host, port)) # Bind to the port
s.listen(5) # Now wait for client connection.
c, addr = s.accept() # Establish connection with client.
print 'Got connection from', addr
while True:
msg = c.recv(1) # get 2 bytes from the TCP connection
print 'Got connection from', msg
ser.write(msg) # write the 2 bytes to the serial interface
#mesg = ser.read()
#print 'respuesta', mesg
<h3>Comando para cargar el servidor de video streaming para visualizar lo que vé el coche:</h3>
gst-launch -v v4l2src ! ffmpegcolorspace ! video/x-raw-yuv,width=320,height=240,framerate=(fraction)30/1 ! queue ! videorate ! video/x-raw-yuv,framerate=20/1 ! jpegenc ! multipartmux ! tcpserversink host=192.168.2.1 port=5000 sync=false
<h3>Configuracion el /etc/network/interfaces para configurar la configuracion wifi wlan0:</h3>
auto lo
iface lo inet loopback
iface eth0 inet static
address 192.168.1.100
netmask 255.255.255.0
gateway 192.168.1.1
auto wlan0
iface wlan0 inet static
address 192.168.2.1
netmask 255.255.255.0
gateway 192.168.2.2
wireless-channel 5
wireless-essid MYNETWORK
wireless-mode ad-hoc
iface default inet dhcp
<p><strong>Adjuntamos un video demostración:</strong>
</p>
