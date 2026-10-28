"""SmartClo backend (Flask + MySQL).

Start it with run.bat (or:  python app.py)  and open http://localhost:5000
XAMPP only needs to run MySQL now - Apache is not used.

How the website talks to this file
  /api/hydrate.js   every page loads this first; it copies the data from MySQL into
                    localStorage so the existing page scripts keep working
  /api/save         admin changes (products, vouchers, outfits, order status) + the cart
  /api/place-order  checkout (prices, stock and totals are checked here)
  /api/add-review, /api/reset-password, /api/register, /api/login, /api/logout, /api/image
"""
import base64
import calendar
import hashlib
import hmac
import html
import json
import os
import re
import secrets
import smtplib
import ssl
import time
import traceback
from contextlib import contextmanager
from datetime import datetime, timedelta
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid
from urllib.parse import quote

import bcrypt
import pymysql
from pymysql.cursors import DictCursor
from flask import Flask, Response, g, jsonify, request, send_from_directory, session
from werkzeug.exceptions import HTTPException

# settings
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = int(os.environ.get("DB_PORT", "3306"))
DB_NAME = os.environ.get("DB_NAME", "smartclo")
DB_USER = os.environ.get("DB_USER", "root")
DB_PASS = os.environ.get("DB_PASS", "")  # XAMPP's root user has no password
# Hosted MySQL services (TiDB Cloud, Aiven, ...) require an encrypted connection.
# Set DB_SSL=1 in Vercel's environment variables to turn it on. Leave unset for local XAMPP.
DB_SSL = os.environ.get("DB_SSL", "").strip().lower() in ("1", "true", "yes", "on")
PORT = int(os.environ.get("PORT", "5000"))
PUBLIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
TZ_OFFSET = "+08:00"  # Philippines
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(BASE_DIR, "settings.env")
SECRET_KEY_FILE = os.path.join(BASE_DIR, "secret_key.txt")


# -- settings.env --
# Email and security settings live in settings.env (copy of settings.example.env), one
# NAME=value per line. A real Windows environment variable with the same name still wins.
# The file is re-read every time, so edits to the SMTP_* lines work without a restart.
def read_settings_file():
    values = {}
    try:
        with open(SETTINGS_FILE, encoding="utf-8-sig") as f:  # utf-8-sig: Notepad may add a BOM
            for line in f.read().splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                name, _, value = line.partition("=")
                value = value.strip()
                if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                    value = value[1:-1]
                values[name.strip()] = value
    except OSError:
        pass  # no settings.env yet - that is fine
    return values


def setting(name, default=""):
    env_value = os.environ.get(name, "")
    if env_value.strip():
        return env_value
    return read_settings_file().get(name, default) or default


def load_secret_key():
    """SECRET_KEY signs the login/reset cookies, so it must be private. Use the one from the
    environment / settings.env if given; otherwise make a random one once and keep it in
    secret_key.txt (never a fixed default that anybody reading the source code would know)."""
    key = setting("SECRET_KEY").strip()
    if key:
        return key
    try:
        with open(SECRET_KEY_FILE, encoding="utf-8") as f:
            key = f.read().strip()
        if key:
            return key
    except OSError:
        pass
    key = secrets.token_hex(32)
    try:
        with open(SECRET_KEY_FILE, "w", encoding="utf-8") as f:
            f.write(key + "\n")
    except OSError:
        print("[security] Could not save secret_key.txt - everybody will be logged out on each restart.")
    return key


app = Flask(__name__, static_folder=PUBLIC, static_url_path="")
app.secret_key = load_secret_key()
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=7)
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["MAX_CONTENT_LENGTH"] = 40 * 1024 * 1024


#database
def get_db():
    if "db" not in g:
        g.db = pymysql.connect(
            host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS, database=DB_NAME,
            charset="utf8mb4", cursorclass=DictCursor, autocommit=True,
            ssl=ssl.create_default_context() if DB_SSL else None,
        )
        with g.db.cursor() as cur:
            cur.execute("SET time_zone = '" + TZ_OFFSET + "'")
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def q_all(sql, params=()):
    with get_db().cursor() as cur:
        cur.execute(sql, tuple(params))
        return list(cur.fetchall())


def q_one(sql, params=()):
    with get_db().cursor() as cur:
        cur.execute(sql, tuple(params))
        return cur.fetchone()


def q_exec(sql, params=()):
    with get_db().cursor() as cur:
        cur.execute(sql, tuple(params))
        return cur.rowcount


@contextmanager
def transaction():
    db = get_db()
    db.begin()
    try:
        yield db
        db.commit()
    except BaseException:
        db.rollback()
        raise


# Note: every literal % inside a SQL string is written %% (pymysql formatting).

# ---------------------------------------------------------------- errors
class ApiError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


def error_response(message, status):
    if request.path == "/api/hydrate.js":  # this endpoint is loaded as a <script>
        return Response("console.error(" + json.dumps("SmartClo: " + message) + ");",
                        status=200, content_type="application/javascript; charset=utf-8")
    return jsonify({"ok": False, "message": message}), status


@app.errorhandler(ApiError)
def on_api_error(e):
    return error_response(e.message, e.status)


@app.errorhandler(pymysql.MySQLError)
def on_db_error(e):
    code = e.args[0] if e.args and isinstance(e.args[0], int) else 0
    text = str(e.args[1]) if len(e.args) > 1 else str(e)
    if code in (2003, 2002):
        msg = "Cannot connect to the database. Is MySQL running in XAMPP?"
    elif code == 1045:
        msg = "MySQL refused the username/password. Check DB_USER / DB_PASS at the top of app.py."
    elif code == 1049:
        msg = "The database 'smartclo' does not exist. Import smartclo.sql in phpMyAdmin first."
    elif code == 1146:
        msg = "A table is missing. Import smartclo.sql in phpMyAdmin."
    elif code == 1062:
        msg = "That code already exists. Use a different one."
    elif code in (1153, 2006, 2013):
        msg = "The image is too large. Use a smaller image (or raise max_allowed_packet in my.ini)."
    else:
        msg = "Database error: " + text
    return error_response(msg, 500)


@app.errorhandler(Exception)
def on_error(e):
    if isinstance(e, HTTPException):
        return e
    traceback.print_exc()
    return error_response("Server error: " + type(e).__name__ + ": " + str(e), 500)


#helpers
def body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def text_or_null(value, maxlen):
    if value is None:
        return None
    value = str(value).strip()
    return value[:maxlen] if value else None


def to_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def to_int(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def json_id(value):
    """Ids made with Date.now() are numbers in the JS; keep them numbers."""
    s = str(value)
    return int(s) if re.fullmatch(r"[0-9]{1,15}", s) else s


def as_dt(value):
    if isinstance(value, datetime):
        return value
    return datetime.strptime(str(value)[:19], "%Y-%m-%d %H:%M:%S")


def iso(value):
    return as_dt(value).strftime("%Y-%m-%dT%H:%M:%S") + TZ_OFFSET


def version(value):
    """A number that changes whenever the row changes (used to refresh cached images)."""
    return calendar.timegm(as_dt(value).timetuple()) if value else 0


def img_url(image, is_data, kind, ident, updated):
    if is_data:
        return "api/image?t=%s&id=%s&v=%d" % (kind, quote(str(ident), safe=""), version(updated))
    return image or ""


def hash_password(password):
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt(10)).decode("ascii")


def check_password(password, hashed):
    h = hashed.encode("ascii", "ignore")
    if h.startswith(b"$2y$"):  # accounts created by the old PHP version
        h = b"$2b$" + h[4:]
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], h)
    except ValueError:
        return False


def current_user():
    if "user" not in g:
        g.user = None
        uid = session.get("user_id")
        if uid:
            g.user = q_one("SELECT id, name, email, phone, role FROM users WHERE id = %s", (uid,))
    return g.user


def require_login():
    user = current_user()
    if not user:
        raise ApiError("Please log in first.", 401)
    return user


def require_admin():
    user = require_login()
    if user["role"] != "admin":
        raise ApiError("Admin access only.", 403)
    return user


PHONE_RE = re.compile(r"^(09\d{9}|\+639\d{9})$")
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


# ---------------------------------------------------------------- pages
@app.get("/")
def home():
    return send_from_directory(PUBLIC, "index.html")


# ---------------------------------------------------------------- accounts
@app.post("/api/register")
def register():
    d = body()
    name = str(d.get("name") or "").strip()
    email = str(d.get("email") or "").strip().lower()
    phone = re.sub(r"[\s-]", "", str(d.get("phone") or "").strip())
    password = str(d.get("password") or "")

    if not name or not email or not phone or not password.strip():
        raise ApiError("Complete all fields.")
    if not EMAIL_RE.match(email):
        raise ApiError("Enter a valid email address.")
    if not PHONE_RE.match(phone):
        raise ApiError("Use a Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.")
    if len(password) < 6:
        raise ApiError("Password must be at least 6 characters.")
    if q_one("SELECT id FROM users WHERE email = %s", (email,)):
        raise ApiError("This email is already registered.", 409)

    q_exec("INSERT INTO users (name, email, phone, password_hash, role) VALUES (%s, %s, %s, %s, 'customer')",
           (name[:100], email, phone, hash_password(password)))
    return jsonify({"ok": True})


@app.post("/api/login")
def login():
    d = body()
    email = str(d.get("email") or "").strip().lower()
    password = str(d.get("password") or "")
    if not email or not password.strip():
        raise ApiError("Enter your email address and password.")

    row = q_one("SELECT id, name, email, phone, role, password_hash FROM users WHERE email = %s", (email,))
    if not row or not check_password(password, row["password_hash"]):
        raise ApiError("Incorrect email or password.", 401)

    session.clear()
    session.permanent = True
    session["user_id"] = int(row["id"])
    user = {k: row[k] for k in ("id", "name", "email", "phone", "role")}  # never send the hash
    return jsonify({"ok": True, "user": user})


@app.route("/api/logout", methods=["GET", "POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})


# ---------------------------------------------------------------- email
EMAIL_FAIL_MESSAGE = "We couldn't send the email right now. Please try again in a few minutes."


def smtp_config():
    host = setting("SMTP_HOST").strip()
    user = setting("SMTP_USER").strip()
    password = setting("SMTP_PASSWORD")
    sender = setting("SMTP_FROM").strip() or user
    try:
        port = int(setting("SMTP_PORT", "587").strip())
    except ValueError:
        port = 0
    if host.lower() in ("smtp.gmail.com", "smtp.googlemail.com"):
        password = password.replace(" ", "")  # Google shows App Passwords as 4 groups of 4 letters
    return {"host": host, "port": port, "user": user, "password": password, "sender": sender}


def email_status_line():
    c = smtp_config()
    if not c["host"] or not c["sender"] or c["port"] not in range(1, 65536):
        return ("Email:  NOT set up - password reset emails will NOT be sent.\n"
                "        Fill in settings.env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM).")
    mode = "SSL" if c["port"] == 465 else "STARTTLS"
    return "Email:  password reset codes are sent from %s via %s:%d (%s)" % (c["sender"], c["host"], c["port"], mode)


def send_email(to_addr, subject, text_body, html_body=None):
    """Send one email with the SMTP settings. On any problem the exact cause and the fix are
    printed in the run.bat window, and the customer only sees a short, safe message."""
    c = smtp_config()
    if not c["host"] or not c["sender"] or c["port"] not in range(1, 65536):
        print("[email] NOT SENT to %s - email is not set up (or SMTP_PORT is not a number).\n"
              "        Open settings.env and fill in SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM."
              % to_addr)
        raise ApiError(EMAIL_FAIL_MESSAGE, 503)

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr(("Smart Clothing", c["sender"]))
    message["To"] = to_addr
    message["Date"] = formatdate(localtime=True)
    message["Message-ID"] = make_msgid(domain=c["sender"].rsplit("@", 1)[-1] or None)
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    hint = ""
    try:
        context = ssl.create_default_context()
        if c["port"] == 465:
            smtp = smtplib.SMTP_SSL(c["host"], c["port"], context=context, timeout=15)
        else:
            smtp = smtplib.SMTP(c["host"], c["port"], timeout=15)
        with smtp:
            if c["port"] != 465:
                smtp.starttls(context=context)
            if c["user"]:
                smtp.login(c["user"], c["password"])
            smtp.send_message(message)
        print("[email] Sent '%s' to %s" % (subject, to_addr))
        return
    except smtplib.SMTPAuthenticationError as e:
        hint = ("%s refused the login (%s). Check SMTP_USER and SMTP_PASSWORD in settings.env. "
                "Gmail needs a 16-letter App Password (2-Step Verification must be on), not your normal password."
                % (c["host"], e.smtp_code))
    except smtplib.SMTPRecipientsRefused:
        hint = "%s refused the address %s. Is it a real, working email address?" % (c["host"], to_addr)
    except smtplib.SMTPSenderRefused as e:
        hint = ("%s refused the sender address %s (%s). SMTP_FROM should be the same address as SMTP_USER."
                % (c["host"], c["sender"], e.smtp_code))
    except ssl.SSLError as e:
        hint = ("Secure connection to %s:%d failed (%s). Port 587 uses STARTTLS and port 465 uses SSL - "
                "make sure SMTP_PORT matches what your provider says." % (c["host"], c["port"], e))
    except (smtplib.SMTPException, OSError) as e:
        hint = ("Could not talk to %s:%d (%s: %s). Check SMTP_HOST / SMTP_PORT, your internet connection, and "
                "that a firewall or antivirus isn't blocking it. You can also try the other port (587 or 465)."
                % (c["host"], c["port"], type(e).__name__, e))
    except Exception as e:  # e.g. a password with unusual characters
        traceback.print_exc()
        hint = "Unexpected problem (%s: %s). Check the SMTP_* lines in settings.env." % (type(e).__name__, e)
    print("[email] NOT SENT to %s - %s" % (to_addr, hint))
    raise ApiError(EMAIL_FAIL_MESSAGE, 502)


@app.post("/api/reset-password")
def reset_password():
    d = body()
    action = str(d.get("action") or "")

    if action == "send_otp":
        email = str(d.get("email") or "").strip().lower()
        if not email:
            raise ApiError("Please enter your email address.")
        if not EMAIL_RE.match(email):
            raise ApiError("Enter a valid email address.")
        u = q_one("SELECT name, email, role FROM users WHERE email = %s", (email,))
        if u and u["role"] == "admin":
            raise ApiError("Admin password can't be reset here. Please contact the shop owner.", 403)
        if not u:
            print("[email] No email sent: %s is not a registered account (the page still says 'sent' on purpose)." % email)
            return jsonify({"ok": True})

        sent_at = int(session.get("reset_otp_sent_at") or 0)
        if session.get("reset_otp_email") == u["email"] and time.time() - sent_at < 60:
            raise ApiError("Please wait a minute before requesting another code.", 429)

        otp = "%06d" % secrets.randbelow(1000000)
        first_name = (str(u.get("name") or "").strip().split(" ") or [""])[0] or "there"
        send_email(
            u["email"],
            "Your Smart Clothing password reset code",
            "Hi %s,\n\n"
            "Your Smart Clothing password reset code is:\n\n"
            "    %s\n\n"
            "It expires in 10 minutes. Enter it on the Forgot Password page to choose a new password.\n\n"
            "If you didn't ask to reset your password, you can ignore this email - your password won't change.\n\n"
            "Smart Clothing" % (first_name, otp),
            '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;color:#111">'
            '<h2 style="margin:0 0 12px">Smart Clothing</h2>'
            '<p>Hi %s,</p>'
            '<p>Your password reset code is:</p>'
            '<p style="font-size:32px;letter-spacing:8px;font-weight:bold;background:#f3f3f3;'
            'padding:14px 0;text-align:center;border-radius:6px;margin:16px 0">%s</p>'
            '<p>It expires in 10 minutes. Enter it on the Forgot Password page to choose a new password.</p>'
            '<p style="color:#666;font-size:13px">If you didn\'t ask to reset your password, you can ignore this '
            'email - your password won\'t change.</p></div>' % (html.escape(first_name), otp),
        )

        otp_digest = hmac.new(
            str(app.secret_key).encode("utf-8"), (u["email"] + ":" + otp).encode("utf-8"), hashlib.sha256
        ).hexdigest()
        session.pop("reset_email", None)
        session.pop("reset_time", None)
        session["reset_otp_email"] = u["email"]
        session["reset_otp_digest"] = otp_digest
        session["reset_otp_sent_at"] = int(time.time())
        session["reset_otp_attempts"] = 0
        return jsonify({"ok": True})

    if action == "verify_otp":
        email = session.get("reset_otp_email") or ""
        sent_at = int(session.get("reset_otp_sent_at") or 0)
        if not email or time.time() - sent_at > 600:
            session.pop("reset_otp_email", None)
            session.pop("reset_otp_digest", None)
            raise ApiError("The code is invalid or expired. Request a new code.", 403)
        attempts = int(session.get("reset_otp_attempts") or 0)
        if attempts >= 5:
            session.pop("reset_otp_email", None)
            session.pop("reset_otp_digest", None)
            raise ApiError("Too many incorrect codes. Request a new code.", 403)
        otp = str(d.get("otp") or "")
        expected = hmac.new(
            str(app.secret_key).encode("utf-8"), (email + ":" + otp).encode("utf-8"), hashlib.sha256
        ).hexdigest()
        if not re.fullmatch(r"\d{6}", otp) or not hmac.compare_digest(
            expected, str(session.get("reset_otp_digest") or "")
        ):
            session["reset_otp_attempts"] = attempts + 1
            raise ApiError("The code is invalid or expired.", 403)
        session["reset_email"] = email
        session["reset_time"] = int(time.time())
        for key in ("reset_otp_email", "reset_otp_digest", "reset_otp_sent_at", "reset_otp_attempts"):
            session.pop(key, None)
        return jsonify({"ok": True})

    if action == "reset":
        password = str(d.get("password") or "")
        email = session.get("reset_email") or ""
        if not email or time.time() - int(session.get("reset_time") or 0) > 600:
            session.pop("reset_email", None)
            session.pop("reset_time", None)
            raise ApiError("Verification expired. Please start again.", 403)
        if len(password) < 6:
            raise ApiError("Password must be at least 6 characters.")
        q_exec("UPDATE users SET password_hash = %s WHERE email = %s AND role = 'customer'",
               (hash_password(password), email))
        session.pop("reset_email", None)
        session.pop("reset_time", None)
        return jsonify({"ok": True})

    raise ApiError("Unknown request.")


# ---------------------------------------------------------------- hydrate
HYDRATE_TAIL = """
function put(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){console.error('SmartClo: could not cache '+k+' (browser storage full?)',e);}}
put('sellerProducts',d.products);
put('vouchers',d.vouchers);
put('ootdItems',d.ootd);
put('productReviews',d.reviews);
put('orders',d.orders);
put('cart',d.cart);
if(d.user&&d.user.role==='admin'){put('currentAdmin',d.user);localStorage.removeItem('currentUser');}
else if(d.user){put('currentUser',d.user);localStorage.removeItem('currentAdmin');}
else{localStorage.removeItem('currentUser');localStorage.removeItem('currentAdmin');}
})();
"""


@app.get("/api/hydrate.js")
def hydrate():
    user = current_user()

    # PRODUCTS (uploaded images are served by /api/image, not embedded)
    products = []
    for r in q_all(
        "SELECT id, name, price, old_price, badge, stock, category, description, extra, created_at, updated_at, "
        "CASE WHEN image LIKE 'data:%%' THEN NULL ELSE image END AS image, "
        "(image LIKE 'data:%%') AS image_is_data "
        "FROM products ORDER BY created_at, id"
    ):
        p = {}
        if r["extra"]:
            try:
                x = json.loads(r["extra"])
            except ValueError:
                x = None
            if isinstance(x, dict):
                p.update(x)
        p["id"] = json_id(r["id"])
        p["name"] = r["name"]
        p["price"] = float(r["price"])
        if r["old_price"] is not None:
            p["oldPrice"] = float(r["old_price"])
        p["image"] = img_url(r["image"], r["image_is_data"], "p", r["id"], r["updated_at"])
        if r["badge"]:
            p["badge"] = r["badge"]
        p["stock"] = int(r["stock"])
        if r["category"] is not None:
            p["category"] = r["category"]
        p["description"] = r["description"] or ""
        p["createdAt"] = iso(r["created_at"])
        products.append(p)

    # VOUCHERS
    vouchers = []
    for r in q_all("SELECT id, code, discount, description, expiration_date FROM vouchers ORDER BY id"):
        v = {"id": r["id"], "code": r["code"], "discount": r["discount"], "description": r["description"] or ""}
        if r["expiration_date"] is not None:
            v["expirationDate"] = str(r["expiration_date"])
        vouchers.append(v)

    # OUTFITS (OOTD)
    ootd = []
    for r in q_all(
        "SELECT id, title, description, product_ids, product_name, price, updated_at, "
        "CASE WHEN image LIKE 'data:%%' THEN NULL ELSE image END AS image, "
        "(image LIKE 'data:%%') AS image_is_data "
        "FROM ootd_items ORDER BY created_at, id"
    ):
        try:
            ids = json.loads(r["product_ids"] or "[]")
        except ValueError:
            ids = []
        ootd.append({
            "id": r["id"], "title": r["title"], "description": r["description"] or "",
            "productIds": ids if isinstance(ids, list) else [],
            "productName": r["product_name"] or "", "price": float(r["price"]),
            "image": img_url(r["image"], r["image_is_data"], "o", r["id"], r["updated_at"]),
        })

    # REVIEWS: {productId: [review, ...]}
    reviews = {}
    for r in q_all("SELECT product_id, name, rating, comment, created_at FROM product_reviews ORDER BY id"):
        dt = as_dt(r["created_at"])
        reviews.setdefault(r["product_id"], []).append({
            "name": r["name"], "rating": int(r["rating"]), "comment": r["comment"],
            "date": "%d/%d/%d" % (dt.month, dt.day, dt.year),
        })

    # ORDERS: admin sees all, a customer sees only their own
    orders = []
    if user:
        if user["role"] == "admin":
            rows = q_all("SELECT * FROM orders ORDER BY created_at, id")
        else:
            rows = q_all("SELECT * FROM orders WHERE user_id = %s OR customer_email = %s ORDER BY created_at, id",
                         (user["id"], str(user["email"]).lower()))
        by_id = {}
        for r in rows:
            by_id[r["id"]] = {
                "id": r["id"], "customerName": r["customer_name"], "phone": r["phone"],
                "email": r["email"], "customerEmail": r["customer_email"],
                "city": r["city"] or "", "address": r["address"] or "",
                "paymentMethod": r["payment_method"] or "", "items": [],
                "subtotal": float(r["subtotal"]), "shipping": float(r["shipping"]),
                "discount": float(r["discount"]), "total": float(r["total"]),
                "status": r["status"], "createdAt": iso(r["created_at"]),
            }
        if by_id:
            marks = ",".join(["%s"] * len(by_id))
            items = q_all(
                "SELECT oi.order_id, oi.product_id, oi.name, oi.price, oi.quantity, oi.image, "
                "(p.image LIKE 'data:%%') AS pdata, "
                "CASE WHEN p.image LIKE 'data:%%' THEN NULL ELSE p.image END AS pimg, p.updated_at AS pupdated "
                "FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id "
                "WHERE oi.order_id IN (" + marks + ") ORDER BY oi.id",
                list(by_id.keys()),
            )
            for i in items:
                image = i["image"] or ""
                if not image:
                    image = img_url(i["pimg"], i["pdata"], "p", i["product_id"], i["pupdated"])
                by_id[i["order_id"]]["items"].append({
                    "id": json_id(i["product_id"]), "name": i["name"], "price": float(i["price"]),
                    "quantity": int(i["quantity"]), "image": image,
                })
        orders = list(by_id.values())

    # CART: only for a logged-in customer
    cart = []
    if user and user["role"] == "customer":
        for r in q_all(
            "SELECT c.product_id, c.quantity, p.name, p.price, p.stock, p.updated_at, "
            "(p.image LIKE 'data:%%') AS pdata, "
            "CASE WHEN p.image LIKE 'data:%%' THEN NULL ELSE p.image END AS pimg "
            "FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.user_id = %s",
            (user["id"],),
        ):
            cart.append({
                "id": json_id(r["product_id"]), "name": r["name"], "price": float(r["price"]),
                "image": img_url(r["pimg"], r["pdata"], "p", r["product_id"], r["updated_at"]),
                "stock": int(r["stock"]), "quantity": int(r["quantity"]),
            })

    payload = {"products": products, "vouchers": vouchers, "ootd": ootd, "reviews": reviews,
               "orders": orders, "cart": cart, "user": user}
    blob = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    blob = (blob.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
                .replace("\u2028", "\\u2028").replace("\u2029", "\\u2029"))
    js = "(function(){var d=" + blob + ";" + HYDRATE_TAIL
    return Response(js, content_type="application/javascript; charset=utf-8", headers={"Cache-Control": "no-store"})


# ---------------------------------------------------------------- images
IMAGE_RE = re.compile(r"^data:(image/(?:png|jpeg|jpg|gif|webp));base64,(.*)$", re.S)


@app.get("/api/image")
def image():
    table = "ootd_items" if request.args.get("t") == "o" else "products"
    row = q_one("SELECT image FROM " + table + " WHERE id = %s", (request.args.get("id", ""),))
    img = row["image"] if row else None
    if not img:
        return Response(status=404)
    m = IMAGE_RE.match(img)
    if m:
        try:
            data = base64.b64decode(m.group(2), validate=False)
        except ValueError:
            return Response(status=404)
        return Response(data, content_type=m.group(1), headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
        })
    if re.match(r"^https?://", img, re.I):
        return Response(status=302, headers={"Location": img})
    return Response(status=404)


# ---------------------------------------------------------------- save (admin + cart)
PRODUCT_KNOWN = {"id", "name", "price", "oldPrice", "image", "badge", "stock", "category", "description", "createdAt"}


def new_image_value(item):
    """api/image?... means 'keep the image already stored in MySQL'."""
    image = item.get("image")
    if isinstance(image, str) and image and not image.startswith("api/image"):
        return image
    return None


def save_products(upserts, deletes):
    for p in upserts:
        if not isinstance(p, dict):
            continue
        pid = str(p.get("id", "")).strip()
        if not pid:
            continue
        extra = {k: v for k, v in p.items() if k not in PRODUCT_KNOWN}
        old = p.get("oldPrice")
        row = [
            text_or_null(p.get("name"), 150) or "Untitled product",
            max(0.0, to_float(p.get("price"))),
            max(0.0, to_float(old)) if old not in (None, "") else None,
            text_or_null(p.get("badge"), 30),
            max(0, to_int(p.get("stock"))),
            text_or_null(p.get("category"), 50),
            str(p.get("description") or ""),
            json.dumps(extra, ensure_ascii=False) if extra else None,
        ]
        image = new_image_value(p)
        if q_one("SELECT 1 AS x FROM products WHERE id = %s", (pid,)):
            sql = ("UPDATE products SET name=%s, price=%s, old_price=%s, badge=%s, stock=%s, "
                   "category=%s, description=%s, extra=%s")
            params = row[:]
            if image is not None:
                sql += ", image=%s"
                params.append(image)
            q_exec(sql + " WHERE id=%s", params + [pid])
        else:
            q_exec("INSERT INTO products (name, price, old_price, badge, stock, category, description, extra, image, id) "
                   "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)", row + [image, pid])
    for pid in deletes:
        q_exec("DELETE FROM products WHERE id = %s", (pid,))


def save_vouchers(upserts, deletes):
    for v in upserts:
        if not isinstance(v, dict):
            continue
        vid = str(v.get("id", "")).strip()
        code = text_or_null(v.get("code"), 50)
        if not vid or code is None:
            continue
        exp = text_or_null(v.get("expirationDate"), 10)
        if exp is not None and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", exp):
            exp = None
        row = [code, text_or_null(v.get("discount"), 50) or "", text_or_null(v.get("description"), 255), exp]
        if q_one("SELECT 1 AS x FROM vouchers WHERE id = %s", (vid,)):
            q_exec("UPDATE vouchers SET code=%s, discount=%s, description=%s, expiration_date=%s WHERE id=%s", row + [vid])
        else:
            q_exec("INSERT INTO vouchers (code, discount, description, expiration_date, id) VALUES (%s,%s,%s,%s,%s)",
                   row + [vid])
    for vid in deletes:
        q_exec("DELETE FROM vouchers WHERE id = %s", (vid,))


def save_ootd(upserts, deletes):
    for o in upserts:
        if not isinstance(o, dict):
            continue
        oid = str(o.get("id", "")).strip()
        if not oid:
            continue
        ids = o.get("productIds")
        row = [
            text_or_null(o.get("title"), 150) or "Untitled",
            str(o.get("description") or ""),
            json.dumps(ids if isinstance(ids, list) else [], ensure_ascii=False),
            str(o.get("productName") or ""),
            max(0.0, to_float(o.get("price"))),
        ]
        image = new_image_value(o)
        if q_one("SELECT 1 AS x FROM ootd_items WHERE id = %s", (oid,)):
            sql = "UPDATE ootd_items SET title=%s, description=%s, product_ids=%s, product_name=%s, price=%s"
            params = row[:]
            if image is not None:
                sql += ", image=%s"
                params.append(image)
            q_exec(sql + " WHERE id=%s", params + [oid])
        else:
            q_exec("INSERT INTO ootd_items (title, description, product_ids, product_name, price, image, id) "
                   "VALUES (%s,%s,%s,%s,%s,%s,%s)", row + [image, oid])
    for oid in deletes:
        q_exec("DELETE FROM ootd_items WHERE id = %s", (oid,))


def save_order_status(upserts):
    """Admin can only change an order's status. New orders come from /api/place-order."""
    for o in upserts:
        if not isinstance(o, dict):
            continue
        status = str(o.get("status") or "").strip().lower()
        if re.fullmatch(r"[a-z _-]{1,20}", status):
            q_exec("UPDATE orders SET status = %s WHERE id = %s", (status, str(o.get("id") or "")))


def save_cart(user, items):
    wanted = {}
    for item in items if isinstance(items, list) else []:
        if isinstance(item, dict) and item.get("id") is not None:
            qty = max(0, to_int(item.get("quantity")))
            if qty > 0:
                pid = str(item["id"])
                wanted[pid] = wanted.get(pid, 0) + qty
    q_exec("DELETE FROM cart_items WHERE user_id = %s", (user["id"],))
    for pid, qty in wanted.items():
        if q_one("SELECT 1 AS x FROM products WHERE id = %s", (pid,)):
            q_exec("INSERT INTO cart_items (user_id, product_id, quantity) VALUES (%s,%s,%s)", (user["id"], pid, qty))


@app.post("/api/save")
def save():
    d = body()
    key = str(d.get("key") or "")
    user = require_login()
    
    upserts = d.get("upserts") if isinstance(d.get("upserts"), list) else []
    deletes = [str(x) for x in d.get("deletes")] if isinstance(d.get("deletes"), list) else []

    if key == "cart":
        if user["role"] == "customer":
            with transaction():
                save_cart(user, d.get("value"))
        return jsonify({"ok": True})

    require_admin()
    if key == "sellerProducts":
        with transaction():
            save_products(upserts, deletes)
    elif key == "vouchers":
        with transaction():
            save_vouchers(upserts, deletes)
    elif key == "ootdItems":
        with transaction():
            save_ootd(upserts, deletes)
    elif key == "orders":
        with transaction():
            save_order_status(upserts)
    else:
        raise ApiError("Unknown data type.")
    return jsonify({"ok": True})


# ---------------------------------------------------------------- checkout
def voucher_discount(discount_text, subtotal):
    m = re.search(r"(\d+(?:\.\d+)?)\s*%", discount_text or "")
    if m:
        return subtotal * float(m.group(1)) / 100
    m = re.search(r"₱\s*(\d+(?:,\d+)?(?:\.\d+)?)", discount_text or "")
    if m:
        return min(subtotal, float(m.group(1).replace(",", "")))
    return 0.0


@app.post("/api/place-order")
def place_order():
    user = require_login()
    if user["role"] != "customer":
        raise ApiError("Please log in with a customer account to place an order.", 403)

    d = body()
    o = d.get("order") if isinstance(d.get("order"), dict) else {}
    voucher_code = str(d.get("voucherCode") or "").strip()

    name = str(o.get("customerName") or "").strip()
    phone = re.sub(r"[\s-]", "", str(o.get("phone") or "").strip())
    email = str(o.get("email") or "").strip().lower()
    city = str(o.get("city") or "").strip()
    address = str(o.get("address") or "").strip()
    payment = str(o.get("paymentMethod") or "").strip()
    items = o.get("items") if isinstance(o.get("items"), list) else []

    if not name or not city or not address or not payment:
        raise ApiError("Please complete all delivery details.")
    if payment != "Cash on Delivery":
        raise ApiError("Only Cash on Delivery is currently available.")
    if not PHONE_RE.match(phone):
        raise ApiError("Use a Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.")
    if not EMAIL_RE.match(email):
        raise ApiError("Enter a valid email address.")
    if not items:
        raise ApiError("Your cart is empty.")

    qty_by_id = {}
    for it in items:
        if isinstance(it, dict) and it.get("id") is not None:
            pid = str(it["id"])
            qty_by_id[pid] = qty_by_id.get(pid, 0) + max(1, to_int(it.get("quantity"), 1))

    with transaction():
        lines = []
        subtotal = 0.0
        for pid, qty in qty_by_id.items():
            p = q_one(
                "SELECT id, name, price, stock, "
                "CASE WHEN image LIKE 'data:%%' OR LENGTH(image) > 2000 THEN NULL ELSE image END AS img "
                "FROM products WHERE id = %s FOR UPDATE", (pid,))
            if not p:
                raise ApiError("A product in your cart is no longer available. Please refresh your cart.", 409)
            if int(p["stock"]) < qty:
                raise ApiError("Not enough stock for %s. Only %d left." % (p["name"], int(p["stock"])), 409)
            price = float(p["price"])
            subtotal += price * qty
            lines.append((p["id"], p["name"], price, qty, p["img"]))
        subtotal = round(subtotal, 2)
        shipping = 0.0 if subtotal >= 1000 else 60.0

        discount = 0.0
        applied_code = None
        if voucher_code:
            v = q_one("SELECT code, discount, expiration_date FROM vouchers WHERE UPPER(code) = UPPER(%s)",
                      (voucher_code,))
            if not v:
                raise ApiError("Invalid voucher code.")
            if v["expiration_date"] is not None and str(v["expiration_date"]) < datetime.now().strftime("%Y-%m-%d"):
                raise ApiError("This voucher has expired.")
            applied_code = v["code"]
            discount = round(voucher_discount(v["discount"], subtotal), 2)
        total = round(max(0.0, subtotal + shipping - discount), 2)
        order_id = str(o.get("id") or "")
        if not re.fullmatch(r"ORD-\d{6,20}", order_id) or q_one("SELECT 1 AS x FROM orders WHERE id = %s", (order_id,)):
            order_id = "ORD-%d" % int(time.time() * 1000)

        q_exec(
            "INSERT INTO orders (id, user_id, customer_name, phone, email, customer_email, city, address, "
            "payment_method, voucher_code, subtotal, shipping, discount, total, status) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (order_id, user["id"], name[:100], phone, email, str(user["email"]).lower(), city[:100], address,
             payment[:50], applied_code, subtotal, shipping, discount, total, "pending"))
        for pid, pname, price, qty, img in lines:
            q_exec("INSERT INTO order_items (order_id, product_id, name, price, quantity, image) VALUES (%s,%s,%s,%s,%s,%s)",
                   (order_id, pid, pname, price, qty, img))
            q_exec("UPDATE products SET stock = stock - %s WHERE id = %s", (qty, pid))
        q_exec("DELETE FROM cart_items WHERE user_id = %s", (user["id"],))

    return jsonify({"ok": True, "order": {"id": order_id, "subtotal": subtotal, "shipping": shipping,
                                          "discount": discount, "total": total, "status": "pending"}})


# reviews
@app.post("/api/add-review")
def add_review():
    user = require_login()
    if user["role"] != "customer":
        raise ApiError("Please log in as a customer to leave a review.", 403)

    d = body()
    product_id = str(d.get("productId") or "")
    rating = to_int(d.get("rating"))
    comment = str(d.get("comment") or "").strip()
    if rating < 1 or rating > 5 or not comment:
        raise ApiError("Choose a rating and write a review.")
    comment = comment[:500]
    if not q_one("SELECT 1 AS x FROM products WHERE id = %s", (product_id,)):
        raise ApiError("Product not found.", 404)

    name = user["name"] or "Customer"
    q_exec("INSERT INTO product_reviews (product_id, user_id, name, rating, comment) VALUES (%s,%s,%s,%s,%s)",
           (product_id, user["id"], name, rating, comment))
    now = datetime.now()
    return jsonify({"ok": True, "review": {"name": name, "rating": rating, "comment": comment,
                                           "date": "%d/%d/%d" % (now.month, now.day, now.year)}})


if __name__ == "__main__":
    print("SmartClo is running:  http://localhost:%d" % PORT)
    print(email_status_line())
    app.run(host="127.0.0.1", port=PORT, debug=False)