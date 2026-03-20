"""
Great Lakes Management — Community Assistant Backend API
Pure Python standard library — no pip installs needed.

Run:  python3 app.py
Open: http://localhost:5000
"""

import csv
import io
import json
import os
import sqlite3
import hashlib
import hmac
import base64
import time
import uuid
import mimetypes
import urllib.parse
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

PORT = int(os.environ.get("PORT", "5000"))
DB_FILE = os.environ.get("DB_FILE", "glchat.db")
SECRET_KEY = os.environ.get("SECRET_KEY", "gl-chat-secret-change-in-production")
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "greatlakes2026")

BASE_DIR = Path(__file__).resolve().parent.parent  # gl-chat-platform/


# ═══════════════════ SIMPLE JWT ═══════════════════
def _b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _b64url_decode(s):
    s += "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s)

def create_token(username):
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url(json.dumps({"sub": username, "exp": int(time.time()) + 86400}).encode())
    sig = _b64url(hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"

def verify_token(token):
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header, payload, sig = parts
        expected = _b64url(hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        data = json.loads(_b64url_decode(payload))
        if data.get("exp", 0) < time.time():
            return None
        return data
    except Exception:
        return None


# ═══════════════════ DATABASE ═══════════════════
def get_db():
    db = sqlite3.connect(DB_FILE)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA foreign_keys=ON")
    return db

def init_db():
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS communities (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE NOT NULL,
            address TEXT,
            phone TEXT,
            brand_color TEXT DEFAULT '#2E5339',
            brand_color_hover TEXT DEFAULT '#1e3a27',
            secondary_color TEXT DEFAULT '#3A4856',
            accent_color TEXT DEFAULT '#4F8636',
            logo_url TEXT,
            floor_plans_url TEXT,
            gallery_url TEXT,
            floor_plans_thumb TEXT,
            gallery_thumb TEXT,
            advisor_name TEXT DEFAULT 'Community Assistant',
            greeting TEXT DEFAULT 'Hi there! I''m here to help you explore',
            tour_enabled INTEGER DEFAULT 1,
            sms_enabled INTEGER DEFAULT 1,
            care_types TEXT DEFAULT '[]',
            config_json TEXT DEFAULT '{}',
            created_at TEXT,
            updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS leads (
            id TEXT PRIMARY KEY,
            community_id TEXT,
            name TEXT,
            email TEXT,
            phone TEXT,
            looking_for TEXT,
            care_type TEXT,
            timeline TEXT,
            interest TEXT,
            tour_date TEXT,
            tour_time TEXT,
            source_url TEXT,
            status TEXT DEFAULT 'new',
            notes TEXT,
            raw_data TEXT,
            created_at TEXT,
            FOREIGN KEY (community_id) REFERENCES communities(id)
        );
        CREATE INDEX IF NOT EXISTS idx_leads_community ON leads(community_id);
        CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
        CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    """)

    cur = db.execute("SELECT COUNT(*) FROM communities")
    if cur.fetchone()[0] == 0:
        now = datetime.utcnow().isoformat()
        db.execute("""
            INSERT INTO communities (id, name, slug, address, phone, brand_color, brand_color_hover,
                secondary_color, accent_color, floor_plans_url, gallery_url, advisor_name,
                greeting, tour_enabled, sms_enabled, care_types, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            str(uuid.uuid4()), "The Glenn West St. Paul", "glenn-west-st-paul",
            "21 Thompson Ave E, West St Paul, MN 55118", "(651) 504-0710",
            "#2E5339", "#1e3a27", "#3A4856", "#4F8636",
            "https://glennseniorliving.com/west-st-paul-mn/floor-plans/",
            "https://glennseniorliving.com/west-st-paul-mn/",
            "Community Assistant", "Hi there! I'm here to help you explore",
            1, 1,
            json.dumps([
                {"name": "Independent Living", "startingAt": 3130},
                {"name": "Assisted Living", "startingAt": 5020},
                {"name": "Memory Care", "startingAt": 5385}
            ]),
            now, now
        ))
        db.commit()
        print("[DB] Seeded The Glenn West St. Paul")
    db.close()


def community_to_widget_config(row):
    return {
        "communityId": row["id"],
        "communityName": row["name"],
        "advisorName": row["advisor_name"],
        "brandColor": row["brand_color"],
        "brandColorHover": row["brand_color_hover"],
        "secondaryColor": row["secondary_color"],
        "accentColor": row["accent_color"],
        "logoUrl": row["logo_url"],
        "careTypes": json.loads(row["care_types"] or "[]"),
        "phoneNumber": row["phone"],
        "address": row["address"],
        "floorPlansUrl": row["floor_plans_url"],
        "galleryUrl": row["gallery_url"],
        "floorPlansThumb": row["floor_plans_thumb"],
        "galleryThumb": row["gallery_thumb"],
        "tourEnabled": bool(row["tour_enabled"]),
        "smsEnabled": bool(row["sms_enabled"]),
        "greeting": row["greeting"],
    }

def community_to_dict(row):
    d = dict(row)
    d["care_types"] = json.loads(d.get("care_types") or "[]")
    d["tour_enabled"] = bool(d.get("tour_enabled"))
    d["sms_enabled"] = bool(d.get("sms_enabled"))
    return d

def lead_to_dict(row):
    d = dict(row)
    d["raw_data"] = json.loads(d.get("raw_data") or "{}")
    return d


# ═══════════════════ HTTP SERVER ═══════════════════
class APIHandler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        # Cleaner logs
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]}")

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _json_response(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw)
        except Exception:
            return {}

    def _check_admin(self):
        auth = self.headers.get("Authorization", "")
        token = auth.replace("Bearer ", "")
        return verify_token(token) is not None

    def _serve_static(self, file_path, content_type=None):
        """Serve a static file."""
        if not file_path.exists() or not file_path.is_file():
            self.send_error(404, "Not found")
            return
        if content_type is None:
            content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
        data = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self._cors()
        self.send_header("Content-Length", len(data))
        self.send_header("Cache-Control", "public, max-age=300")
        self.end_headers()
        self.wfile.write(data)

    # ── OPTIONS (CORS preflight) ──
    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    # ── GET ──
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = dict(urllib.parse.parse_qs(parsed.query))
        # Flatten single-value params
        for k in params:
            if len(params[k]) == 1:
                params[k] = params[k][0]

        # ── Static files ──
        if path == "/" or path == "/preview" or path == "/preview.html":
            self._serve_static(BASE_DIR / "preview.html", "text/html")
            return
        if path.startswith("/admin"):
            sub = path[6:] or "/index.html"
            if sub == "/" or sub == "":
                sub = "/index.html"
            self._serve_static(BASE_DIR / "admin" / sub.lstrip("/"))
            return
        if path.startswith("/widget/"):
            self._serve_static(BASE_DIR / "widget" / path[8:])
            return

        # ── API: Health ──
        if path == "/api/health":
            return self._json_response({"status": "ok", "version": "1.0.0"})

        # ── API: Community config (public) ──
        if path.startswith("/api/communities/"):
            cid = path.split("/")[-1]
            db = get_db()
            row = db.execute("SELECT * FROM communities WHERE id = ? OR slug = ?", (cid, cid)).fetchone()
            db.close()
            if not row:
                return self._json_response({"error": "Not found"}, 404)
            return self._json_response(community_to_widget_config(row))

        # ── ADMIN: Stats ──
        if path == "/api/admin/stats":
            if not self._check_admin():
                return self._json_response({"error": "Unauthorized"}, 401)
            db = get_db()
            week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
            month_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
            stats = {
                "totalLeads": db.execute("SELECT COUNT(*) FROM leads").fetchone()[0],
                "newLeads": db.execute("SELECT COUNT(*) FROM leads WHERE status='new'").fetchone()[0],
                "leadsThisWeek": db.execute("SELECT COUNT(*) FROM leads WHERE created_at>=?", (week_ago,)).fetchone()[0],
                "leadsThisMonth": db.execute("SELECT COUNT(*) FROM leads WHERE created_at>=?", (month_ago,)).fetchone()[0],
                "totalCommunities": db.execute("SELECT COUNT(*) FROM communities").fetchone()[0],
                "byCommunity": [dict(r) for r in db.execute("SELECT c.name, COUNT(l.id) as count FROM communities c LEFT JOIN leads l ON c.id=l.community_id GROUP BY c.id ORDER BY count DESC").fetchall()],
                "byCareType": [{"careType": r["care_type"], "count": r[1]} for r in db.execute("SELECT care_type, COUNT(*) FROM leads WHERE care_type IS NOT NULL GROUP BY care_type ORDER BY 2 DESC").fetchall()],
                "recentLeads": [lead_to_dict(r) for r in db.execute("SELECT l.*, c.name as community_name FROM leads l LEFT JOIN communities c ON l.community_id=c.id ORDER BY l.created_at DESC LIMIT 10").fetchall()],
            }
            db.close()
            return self._json_response(stats)

        # ── ADMIN: List communities ──
        if path == "/api/admin/communities":
            if not self._check_admin():
                return self._json_response({"error": "Unauthorized"}, 401)
            db = get_db()
            rows = db.execute("SELECT * FROM communities ORDER BY name").fetchall()
            db.close()
            return self._json_response({"communities": [community_to_dict(r) for r in rows]})

        # ── ADMIN: List leads ──
        if path == "/api/admin/leads":
            if not self._check_admin():
                return self._json_response({"error": "Unauthorized"}, 401)
            db = get_db()
            community = params.get("community", "")
            status = params.get("status", "")
            limit = int(params.get("limit", "200"))
            offset = int(params.get("offset", "0"))
            q = "SELECT l.*, c.name as community_name FROM leads l LEFT JOIN communities c ON l.community_id=c.id WHERE 1=1"
            p = []
            if community:
                q += " AND l.community_id=?"; p.append(community)
            if status:
                q += " AND l.status=?"; p.append(status)
            q += " ORDER BY l.created_at DESC LIMIT ? OFFSET ?"
            p.extend([limit, offset])
            rows = db.execute(q, p).fetchall()
            total = db.execute("SELECT COUNT(*) FROM leads").fetchone()[0]
            db.close()
            return self._json_response({"leads": [lead_to_dict(r) for r in rows], "total": total})

        # ── ADMIN: Export leads CSV ──
        if path == "/api/admin/leads/export":
            if not self._check_admin():
                return self._json_response({"error": "Unauthorized"}, 401)
            db = get_db()
            rows = db.execute("SELECT l.*, c.name as community_name FROM leads l LEFT JOIN communities c ON l.community_id=c.id ORDER BY l.created_at DESC").fetchall()
            db.close()
            output = io.StringIO()
            w = csv.writer(output)
            w.writerow(["ID","Community","Name","Email","Phone","Looking For","Care Type","Timeline","Interest","Tour Date","Tour Time","Status","Source","Created"])
            for r in rows:
                w.writerow([r["id"],r["community_name"],r["name"],r["email"],r["phone"],r["looking_for"],r["care_type"],r["timeline"],r["interest"],r["tour_date"],r["tour_time"],r["status"],r["source_url"],r["created_at"]])
            body = output.getvalue().encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/csv")
            self._cors()
            self.send_header("Content-Disposition", f"attachment; filename=leads_{datetime.utcnow().strftime('%Y%m%d')}.csv")
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)
            return

        # ── ADMIN: Single lead ──
        if path.startswith("/api/admin/leads/"):
            lid = path.split("/")[-1]
            if not self._check_admin():
                return self._json_response({"error": "Unauthorized"}, 401)
            db = get_db()
            row = db.execute("SELECT l.*, c.name as community_name FROM leads l LEFT JOIN communities c ON l.community_id=c.id WHERE l.id=?", (lid,)).fetchone()
            db.close()
            if not row:
                return self._json_response({"error": "Not found"}, 404)
            return self._json_response(lead_to_dict(row))

        self.send_error(404, "Not found")

    # ── POST ──
    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        data = self._read_body()

        # ── Auth login ──
        if path == "/api/auth/login":
            if data.get("username") == ADMIN_USER and data.get("password") == ADMIN_PASS:
                return self._json_response({"token": create_token(ADMIN_USER), "user": ADMIN_USER})
            return self._json_response({"error": "Invalid credentials"}, 401)

        # ── Submit lead (public) ──
        if path == "/api/leads":
            lead_id = f"lead_{uuid.uuid4().hex[:12]}"
            now = datetime.utcnow().isoformat()
            db = get_db()
            db.execute("""
                INSERT INTO leads (id, community_id, name, email, phone, looking_for, care_type,
                    timeline, interest, tour_date, tour_time, source_url, status, raw_data, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                lead_id, data.get("communityId"), data.get("name"), data.get("email"),
                data.get("phone"), data.get("lookingFor"), data.get("careType"),
                data.get("timeline"), data.get("interest"), data.get("tourDate"),
                data.get("tourTime"), data.get("source"), "new", json.dumps(data), now
            ))
            db.commit()
            db.close()
            print(f"  >>> NEW LEAD: {data.get('name')} — {data.get('email')} — {data.get('community')}")
            return self._json_response({"status": "ok", "id": lead_id}, 201)

        # ── ADMIN: Create community ──
        if path == "/api/admin/communities":
            if not self._check_admin():
                return self._json_response({"error": "Unauthorized"}, 401)
            cid = str(uuid.uuid4())
            slug = data.get("slug") or data.get("name", "").lower().replace(" ", "-").replace(",", "")
            now = datetime.utcnow().isoformat()
            db = get_db()
            db.execute("""
                INSERT INTO communities (id,name,slug,address,phone,brand_color,brand_color_hover,
                    secondary_color,accent_color,logo_url,floor_plans_url,gallery_url,
                    floor_plans_thumb,gallery_thumb,advisor_name,greeting,
                    tour_enabled,sms_enabled,care_types,config_json,created_at,updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                cid, data["name"], slug, data.get("address"), data.get("phone"),
                data.get("brandColor","#2E5339"), data.get("brandColorHover","#1e3a27"),
                data.get("secondaryColor","#3A4856"), data.get("accentColor","#4F8636"),
                data.get("logoUrl"), data.get("floorPlansUrl"), data.get("galleryUrl"),
                data.get("floorPlansThumb"), data.get("galleryThumb"),
                data.get("advisorName","Community Assistant"),
                data.get("greeting","Hi there! I'm here to help you explore"),
                1 if data.get("tourEnabled", True) else 0,
                1 if data.get("smsEnabled", True) else 0,
                json.dumps(data.get("careTypes", [])),
                json.dumps(data.get("configJson", {})),
                now, now
            ))
            db.commit()
            db.close()
            return self._json_response({"id": cid, "slug": slug}, 201)

        self.send_error(404, "Not found")

    # ── PUT ──
    def do_PUT(self):
        path = urllib.parse.urlparse(self.path).path
        data = self._read_body()

        if not self._check_admin():
            return self._json_response({"error": "Unauthorized"}, 401)

        # ── Update community ──
        if path.startswith("/api/admin/communities/"):
            cid = path.split("/")[-1]
            now = datetime.utcnow().isoformat()
            db = get_db()
            fields = {
                "name": data.get("name"), "slug": data.get("slug"),
                "address": data.get("address"), "phone": data.get("phone"),
                "brand_color": data.get("brandColor"), "brand_color_hover": data.get("brandColorHover"),
                "secondary_color": data.get("secondaryColor"), "accent_color": data.get("accentColor"),
                "logo_url": data.get("logoUrl"), "floor_plans_url": data.get("floorPlansUrl"),
                "gallery_url": data.get("galleryUrl"), "floor_plans_thumb": data.get("floorPlansThumb"),
                "gallery_thumb": data.get("galleryThumb"), "advisor_name": data.get("advisorName"),
                "greeting": data.get("greeting"),
            }
            if "tourEnabled" in data:
                fields["tour_enabled"] = 1 if data["tourEnabled"] else 0
            if "smsEnabled" in data:
                fields["sms_enabled"] = 1 if data["smsEnabled"] else 0
            if "careTypes" in data:
                fields["care_types"] = json.dumps(data["careTypes"])

            sets = ["updated_at=?"]
            vals = [now]
            for k, v in fields.items():
                if v is not None:
                    sets.append(f"{k}=?")
                    vals.append(v)
            vals.append(cid)
            db.execute(f"UPDATE communities SET {','.join(sets)} WHERE id=?", vals)
            db.commit()
            db.close()
            return self._json_response({"status": "ok"})

        # ── Update lead ──
        if path.startswith("/api/admin/leads/"):
            lid = path.split("/")[-1]
            db = get_db()
            if "status" in data:
                db.execute("UPDATE leads SET status=? WHERE id=?", (data["status"], lid))
            if "notes" in data:
                db.execute("UPDATE leads SET notes=? WHERE id=?", (data["notes"], lid))
            db.commit()
            db.close()
            return self._json_response({"status": "ok"})

        self.send_error(404, "Not found")

    # ── DELETE ──
    def do_DELETE(self):
        path = urllib.parse.urlparse(self.path).path
        if not self._check_admin():
            return self._json_response({"error": "Unauthorized"}, 401)

        db = get_db()
        if path.startswith("/api/admin/communities/"):
            cid = path.split("/")[-1]
            db.execute("DELETE FROM communities WHERE id=?", (cid,))
        elif path.startswith("/api/admin/leads/"):
            lid = path.split("/")[-1]
            db.execute("DELETE FROM leads WHERE id=?", (lid,))
        db.commit()
        db.close()
        return self._json_response({"status": "ok"})


# ═══════════════════ MAIN ═══════════════════
if __name__ == "__main__":
    init_db()
    server = HTTPServer(("0.0.0.0", PORT), APIHandler)
    print(f"""
╔══════════════════════════════════════════════════════════╗
║  Great Lakes Management — Community Assistant Platform   ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  Preview:    http://localhost:{PORT}/                       ║
║  Admin:      http://localhost:{PORT}/admin                  ║
║  Widget JS:  http://localhost:{PORT}/widget/gl-widget.js    ║
║  API:        http://localhost:{PORT}/api/health              ║
║                                                          ║
║  Admin login:  admin / greatlakes2026                    ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
""")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.shutdown()
