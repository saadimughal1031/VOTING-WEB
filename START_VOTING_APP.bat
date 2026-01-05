@echo off
SETLOCAL EnableDelayedExpansion

echo ===================================================
echo   VOTING SYSTEM - ONE CLICK RUNNER (STABLE V6)
echo ===================================================

:: 1. Cleanup old processes using window titles
echo [1/4] Cleaning up old background tasks...
taskkill /f /fi "WINDOWTITLE eq Voting Backend" /t >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq Voting Frontend" /t >nul 2>&1
echo Done.

:: 2. Setup/Start Backend
echo.
echo [2/4] Starting Backend Server...
set "BACKEND_DIR=%~dp0backend-node"
if not exist "!BACKEND_DIR!" (
    echo [ERROR] Backend directory not found at: "!BACKEND_DIR!"
    pause
    exit /b 1
)

:: CD into the directory FIRST to avoid space issues in arguments
cd /d "!BACKEND_DIR!"

if not exist "node_modules\" (
    echo node_modules missing. Installing...
    call npm.cmd install
)

echo Launching Backend window...
start "Voting Backend" cmd /k "node server.js"

:: 3. Start Frontend server
echo.
echo [3/4] Starting Frontend Server...
set "FRONTEND_DIR=%~dp0frontend"
if not exist "!FRONTEND_DIR!" (
    echo [ERROR] Frontend directory not found at: "!FRONTEND_DIR!"
    pause
    exit /b 1
)

:: CD into the directory FIRST to avoid space issues in arguments
cd /d "!FRONTEND_DIR!"

echo Launching Frontend window...
:: Serving '.' from within the frontend directory
start "Voting Frontend" cmd /k "npx.cmd http-server . -p 3000"

:: 4. Launch Browser
echo.
echo [4/4] Launching your browser...
echo Waiting 5 seconds...
ping 127.0.0.1 -n 6 >nul
start http://localhost:3000

echo.
echo ===================================================
echo   COMPLETED! 
echo.
echo   Check the "Voting Backend" and "Voting Frontend" 
echo   windows for startup messages.
echo ===================================================
echo.
pause
