@echo off
net session >nul 2>&1 || (echo Ejecute este archivo como Administrador. & pause & exit /b 1)
sc stop AplixCashFlowAgente >nul 2>&1
timeout /t 3 /nobreak >nul
sc delete AplixCashFlowAgente
echo Servicio eliminado.
pause
