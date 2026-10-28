@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (set PY=py) else (set PY=python)
if not exist settings.env if exist settings.example.env copy /y settings.example.env settings.env >nul
%PY% -m pip install -r requirements.txt
echo.
echo SmartClo is starting. Open http://localhost:5000 in your browser.
echo (Keep this window open. XAMPP MySQL must be running.)
echo (Password reset emails: fill in settings.env first - see README.txt.)
echo.
%PY% app.py
pause
