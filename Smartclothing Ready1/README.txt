SmartClo (Python version)

1. Start MySQL in XAMPP (Apache is not needed).
2. Double-click run.bat   (needs Python from python.org; tick "Add Python to PATH" when installing)
3. Open http://localhost:5000

Database: if you already imported smartclo.sql before, do nothing. Otherwise import smartclo.sql
into a database named smartclo in phpMyAdmin.
Admin login: admin@smartclothing.com / admin123
Database password or name different? Edit the DB_* lines at the top of app.py.

Password reset email (Forgot password sends a 6-digit code to the customer's email)
  1. Run run.bat once. It creates a file called settings.env next to app.py.
  2. Open settings.env in Notepad and fill in SMTP_USER (your Gmail address) and SMTP_PASSWORD.
     SMTP_PASSWORD must be a Google App Password, not your normal password:
     Google Account > Security > turn on 2-Step Verification, then open
     https://myaccount.google.com/apppasswords and create one (16 letters, spaces are fine).
  3. Save. No restart needed - just ask for a new code on the Forgot Password page.
  Port 587 = STARTTLS (default, use this for Gmail), port 465 = SSL.
  The run.bat window prints "Email: password reset codes are sent from ..." when it is set up,
  and the exact reason if an email can't be sent. Codes only go to emails that have an account.
  Real environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM) still
  work and take priority over settings.env.
  Never upload settings.env or secret_key.txt to GitHub (.gitignore already skips them).

SECRET_KEY: signs the login cookies. If you don't set one, a random one is created on first start
and saved in secret_key.txt (keep that file private). To use your own, add SECRET_KEY=... to settings.env.