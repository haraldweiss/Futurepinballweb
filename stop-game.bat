@echo off
REM Future Pinball Web - Stop dev server (Windows)
REM Usage: stop-game.bat [--force] [--port 5173]

setlocal enabledelayedexpansion

set PROJECT_DIR=%~dp0
set PID_FILE=%PROJECT_DIR%.fpw-server.pid
set PORT=5173
set FORCE=

:parse
if "%~1"=="" goto run
if /i "%~1"=="--force" set FORCE=/F & shift & goto parse
if /i "%~1"=="--port"  set PORT=%~2 & shift & shift & goto parse
shift
goto parse

:run
set STOPPED=0

if exist "%PID_FILE%" (
  set /p PID=<"%PID_FILE%"
  if not "!PID!"=="" (
    taskkill /T %FORCE% /PID !PID! >nul 2>&1 && (
      echo + Stopped server (PID: !PID!)
      set STOPPED=1
    )
  )
  del /q "%PID_FILE%" >nul 2>&1
)

if !STOPPED!==0 (
  for /f "tokens=5" %%A in ('netstat -ano ^| find ":%PORT%" ^| find "LISTENING"') do (
    taskkill /T %FORCE% /PID %%A >nul 2>&1 && (
      echo + Stopped process on :%PORT% (PID: %%A)
      set STOPPED=1
    )
  )
)

if !STOPPED!==0 (
  echo i No Future Pinball dev server running.
  exit /b 0
)

echo + Browser windows are not closed automatically - close them manually.
