@echo off
setlocal
cd /d "%~dp0"

rem ----- port and url -----
set "PORT=8787"
set "URL=http://localhost:%PORT%"

rem ----- locate node (PATH first, then managed fallback) -----
set "NODE_EXE="
for %%i in (node.exe) do set "NODE_EXE=%%~$PATH:i"
if not defined NODE_EXE (
  set "NODE_EXE=C:\Users\Administrator\.workbuddy\binaries\node\versions\22.12.0\node.exe"
)
if not exist "%NODE_EXE%" (
  echo [ERROR] node not found. Install Node.js or add it to PATH.
  pause
  exit /b 1
)

rem ----- start server in a new window (close that window to stop) -----
echo Starting server at %URL%
start "WoWS APP Server" "%NODE_EXE%" server.js

rem ----- wait until server is ready (poll /api/ping, max ~10s) -----
set "READY=0"
for /L %%t in (1,1,10) do (
  curl -s -o nul -w "%%{http_code}" "%URL%/api/ping" 2>nul | findstr "200" >nul && (set "READY=1" & goto :open)
  timeout /t 1 >nul
)
if "%READY%"=="0" echo [WARN] server may not have started; still opening browser.

:open
rem ----- open in Microsoft Edge (exe first, then protocol, then default) -----
set "EDGE_EXE="
for %%i in (msedge.exe) do set "EDGE_EXE=%%~$PATH:i"
if not defined EDGE_EXE (
  if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" set "EDGE_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)
if defined EDGE_EXE (
  start "" "%EDGE_EXE%" "%URL%"
) else (
  start "" "microsoft-edge:%URL%"
)

exit /b 0
