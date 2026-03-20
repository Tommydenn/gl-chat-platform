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
SEED_VERSION_FILE = "/tmp/gl_seed_version.txt"
SEED_VERSION = "3"  # Bump this to force re-seed with enriched data

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

    # Check seed version — if outdated, wipe communities to force re-seed
    current_version = ""
    try:
        if os.path.exists(SEED_VERSION_FILE):
            with open(SEED_VERSION_FILE, "r") as f:
                current_version = f.read().strip()
    except Exception:
        pass

    if current_version != SEED_VERSION:
        # Version mismatch — clear old community data to force re-seed
        COMMUNITIES = {}
        try:
            if os.path.exists(COMMUNITIES_FILE):
                os.remove(COMMUNITIES_FILE)
        except Exception:
            pass
        # Write new version
        try:
            with open(SEED_VERSION_FILE, "w") as f:
                f.write(SEED_VERSION)
        except Exception:
            pass
    else:
        COMMUNITIES = _load_from_file(COMMUNITIES_FILE, {})

    # Always load leads (don't wipe those)
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
            "advisor_name": "Sarah",
            "greeting": "Hi! I'm Sarah, your advisor here at The Glenn. Are you exploring senior living options for yourself or a loved one?",
            "tour_enabled": True,
            "sms_enabled": True,
            "care_types": [
                {"name": "Independent Living", "startingAt": 3130},
                {"name": "Assisted Living", "startingAt": 5020},
                {"name": "Memory Care", "startingAt": 5385}
            ],
            "community_description": "A faith-based senior community for adults 62 and over in West St. Paul, Minnesota. The Glenn offers Independent Living, Assisted Living, and Memory Care. Suburban setting, close to parks and hospitals. Minimum age 62. Couples welcome. No move-in fee. Month-to-month leasing available.",
            "room_types": "Studios, 1 Bedroom/1 Bath, 2 Bedroom/1 Bath. All units include individual climate control, private kitchenette, refrigerator, microwave, safety-assist bathroom, walk-in shower, and emergency pendant system. Residents can bring their own furniture.",
            "amenities": "Activity center, Beauty salon, Chapel, Communal kitchen, Elevators, Exercise room, Fireplace lounge, Individual mailboxes, High-speed internet and WiFi, Library, Movie room, On-site parking, Party/event space, Shared computers, Sun room, Secure memory care wing, Outdoor courtyard, Garden areas, Walking paths, Landscaped grounds, Patio seating",
            "dining_info": "Three chef-prepared meals daily (breakfast, lunch, dinner) plus snacks. Restaurant-style dining room with changing seasonal menus and nightly specials. Bistro and cafe seating available. Private dining room for family events. Accommodates diabetic, gluten-free, low-sugar/salt, vegetarian diets and other therapeutic diets.",
            "activities": "Indoor: Activity programs, arts and crafts, billiards, book clubs, card games, exercise classes, game nights, live entertainment, movie nights, piano, wellness programs, men's and women's groups, intergenerational programs. Outdoor: Accompanied walks, day trips, gardening, park visits, community outings, volunteer opportunities.",
            "pet_policy": "Small pets welcome with approval. Pet deposit may apply. Community also has shared community pets.",
            "visiting_hours": "Flexible visiting hours — mornings, afternoons, and evenings. Guests welcome at mealtimes. On-site parking for guests. Overnight guests allowed with arrangement.",
            "transportation": "Scheduled local transportation for medical appointments, personal errands, shopping trips, events, and religious services. Wheelchair-accessible transportation available.",
            "staff_info": "24/7 trained staff on-site. Licensed nurses available. Staff background checks required. English and Spanish spoken. Emergency pendant system in every unit. Personalized care plans for each resident. Services include medication management, bathing/dressing/grooming assistance, incontinence care, transfer assistance, concierge services, and accompaniment to medical appointments.",
            "daily_living_services": "Medication management, bathing assistance, dressing assistance, grooming assistance, eating assistance, transfer assistance, incontinence care, emergency pendant system, check-in care, concierge services, errand assistance, grocery shopping assistance, prescription pickup",
            "cleaning_services": "Housekeeping included, linen services included, full-service laundry available",
            "security": "24-hour security, staff background checks, secure memory care unit, emergency pendant system in all units",
            "included_in_rent": "Three meals daily, utilities, basic cable, high-speed internet/WiFi, weekly housekeeping, linen service, scheduled transportation, all activities and amenities",
            "move_in_info": "No move-in fee. Month-to-month lease available. Flexible move-in timelines. We help with the entire transition process. Respite (short-term) stays also available to try us out.",
            "additional_care": "Physical therapy available on-site. Private aides allowed for additional care. Respite/short-term stays provided. Adult day care not offered. Fully wheelchair accessible.",
            "accepted_programs": "Medicare accepted. Private pay.",
            "smoking_policy": "Smoking not allowed indoors. Outdoor smoking areas available.",
            "religious_services": "Chapel on-site, regular spiritual services, devotional areas, chaplain available.",
            "faq": [
                {"q": "What is included in the monthly cost?", "a": "Your apartment, three meals daily, utilities, basic cable, WiFi, weekly housekeeping, linen service, scheduled transportation, and access to all amenities and activities."},
                {"q": "Can I bring my own furniture?", "a": "Absolutely! We encourage it. Your apartment should feel like home."},
                {"q": "Is there a waiting list?", "a": "Availability changes frequently. Best to schedule a tour so we can show you what's open right now."},
                {"q": "Can couples live together?", "a": "Yes, we welcome couples and can accommodate them in our larger floor plans."},
                {"q": "Do you offer short-term stays?", "a": "Yes, we offer respite stays so you or your loved one can try the community before committing."},
                {"q": "What if care needs change over time?", "a": "We offer Independent Living, Assisted Living, and Memory Care all on one campus, so residents can transition seamlessly as needs change."},
                {"q": "Is there a minimum lease?", "a": "We offer month-to-month leasing. No long-term commitment required."},
                {"q": "Are pets allowed?", "a": "Yes, small pets are welcome with approval."}
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
    """Build a conversational, conversion-focused system prompt."""
    care_types_text = ""
    if community.get("care_types"):
        for ct in community.get("care_types", []):
            care_types_text += f"  {ct.get('name')}: starting at ${ct.get('startingAt', 'N/A')}/month\n"

    # Gather all knowledge fields
    knowledge_fields = [
        ("Description", "community_description"),
        ("Room Types", "room_types"),
        ("Amenities", "amenities"),
        ("Dining", "dining_info"),
        ("Activities", "activities"),
        ("Pet Policy", "pet_policy"),
        ("Visiting", "visiting_hours"),
        ("Transportation", "transportation"),
        ("Staff & Care", "staff_info"),
        ("Daily Living Services", "daily_living_services"),
        ("Cleaning", "cleaning_services"),
        ("Security", "security"),
        ("Included in Rent", "included_in_rent"),
        ("Move-In", "move_in_info"),
        ("Additional Care", "additional_care"),
        ("Accepted Programs", "accepted_programs"),
        ("Smoking", "smoking_policy"),
        ("Religious Services", "religious_services"),
    ]
    knowledge_text = ""
    for label, key in knowledge_fields:
        val = community.get(key, "")
        if val:
            knowledge_text += f"{label}: {val}\n"

    faq_text = ""
    if community.get("faq"):
        for item in community.get("faq", []):
            faq_text += f"Q: {item.get('q')} A: {item.get('a')}\n"

    system_prompt = f"""You are {community.get('advisor_name', 'an advisor')} at {community.get('name', 'our community')}. You're chatting with a website visitor through a small chat widget on the community's website.

PERSONALITY: You are warm, friendly, and genuinely helpful — like a real person texting, not a robot. You care about finding the right fit for each person.

=== CRITICAL CONVERSATION RULES ===
1. KEEP IT SHORT. 1-3 sentences max per response. This is a chat bubble, not an email.
2. Ask ONE question per response to keep the conversation flowing naturally.
3. NEVER dump all information at once. Share one thing, then ask what else they'd like to know.
4. When they ask about pricing, ask which care type first. Only share the relevant price.
5. DO NOT use markdown formatting (no **, no -, no bullet points). Write like a normal person texting.
6. DO NOT list things out. If they ask about amenities, mention 2-3 highlights and ask what matters most to them.
7. Use contractions (we've, you'll, it's). Sound natural and warm.
8. Mirror their tone — if they're casual, be casual. If they're formal, match that.

=== YOUR GOAL (in this order) ===
1. Figure out WHO they're looking for (themselves? a parent? spouse?) and WHAT matters most to them.
2. Answer their questions helpfully and build trust.
3. After 2-3 exchanges, naturally suggest a tour: "Would you like to come see the community in person? I'd love to show you around."
4. Get their contact info: "What's the best name and number to reach you at? I'll have our team set something up."
5. If they hesitate on a tour, offer to send info: "I can have someone send you more details — what's a good email?"

=== COMMUNITY KNOWLEDGE ===
{community.get('name', 'Our Community')}
Address: {community.get('address', 'N/A')}
Phone: {community.get('phone', 'N/A')}

Pricing:
{care_types_text}
{knowledge_text}
{faq_text}

=== IMPORTANT ===
If you don't know something specific, say "That's a great question — let me connect you with our team at {community.get('phone', 'our front desk')} for the most current info on that."
Never invent details not in the knowledge base above."""

    return system_prompt


def _call_anthropic_api(system_prompt, messages):
    """Call the Anthropic Messages API using urllib.request."""
    if not ANTHROPIC_API_KEY:
        return None, "Anthropic API key not configured"

    try:
        request_body = {
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 300,
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
