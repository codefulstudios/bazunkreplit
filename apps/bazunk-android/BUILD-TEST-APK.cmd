@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 LTS from https://nodejs.org then open this file again.
  pause
  exit /b 1
)
echo Preparing Bazunk. This may take several minutes.
call npm ci
if errorlevel 1 goto failed
call npm run typecheck
if errorlevel 1 goto failed
echo Sign in to your Expo account in the following prompts.
call npx --yes eas-cli@latest login
if errorlevel 1 goto failed
call npx --yes eas-cli@latest init
if errorlevel 1 goto failed
echo Choose Generate a new Android keystore if Expo asks on your first build.
call npx --yes eas-cli@latest build --platform android --profile preview
if errorlevel 1 goto failed
echo Open the completed Expo build link on your Android phone to install its APK.
pause
exit /b 0
:failed
echo Build setup stopped. Send the error message to ChatGPT for help.
pause
exit /b 1
