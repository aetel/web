% Practica 4: Analisis de sistemas de control en regimen transitorio
% Criterio del curso: |ln(0.05)| ~ pi  ->  ts = pi/|sigma| (continuo), ks = ceil(-pi/ln|p|) (discreto)
clear; close all; clc

%% 3.1 Sistema continuo -----------------------------------------------
G = zpk([], [-1 -20], 20);            % ganancia significativa unitaria: G(0) = 20/20 = 1

M1 = feedback(1*G, 1)                 % F = 1, H = 1
pole(M1)
figure('name', 'M1(s)'); step(M1)
info1 = stepinfo(M1, 'SettlingTimeThreshold', 0.05)

M2 = feedback(25*G, 1)                % F = 25
pole(M2)
figure('name', 'M2(s)'); step(M2)
info2 = stepinfo(M2, 'SettlingTimeThreshold', 0.05)

%% 3.2 Sistema discreto -------------------------------------------------
T  = 0.1;
kg = (1 - 0.905) * (1 - 0.135);       % G(1) = 1
Gz = zpk([], [0.905 0.135], kg, T);

M1z = feedback(1*Gz, 1)
pole(M1z)
figure('name', 'M1(z)'); step(M1z, 0:T:5)
info1z = stepinfo(M1z, 'SettlingTimeThreshold', 0.05)

M2z = feedback(6.25*Gz, 1)
pole(M2z)
figure('name', 'M2(z)'); step(M2z, 0:T:5)
info2z = stepinfo(M2z, 'SettlingTimeThreshold', 0.05)

%% 3.3 Rango de estabilidad: continuo -------------------------------------
Gp = zpk([], [0 -1 -10], 10);         % G'(s) = 10/(s(s+1)(s+10)), Kv = 1

for K = [0.18 0.23765 3 11 12]
	disp(['Ganancia K= ' num2str(K)])
	M = feedback(K*Gp, 1);
	pole(M)
	figure('name', ['K= ' num2str(K)]); step(M)
end

% Valores exactos
den = conv([1 0], conv([1 1], [1 10]));        % s(s+1)(s+10)
ruptura = roots(polyder(den));                 % puntos de ruptura: -0.4869 y -6.8465
sr = ruptura(ruptura > -1 & ruptura < 0);      % el valido es -0.4869 (el otro, -6.8465, no esta en el lugar)
Kcrit_c = -polyval(den, sr) / 10               % K = 0.2377
[Kmarg_c, ~, wcg] = margin(Gp);                % Kmarg_c = 11, wcg = sqrt(10) rad/s
Tosc_c = 2*pi / wcg                            % 1.987 s

%% 3.3 Rango de estabilidad: discreto ---------------------------------------
BGp = c2d(Gp, T, 'zoh');

for K = [0.16 0.232 2.4 7.15 8]
	disp(['Ganancia K= ' num2str(K)])
	M = feedback(K*BGp, 1);
	p = pole(M);
	Mod_p = abs(p)
	Fas_p = angle(p)
	figure('name', ['K= ' num2str(K)]); step(M, 0:T:20)
end

[Kmarg_d, ~, wcg_d] = margin(BGp);             % Kmarg_d = 7.16, wcg_d = fase/T
Tosc_d = 2*pi / wcg_d                          % 2.476 s (24.76 muestras)

%% 4. Prueba: preguntas tipo ------------------------------------------------

% 4.1 Tiempo de pico en lazo cerrado con dos polos reales (G con polos -2 y -20, F = 2, H = 1)
G41 = zpk([], [-2 -20], 40);                  % G(0) = 40/40 = 1
M41 = feedback(2*G41, 1);
p41 = pole(M41)                               % -12 y -10: reales distintos
hayPico = any(abs(imag(p41)) > 1e-9)          % 0: no existe tiempo de pico
figure('name', 'Prueba 4.1'); step(M41)

% 4.2 Clasificar el comportamiento a partir de los polos de un sistema discreto
polos42 = [0.6463+0.6427i; 0.2488+1.2008i];   % K = 10 y K = 40
Mod42 = abs(polos42)                          % 0.9115 (<1: subamortiguado) y 1.2263 (>1: inestable)
Fas42 = angle(polos42)
tipoRespuesta([0.9990; 0.9990], true)         % polo doble real: criticamente amortiguado
tipoRespuesta(polos42(1), true)
tipoRespuesta(polos42(2), true)

% 4.3 Planta inestable G(s) = 9/((s-1)(s+9)) con regulador proporcional K
G43 = zpk([], [1 -9], 9);
fprintf('\n%6s %-8s %-26s %-26s %9s %9s %9s\n', 'K', 'Estable', 'Polos', 'Amortiguamiento', 'ts (s)', 'tp (s)', 'Mp (%)');
for K = [1 2.8 4.6 0.01]
	M = feedback(K*G43, 1);
	[~, i] = sort(real(pole(M)));
	p = pole(M); p = p(i);
	estable = all(real(p) < 0);
	ts = NaN; tp = NaN; Mp = NaN;
	if estable
		sg = -max(real(p));
		ts = pi / sg;
		if any(abs(imag(p)) > 1e-3)
			tp = pi / max(imag(p));
			Mp = 100 * exp(-pi * sg / max(imag(p)));
		end
	end
	fprintf('%6.2f %-8s %-26s %-26s %9.4f %9.4f %9.2f\n', K, string(estable), num2str(p.', 4), tipoRespuesta(p, false), ts, tp, Mp);
end

Kcrit43 = 1 + ((9-1)/2)^2 / 9                 % 2.7778: polo doble en s = -4
Kmin43 = 1                                    % K > 1 para estabilidad: s^2 + 8s + 9(K-1)

% Con polo doble el ts de pi/sigma no vale: se mide en la grafica
Mcrit = feedback(Kcrit43*G43, 1);
figure('name', 'Prueba 4.3 critico'); step(Mcrit)
infoCrit = stepinfo(Mcrit/dcgain(Mcrit), 'SettlingTimeThreshold', 0.05)   % ts ~ 1.19 s

% 4.4 Orden de los argumentos de feedback: regulador F = 2 en serie, realimentacion H = 3
g = zpk([], [-1 -2], 2);
Mok  = feedback(2*g, 3);                      % M = F*G / (1 + F*G*H)
Mmal = feedback(3*g, 2);                      % F y H intercambiados: otro sistema
[pole(Mok) pole(Mmal)]

% 4.5 Simplificar a orden 1: solo si hay un polo dominante
Mrapido = zpk([], [-1 -15], 15);
Mred    = zpk([], -1, 1);                     % se conserva el polo lento y la ganancia estatica
figure('name', 'Prueba 4.5'); step(Mrapido, Mred); legend('orden 2', 'orden 1')

Mconj = tf(25, [1 2 25]);                     % polos -1 +/- 4.9j: misma parte real, sin dominante
pole(Mconj)

% 4.6 Definir en Matlab una FdeT discreta (T = 40 ms)
T = 0.04;
X1 = zpk([], [0.2 0.6], 3, T)                 % 3/((z-0.2)(z-0.6))
X2 = tf(3, conv([1 0.2], [1 0.6]), T)         % 3/((z+0.2)(z+0.6)) = 3/(z^2 + 0.8z + 0.12)
pole(X2)                                      % -0.2 y -0.6 (en tf se dan los coeficientes, no los polos)
Xmal = tf([3], [0.2 0.6], T)                  % 3/(0.2z + 0.6): un solo polo en z = -3

%% Funciones locales -------------------------------------------------------
function t = tipoRespuesta(p, discreto)
	tol = 1e-3;
	if discreto && any(abs(p) > 1 + tol)
		t = 'inestable';
	elseif all(abs(imag(p)) < tol)
		if numel(p) > 1 && abs(p(1) - p(2)) < tol
			t = 'criticamente amortiguado';
		else
			t = 'sobreamortiguado';
		end
	else
		t = 'subamortiguado';
	end
end
