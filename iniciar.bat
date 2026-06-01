@echo off
echo =========================================
echo   CATAMINER@S - Iniciando servidor
echo =========================================
echo.

REM Matar cualquier proceso que use el puerto 8080
echo Liberando puerto 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8080" ^| find "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

node --version >nul 2>&1
IF %ERRORLEVEL% == 0 (
    echo Servidor iniciando...
    echo Abri Chrome en: http://localhost:8080
    echo Las fotos se guardan en la carpeta: fotos\
    echo Para cerrar presiona Ctrl+C
    echo.
    node server.js
    goto :end
)

echo ERROR: Node.js no encontrado.
echo Instala Node.js desde https://nodejs.org/
pause

:end
