"""
Great Lakes Management — Community Assistant API (Vercel Serverless)
Serverless-compatible version using in-memory storage + JSON file fallback.
"""

import json
import os
import hashlib
import hmac
import base64
import time
import uuid
import csv
import io
import urllib.parse
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler

SECRET_KEY = os.environ.get("SECRET_KEY", "gl-chat-secret-change-in-production")
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "glmc2024")

# ── In-memory data store (resets on cold start — use Vercel KV/Postgres for production) ──
COMMUNITIES = {}
LEADS = {}

def _seed():
    if COMMUNITIES:
        return
    cid = "glenn-west-st-paul"
    COMMUNITIES[cid] = {
        "id": cid,
        "name": "The Glenn West St. Paul",
        "slug": cid,
        "address": "21 Thompson Ave E, West St Paul, MN 55118",
        "phone": "(651) 504-0710",
        "brand_color": "#2E5339",
        "brand_color_hover": "#1e3a27",
        "secondary_color": "#3A4856",
        "accent_color": "#4F8636",
        "logo_url": None,
        "floor_plans_url": "https://glennseniorliving.com/west-st-paul-mn/floor-plans/",
        "gallery_url": "https://glennseniorliving.com/west-st-paul-mn/",
        "floor_plans_thumb": None,
        "gallery_thumb": None,
        "advisor_name": "Community Assistant",
        "greeting": "Hi there! I'm here to help you explore",
        "tour_enabled": True,
        "sms_enabled": True,
        "care_types": [
            {"name": "Independent Living", "startingAt": 3130},
            {"name": "Assisted Living", "startingAt": 5020},
            {"name": "Memory Care", "startingAt": 5385}
        ],
        "community_description": "A faith-based senior community for adults 62 and over in West St. Paul, Minnesota. The Glenn offers Independent Living, Assisted Living, and Memory Care with a warm, welcoming environment.",
        "amenities": "Restaurant-style dining, Fitness center, Chapel, Library, Beauty salon, Walking paths, Community garden, Activity rooms, Underground parking, Emergency call system",
        "dining_info": "Three chef-prepared meals daily included. Restaurant-style dining room with seasonal menus. Special dietary accommodations available.",
        "activities": "Daily social activities, Exercise classes, Arts and crafts, Book clubs, Movie nights, Live entertainment, Community outings, Spiritual services, Holiday celebrations",
        "pet_policy": "Small pets welcome with approval. Pet deposit may apply.",
        "visiting_hours": "Visitors welcome anytime during regular hours. 24/7 access for family members of Memory Care residents with prior arrangement.",
        "transportation": "Scheduled transportation for medical appointments and community outings.",
        "staff_info": "24/7 trained staff on-site. Licensed nurses available. Personalized care plans for each resident.",
        "move_in_info": "Contact us to schedule a tour and learn about current availability. We offer flexible move-in timelines and can help with the transition process.",
        "faq": [
            {"q": "What is included in the monthly cost?", "a": "Monthly rent includes your apartment, three meals daily, utilities, basic cable, weekly housekeeping, scheduled transportation, and access to all community amenities and activities."},
            {"q": "Can I bring my own furniture?", "a": "Yes! We encourage residents to bring personal furnishings to make their apartment feel like home."},
            {"q": "Is there a waiting list?", "a": "Availability varies. Contact us to check current openings and join our interest list."},
            {"q": "What level of care is available?", "a": "We offer Independent Living, Assisted Living, and Memory Care, with personalized care plans that can adjust as needs change."}
        ],
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

_seed()


# ── JWT ──
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


def community_to_widget_config(c):
    return {
        "communityId": c["id"],
        "communityName": c["name"],
        "advisorName": c.get("advisor_name", "Community Assistant"),
        "brandColor": c.get("brand_color", "#2E5339"),
        "brandColorHover": c.get("brand_color_hover", "#1e3a27"),
        "secondaryColor": c.get("secondary_color", "#3A4856"),
        "accentColor": c.get("accent_color", "#4F8636"),
        "logoUrl": c.get("logo_url"),
        "careTypes": c.get("care_types", []),
        "phoneNumber": c.get("phone"),
        "address": c.get("address"),
        "floorPlansUrl": c.get("floor_plans_url"),
        "galleryUrl": c.get("gallery_url"),
        "floorPlansThumb": c.get("floor_plans_thumb"),
        "galleryThumb": c.get("gallery_thumb"),
        "tourEnabled": c.get("tour_enabled", True),
        "smsEnabled": c.get("sms_enabled", True),
        "greeting": c.get("greeting", "Hi there! I'm here to help you explore"),
        "communityDescription": c.get("community_description", ""),
        "amenities": c.get("amenities", ""),
        "diningInfo": c.get("dining_info", ""),
        "activities": c.get("activities", ""),
        "petPolicy": c.get("pet_policy", ""),
        "visitingHours": c.get("visiting_hours", ""),
        "transportation": c.get("transportation", ""),
        "staffInfo": c.get("staff_info", ""),
        "moveInInfo": c.get("move_in_info", ""),
        "faq": c.get("faq", []),
    }


class handler(BaseHTTPRequestHandler):

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        try:
            return json.loads(self.rfile.read(length))
        except Exception:
            return {}

    def _auth(self):
        token = self.headers.get("Authorization", "").replace("Bearer ", "")
        return verify_token(token) is not None

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        params = {k: v[0] for k, v in urllib.parse.parse_qs(parsed.query).items()}

        if path == "/api/health":
            return self._json({"status": "ok", "version": "1.0.0"})

        if path.startswith("/api/communities/"):
            cid = path.split("/")[-1]
            c = COMMUNITIES.get(cid)
            if not c:
                return self._json({"error": "Not found"}, 404)
            return self._json(community_to_widget_config(c))

        if path == "/api/admin/stats":
            if not self._auth():
                return self._json({"error": "Unauthorized"}, 401)
            leads_list = list(LEADS.values())
            week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
            month_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
            return self._json({
                "totalLeads": len(leads_list),
                "newLeads": sum(1 for l in leads_list if l.get("status") == "new"),
                "leadsThisWeek": sum(1 for l in leads_list if l.get("created_at", "") >= week_ago),
                "leadsThisMonth": sum(1 for l in leads_list if l.get("created_at", "") >= month_ago),
                "totalCommunities": len(COMMUNITIES),
                "byCommunity": [],
                "byCareType": [],
                "recentLeads": sorted(leads_list, key=lambda x: x.get("created_at", ""), reverse=True)[:10],
            })

        if path == "/api/admin/communities":
            if not self._auth():
                return self._json({"error": "Unauthorized"}, 401)
            return self._json({"communities": list(COMMUNITIES.values())})

        if path == "/api/admin/leads":
            if not self._auth():
                return self._json({"error": "Unauthorized"}, 401)
            leads_list = sorted(LEADS.values(), key=lambda x: x.get("created_at", ""), reverse=True)
            return self._json({"leads": leads_list, "total": len(leads_list)})

        if path == "/api/admin/leads/export":
            if not self._auth():
                return self._json({"error": "Unauthorized"}, 401)
            output = io.StringIO()
            w = csv.writer(output)
            w.writerow(["ID", "Community", "Name", "Email", "Phone", "Care Type", "Timeline", "Status", "Created"])
            for l in LEADS.values():
                w.writerow([l.get("id"), l.get("community"), l.get("name"), l.get("email"), l.get("phone"), l.get("care_type"), l.get("timeline"), l.get("status"), l.get("created_at")])
            body = output.getvalue().encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/csv")
            self._cors()
            self.send_header("Content-Disposition", "attachment; filename=leads.csv")
            self.send_header("Content-Length", len(body))
            self.end_headers()
            self.wfile.write(body)
            return

        self._json({"error": "Not found"}, 404)

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path.rstrip("/")
        data = self._body()

        if path == "/api/auth/login":
            if data.get("username") == ADMIN_USER and data.get("password") == ADMIN_PASS:
                return self._json({"token": create_token(ADMIN_USER), "user": ADMIN_USER})
            return self._json({"error": "Invalid credentials"}, 401)

        if path == "/api/leads":
            lid = f"lead_{uuid.uuid4().hex[:12]}"
            data["id"] = lid
            data["status"] = "new"
            data["created_at"] = datetime.utcnow().isoformat()
            LEADS[lid] = data
            return self._json({"status": "ok", "id": lid}, 201)

        if path == "/api/admin/communities":
            if not self._auth():
                return self._json({"error": "Unauthorized"}, 401)
            # Map camelCase from admin dashboard to snake_case
            field_map = {
                "brandColor": "brand_color", "accentColor": "accent_color",
                "floorPlansUrl": "floor_plans_url", "galleryUrl": "gallery_url",
                "logoUrl": "logo_url", "advisorName": "advisor_name",
                "careTypes": "care_types",
                "communityDescription": "community_description",
                "amenities": "amenities", "diningInfo": "dining_info",
                "activities": "activities", "petPolicy": "pet_policy",
                "visitingHours": "visiting_hours", "transportation": "transportation",
                "staffInfo": "staff_info", "moveInInfo": "move_in_info",
                "faq": "faq",
            }
            mapped = {}
            for k, v in data.items():
                mapped[field_map.get(k, k)] = v
            cid = mapped.get("slug") or mapped.get("name", "").lower().replace(" ", "-").replace(",", "")
            mapped["id"] = cid
            mapped["slug"] = cid
            mapped["created_at"] = datetime.utcnow().isoformat()
            mapped["updated_at"] = datetime.utcnow().isoformat()
            COMMUNITIES[cid] = mapped
            return self._json({"id": cid, "slug": cid}, 201)

        self._json({"error": "Not found"}, 404)

    def do_PUT(self):
        path = urllib.parse.urlparse(self.path).path.rstrip("/")
        data = self._body()
        if not self._auth():
            return self._json({"error": "Unauthorized"}, 401)

        if "/api/admin/communities/" in path:
            cid = path.split("/")[-1]
            if cid in COMMUNITIES:
                # Map camelCase from admin dashboard to snake_case
                field_map = {
                    "brandColor": "brand_color", "accentColor": "accent_color",
                    "floorPlansUrl": "floor_plans_url", "galleryUrl": "gallery_url",
                    "logoUrl": "logo_url", "advisorName": "advisor_name",
                    "careTypes": "care_types",
                    "communityDescription": "community_description",
                    "amenities": "amenities", "diningInfo": "dining_info",
                    "activities": "activities", "petPolicy": "pet_policy",
                    "visitingHours": "visiting_hours", "transportation": "transportation",
                    "staffInfo": "staff_info", "moveInInfo": "move_in_info",
                    "faq": "faq",
                }
                mapped = {}
                for k, v in data.items():
                    mapped[field_map.get(k, k)] = v
                COMMUNITIES[cid].update(mapped)
                COMMUNITIES[cid]["updated_at"] = datetime.utcnow().isoformat()
            return self._json({"status": "ok"})

        if "/api/admin/leads/" in path:
            lid = path.split("/")[-1]
            if lid in LEADS:
                if "status" in data:
                    LEADS[lid]["status"] = data["status"]
                if "notes" in data:
                    LEADS[lid]["notes"] = data["notes"]
            return self._json({"status": "ok"})

        self._json({"error": "Not found"}, 404)

    def do_DELETE(self):
        path = urllib.parse.urlparse(self.path).path.rstrip("/")
        if not self._auth():
            return self._json({"error": "Unauthorized"}, 401)

        if "/api/admin/communities/" in path:
            cid = path.split("/")[-1]
            COMMUNITIES.pop(cid, None)
        elif "/api/admin/leads/" in path:
            lid = path.split("/")[-1]
            LEADS.pop(lid, None)

        self._json({"status": "ok"})
