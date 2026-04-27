@echo off
REM Future Pinball Web - Startup Script for Windows
REM Usage: start-game.bat [1|2|3]
REM Default: Auto-detect screens

setlocal enabledelayedexpansion

set SCREENS=%1
if "%SCREENS%"=="" (
  set SCREENS=auto
)

set PORT=%2
if "%PORT%"=="" (
  set PORT=5173
)

set BASE_URL=http://localhost:%PORT%
set PROJECT_DIR=%~dp0

echo.
echo ╔════════════════════════════════════════════════════════════════════╗
echo ║                  Future Pinball Web - Game Startup                 ║
echo ╚════════════════════════════════════════════════════════════════════╝
echo.

REM Validate screen count
if "%SCREENS%"=="1" (
  echo ✓ Screen mode: 1 screen (explicit^)
) else if "%SCREENS%"=="2" (
  echo ✓ Screen mode: 2 screens (explicit^)
) else if "%SCREENS%"=="3" (
  echo ✓ Screen mode: 3 screens (explicit^)
) else if "%SCREENS%"=="auto" (
  echo ℹ Screen mode: AUTO-DETECT on first launch
) else (
  echo ✗ Invalid screen count: %SCREENS%
  echo   Usage: %0 [1^|2^|3^|auto]
  exit /b 1
)

echo ✓ Base URL: %BASE_URL%
echo ✓ Project: %PROJECT_DIR%
echo.

REM Check if dev server is already running
for /f "tokens=5" %%A in ('netstat -ano ^| find ":%PORT%"') do (
  set SERVER_PID=%%A
)

if "%SERVER_PID%"=="" (
  echo 🚀 Starting Vite dev server on port %PORT%...
  cd /d "%PROJECT_DIR%"
  start "Future Pinball Dev Server" npm run dev

  echo ⏳ Waiting for server to start...
  timeout /t 5 /nobreak
) else (
  echo ✓ Dev server already running on port %PORT% (PID: %SERVER_PID%^)
)

echo.

REM Open browser windows
if "%SCREENS%"=="1" (
  echo 🎮 Launching single-screen mode...
  echo    → Main playfield window opening...

  set URL=%BASE_URL%/?screens=1
  start "" "%URL%"

) else if "%SCREENS%"=="2" (
  echo 🎮 Launching dual-screen mode...
  echo    → Screen 1 (Playfield) opening...
  echo    → Screen 2 (Backglass) opening...

  timeout /t 2 /nobreak

  set URL_PLAYFIELD=%BASE_URL%/?screens=2^&screen=1
  start "" "%URL_PLAYFIELD%"

  timeout /t 1 /nobreak

  set URL_BACKGLASS=%BASE_URL%/?screens=2^&screen=2
  start "" "%URL_BACKGLASS%"

) else if "%SCREENS%"=="3" (
  echo 🎮 Launching triple-screen mode...
  echo    → Screen 1 (Left playfield) opening...
  echo    → Screen 2 (Center playfield) opening...
  echo    → Screen 3 (Backglass) opening...

  timeout /t 2 /nobreak

  set URL_LEFT=%BASE_URL%/?screens=3^&screen=1
  start "" "%URL_LEFT%"

  timeout /t 1 /nobreak

  set URL_CENTER=%BASE_URL%/?screens=3^&screen=2
  start "" "%URL_CENTER%"

  timeout /t 1 /nobreak

  set URL_BACKGLASS=%BASE_URL%/?screens=3^&screen=3
  start "" "%URL_BACKGLASS%"

) else (
  echo 🎮 Launching with auto-detect...
  echo    → Main window opening (screen count will auto-detect)...

  set URL=%BASE_URL%/?screens=auto
  start "" "%URL%"
)

echo.
echo ╔════════════════════════════════════════════════════════════════════╗
echo ║ ✓ Game startup complete!                                           ║
echo ╠════════════════════════════════════════════════════════════════════╣
echo ║                                                                    ║
echo ║ Controls:                                                          ║
echo ║   Z / M         - Left / Right Flipper                             ║
echo ║   SPACE         - Tilt                                             ║
echo ║   ENTER         - Launch Ball                                      ║
echo ║   P             - Performance Monitor                              ║
echo ║   1, 2, 3       - Quality Presets (Low, Medium, High, Ultra)       ║
echo ║   ESC           - Exit / Return to Menu                            ║
echo ║                                                                    ║
echo ║ Multi-Screen Tips:                                                 ║
echo ║   • Use for arcade cabinet setup with multiple displays            ║
echo ║   • Each screen runs in separate browser window                    ║
echo ║   • Sync via BroadcastChannel API (same-origin only)               ║
echo ║   • Full-screen each window for best cabinet experience            ║
echo ║                                                                    ║
echo ╚════════════════════════════════════════════════════════════════════╝
echo.
