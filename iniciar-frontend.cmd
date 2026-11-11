@echo off
rem Starts the PRISALY frontend (Angular dev server) in the foreground. Ctrl+C stops it.
rem From Git Bash run:  cmd //c iniciar-frontend.cmd
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar-frontend.ps1" %*
exit /b %errorlevel%
