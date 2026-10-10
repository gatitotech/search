@echo off
setlocal
set "site=%~dp0."
if "%~1"=="--preview" goto preview
set "message=%~1"
if "%message%"=="" set "message=Update Gatita Search"
git -c safe.directory=//192.168.18.157/server/Documents/CL4NKR/gatita-search -C "%site%" fetch origin main || exit /b 1
git -c safe.directory=//192.168.18.157/server/Documents/CL4NKR/gatita-search -C "%site%" merge --ff-only origin/main || exit /b 1
git -c safe.directory=//192.168.18.157/server/Documents/CL4NKR/gatita-search -C "%site%" add -A || exit /b 1
git -c safe.directory=//192.168.18.157/server/Documents/CL4NKR/gatita-search -C "%site%" diff --cached --check || exit /b 1
git -c safe.directory=//192.168.18.157/server/Documents/CL4NKR/gatita-search -C "%site%" diff --cached --quiet && (echo No site changes to push. & exit /b 0)
git -c safe.directory=//192.168.18.157/server/Documents/CL4NKR/gatita-search -C "%site%" commit -m "%message%" || exit /b 1
git -c safe.directory=//192.168.18.157/server/Documents/CL4NKR/gatita-search -C "%site%" push origin main
exit /b %errorlevel%

:preview
git -c safe.directory=//192.168.18.157/server/Documents/CL4NKR/gatita-search -C "%site%" add -n -A
exit /b %errorlevel%
