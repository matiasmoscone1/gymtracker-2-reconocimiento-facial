@echo off

REM Iniciar el servidor Node.js en segundo plano

start /B node server.js



REM Esperar a que se cree el archivo port.txt

:esperar

if not exist port.txt (

    timeout /t 1 >nul

    goto esperar

)



REM Esperar unos segundos adicionales antes de abrir el navegador

timeout /t 3 >nul



REM Leer el puerto desde el archivo

set /p PORT=<port.txt



REM Abrir Google Chrome en el puerto correspondiente

start chrome http://localhost:%PORT%

REM Esperar hasta que se cierre el navegador (en este caso, Google Chrome)

:esperar_cierre

tasklist /FI "IMAGENAME eq chrome.exe" | findstr /I "chrome.exe" >nul

if errorlevel 1 (
REM Si Chrome ya no está en ejecución, salir del bucle
goto cerrar
)

timeout /t 2 > nul

goto esperar_cierre

:cerrar

REM Cerrar la ventana del cmd.exe
exit