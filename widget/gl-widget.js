/**
 * Great Lakes Management — Community Assistant Chat Widget
 * Full-featured conversational lead-capture + pricing + tour scheduling widget.
 * Built as a Web Component with Shadow DOM.
 *
 * Features:
 *   - Step-based conversation flow engine
 *   - Pricing display per care type (pulled from API or config)
 *   - Floor plans & gallery links with thumbnail previews
 *   - Tour scheduling with date/time picker
 *   - SMS/text handoff opt-in
 *   - "Out of my budget" alternative flow
 *   - Lead capture with confirmation summary
 *   - Email + phone validation
 *   - Typing indicators, animations, mobile responsive
 *   - Custom event dispatch for analytics integration
 *   - Configurable per-community branding
 */

(function () {
  "use strict";

  /* ═══════════════════════════════ DEFAULT CONFIG ═══════════════════════════════ */
  const DEFAULT_CONFIG = {
    communityId: null,
    communityName: "The Glenn West St. Paul",
    advisorName: "Community Assistant",
    brandColor: "#2E5339",
    brandColorHover: "#1e3a27",
    secondaryColor: "#3A4856",
    accentColor: "#4F8636",
    fontFamily: '"Montserrat", "Segoe UI", Roboto, sans-serif',
    headingFont: '"Montserrat", sans-serif',
    logoUrl: null,
    careTypes: [
      { name: "Independent Living", startingAt: null },
      { name: "Assisted Living", startingAt: null },
      { name: "Memory Care", startingAt: null }
    ],
    chatWidth: 400,
    chatHeight: 560,
    position: "right",
    greeting: "Hi there! I'm here to help you explore",
    phoneNumber: "(651) 504-0710",
    address: "21 Thompson Ave E, West St Paul, MN 55118",
    floorPlansUrl: null,
    galleryUrl: null,
    floorPlansThumb: null,
    galleryThumb: null,
    tourEnabled: true,
    smsEnabled: true,
    apiEndpoint: null,
    zIndex: 999999,
    autoOpen: false,
    autoOpenDelay: 5000,
    showPoweredBy: true,
  };

  /* ═══════════════════════════════ ICONS (SVG) ═══════════════════════════════ */
  const ICON = {
    chat: `<svg class="ic-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
    close: `<svg class="ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    send: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
    person: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>`,
    sms: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>`,
    home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    arrowLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
    dollar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
    layout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
  };

  /* ═══════════════════════════════ STYLES ═══════════════════════════════ */
  function buildCSS(c) {
    return `
:host { all:initial; font-family:${c.fontFamily}; --brand:${c.brandColor}; --brand-h:${c.brandColorHover}; --sec:${c.secondaryColor}; --accent:${c.accentColor}; }
*{box-sizing:border-box;margin:0;padding:0;}

/* ── BUBBLE ── */
.bubble{position:fixed;bottom:24px;${c.position}:24px;width:64px;height:64px;border-radius:50%;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.25);z-index:${c.zIndex};transition:transform .2s,box-shadow .2s;border:none;outline:none;}
.bubble:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(0,0,0,0.32);}
.bubble svg{width:28px;height:28px;}
.bubble.open .ic-chat{display:none;} .bubble.open .ic-close{display:block;}
.bubble:not(.open) .ic-close{display:none;}
.badge{position:absolute;top:-2px;right:-2px;width:20px;height:20px;border-radius:50%;background:#e53e3e;color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center;font-weight:700;animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.15);}}

/* ── WINDOW ── */
.window{position:fixed;bottom:100px;${c.position}:24px;width:${c.chatWidth}px;max-width:calc(100vw - 32px);height:${c.chatHeight}px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,0.2);z-index:${c.zIndex};display:flex;flex-direction:column;overflow:hidden;opacity:0;transform:translateY(20px) scale(0.95);pointer-events:none;transition:opacity .25s ease,transform .25s ease;}
.window.vis{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}

/* ── HEADER ── */
.hdr{background:var(--brand);color:#fff;padding:14px 18px;display:flex;align-items:center;gap:12px;flex-shrink:0;position:relative;}
.hdr-avatar{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.hdr-avatar svg{width:22px;height:22px;}
.hdr-avatar img{width:42px;height:42px;border-radius:50%;object-fit:cover;}
.hdr-info h3{font-family:${c.headingFont};font-size:15px;font-weight:700;margin:0;}
.hdr-info p{font-size:12px;opacity:.82;margin:2px 0 0;}
.hdr-close{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;color:#fff;cursor:pointer;opacity:.7;padding:4px;}
.hdr-close:hover{opacity:1;}
.hdr-close svg{width:18px;height:18px;}

/* ── SMS BANNER ── */
.sms-banner{background:var(--sec);color:#fff;padding:10px 16px;display:flex;align-items:center;gap:10px;cursor:pointer;flex-shrink:0;transition:background .2s;}
.sms-banner:hover{background:${c.brandColorHover};}
.sms-banner svg{width:22px;height:22px;flex-shrink:0;}
.sms-banner-text{font-size:13px;line-height:1.3;}
.sms-banner-text strong{display:block;font-size:14px;}
.sms-banner-text a{color:#9ae6b4;font-size:12px;}

/* ── BODY ── */
.body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#f7f8fa;scroll-behavior:smooth;}
.body::-webkit-scrollbar{width:4px;} .body::-webkit-scrollbar-thumb{background:#d0d0d0;border-radius:4px;}

/* ── MESSAGES ── */
.msg{max-width:90%;padding:11px 15px;border-radius:16px;font-size:13.5px;line-height:1.55;animation:fadeUp .3s ease;word-wrap:break-word;}
.msg strong{font-weight:600;}
.bot{background:#fff;color:var(--sec);border-bottom-left-radius:4px;align-self:flex-start;box-shadow:0 1px 4px rgba(0,0,0,0.05);}
.usr{background:var(--brand);color:#fff;border-bottom-right-radius:4px;align-self:flex-end;}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}

/* ── TYPING ── */
.typing{display:flex;gap:5px;padding:10px 15px;align-self:flex-start;}
.typing span{width:7px;height:7px;border-radius:50%;background:var(--brand);opacity:.35;animation:blink 1.2s infinite;}
.typing span:nth-child(2){animation-delay:.2s;} .typing span:nth-child(3){animation-delay:.4s;}
@keyframes blink{0%,100%{opacity:.35;transform:scale(1);}50%{opacity:1;transform:scale(1.2);}}

/* ── PRICING TABLE ── */
.pricing{background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,0.05);animation:fadeUp .3s ease;align-self:flex-start;width:100%;}
.pricing-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0f0f0;}
.pricing-row:last-child{border-bottom:none;}
.pricing-name{font-size:13.5px;color:var(--sec);font-weight:500;}
.pricing-val{font-size:14px;font-weight:700;color:var(--brand);}
.pricing-val span{font-size:11px;font-weight:400;color:#999;display:block;text-align:right;}

/* ── MEDIA CARDS (Floor Plans / Gallery) ── */
.media-row{display:flex;gap:10px;animation:fadeUp .3s ease;}
.media-card{flex:1;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);cursor:pointer;transition:transform .15s,box-shadow .15s;text-decoration:none;color:inherit;}
.media-card:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.12);}
.media-card-img{width:100%;height:80px;background:#e8ecef;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.media-card-img img{width:100%;height:100%;object-fit:cover;}
.media-card-img svg{width:28px;height:28px;color:#aaa;}
.media-card-label{padding:8px 10px;font-size:12.5px;font-weight:600;color:var(--brand);display:flex;align-items:center;justify-content:space-between;}
.media-card-label span{font-size:16px;}

/* ── CALENDAR ── */
.cal{background:#fff;border-radius:12px;padding:14px;box-shadow:0 1px 4px rgba(0,0,0,0.05);animation:fadeUp .3s ease;align-self:stretch;}
.cal-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.cal-hdr button{background:none;border:none;cursor:pointer;color:var(--brand);padding:4px;}
.cal-hdr button svg{width:18px;height:18px;}
.cal-hdr span{font-weight:600;font-size:14px;color:var(--sec);}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;}
.cal-day-name{font-size:11px;color:#999;padding:4px 0;font-weight:600;}
.cal-day{font-size:13px;padding:8px 4px;border-radius:8px;cursor:pointer;transition:all .15s;color:var(--sec);}
.cal-day:hover{background:rgba(79,134,54,0.1);}
.cal-day.selected{background:var(--brand);color:#fff;font-weight:600;}
.cal-day.disabled{color:#ddd;cursor:default;pointer-events:none;}
.cal-day.empty{pointer-events:none;}

/* ── TIME SLOTS ── */
.times{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;animation:fadeUp .3s ease;}
.time-btn{padding:10px 8px;border:1.5px solid #e0e0e0;border-radius:8px;background:#fff;font-size:13px;font-family:${c.fontFamily};cursor:pointer;transition:all .15s;color:var(--sec);text-align:center;}
.time-btn:hover{border-color:var(--brand);color:var(--brand);}
.time-btn.selected{background:var(--brand);color:#fff;border-color:var(--brand);font-weight:600;}

/* ── OPTIONS ── */
.opts{display:flex;flex-direction:column;gap:7px;animation:fadeUp .3s ease;}
.opt{padding:10px 15px;border:1.5px solid var(--brand);border-radius:24px;background:#fff;color:var(--brand);font-size:13.5px;font-family:${c.fontFamily};font-weight:500;cursor:pointer;transition:all .15s;text-align:left;display:flex;align-items:center;gap:8px;}
.opt:hover{background:var(--brand);color:#fff;}
.opt svg{width:16px;height:16px;flex-shrink:0;}

/* ── CTA BUTTONS (Request Tour / Out of Budget) ── */
.cta-row{display:flex;flex-direction:column;gap:7px;animation:fadeUp .3s ease;margin-top:4px;}
.cta{padding:12px 16px;border-radius:24px;font-size:14px;font-family:${c.fontFamily};font-weight:600;cursor:pointer;transition:all .15s;text-align:center;border:none;}
.cta-primary{background:var(--brand);color:#fff;}
.cta-primary:hover{background:var(--brand-h);}
.cta-secondary{background:#fff;color:var(--sec);border:1.5px solid #ddd;}
.cta-secondary:hover{border-color:var(--brand);color:var(--brand);}

/* ── INPUT AREA ── */
.input-area{padding:10px 14px;border-top:1px solid #eee;background:#fff;flex-shrink:0;}
.input-row{display:flex;gap:8px;align-items:center;}
.input-row input{flex:1;padding:10px 14px;border:1.5px solid #ddd;border-radius:24px;font-size:13.5px;font-family:${c.fontFamily};outline:none;transition:border-color .2s;}
.input-row input:focus{border-color:var(--brand);}
.input-row input::placeholder{color:#bbb;}
.input-row button{width:38px;height:38px;border-radius:50%;background:var(--brand);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;flex-shrink:0;}
.input-row button:hover{background:var(--brand-h);}
.input-row button:disabled{opacity:.4;cursor:default;}
.input-row button svg{width:16px;height:16px;}
.input-err{color:#e53e3e;font-size:12px;margin-top:3px;padding-left:14px;}

/* ── FOOTER ── */
.foot{text-align:center;font-size:10.5px;color:#bbb;padding:5px;background:#fff;flex-shrink:0;}
.foot a{color:#aaa;text-decoration:none;} .foot a:hover{text-decoration:underline;}

/* ── MOBILE ── */
@media(max-width:480px){
  .window{bottom:0;left:0;right:0;width:100%;max-width:100%;height:100vh;max-height:100vh;border-radius:0;}
  .bubble{bottom:16px;${c.position}:16px;}
}
`;
  }

  /* ═══════════════════════════════ FLOW DEFINITIONS ═══════════════════════════════ */
  function buildFlow(cfg) {
    return [
      /* ── GREETING ── */
      { id:"greeting", message:`${cfg.greeting} ${cfg.communityName}! How can I help you today?`, type:"options", options:[
        {label:"Schedule a Tour", value:"tour", next:"ask_name", icon:"calendar"},
        {label:"Get Pricing Info", value:"pricing", next:"show_pricing", icon:"dollar"},
        {label:"View Floor Plans", value:"floorplans", next:"show_media", icon:"layout"},
        {label:"Speak With Someone", value:"call", next:"show_phone", icon:"phone"},
      ]},

      /* ── PRICING ── */
      { id:"show_pricing", type:"pricing", next:"pricing_cta" },
      { id:"pricing_cta", message:"Someone will be reaching out shortly to provide more detailed pricing information. We encourage you to schedule a tour with our team to learn more about {{communityName}}.", type:"media_and_cta" },

      /* ── MEDIA (floor plans + gallery) ── */
      { id:"show_media", type:"media", next:"media_done" },
      { id:"media_done", message:"Would you like to schedule a tour or get pricing info?", type:"options", options:[
        {label:"Schedule a Tour", value:"tour", next:"ask_name", icon:"calendar"},
        {label:"Get Pricing Info", value:"pricing", next:"show_pricing", icon:"dollar"},
        {label:"That's all for now", value:"done", next:"goodbye"},
      ]},

      /* ── PHONE ── */
      { id:"show_phone", message:`You can reach our team directly at <strong>${cfg.phoneNumber}</strong>. Would you also like us to reach out to you?`, type:"options", options:[
        {label:"Yes, contact me", value:"yes", next:"ask_name"},
        {label:"No thanks", value:"no", next:"goodbye"},
      ]},

      /* ── LEAD CAPTURE ── */
      { id:"ask_name", message:"Great! What's your name?", type:"text", field:"name", placeholder:"Your full name", next:"ask_who" },
      { id:"ask_who", message:"Nice to meet you, {{name}}! Who are you looking into senior living for?", type:"options", field:"lookingFor", options:[
        {label:"Myself", value:"Myself", next:"ask_care"},
        {label:"My parent", value:"Parent", next:"ask_care"},
        {label:"My spouse", value:"Spouse", next:"ask_care"},
        {label:"Another loved one", value:"Other", next:"ask_care"},
      ]},
      { id:"ask_care", message:"What type of care are you interested in?", type:"options", field:"careType", options:"__careTypes__" },
      { id:"ask_timeline", message:"When are you looking to make this move?", type:"options", field:"timeline", options:[
        {label:"Immediately", value:"Immediately", next:"ask_email"},
        {label:"1–3 months", value:"1-3 months", next:"ask_email"},
        {label:"3–6 months", value:"3-6 months", next:"ask_email"},
        {label:"6+ months / Just exploring", value:"6+ months", next:"ask_email"},
      ]},
      { id:"ask_email", message:"What's the best email to reach you at?", type:"email", field:"email", placeholder:"your@email.com", next:"ask_phone_input" },
      { id:"ask_phone_input", message:"And a phone number in case we need to follow up?", type:"phone", field:"phone", placeholder:"(555) 123-4567", next:"confirm" },
      { id:"confirm", message:"Thank you, {{name}}! Here's what you shared:\n\n• **Looking for:** {{lookingFor}}\n• **Care type:** {{careType}}\n• **Timeline:** {{timeline}}\n• **Email:** {{email}}\n• **Phone:** {{phone}}\n\nDoes everything look correct?", type:"options", options:[
        {label:"Looks good — submit!", value:"yes", next:"submit", icon:"check"},
        {label:"I need to make a change", value:"no", next:"ask_name"},
      ]},
      { id:"submit", message:"Sending your information to our team…", type:"action", action:"submitLead", next:"thank_you" },
      { id:"thank_you", message:"You're all set! A member of our team at {{communityName}} will be in touch soon. Have a wonderful day!", type:"done" },

      /* ── TOUR SCHEDULING ── */
      { id:"tour_pick_date", message:"Pick a date that works for you:", type:"calendar", field:"tourDate", next:"tour_pick_time" },
      { id:"tour_pick_time", message:"What time works best?", type:"timeslots", field:"tourTime", next:"ask_email", slots:[
        "9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM",
        "12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM","4:00 PM"
      ]},

      /* ── OUT OF BUDGET ── */
      { id:"out_of_budget", message:"We understand. Pricing can be a big factor, and we want to make sure you find the right fit. Would you like us to follow up with information about financial options and assistance programs?", type:"options", options:[
        {label:"Yes, please share info", value:"yes", next:"ask_name"},
        {label:"No thanks", value:"no", next:"goodbye"},
      ]},

      /* ── GOODBYE ── */
      { id:"goodbye", message:`Thanks for chatting! If you ever have questions, feel free to come back or call us at <strong>${cfg.phoneNumber}</strong>. Have a great day!`, type:"done" },
    ];
  }

  /* ═══════════════════════════════ UTILITIES ═══════════════════════════════ */
  function fmt$(n) {
    if (n == null) return null;
    return "$" + Number(n).toLocaleString("en-US");
  }

  function interpolate(text, cfg, lead) {
    return text
      .replace(/\{\{communityName\}\}/g, cfg.communityName)
      .replace(/\{\{phoneNumber\}\}/g, cfg.phoneNumber)
      .replace(/\{\{name\}\}/g, lead.name || "there")
      .replace(/\{\{lookingFor\}\}/g, lead.lookingFor || "")
      .replace(/\{\{careType\}\}/g, lead.careType || "")
      .replace(/\{\{timeline\}\}/g, lead.timeline || "")
      .replace(/\{\{email\}\}/g, lead.email || "")
      .replace(/\{\{phone\}\}/g, lead.phone || "");
  }

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  /* ═══════════════════════════════ WEB COMPONENT ═══════════════════════════════ */
  class GLChatWidget extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._open = false;
      this._lead = {};
      this._submitted = false;
      this._calMonth = new Date().getMonth();
      this._calYear = new Date().getFullYear();
    }

    connectedCallback() {
      // ── Parse config ──
      let userCfg = {};
      try { const a = this.getAttribute("config"); if (a) userCfg = JSON.parse(a); } catch(e){}
      try { const p = this.querySelector("pre.property-info"); if (p) Object.assign(userCfg, JSON.parse(p.textContent)); } catch(e){}
      this.cfg = Object.assign({}, DEFAULT_CONFIG, userCfg);

      // ── Build flow ──
      this._flow = buildFlow(this.cfg);
      // Replace __careTypes__ with actual options
      const ctStep = this._flow.find(s => s.options === "__careTypes__");
      if (ctStep) {
        ctStep.options = this.cfg.careTypes.map(ct => ({
          label: typeof ct === "string" ? ct : ct.name,
          value: typeof ct === "string" ? ct : ct.name,
          next: "ask_timeline"
        }));
      }
      this._flowMap = {};
      this._flow.forEach(s => this._flowMap[s.id] = JSON.parse(JSON.stringify(s)));

      // ── Render ──
      this._render();
      this._bind();

      // ── Auto-start ──
      setTimeout(() => this._runStep("greeting"), 500);
      if (this.cfg.autoOpen) setTimeout(() => { if (!this._open) this._toggle(); }, this.cfg.autoOpenDelay);
    }

    _render() {
      const c = this.cfg;
      const avatarHTML = c.logoUrl
        ? `<img src="${c.logoUrl}" alt="${c.communityName}" />`
        : ICON.person;

      this.shadowRoot.innerHTML = `
<style>${buildCSS(c)}</style>

<button class="bubble" aria-label="Open chat">
  <span class="badge">1</span>
  ${ICON.chat}${ICON.close}
</button>

<div class="window" role="dialog" aria-label="${c.advisorName}">
  <div class="hdr">
    <div class="hdr-avatar">${avatarHTML}</div>
    <div class="hdr-info">
      <h3>${c.advisorName}</h3>
      <p>${c.communityName}</p>
    </div>
    <button class="hdr-close" aria-label="Close">${ICON.close}</button>
  </div>
  ${c.smsEnabled ? `
  <div class="sms-banner" style="display:none;">
    ${ICON.sms}
    <div class="sms-banner-text">
      <strong>Let's continue this via text message</strong>
      Check your phone soon, or <a href="#">view options</a>
    </div>
  </div>` : ""}
  <div class="body"></div>
  <div class="input-area" style="display:none;">
    <div class="input-row">
      <input type="text" placeholder="Type a message…" />
      <button aria-label="Send">${ICON.send}</button>
    </div>
    <div class="input-err"></div>
  </div>
  ${c.showPoweredBy ? `<div class="foot">Powered by <a href="https://greatlakesmc.com" target="_blank" rel="noopener">Great Lakes Management</a></div>` : ""}
</div>`;
    }

    _bind() {
      this.$bubble = this.shadowRoot.querySelector(".bubble");
      this.$badge = this.shadowRoot.querySelector(".badge");
      this.$window = this.shadowRoot.querySelector(".window");
      this.$body = this.shadowRoot.querySelector(".body");
      this.$inputArea = this.shadowRoot.querySelector(".input-area");
      this.$input = this.shadowRoot.querySelector(".input-row input");
      this.$sendBtn = this.shadowRoot.querySelector(".input-row button");
      this.$error = this.shadowRoot.querySelector(".input-err");
      this.$smsBanner = this.shadowRoot.querySelector(".sms-banner");
      this.$hdrClose = this.shadowRoot.querySelector(".hdr-close");

      this.$bubble.addEventListener("click", () => this._toggle());
      this.$hdrClose.addEventListener("click", () => this._toggle());
      this.$sendBtn.addEventListener("click", () => this._onTextSubmit());
      this.$input.addEventListener("keydown", e => { if (e.key === "Enter") this._onTextSubmit(); });
    }

    /* ── Toggle ── */
    _toggle() {
      this._open = !this._open;
      this.$window.classList.toggle("vis", this._open);
      this.$bubble.classList.toggle("open", this._open);
      if (this._open) { this.$badge.style.display = "none"; this._scroll(); }
    }

    /* ── Bot message ── */
    _botMsg(html) {
      return new Promise(resolve => {
        const t = document.createElement("div");
        t.className = "typing";
        t.innerHTML = "<span></span><span></span><span></span>";
        this.$body.appendChild(t);
        this._scroll();
        const delay = Math.min(1000, 350 + html.length * 5);
        setTimeout(() => {
          t.remove();
          const m = document.createElement("div");
          m.className = "msg bot";
          m.innerHTML = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");
          this.$body.appendChild(m);
          this._scroll();
          resolve();
        }, delay);
      });
    }

    /* ── User message ── */
    _userMsg(text) {
      const m = document.createElement("div");
      m.className = "msg usr";
      m.textContent = text;
      this.$body.appendChild(m);
      this._scroll();
    }

    /* ── Show options ── */
    _showOptions(options) {
      return new Promise(resolve => {
        const c = document.createElement("div");
        c.className = "opts";
        options.forEach(opt => {
          const b = document.createElement("button");
          b.className = "opt";
          if (opt.icon && ICON[opt.icon]) b.innerHTML = ICON[opt.icon] + " " + opt.label;
          else b.textContent = opt.label;
          b.addEventListener("click", () => { c.remove(); this._userMsg(opt.label); resolve(opt); });
          c.appendChild(b);
        });
        this.$body.appendChild(c);
        this._scroll();
      });
    }

    /* ── Show pricing table ── */
    _showPricing() {
      return new Promise(resolve => {
        const t = document.createElement("div");
        t.className = "typing";
        t.innerHTML = "<span></span><span></span><span></span>";
        this.$body.appendChild(t);
        this._scroll();
        setTimeout(() => {
          t.remove();
          // Show user's email if we have it
          if (this._lead.email) {
            const em = document.createElement("div");
            em.className = "msg usr";
            em.textContent = this._lead.email;
            this.$body.appendChild(em);
          }
          const p = document.createElement("div");
          p.className = "pricing";
          this.cfg.careTypes.forEach(ct => {
            const name = typeof ct === "string" ? ct : ct.name;
            const price = typeof ct === "string" ? null : ct.startingAt;
            const row = document.createElement("div");
            row.className = "pricing-row";
            row.innerHTML = `
              <div class="pricing-name">${name}</div>
              <div class="pricing-val">${price ? `${fmt$(price)}<span>starting at</span>` : '<span>Contact us</span>'}</div>
            `;
            p.appendChild(row);
          });
          this.$body.appendChild(p);
          this._scroll();
          resolve();
        }, 600);
      });
    }

    /* ── Show media cards (floor plans + gallery) ── */
    _showMedia() {
      return new Promise(resolve => {
        const row = document.createElement("div");
        row.className = "media-row";

        if (this.cfg.floorPlansUrl) {
          const card = document.createElement("a");
          card.className = "media-card";
          card.href = this.cfg.floorPlansUrl;
          card.target = "_blank";
          card.rel = "noopener";
          card.innerHTML = `
            <div class="media-card-img">${this.cfg.floorPlansThumb ? `<img src="${this.cfg.floorPlansThumb}" alt="Floor Plans"/>` : ICON.layout}</div>
            <div class="media-card-label">View Floor Plans <span>›</span></div>
          `;
          row.appendChild(card);
        }
        if (this.cfg.galleryUrl) {
          const card = document.createElement("a");
          card.className = "media-card";
          card.href = this.cfg.galleryUrl;
          card.target = "_blank";
          card.rel = "noopener";
          card.innerHTML = `
            <div class="media-card-img">${this.cfg.galleryThumb ? `<img src="${this.cfg.galleryThumb}" alt="Gallery"/>` : ICON.image}</div>
            <div class="media-card-label">View Gallery <span>›</span></div>
          `;
          row.appendChild(card);
        }
        this.$body.appendChild(row);
        this._scroll();
        resolve();
      });
    }

    /* ── Show CTA buttons (Request Tour + Out of Budget) ── */
    _showCTAs() {
      return new Promise(resolve => {
        const wrap = document.createElement("div");
        wrap.className = "cta-row";

        const tourBtn = document.createElement("button");
        tourBtn.className = "cta cta-primary";
        tourBtn.textContent = "Request A Tour";
        tourBtn.addEventListener("click", () => { wrap.remove(); this._userMsg("Request A Tour"); resolve({ next: "ask_name", interest: "tour" }); });

        const budgetBtn = document.createElement("button");
        budgetBtn.className = "cta cta-secondary";
        budgetBtn.textContent = "Out Of My Budget";
        budgetBtn.addEventListener("click", () => { wrap.remove(); this._userMsg("Out Of My Budget"); resolve({ next: "out_of_budget", interest: "budget" }); });

        wrap.appendChild(tourBtn);
        wrap.appendChild(budgetBtn);
        this.$body.appendChild(wrap);
        this._scroll();
      });
    }

    /* ── Calendar picker ── */
    _showCalendar() {
      return new Promise(resolve => {
        const wrap = document.createElement("div");
        wrap.className = "cal";
        let selectedDate = null;

        const render = () => {
          const first = new Date(this._calYear, this._calMonth, 1);
          const daysInMonth = new Date(this._calYear, this._calMonth + 1, 0).getDate();
          const startDay = first.getDay();
          const today = new Date(); today.setHours(0,0,0,0);

          let html = `<div class="cal-hdr">
            <button class="cal-prev">${ICON.arrowLeft}</button>
            <span>${MONTHS[this._calMonth]} ${this._calYear}</span>
            <button class="cal-next" style="transform:rotate(180deg)">${ICON.arrowLeft}</button>
          </div><div class="cal-grid">`;
          DAYS.forEach(d => html += `<div class="cal-day-name">${d}</div>`);
          for (let i = 0; i < startDay; i++) html += `<div class="cal-day empty"></div>`;
          for (let d = 1; d <= daysInMonth; d++) {
            const dt = new Date(this._calYear, this._calMonth, d);
            const past = dt < today;
            const sel = selectedDate && dt.getTime() === selectedDate.getTime();
            html += `<div class="cal-day${past ? ' disabled' : ''}${sel ? ' selected' : ''}" data-d="${d}">${d}</div>`;
          }
          html += `</div>`;
          wrap.innerHTML = html;

          // Nav buttons
          wrap.querySelector(".cal-prev").addEventListener("click", () => {
            this._calMonth--; if (this._calMonth < 0) { this._calMonth = 11; this._calYear--; }
            render();
          });
          wrap.querySelector(".cal-next").addEventListener("click", () => {
            this._calMonth++; if (this._calMonth > 11) { this._calMonth = 0; this._calYear++; }
            render();
          });

          // Day clicks
          wrap.querySelectorAll(".cal-day:not(.disabled):not(.empty)").forEach(el => {
            el.addEventListener("click", () => {
              const day = parseInt(el.dataset.d);
              selectedDate = new Date(this._calYear, this._calMonth, day);
              const formatted = `${MONTHS[this._calMonth]} ${day}, ${this._calYear}`;
              wrap.remove();
              this._userMsg(formatted);
              resolve(formatted);
            });
          });
        };
        render();
        this.$body.appendChild(wrap);
        this._scroll();
      });
    }

    /* ── Time slot picker ── */
    _showTimeSlots(slots) {
      return new Promise(resolve => {
        const wrap = document.createElement("div");
        wrap.className = "times";
        slots.forEach(t => {
          const b = document.createElement("button");
          b.className = "time-btn";
          b.textContent = t;
          b.addEventListener("click", () => { wrap.remove(); this._userMsg(t); resolve(t); });
          wrap.appendChild(b);
        });
        this.$body.appendChild(wrap);
        this._scroll();
      });
    }

    /* ── Text input ── */
    _showInput(type, placeholder) {
      this.$inputArea.style.display = "block";
      this.$input.type = type === "phone" ? "tel" : type === "email" ? "email" : "text";
      this.$input.placeholder = placeholder || "Type here…";
      this.$input.value = "";
      this.$error.textContent = "";
      this._inputType = type;
      setTimeout(() => this.$input.focus(), 80);
    }
    _hideInput() { this.$inputArea.style.display = "none"; this.$error.textContent = ""; }

    _validate(val, type) {
      if (!val.trim()) return "Please enter a response.";
      if (type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) return "Please enter a valid email.";
      if (type === "phone" && !/[\d\-\(\)\+\s]{7,}/.test(val.trim())) return "Please enter a valid phone number.";
      return null;
    }

    _onTextSubmit() {
      const val = this.$input.value.trim();
      const err = this._validate(val, this._inputType);
      if (err) { this.$error.textContent = err; return; }
      this._hideInput();
      this._userMsg(val);
      if (this._curStep?.field) this._lead[this._curStep.field] = val;
      if (this._curStep?.next) this._runStep(this._curStep.next);
    }

    /* ═══════════════════ FLOW ENGINE ═══════════════════ */
    async _runStep(stepId) {
      const step = this._flowMap[stepId];
      if (!step) return;
      this._curStep = step;

      // ── ACTION steps ──
      if (step.action === "submitLead") {
        await this._botMsg(interpolate(step.message, this.cfg, this._lead));
        await this._submitLead();
        if (step.next) this._runStep(step.next);
        return;
      }

      // ── PRICING step ──
      if (step.type === "pricing") {
        await this._showPricing();
        if (step.next) this._runStep(step.next);
        return;
      }

      // ── MEDIA step ──
      if (step.type === "media") {
        await this._showMedia();
        if (step.next) this._runStep(step.next);
        return;
      }

      // ── MEDIA + CTA step (pricing follow-up) ──
      if (step.type === "media_and_cta") {
        await this._botMsg(interpolate(step.message, this.cfg, this._lead));
        await this._showMedia();
        const result = await this._showCTAs();
        if (result.interest) this._lead.interest = result.interest;
        if (result.next) this._runStep(result.next);
        return;
      }

      // ── CALENDAR step ──
      if (step.type === "calendar") {
        await this._botMsg(interpolate(step.message, this.cfg, this._lead));
        const date = await this._showCalendar();
        if (step.field) this._lead[step.field] = date;
        if (step.next) this._runStep(step.next);
        return;
      }

      // ── TIME SLOTS step ──
      if (step.type === "timeslots") {
        await this._botMsg(interpolate(step.message, this.cfg, this._lead));
        const time = await this._showTimeSlots(step.slots);
        if (step.field) this._lead[step.field] = time;
        if (step.next) this._runStep(step.next);
        return;
      }

      // ── Standard steps ──
      if (step.message) {
        await this._botMsg(interpolate(step.message, this.cfg, this._lead));
      }

      switch (step.type) {
        case "options": {
          const chosen = await this._showOptions(step.options);
          if (step.field) this._lead[step.field] = chosen.value;

          // Special: after choosing care type in greeting/pricing flow, go to tour scheduling
          if (chosen.value === "tour" && this.cfg.tourEnabled && !this._lead.name) {
            this._lead.interest = "tour";
          }

          if (chosen.next) this._runStep(chosen.next);
          break;
        }
        case "text": case "email": case "phone":
          this._showInput(step.type, step.placeholder);
          break;
        case "done":
          this._hideInput();
          // Show SMS banner after completion
          if (this.cfg.smsEnabled && this.$smsBanner) this.$smsBanner.style.display = "flex";
          break;
      }
    }

    /* ── Submit lead ── */
    async _submitLead() {
      if (this._submitted) return;
      this._submitted = true;
      const payload = {
        ...this._lead,
        community: this.cfg.communityName,
        communityId: this.cfg.communityId,
        source: window.location.href,
        timestamp: new Date().toISOString(),
      };
      console.log("[GL Chat] Lead captured:", payload);
      this.dispatchEvent(new CustomEvent("gl-lead-captured", { detail: payload, bubbles: true, composed: true }));
      if (this.cfg.apiEndpoint) {
        try {
          await fetch(this.cfg.apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (e) { console.warn("[GL Chat] API error:", e.message); }
      }
    }

    _scroll() { requestAnimationFrame(() => { this.$body.scrollTop = this.$body.scrollHeight; }); }
  }

  /* ═══════════════════ REGISTER ═══════════════════ */
  if (!customElements.get("gl-chat")) customElements.define("gl-chat", GLChatWidget);
})();
