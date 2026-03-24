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
SESSIONS_FILE = "/tmp/gl_sessions.json"
SEED_VERSION_FILE = "/tmp/gl_seed_version.txt"
SEED_VERSION = "4"  # Bump this to force re-seed with enriched data

# ── In-memory data store (synced with files on startup) ──
COMMUNITIES = {}
LEADS = {}
CHAT_SESSIONS = {}  # Track all conversations (not just leads)


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
    global COMMUNITIES, LEADS, CHAT_SESSIONS

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

    # Always load leads and sessions (don't wipe those)
    LEADS = _load_from_file(LEADS_FILE, {})
    CHAT_SESSIONS = _load_from_file(SESSIONS_FILE, {})

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
            "advisor_name": "Your Advisor",
            "greeting": "Hi there! Welcome to The Glenn. Are you exploring senior living options for yourself or a loved one?",
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

    system_prompt = f"""You are a friendly advisor at {community.get('name', 'our community')}. You're chatting with a website visitor through a small chat widget on the community's website.

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
1. Figure out WHO they're looking for (themselves? a parent? spouse?) and WHAT matters most.
2. Answer their questions helpfully — be genuinely useful and build trust.
3. After 2-3 exchanges, naturally suggest scheduling a tour: "Would you like to come see the community? I'd love to show you around!"
4. When they show interest in a tour or more info, ask for their name naturally: "Great! What's your name so I can get that set up for you?"
5. Then ask for their best contact: "And what's the best number or email to reach you at?"
6. If they hesitate on a tour, offer to email info: "No pressure at all! I can have someone send you more details — what's a good email?"
7. NEVER ask for all contact info at once. Get name first, then phone/email in a follow-up.

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


def _parse_source(page_url, referrer=""):
    """Parse a page URL and referrer into a traffic source label."""
    if not page_url and not referrer:
        return "Direct"
    url_lower = (page_url or "").lower()

    # 1. Check URL params for paid campaigns first
    if "gclid" in url_lower or ("utm_source=google" in url_lower and "utm_medium=cpc" in url_lower):
        return "Google Ads"
    if "fbclid" in url_lower or "utm_source=facebook" in url_lower:
        return "Facebook Ads"
    if "msclkid" in url_lower:
        return "Bing Ads"

    # 2. Check UTM source for any campaign tracking
    if "utm_source" in url_lower:
        try:
            params = urllib.parse.parse_qs(urllib.parse.urlparse(page_url).query)
            src = params.get("utm_source", [""])[0]
            medium = params.get("utm_medium", [""])[0]
            if src:
                label = src.replace("_", " ").title()
                if medium:
                    label += f" ({medium})"
                return label
        except Exception:
            pass

    # 3. Check referrer for organic traffic sources
    ref_lower = (referrer or "").lower()
    if ref_lower:
        referrer_map = {
            "google.": "Google Organic",
            "bing.": "Bing Organic",
            "yahoo.": "Yahoo Organic",
            "duckduckgo.": "DuckDuckGo",
            "facebook.": "Facebook",
            "instagram.": "Instagram",
            "linkedin.": "LinkedIn",
            "twitter.": "Twitter/X",
            "x.com": "Twitter/X",
            "youtube.": "YouTube",
            "tiktok.": "TikTok",
            "pinterest.": "Pinterest",
            "nextdoor.": "Nextdoor",
            "yelp.": "Yelp",
            "caring.com": "Caring.com",
            "aplaceformom.": "A Place for Mom",
            "seniorly.": "Seniorly",
            "seniorliving.": "SeniorLiving.org",
        }
        for pattern, label in referrer_map.items():
            if pattern in ref_lower:
                return label
        # Generic referral — extract domain
        try:
            ref_domain = urllib.parse.urlparse(referrer).netloc
            if ref_domain:
                return f"Referral ({ref_domain})"
        except Exception:
            pass

    # 4. No referrer and no UTM = Direct
    if not ref_lower:
        return "Direct"

    return "Direct"


def _extract_contact_info(messages):
    """Extract name, email, phone from conversation messages."""
    import re
    info = {}
    email_pattern = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')
    phone_pattern = re.compile(r'[\(]?\d{3}[\)\s.-]?\s*\d{3}[\s.-]?\d{4}')
    # Name patterns: "my name is X", "I'm X", "it's X", "this is X", "call me X", "name's X"
    name_patterns = [
        re.compile(r"(?:my name(?:'s| is)|i'?m|it'?s|this is|call me|name'?s)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", re.IGNORECASE),
    ]

    for msg in messages:
        if msg.get('role') != 'user':
            continue
        text = msg.get('content', '')

        # Extract name
        if not info.get('name'):
            for pattern in name_patterns:
                match = pattern.search(text)
                if match:
                    name = match.group(1).strip()
                    # Filter out common false positives
                    if name.lower() not in ('interested', 'looking', 'calling', 'writing', 'here', 'ready', 'fine', 'good', 'okay'):
                        info['name'] = name
                        break

        # Extract email
        if not info.get('email'):
            match = email_pattern.search(text)
            if match:
                info['email'] = match.group()

        # Extract phone
        if not info.get('phone'):
            match = phone_pattern.search(text)
            if match:
                info['phone'] = match.group()

    return info


def _calculate_move_in_score(messages, lead_data=None):
    """
    Calculate a move-in likelihood score (0-100) based on conversation signals.
    Inspired by Further's Move-in Prediction model.

    Scoring factors:
    - Contact info provided (name, email, phone)
    - Care type specificity (knows what level of care they need)
    - Timeline urgency (mentioned timeframe)
    - Tour interest (asked about visiting)
    - Decision stage signals (comparing communities, asked about availability)
    - Engagement depth (number of messages, follow-up questions)
    - Financial readiness (asked about pricing, payment options)
    - Personal connection (mentioned specific person moving in, relationship)
    """
    import re
    score = 0
    signals = []

    user_messages = [m.get('content', '') for m in messages if m.get('role') == 'user']
    all_text = ' '.join(user_messages).lower()
    msg_count = len(user_messages)

    # ── Contact Info Provided (max 20 pts) ──
    if lead_data:
        if lead_data.get('name'):
            score += 7; signals.append('provided_name')
        if lead_data.get('email'):
            score += 7; signals.append('provided_email')
        if lead_data.get('phone'):
            score += 6; signals.append('provided_phone')

    # ── Care Type Specificity (max 10 pts) ──
    care_keywords = ['assisted living', 'memory care', 'independent living', 'enhanced care', 'skilled nursing']
    for kw in care_keywords:
        if kw in all_text:
            score += 10; signals.append('specific_care_type')
            break

    # ── Tour Interest (max 15 pts) ──
    tour_patterns = [r'tour', r'visit', r'come see', r'stop by', r'walk.?through', r'check.?it out', r'look around', r'see the']
    for p in tour_patterns:
        if re.search(p, all_text):
            score += 15; signals.append('tour_interest')
            break

    # ── Timeline / Urgency (max 15 pts) ──
    urgent = [r'as soon as', r'right away', r'this week', r'this month', r'immediately', r'urgent', r'asap']
    moderate = [r'next month', r'next few months', r'coming months', r'in the spring', r'in the summer', r'in the fall', r'in the winter', r'soon']
    exploring = [r'just looking', r'just researching', r'exploring options', r'not sure yet', r'down the road', r'someday']

    has_timeline = False
    for p in urgent:
        if re.search(p, all_text):
            score += 15; signals.append('urgent_timeline'); has_timeline = True; break
    if not has_timeline:
        for p in moderate:
            if re.search(p, all_text):
                score += 10; signals.append('moderate_timeline'); has_timeline = True; break
    if not has_timeline:
        for p in exploring:
            if re.search(p, all_text):
                score += 3; signals.append('early_exploring'); has_timeline = True; break

    # ── Personal Connection (max 10 pts) ──
    personal = [r'my (mom|dad|mother|father|parent|grandmother|grandfather|grandma|grandpa|wife|husband|spouse)',
                r'for (him|her|them|my)', r'loved one']
    for p in personal:
        if re.search(p, all_text):
            score += 10; signals.append('personal_connection'); break

    # ── Financial Readiness (max 10 pts) ──
    financial = [r'cost', r'price', r'pricing', r'afford', r'budget', r'pay', r'insurance', r'medicare', r'medicaid', r'veteran', r'va benefit', r'included in rent']
    fin_count = sum(1 for p in financial if re.search(p, all_text))
    if fin_count >= 2:
        score += 10; signals.append('financial_discussion')
    elif fin_count == 1:
        score += 5; signals.append('pricing_inquiry')

    # ── Decision Stage (max 10 pts) ──
    decision = [r'avail', r'opening', r'wait.?list', r'move.?in date', r'when can', r'how soon', r'comparing', r'other communit']
    for p in decision:
        if re.search(p, all_text):
            score += 10; signals.append('decision_stage'); break

    # ── Engagement Depth (max 10 pts) ──
    if msg_count >= 6:
        score += 10; signals.append('high_engagement')
    elif msg_count >= 4:
        score += 7; signals.append('moderate_engagement')
    elif msg_count >= 2:
        score += 3; signals.append('light_engagement')

    # Cap at 100
    score = min(score, 100)

    # Determine label
    if score >= 70:
        label = 'High'
    elif score >= 40:
        label = 'Medium'
    else:
        label = 'Low'

    return {
        'score': score,
        'label': label,
        'signals': signals,
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

        if path == "/api/admin/analytics":
            if not self._auth():
                return self._json({"error": "Unauthorized"}, 401)
            sessions_list = list(CHAT_SESSIONS.values())
            leads_list = list(LEADS.values())
            week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()

            # Source breakdown
            source_map = {}
            for s in sessions_list:
                src = s.get("source", "Direct")
                if src not in source_map:
                    source_map[src] = {"source": src, "conversations": 0, "leads": 0, "messages": 0}
                source_map[src]["conversations"] += 1
                source_map[src]["messages"] += s.get("message_count", 0)
                if s.get("has_lead"):
                    source_map[src]["leads"] += 1

            sources = sorted(source_map.values(), key=lambda x: x["conversations"], reverse=True)
            for src in sources:
                src["conversionRate"] = round((src["leads"] / src["conversations"] * 100), 1) if src["conversations"] > 0 else 0
                src["avgMessages"] = round(src["messages"] / src["conversations"], 1) if src["conversations"] > 0 else 0

            # Page breakdown
            page_map = {}
            for s in sessions_list:
                page = s.get("page_url", "Unknown")
                if page not in page_map:
                    page_map[page] = {"page": page, "conversations": 0, "leads": 0}
                page_map[page]["conversations"] += 1
                if s.get("has_lead"):
                    page_map[page]["leads"] += 1
            pages = sorted(page_map.values(), key=lambda x: x["conversations"], reverse=True)

            # Community breakdown
            community_map = {}
            for s in sessions_list:
                cname = s.get("community_name", s.get("community", "Unknown"))
                if cname not in community_map:
                    community_map[cname] = {"community": cname, "conversations": 0, "leads": 0}
                community_map[cname]["conversations"] += 1
                if s.get("has_lead"):
                    community_map[cname]["leads"] += 1
            communities_breakdown = sorted(community_map.values(), key=lambda x: x["conversations"], reverse=True)

            total_convos = len(sessions_list)
            total_leads = len(leads_list)
            total_with_lead = sum(1 for s in sessions_list if s.get("has_lead"))
            this_week_convos = sum(1 for s in sessions_list if s.get("created_at", "") >= week_ago)
            avg_msgs = round(sum(s.get("message_count", 0) for s in sessions_list) / max(total_convos, 1), 1)

            return self._json({
                "totalConversations": total_convos,
                "totalLeads": total_leads,
                "conversionRate": round((total_with_lead / max(total_convos, 1)) * 100, 1),
                "conversationsThisWeek": this_week_convos,
                "avgMessagesPerConvo": avg_msgs,
                "bySource": sources,
                "byPage": pages,
                "byCommunity": communities_breakdown,
            })

        if path == "/api/admin/communities":
            if not self._auth():
                return self._json({"error": "Unauthorized"}, 401)
            return self._json({"communities": list(COMMUNITIES.values())})

        if path.startswith("/api/admin/communities/"):
            if not self._auth():
                return self._json({"error": "Unauthorized"}, 401)
            cid = path.split("/")[-1]
            c = COMMUNITIES.get(cid)
            if not c:
                return self._json({"error": "Not found"}, 404)
            return self._json(c)

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

        if path.startswith("/api/admin/leads/") and path != "/api/admin/leads/export":
            if not self._auth():
                return self._json({"error": "Unauthorized"}, 401)
            lid = path.split("/")[-1]
            lead = LEADS.get(lid)
            if not lead:
                return self._json({"error": "Not found"}, 404)
            return self._json(lead)

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
            session_id = data.get("sessionId", "")
            page_url = data.get("pageUrl", "")
            referrer = data.get("referrer", "")

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

            # Auto-detect contact info from conversation
            full_convo = messages + [{"role": "assistant", "content": response_text}]
            detected = _extract_contact_info(messages)

            # Store/update lead if we have any contact info
            should_capture_lead = False
            if detected.get('email') or detected.get('phone'):
                should_capture_lead = True
                # Calculate move-in score
                move_in = _calculate_move_in_score(full_convo, detected)
                traffic_source = _parse_source(page_url, referrer)

                # Check if we already have a lead for this conversation
                existing_lead = None
                conv_key = community_id + "_" + (detected.get('email', '') or detected.get('phone', ''))
                for lid, lead in LEADS.items():
                    if lead.get('_conv_key') == conv_key:
                        existing_lead = lid
                        break

                if existing_lead:
                    # Update existing lead with new info and conversation
                    LEADS[existing_lead].update({
                        k: v for k, v in detected.items() if v
                    })
                    LEADS[existing_lead]['conversation'] = full_convo
                    LEADS[existing_lead]['move_in_score'] = move_in['score']
                    LEADS[existing_lead]['move_in_label'] = move_in['label']
                    LEADS[existing_lead]['move_in_signals'] = move_in['signals']
                    LEADS[existing_lead]['updated_at'] = datetime.utcnow().isoformat()
                else:
                    lid = f"lead_{uuid.uuid4().hex[:12]}"
                    LEADS[lid] = {
                        "id": lid,
                        "community": community_id,
                        "community_name": community.get("name", ""),
                        "name": detected.get('name', ''),
                        "email": detected.get('email', ''),
                        "phone": detected.get('phone', ''),
                        "care_type": "",
                        "status": "new",
                        "source": "chat_widget",
                        "traffic_source": traffic_source,
                        "referrer": referrer,
                        "page_url": page_url,
                        "move_in_score": move_in['score'],
                        "move_in_label": move_in['label'],
                        "move_in_signals": move_in['signals'],
                        "conversation": full_convo,
                        "notes": "",
                        "salesperson": "",
                        "_conv_key": conv_key,
                        "created_at": datetime.utcnow().isoformat(),
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                _save_to_file(LEADS_FILE, LEADS)

            # Track chat session for analytics
            if session_id:
                if session_id in CHAT_SESSIONS:
                    CHAT_SESSIONS[session_id]["messages"] = full_convo
                    CHAT_SESSIONS[session_id]["message_count"] = len(full_convo)
                    CHAT_SESSIONS[session_id]["has_lead"] = should_capture_lead
                    CHAT_SESSIONS[session_id]["updated_at"] = datetime.utcnow().isoformat()
                else:
                    CHAT_SESSIONS[session_id] = {
                        "id": session_id,
                        "community": community_id,
                        "community_name": community.get("name", ""),
                        "page_url": page_url,
                        "source": _parse_source(page_url, referrer),
                        "referrer": referrer,
                        "message_count": len(full_convo),
                        "has_lead": should_capture_lead,
                        "created_at": datetime.utcnow().isoformat(),
                        "updated_at": datetime.utcnow().isoformat(),
                    }
                _save_to_file(SESSIONS_FILE, CHAT_SESSIONS)

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
            if "conversation" not in data:
                data["conversation"] = []
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
                "roomTypes": "room_types",
                "dailyLivingServices": "daily_living_services",
                "cleaningServices": "cleaning_services",
                "security": "security",
                "includedInRent": "included_in_rent",
                "additionalCare": "additional_care",
                "acceptedPrograms": "accepted_programs",
                "smokingPolicy": "smoking_policy",
                "religiousServices": "religious_services",
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
                    "roomTypes": "room_types",
                    "dailyLivingServices": "daily_living_services",
                    "cleaningServices": "cleaning_services",
                    "security": "security",
                    "includedInRent": "included_in_rent",
                    "additionalCare": "additional_care",
                    "acceptedPrograms": "accepted_programs",
                    "smokingPolicy": "smoking_policy",
                    "religiousServices": "religious_services",
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
                allowed = ["status", "notes", "salesperson", "care_type"]
                for field in allowed:
                    if field in data:
                        LEADS[lid][field] = data[field]
                LEADS[lid]["updated_at"] = datetime.utcnow().isoformat()
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
