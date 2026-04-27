@echo off
REM Future Pinball Web - Startup (Windows)
REM Usage: start-game.bat [1|2|3|auto] [port]
REM Default: auto-detect (recommended)

setlocal enabledelayedexpansion

set SCREENS=%1
if "%SCREENS%"=="" set SCREENS=auto

set PORT=%2
if "%PORT%"=="" set PORT=5173

set BASE_URL=http://localhost:%PORT%
set PROJECT_DIR=%~dp0
set PID_FILE=%PROJECT_DIR%.fpw-server.pid

if not "%SCREENS%"=="1" if not "%SCREENS%"=="2" if not "%SCREENS%"=="3" if not "%SCREENS%"=="auto" (
  echo X Invalid screen hint: %SCREENS%
  echo   Usage: %0 [1^|2^|3^|auto] [port]
  exit /b 1
)

echo.
echo +==================================================================+
echo ^|                  Future Pinball Web - Game Startup               ^|
echo +==================================================================+
echo.

REM Detect screen count via PowerShell (informational)
for /f %%A in ('powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::AllScreens.Length" 2^>nul') do set DETECTED=%%A
if "%DETECTED%"=="" set DETECTED=1

if "%SCREENS%"=="auto" (
  echo + Screen hint: auto (OS reports %DETECTED% display^(s^)^)
) else (
  echo + Screen hint: %SCREENS%
)
echo + Base URL:    %BASE_URL%
echo + Project:     %PROJECT_DIR%
echo.

REM Check if dev server already running
set SERVER_PID=
for /f "tokens=5" %%A in ('netstat -ano ^| find ":%PORT%" ^| find "LISTENING"') do set SERVER_PID=%%A

if "%SERVER_PID%"=="" (
  echo Starting Vite dev server on port %PORT%...
  cd /d "%PROJECT_DIR%"
  start "Future Pinball Dev Server" /MIN cmd /c "npm run dev"

  echo Waiting for server...
  set ATTEMPTS=0
  :wait_loop
  set /a ATTEMPTS+=1
  if !ATTEMPTS! GTR 30 (
    echo X Server failed to start within 30s
    exit /b 1
  )
  timeout /t 1 /nobreak >nul
  netstat -ano | find ":%PORT%" | find "LISTENING" >nul
  if errorlevel 1 goto wait_loop

  REM Capture the PID once it's up
  for /f "tokens=5" %%A in ('netstat -ano ^| find ":%PORT%" ^| find "LISTENING"') do set SERVER_PID=%%A
  if not "%SERVER_PID%"=="" (
    echo %SERVER_PID% > "%PID_FILE%"
    echo + Dev server started (PID: %SERVER_PID%)
  )
) else (
  echo + Dev server already running on port %PORT% (PID: %SERVER_PID%)
)

echo.
echo Opening primary window - the app will spawn role-specific
echo windows (backglass, DMD) onto extra screens automatically.
echo.

start "" "%BASE_URL%/?screens=%SCREENS%"

echo.
echo +==================================================================+
echo ^| + Startup complete                                                ^|
echo +==================================================================+
echo ^| Controls                                                          ^|
echo ^|   Z / M           Left / Right Flipper                            ^|
echo ^|   SPACE           Tilt        ENTER  Launch Ball                  ^|
echo ^|   1 / 2 / 3 / 4   Quality presets (Low / Medium / High / Ultra)   ^|
echo ^|   P               Performance monitor                             ^|
echo ^|   ESC             Exit / Return to Menu                           ^|
echo ^|                                                                   ^|
echo ^| Multi-screen                                                      ^|
echo ^|   Grant 'Window Management' permission on first run.              ^|
echo ^|                                                                   ^|
echo ^| To stop the server                                                ^|
echo ^|   Run: stop-game.bat                                              ^|
echo +==================================================================+
echo.
