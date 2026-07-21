@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0criar-super-admin.ps1" %*
exit /b %ERRORLEVEL%
