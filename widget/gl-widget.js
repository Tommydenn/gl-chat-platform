(function() {
  'use strict';

  /**
   * Great Lakes Chat Widget v2.0
   * AI-powered conversational interface for senior living communities
   * Powered by Anthropic Claude via Great Lakes Management
   */

  const style = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

    :host {
      --primary: #003c4c;
      --primary-light: #007098;
      --primary-lighter: #e8f4f8;
      --accent: #a61c3b;
      --surface: #ffffff;
      --surface-alt: #f7f8fa;
      --text-primary: #1a2b3c;
      --text-secondary: #5f6b7a;
      --text-muted: #8e99a4;
      --border: #e2e8f0;
      --border-light: #f0f3f6;
      --shadow-sm: 0 1px 3px rgba(0,60,76,0.08);
      --shadow-md: 0 4px 20px rgba(0,60,76,0.12);
      --shadow-lg: 0 12px 40px rgba(0,60,76,0.18);
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --radius-full: 9999px;
      --transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .gl-widget-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      font-size: 14px;
      line-height: 1.5;
      color: var(--text-primary);
    }

    .gl-widget-root[data-position="left"] {
      left: 24px;
      right: auto;
    }

    /* ─── Launcher ─── */
    .gl-launcher {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
      box-shadow: var(--shadow-lg), 0 0 0 0 rgba(0,112,152,0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      padding: 0;
      transition: all var(--transition);
      position: relative;
      animation: pulse-ring 3s ease-out infinite;
    }

    @keyframes pulse-ring {
      0% { box-shadow: var(--shadow-lg), 0 0 0 0 rgba(0,112,152,0.35); }
      50% { box-shadow: var(--shadow-lg), 0 0 0 12px rgba(0,112,152,0); }
      100% { box-shadow: var(--shadow-lg), 0 0 0 0 rgba(0,112,152,0); }
    }

    .gl-launcher:hover {
      transform: scale(1.08);
      box-shadow: var(--shadow-lg);
      animation: none;
    }

    .gl-launcher:active { transform: scale(0.95); }

    .gl-launcher.hide {
      opacity: 0;
      pointer-events: none;
      transform: scale(0);
    }

    .gl-launcher svg {
      width: 26px;
      height: 26px;
      color: white;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    /* ─── Chat Window ─── */
    .gl-window {
      position: absolute;
      bottom: 76px;
      right: 0;
      width: 400px;
      height: 580px;
      background: var(--surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 2;
      animation: window-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .gl-widget-root[data-position="left"] .gl-window {
      left: 0;
      right: auto;
    }

    .gl-window.open { display: flex; }

    @keyframes window-enter {
      from { opacity: 0; transform: translateY(16px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ─── Header ─── */
    .gl-header {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
      color: white;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
      position: relative;
    }

    .gl-header::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(to bottom, rgba(0,0,0,0.04), transparent);
    }

    .gl-header-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .gl-header-avatar svg {
      width: 22px;
      height: 22px;
      color: white;
    }

    .gl-header-info { flex: 1; min-width: 0; }

    .gl-header-name {
      font-weight: 600;
      font-size: 15px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .gl-header-status {
      font-size: 12px;
      opacity: 0.85;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .gl-header-status::before {
      content: '';
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #4ade80;
      display: inline-block;
    }

    .gl-close {
      background: rgba(255,255,255,0.15);
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: background var(--transition);
      flex-shrink: 0;
    }

    .gl-close:hover { background: rgba(255,255,255,0.25); }

    /* ─── Messages ─── */
    .gl-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: var(--surface-alt);
      scroll-behavior: smooth;
    }

    .gl-messages::-webkit-scrollbar { width: 5px; }
    .gl-messages::-webkit-scrollbar-track { background: transparent; }
    .gl-messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    .gl-msg {
      display: flex;
      flex-direction: column;
      animation: msg-enter 0.3s ease-out;
      max-width: 100%;
    }

    @keyframes msg-enter {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .gl-msg.user { align-items: flex-end; }
    .gl-msg.ai { align-items: flex-start; }

    .gl-bubble {
      max-width: 82%;
      padding: 10px 14px;
      font-size: 14px;
      line-height: 1.55;
      word-wrap: break-word;
      word-break: break-word;
    }

    .gl-msg.user .gl-bubble {
      background: var(--primary);
      color: white;
      border-radius: var(--radius-md) var(--radius-md) 4px var(--radius-md);
    }

    .gl-msg.ai .gl-bubble {
      background: var(--surface);
      color: var(--text-primary);
      border-radius: var(--radius-md) var(--radius-md) var(--radius-md) 4px;
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);
    }

    .gl-msg-time {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
      padding: 0 4px;
    }

    /* ─── Typing ─── */
    .gl-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;
      background: var(--surface);
      border-radius: var(--radius-md) var(--radius-md) var(--radius-md) 4px;
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-sm);
      width: fit-content;
    }

    .gl-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--primary-light);
      animation: dot-bounce 1.4s ease-in-out infinite;
    }

    .gl-dot:nth-child(2) { animation-delay: 0.16s; }
    .gl-dot:nth-child(3) { animation-delay: 0.32s; }

    @keyframes dot-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-6px); opacity: 1; }
    }

    /* ─── Quick Replies ─── */
    .gl-quick-replies {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--border-light);
      background: var(--surface);
    }

    .gl-chip {
      background: var(--primary-lighter);
      color: var(--primary);
      border: 1px solid transparent;
      padding: 8px 14px;
      border-radius: var(--radius-full);
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition);
      font-family: inherit;
      white-space: nowrap;
    }

    .gl-chip:hover {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    .gl-chip:active { transform: scale(0.96); }

    /* ─── Input Area ─── */
    .gl-input-area {
      padding: 12px 16px 14px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 10px;
      align-items: flex-end;
      background: var(--surface);
    }

    .gl-input-wrap {
      flex: 1;
      background: var(--surface-alt);
      border: 1px solid var(--border);
      border-radius: 22px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      transition: border-color var(--transition), box-shadow var(--transition);
    }

    .gl-input-wrap:focus-within {
      border-color: var(--primary-light);
      box-shadow: 0 0 0 3px rgba(0,112,152,0.1);
    }

    .gl-input-wrap input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 10px 0;
      font-size: 14px;
      font-family: inherit;
      color: var(--text-primary);
      outline: none;
    }

    .gl-input-wrap input::placeholder { color: var(--text-muted); }

    .gl-send-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--primary);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition);
      flex-shrink: 0;
    }

    .gl-send-btn:hover:not(:disabled) {
      background: var(--primary-light);
      transform: scale(1.05);
    }

    .gl-send-btn:active:not(:disabled) { transform: scale(0.95); }

    .gl-send-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    .gl-send-btn svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }

    /* ─── Footer ─── */
    .gl-footer {
      text-align: center;
      font-size: 11px;
      color: var(--text-muted);
      padding: 6px 0 10px;
      background: var(--surface);
    }

    .gl-footer a {
      color: var(--primary-light);
      text-decoration: none;
    }

    /* ─── Inline Cards ─── */
    .gl-pricing-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 14px 16px;
      margin-top: 8px;
    }

    .gl-pricing-card-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 10px;
      color: var(--primary);
    }

    .gl-pricing-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-light);
    }

    .gl-pricing-item:last-child { border-bottom: none; }

    .gl-pricing-name {
      font-size: 13px;
      color: var(--text-primary);
    }

    .gl-pricing-price {
      font-size: 13px;
      font-weight: 600;
      color: var(--primary);
    }

    /* ─── Contact Form ─── */
    .gl-contact-form {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 16px;
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .gl-contact-form-title {
      font-weight: 600;
      font-size: 14px;
      color: var(--primary);
      margin-bottom: 2px;
    }

    .gl-form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .gl-form-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .gl-form-input, .gl-form-select {
      padding: 9px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-family: inherit;
      color: var(--text-primary);
      background: var(--surface);
      transition: border-color var(--transition), box-shadow var(--transition);
    }

    .gl-form-input:focus, .gl-form-select:focus {
      outline: none;
      border-color: var(--primary-light);
      box-shadow: 0 0 0 3px rgba(0,112,152,0.1);
    }

    .gl-form-submit {
      padding: 11px 16px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background var(--transition);
      font-family: inherit;
      margin-top: 4px;
    }

    .gl-form-submit:hover { background: var(--primary-light); }
    .gl-form-submit:active { transform: scale(0.98); }

    /* ─── Confirmation ─── */
    .gl-confirmation {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      padding: 12px 14px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .gl-confirmation svg {
      width: 18px;
      height: 18px;
      color: #059669;
      flex-shrink: 0;
    }

    /* ─── Tour Button ─── */
    .gl-tour-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: var(--radius-full);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition);
      font-family: inherit;
      margin-top: 8px;
    }

    .gl-tour-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
    .gl-tour-btn:active { transform: scale(0.97); }

    .gl-tour-btn svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
    }

    /* ─── Responsive ─── */
    @media (max-width: 480px) {
      .gl-widget-root {
        bottom: 0;
        right: 0;
        left: 0;
      }

      .gl-widget-root[data-position="left"] {
        left: 0;
        right: 0;
      }

      .gl-window {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        height: 100%;
        border-radius: 0;
        animation: window-enter-mobile 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes window-enter-mobile {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }

      .gl-launcher.hide { display: none; }
    }
  `;

  const chatIcon = '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  const sendIcon = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
  const personIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const checkIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
  const calendarIcon = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

  const html = `
    <div class="gl-widget-root">
      <button class="gl-launcher" aria-label="Open chat">${chatIcon}</button>
      <div class="gl-window">
        <div class="gl-header">
          <div class="gl-header-avatar">${personIcon}</div>
          <div class="gl-header-info">
            <div class="gl-header-name">Community Advisor</div>
            <div class="gl-header-status">Online now</div>
          </div>
          <button class="gl-close" aria-label="Close chat">&times;</button>
        </div>
        <div class="gl-messages"></div>
        <div class="gl-quick-replies"></div>
        <div class="gl-input-area">
          <div class="gl-input-wrap">
            <input type="text" placeholder="Ask me anything..." autocomplete="off" />
          </div>
          <button class="gl-send-btn" aria-label="Send" disabled>${sendIcon}</button>
        </div>
        <div class="gl-footer">Powered by <a href="https://greatlakesmc.com" target="_blank" rel="noopener">Great Lakes Management</a></div>
      </div>
    </div>
  `;

  class GLChat extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.config = {};
      this.messages = [];
      this.leadData = {};
      this.isOpen = false;
      this.waiting = false;
      this.contactFormShown = false;
      this.sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    }

    connectedCallback() {
      // Parse config
      const attr = this.getAttribute('config');
      if (attr) {
        try { this.config = JSON.parse(attr); } catch(e) { this.config = {}; }
      }

      // Defaults
      this.config = {
        communityId: '',
        communityName: 'Senior Living Community',
        advisorName: 'Community Advisor',
        brandColor: '#003c4c',
        brandColorHover: '#007098',
        accentColor: '#a61c3b',
        phoneNumber: '',
        careTypes: [],
        greeting: '',
        apiEndpoint: window.location.origin,
        position: 'right',
        autoOpen: false,
        ...this.config
      };

      // Render
      const styleEl = document.createElement('style');
      styleEl.textContent = style;
      this.shadowRoot.appendChild(styleEl);
      const tpl = document.createElement('template');
      tpl.innerHTML = html;
      this.shadowRoot.appendChild(tpl.content.cloneNode(true));

      // Apply custom colors
      const host = this.shadowRoot.host;
      host.style.setProperty('--primary', this.config.brandColor || '#003c4c');
      host.style.setProperty('--primary-light', this.config.brandColorHover || '#007098');
      if (this.config.accentColor) host.style.setProperty('--accent', this.config.accentColor);

      // Position
      const root = this.shadowRoot.querySelector('.gl-widget-root');
      if (this.config.position === 'left') root.setAttribute('data-position', 'left');

      // Header
      const headerName = this.shadowRoot.querySelector('.gl-header-name');
      if (headerName) headerName.textContent = this.config.communityName || 'Community Advisor';

      // Events
      this._bindEvents();

      // Greeting
      const name = this.config.communityName || 'our community';
      const greeting = this.config.greeting ||
        ("Hi there! Welcome to " + name + ". Are you exploring senior living options for yourself or a loved one?");
      this.addMessage({ role: 'ai', content: greeting });

      // Quick replies
      this._renderChips();

      // Auto-open
      if (this.config.autoOpen) {
        setTimeout(() => this.open(), 4000);
      }
    }

    _bindEvents() {
      const launcher = this.shadowRoot.querySelector('.gl-launcher');
      const close = this.shadowRoot.querySelector('.gl-close');
      const send = this.shadowRoot.querySelector('.gl-send-btn');
      const input = this.shadowRoot.querySelector('.gl-input-wrap input');

      launcher.addEventListener('click', () => this.open());
      close.addEventListener('click', () => this.close());
      send.addEventListener('click', () => this.sendMessage());

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      input.addEventListener('input', () => {
        send.disabled = !input.value.trim() || this.waiting;
      });
    }

    open() {
      this.isOpen = true;
      this.shadowRoot.querySelector('.gl-window').classList.add('open');
      this.shadowRoot.querySelector('.gl-launcher').classList.add('hide');
      const input = this.shadowRoot.querySelector('.gl-input-wrap input');
      if (input) setTimeout(() => input.focus(), 150);
    }

    close() {
      this.isOpen = false;
      this.shadowRoot.querySelector('.gl-window').classList.remove('open');
      this.shadowRoot.querySelector('.gl-launcher').classList.remove('hide');
    }

    _time() {
      const d = new Date();
      let h = d.getHours(), m = d.getMinutes();
      const ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
    }

    addMessage(msg) {
      this.messages.push(msg);
      const container = this.shadowRoot.querySelector('.gl-messages');
      if (!container) return;

      const el = document.createElement('div');
      el.className = 'gl-msg ' + msg.role;

      if (msg.html) {
        const bubble = document.createElement('div');
        bubble.className = 'gl-bubble';
        bubble.innerHTML = msg.html;
        el.appendChild(bubble);
      } else if (msg.content) {
        const bubble = document.createElement('div');
        bubble.className = 'gl-bubble';
        bubble.textContent = msg.content;
        el.appendChild(bubble);
      }

      const time = document.createElement('div');
      time.className = 'gl-msg-time';
      time.textContent = this._time();
      el.appendChild(time);

      container.appendChild(el);
      requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
    }

    _showTyping() {
      const container = this.shadowRoot.querySelector('.gl-messages');
      const el = document.createElement('div');
      el.className = 'gl-msg ai';
      el.id = 'gl-typing';
      el.innerHTML = '<div class="gl-typing"><div class="gl-dot"></div><div class="gl-dot"></div><div class="gl-dot"></div></div>';
      container.appendChild(el);
      requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
    }

    _hideTyping() {
      const el = this.shadowRoot.getElementById('gl-typing');
      if (el) el.remove();
    }

    sendMessage() {
      const input = this.shadowRoot.querySelector('.gl-input-wrap input');
      const text = input.value.trim();
      if (!text || this.waiting) return;

      this.addMessage({ role: 'user', content: text });
      input.value = '';
      this.shadowRoot.querySelector('.gl-send-btn').disabled = true;

      // Hide quick replies after first message
      const chips = this.shadowRoot.querySelector('.gl-quick-replies');
      if (chips) chips.style.display = 'none';

      this.waiting = true;
      this._showTyping();
      this._callAPI(text);
    }

    _callAPI(text) {
      const endpoint = this.config.apiEndpoint + '/api/chat';
      const payload = {
        communityId: this.config.communityId,
        sessionId: this.sessionId,
        pageUrl: window.location.href,
        referrer: document.referrer || '',
        messages: this.messages
          .filter(m => m.content)
          .slice(1) // skip greeting
          .map(m => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.content
          })),
        leadData: this.leadData
      };

      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onload = () => {
        this._hideTyping();
        this.waiting = false;

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            const text = data.response || "I'm sorry, I couldn't process that. Could you rephrase?";
            this.addMessage({ role: 'ai', content: text, html: this._formatAIText(text) });

            // Handle actions
            if (data.suggestedActions && data.suggestedActions.length > 0) {
              this._handleActions(data.suggestedActions);
            }
          } catch(e) {
            this.addMessage({ role: 'ai', content: "Sorry, something went wrong. Please try again." });
          }
        } else {
          this.addMessage({ role: 'ai', content: "I'm having trouble connecting right now. Please try again in a moment." });
        }

        const sendBtn = this.shadowRoot.querySelector('.gl-send-btn');
        const input = this.shadowRoot.querySelector('.gl-input-wrap input');
        if (sendBtn) sendBtn.disabled = !input || !input.value.trim();
      };

      xhr.onerror = () => {
        this._hideTyping();
        this.waiting = false;
        this.addMessage({ role: 'ai', content: "I lost my connection. Please try again." });
        const sendBtn = this.shadowRoot.querySelector('.gl-send-btn');
        if (sendBtn) sendBtn.disabled = false;
      };

      xhr.send(JSON.stringify(payload));
    }

    _handleActions(actions) {
      // Actions are now handled naturally through the AI conversation
      // No forms or popups — the AI asks for contact info conversationally
    }

    _renderChips() {
      const container = this.shadowRoot.querySelector('.gl-quick-replies');
      if (!container) return;

      const suggestions = [
        'What does it cost?',
        'I\u2019d like to schedule a tour',
        'Tell me about the amenities',
        'What\u2019s included in rent?'
      ];

      suggestions.forEach(text => {
        const chip = document.createElement('button');
        chip.className = 'gl-chip';
        chip.textContent = text;
        chip.addEventListener('click', () => {
          const input = this.shadowRoot.querySelector('.gl-input-wrap input');
          if (input) {
            input.value = text;
            this.shadowRoot.querySelector('.gl-send-btn').disabled = false;
            this.sendMessage();
          }
        });
        container.appendChild(chip);
      });
    }

    _escHtml(s) {
      const div = document.createElement('div');
      div.textContent = s || '';
      return div.innerHTML;
    }

    _formatAIText(text) {
      // Escape HTML first for safety
      let safe = this._escHtml(text);
      // Convert newlines to <br>
      safe = safe.replace(/\n/g, '<br>');
      // Strip any stray markdown bold/italic (AI told not to use it, but just in case)
      safe = safe.replace(/\*\*(.+?)\*\*/g, '$1');
      safe = safe.replace(/\*(.+?)\*/g, '$1');
      // Convert markdown-style bullet lines to plain text
      safe = safe.replace(/<br>\s*[-•]\s+/g, '<br>• ');
      return safe;
    }
  }

  customElements.define('gl-chat', GLChat);
})();
