@echo off
rem Keeps the voice service online for the live website: runs "npm run voice:online"
rem (voice service + ngrok tunnel) and restarts it if it ever stops (crash, network drop).
rem Close this window to take the voice service offline.
title ActorPro voice service (online)
cd /d "%~dp0.."
:loop
echo [%date% %time%] Starting voice service and tunnel...
call npm run voice:online
echo [%date% %time%] Voice service stopped. Restarting in 15 seconds (close this window to stop)...
timeout /t 15 /nobreak >nul
goto loop
