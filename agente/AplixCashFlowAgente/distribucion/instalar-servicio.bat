@echo off
setlocal
cd /d "%~dp0"
net session >nul 2>&1 || (echo Ejecute este archivo como Administrador. & pause & exit /b 1)
findstr /C:"\"Token\": \"\"" appsettings.json >nul && (echo Falta el Token en appsettings.json. Genere uno en Parametros ^> Agente local. & pause & exit /b 1)
sc query AplixCashFlowAgente >nul 2>&1 && (echo El servicio ya existe. Reinicielo o ejecute desinstalar-servicio.bat. & pause & exit /b 1)
sc create AplixCashFlowAgente binPath= "\"%~dp0AplixCashFlowAgente.exe\"" start= delayed-auto DisplayName= "Aplix Cash Flow Agente"
sc description AplixCashFlowAgente "Sincroniza Softland con Aplix Cash Flow por HTTPS saliente."
sc failure AplixCashFlowAgente reset= 86400 actions= restart/60000/restart/60000/restart/60000
sc start AplixCashFlowAgente
echo Servicio instalado e iniciado.
pause
