"""
Great Lakes Management — Community Assistant API (Vercel Serverless)
Serverless-compatible version using in-memory storage + JSON file fallback + Anthropic chat API.
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
import urllib.request
import urllib.parse
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler

SECRET_KEY = os.environ.get("SECRET_KEY", "gl-chat-secret-change-in-production")
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASS = os.environ.get("ADMIN_PASS", "glmc2024")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

# ── File paths for persistence ──
COMMUNITIES_FILE = "/tmp/gl_communities.json"
LEADS_FILE = "/tmp/gl_leads.json"

# ── In-memory data store (synced with files on startup) ──
COMMUNITIES = {}
LEADS = {}


def _load_from_file(filepath, default):
    """Load data from JSON file, return default if not found or error."""
    try:
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                return json.load(f)
    except Exception:
        pass
    return default


def _save_to_file(filepath, data):
    """Save data to JSON file."""
    try:
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass


def _seed():
    """Initialize communities and leads from files or defaults."""
    global COMMUNITIES, LEADS

    # Load from files first
    COMMUNITIES = _load_from_file(COMMUNITIES_FILE, {})
    LEADS = _load_from_file(LEADS_FILE, {})

    # Seed default community if not present
    if not COMMUNITIES:
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
        _save_to_file(COMMUNITIES_FILE, COMMUNITIES)


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


def _build_system_prompt(community):
    """Build a system prompt for the Anthropic API with community context."""
    care_types_text = ""
    if community.get("care_types"):
        care_types_text = "\n\nCare Types & Pricing:\n"
        for ct in community.get("care_types", []):
            care_types_text += f"- {ct.get('name')}: Starting at ${ct.get('startingAt', 'N/A')}/month\n"

    faq_text = ""
    if community.get("faq"):
        faq_text = "\n\nFrequently Asked Questions:\n"
        for item in community.get("faq", []):
            faq_text += f"Q: {item.get('q')}\nA: {item.get('a')}\n\n"

    system_prompt = f"""You are a warm, knowledgeable, and empathetic senior living advisor for {community.get('name', 'our community')}.

COMMUNITY INFORMATION:
Address: {community.get('address', 'N/A')}
Phone: {community.get('phone', 'N/A')}

{community.get('community_description', '')}

AMENITIES:
{community.get('amenities', 'N/A')}

DINING:
{community.get('dining_info', 'N/A')}

ACTIVITIES & PROGRAMS:
{community.get('activities', 'N/A')}

PET POLICY:
{community.get('pet_policy', 'N/A')}

VISITING HOURS:
{community.get('visiting_hours', 'N/A')}

TRANSPORTATION:
{community.get('transportation', 'N/A')}

STAFF & CARE:
{community.get('staff_info', 'N/A')}

MOVE-IN INFORMATION:
{community.get('move_in_info', 'N/A')}{care_types_text}{faq_text}

YOUR ROLE:
1. Answer questions about our community naturally and warmly, using the information provided above.
2. Be empathetic and understanding — choosing a senior living community is often an emotional decision for families.
3. Guide conversations toward scheduling tours and providing contact information.
4. When you sense the visitor is interested or considering a move, gently ask for their name, email, and phone number so we can follow up personally.
5. Never make up information not in the knowledge base — if unsure, say "I'd recommend speaking with our team directly at {community.get('phone', 'the number above')} to get the most accurate information."
6. Be professional, warm, and helpful. Remember that many visitors are exploring options for themselves or a loved one.

When suggesting actions like scheduling a tour or following up, be encouraging and make it easy for them."""

    return system_prompt


def _call_anthropic_api(system_prompt, messages):
    """Call the Anthropic Messages API using urllib.request."""
    if not ANTHROPIC_API_KEY:
        return None, "Anthropic API key not configured"

    try:
        request_body = {
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 1024,
            "system": system_prompt,
            "messages": messages,
        }

        body_bytes = json.dumps(request_body).encode("utf-8")

        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=body_bytes,
            headers={
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
            },
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=30) as response:
            response_data = json.loads(response.read().decode("utf-8"))

            # Extract text from response
            if response_data.get("content") and len(response_data["content"]) > 0:
                return response_data["content"][0].get("text"), None
            else:
                return None, "No response from API"

    except urllib.error.HTTPError as e:
        try:
            error_body = json.loads(e.read().decode("utf-8"))
            return None, error_body.get("error", {}).get("message", str(e))
        except Exception:
            return None, f"API error: {e.code} {e.reason}"
    except Exception as e:
        return None, f"Request error: {str(e)}"


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

        if path == "/api/chat":
            """Handle chat requests with Anthropic API."""
            community_id = data.get("communityId")
            messages = data.get("messages", [])
            lead_data = data.get("leadData")

            # Validate inputs
            if not community_id or not messages:
                return self._json({"error": "Missing communityId or messages"}, 400)

            # Get community
            community = COMMUNITIES.get(community_id)
            if not community:
                return self._json({"error": "Community not found"}, 404)

            # Build system prompt
            system_prompt = _build_system_prompt(community)

            # Call Anthropic API
            response_text, error = _call_anthropic_api(system_prompt, messages)

            if error:
                return self._json({"error": error}, 500)

            # Determine if we should capture a lead
            should_capture_lead = False
            if lead_data and lead_data.get("name") and lead_data.get("email"):
                should_capture_lead = True
                # Auto-save the lead
                lid = f"lead_{uuid.uuid4().hex[:12]}"
                lead_record = {
                    "id": lid,
                    "community": community_id,
                    "name": lead_data.get("name"),
                    "email": lead_data.get("email"),
                    "phone": lead_data.get("phone"),
                    "care_type": lead_data.get("care_type"),
                    "timeline": lead_data.get("timeline"),
                    "status": "new",
                    "created_at": datetime.utcnow().isoformat(),
                }
                LEADS[lid] = lead_record
                _save_to_file(LEADS_FILE, LEADS)

            # Detect if visitor seems interested (simple heuristic)
            suggested_actions = []
            if response_text and any(keyword in response_text.lower() for keyword in ["tour", "schedule", "visit", "interested"]):
                suggested_actions.append("schedule_tour")
                suggested_actions.append("provide_contact")

            return self._json({
                "response": response_text,
                "shouldCaptureLead": should_capture_lead,
                "suggestedActions": suggested_actions,
            })

        if path == "/api/leads":
            lid = f"lead_{uuid.uuid4().hex[:12]}"
            data["id"] = lid
            data["status"] = "new"
            data["created_at"] = datetime.utcnow().isoformat()
            LEADS[lid] = data
            _save_to_file(LEADS_FILE, LEADS)
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
            _save_to_file(COMMUNITIES_FILE, COMMUNITIES)
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
                _save_to_file(COMMUNITIES_FILE, COMMUNITIES)
            return self._json({"status": "ok"})

        if "/api/admin/leads/" in path:
            lid = path.split("/")[-1]
            if lid in LEADS:
                if "status" in data:
                    LEADS[lid]["status"] = data["status"]
                if "notes" in data:
                    LEADS[lid]["notes"] = data["notes"]
                _save_to_file(LEADS_FILE, LEADS)
            return self._json({"status": "ok"})

        self._json({"error": "Not found"}, 404)

    def do_DELETE(self):
        path = urllib.parse.urlparse(self.path).path.rstrip("/")
        if not self._auth():
            return self._json({"error": "Unauthorized"}, 401)

        if "/api/admin/communities/" in path:
            cid = path.split("/")[-1]
            COMMUNITIES.pop(cid, None)
            _save_to_file(COMMUNITIES_FILE, COMMUNITIES)
        elif "/api/admin/leads/" in path:
            lid = path.split("/")[-1]
            LEADS.pop(lid, None)
            _save_to_file(LEADS_FILE, LEADS)

        self._json({"status": "ok"})
