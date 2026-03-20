(function() {
  'use strict';

  /**
   * Great Lakes Chat Widget
   * AI-powered conversational interface for senior living communities
   * Registers as <gl-chat> custom element with Web Component architecture
   */

  const style = `
    :host {
      --brand-color: #2c5f7f;
      --brand-color-hover: #1e4a5f;
      --secondary-color: #f5f5f5;
      --accent-color: #ff6b35;
      --text-dark: #333;
      --text-light: #666;
      --border-color: #ddd;
      --message-user-bg: var(--brand-color);
      --message-ai-bg: #e8eef3;
      --input-bg: #fff;
      --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.1);
      --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .gl-widget-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-size: 14px;
      line-height: 1.5;
      color: var(--text-dark);
    }

    .gl-widget-container[data-position="left"] {
      left: 20px;
      right: auto;
    }

    /* Floating Bubble Launcher */
    .gl-launcher {
      position: relative;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: var(--brand-color);
      box-shadow: var(--shadow-md);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
      padding: 0;
      user-select: none;
      z-index: 1;
    }

    .gl-launcher:hover {
      background-color: var(--brand-color-hover);
      transform: scale(1.1);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
    }

    .gl-launcher:active {
      transform: scale(0.95);
    }

    .gl-launcher.open {
      opacity: 0;
      pointer-events: none;
      transform: scale(0);
    }

    .gl-launcher-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      width: 20px;
      height: 20px;
      background-color: var(--accent-color);
      border-radius: 50%;
      display: none;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
    }

    .gl-launcher-badge.show {
      display: flex;
    }

    .gl-launcher-icon {
      color: white;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Chat Window */
    .gl-chat-window {
      position: absolute;
      bottom: 80px;
      right: 0;
      background: white;
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      display: none;
      flex-direction: column;
      width: 100%;
      max-width: 420px;
      height: 600px;
      z-index: 2;
      animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .gl-widget-container[data-position="left"] .gl-chat-window {
      left: 0;
      right: auto;
    }

    .gl-chat-window.open {
      display: flex;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Header */
    .gl-chat-header {
      background-color: var(--brand-color);
      color: white;
      padding: 16px;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .gl-chat-header-content {
      flex: 1;
    }

    .gl-chat-header-title {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 2px;
    }

    .gl-chat-header-subtitle {
      font-size: 12px;
      opacity: 0.9;
    }

    .gl-chat-close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s;
    }

    .gl-chat-close-btn:hover {
      opacity: 0.8;
    }

    /* Messages Container */
    .gl-messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background-color: #fafafa;
    }

    .gl-messages-container::-webkit-scrollbar {
      width: 6px;
    }

    .gl-messages-container::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }

    .gl-messages-container::-webkit-scrollbar-thumb {
      background: #ccc;
      border-radius: 3px;
    }

    .gl-messages-container::-webkit-scrollbar-thumb:hover {
      background: #999;
    }

    /* Message */
    .gl-message {
      display: flex;
      animation: fadeIn 0.3s ease-in;
      word-wrap: break-word;
      word-break: break-word;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .gl-message.user {
      justify-content: flex-end;
    }

    .gl-message.ai {
      justify-content: flex-start;
    }

    .gl-message-bubble {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
    }

    .gl-message.user .gl-message-bubble {
      background-color: var(--message-user-bg);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .gl-message.ai .gl-message-bubble {
      background-color: var(--message-ai-bg);
      color: var(--text-dark);
      border-bottom-left-radius: 4px;
    }

    /* Typing Indicator */
    .gl-typing-indicator {
      display: flex;
      gap: 4px;
      padding: 10px 14px;
      background-color: var(--message-ai-bg);
      border-radius: 12px;
      width: fit-content;
      border-bottom-left-radius: 4px;
    }

    .gl-typing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--text-light);
      animation: typing 1.4s infinite;
    }

    .gl-typing-dot:nth-child(2) {
      animation-delay: 0.2s;
    }

    .gl-typing-dot:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing {
      0%, 60%, 100% {
        opacity: 0.5;
        transform: translateY(0);
      }
      30% {
        opacity: 1;
        transform: translateY(-10px);
      }
    }

    /* Pricing Card */
    .gl-pricing-card {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 14px;
      margin: 8px 0;
      font-size: 13px;
    }

    .gl-pricing-card-title {
      font-weight: 600;
      margin-bottom: 10px;
      color: var(--text-dark);
    }

    .gl-pricing-item {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .gl-pricing-item:last-child {
      border-bottom: none;
    }

    .gl-pricing-name {
      color: var(--text-dark);
      font-weight: 500;
    }

    .gl-pricing-price {
      color: var(--brand-color);
      font-weight: 600;
    }

    /* Contact Form */
    .gl-contact-form {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 14px;
      margin: 8px 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .gl-form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .gl-form-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-dark);
    }

    .gl-form-input,
    .gl-form-select {
      padding: 8px 10px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 13px;
      font-family: inherit;
      color: var(--text-dark);
    }

    .gl-form-input:focus,
    .gl-form-select:focus {
      outline: none;
      border-color: var(--brand-color);
      box-shadow: 0 0 0 3px rgba(44, 95, 127, 0.1);
    }

    .gl-form-submit {
      padding: 10px 14px;
      background-color: var(--brand-color);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .gl-form-submit:hover {
      background-color: var(--brand-color-hover);
    }

    .gl-form-submit:active {
      transform: scale(0.98);
    }

    /* Confirmation Message */
    .gl-confirmation-message {
      background-color: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
      padding: 12px;
      border-radius: 6px;
      font-size: 13px;
      margin: 8px 0;
    }

    /* Quick Reply Chips */
    .gl-quick-replies {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 0 16px;
      margin-top: 8px;
    }

    .gl-chip {
      background-color: white;
      border: 1px solid var(--border-color);
      padding: 10px 12px;
      border-radius: 20px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
      color: var(--text-dark);
    }

    .gl-chip:hover {
      background-color: var(--secondary-color);
      border-color: var(--brand-color);
    }

    .gl-chip:active {
      transform: scale(0.98);
    }

    /* Input Area */
    .gl-input-area {
      padding: 12px 16px;
      border-top: 1px solid var(--border-color);
      display: flex;
      gap: 8px;
      background-color: white;
      border-radius: 0 0 12px 12px;
      flex-shrink: 0;
    }

    .gl-input-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      background-color: var(--input-bg);
      border: 1px solid var(--border-color);
      border-radius: 24px;
      padding: 0 14px;
    }

    .gl-input-wrapper input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 10px 0;
      font-size: 14px;
      font-family: inherit;
      color: var(--text-dark);
      outline: none;
    }

    .gl-input-wrapper input::placeholder {
      color: var(--text-light);
    }

    .gl-input-wrapper input:focus {
      outline: none;
    }

    .gl-send-btn {
      background-color: var(--brand-color);
      color: white;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      padding: 0;
      flex-shrink: 0;
    }

    .gl-send-btn:hover {
      background-color: var(--brand-color-hover);
      transform: scale(1.05);
    }

    .gl-send-btn:active {
      transform: scale(0.95);
    }

    .gl-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .gl-send-icon {
      width: 18px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Footer Attribution */
    .gl-footer-attribution {
      text-align: center;
      font-size: 11px;
      color: var(--text-light);
      padding: 8px 0 0 0;
      margin-top: auto;
    }

    /* Responsive */
    @media (max-width: 600px) {
      .gl-widget-container {
        bottom: 0;
        right: 0;
        left: 0;
      }

      .gl-widget-container[data-position="left"] {
        left: 0;
        right: 0;
      }

      .gl-chat-window {
        position: fixed;
        bottom: 0;
        right: 0;
        left: 0;
        max-width: none;
        height: 100vh;
        border-radius: 0;
        animation: slideUpFull 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .gl-launcher.open {
        display: none;
      }

      @keyframes slideUpFull {
        from {
          opacity: 0;
          transform: translateY(100%);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    }
  `;

  const template = `
    <div class="gl-widget-container">
      <button class="gl-launcher" aria-label="Open chat">
        <div class="gl-launcher-badge"></div>
        <div class="gl-launcher-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
      </button>

      <div class="gl-chat-window">
        <div class="gl-chat-header">
          <div class="gl-chat-header-content">
            <div class="gl-chat-header-title">Chat with us</div>
            <div class="gl-chat-header-subtitle">We're here to help</div>
          </div>
          <button class="gl-chat-close-btn" aria-label="Close chat">×</button>
        </div>

        <div class="gl-messages-container"></div>

        <div class="gl-quick-replies"></div>

        <div class="gl-input-area">
          <div class="gl-input-wrapper">
            <input type="text" placeholder="Type your message..." />
          </div>
          <button class="gl-send-btn" aria-label="Send message" disabled>
            <div class="gl-send-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M16.6915026,12.4744748 L3.50612381,13.2599618 C3.19218622,13.2599618 3.03521743,13.4170592 3.03521743,13.5741566 L1.15159189,20.0151496 C0.8376543,20.8006365 0.99,21.89 1.77946707,22.52 C2.40337463,22.99 3.50612381,23.1 4.13003138,22.8429026 L21.714504,14.0454487 C22.6563168,13.5741566 23.1272231,12.6315722 22.9702544,11.6889879 L4.13003138,1.16865969 C3.34915502,0.9115623 2.40337463,1.0218159 1.77946707,1.4930505 C0.994589706,2.13399899 0.837620913,3.0765833 1.15159189,3.68229181 L3.03521743,10.1232844 C3.03521743,10.2305521 3.19218622,10.4872181 3.50612381,10.4872181 L16.6915026,11.2727017 C16.6915026,11.2727017 17.1624089,11.2727017 17.1624089,11.8784102 L17.1624089,12.0355075 C17.1624089,12.641216 16.6915026,12.4744748 16.6915026,12.4744748 Z"/>
              </svg>
            </div>
          </button>
        </div>

        <div class="gl-footer-attribution">Powered by Great Lakes Management</div>
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
      this.isWaitingForResponse = false;
    }

    connectedCallback() {
      // Parse config from attribute
      const configAttr = this.getAttribute('config');
      if (configAttr) {
        try {
          this.config = JSON.parse(configAttr);
        } catch (e) {
          console.warn('[GL Chat] Failed to parse config attribute:', e);
          this.config = {};
        }
      }

      // Merge with defaults
      this.config = {
        communityId: '',
        communityName: 'Senior Living Community',
        advisorName: 'Advisor',
        brandColor: '#2c5f7f',
        brandColorHover: '#1e4a5f',
        secondaryColor: '#f5f5f5',
        accentColor: '#ff6b35',
        phoneNumber: '',
        careTypes: [],
        amenities: [],
        greeting: 'Hello! How can we help you today?',
        apiEndpoint: window.location.origin,
        position: 'right',
        autoOpen: false,
        ...this.config
      };

      // Render template
      const styleEl = document.createElement('style');
      styleEl.textContent = style;
      this.shadowRoot.appendChild(styleEl);

      const templateEl = document.createElement('template');
      templateEl.innerHTML = template;
      this.shadowRoot.appendChild(templateEl.content.cloneNode(true));

      // Set CSS variables
      this.shadowRoot.host.style.setProperty('--brand-color', this.config.brandColor);
      this.shadowRoot.host.style.setProperty('--brand-color-hover', this.config.brandColorHover);
      this.shadowRoot.host.style.setProperty('--secondary-color', this.config.secondaryColor);
      this.shadowRoot.host.style.setProperty('--accent-color', this.config.accentColor);

      // Update header
      const headerTitle = this.shadowRoot.querySelector('.gl-chat-header-title');
      if (headerTitle) {
        headerTitle.textContent = this.config.communityName;
      }

      const headerSubtitle = this.shadowRoot.querySelector('.gl-chat-header-subtitle');
      if (headerSubtitle && this.config.advisorName) {
        headerSubtitle.textContent = 'Chat with ' + this.config.advisorName;
      }

      // Wire up event listeners
      this.setupEventListeners();

      // Show greeting message
      this.addMessage({
        role: 'ai',
        content: this.config.greeting || 'Hello! How can we help you today?'
      });

      // Render quick reply chips
      this.renderQuickReplies();

      // Auto-open if configured
      if (this.config.autoOpen) {
        setTimeout(() => this.openChat(), 5000);
      }
    }

    setupEventListeners() {
      const launcher = this.shadowRoot.querySelector('.gl-launcher');
      const closeBtn = this.shadowRoot.querySelector('.gl-chat-close-btn');
      const sendBtn = this.shadowRoot.querySelector('.gl-send-btn');
      const input = this.shadowRoot.querySelector('.gl-input-wrapper input');

      if (launcher) {
        launcher.addEventListener('click', () => this.openChat());
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeChat());
      }

      if (sendBtn) {
        sendBtn.addEventListener('click', () => this.sendMessage());
      }

      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
          }
        });

        input.addEventListener('input', () => {
          const hasText = input.value.trim().length > 0;
          sendBtn.disabled = !hasText || this.isWaitingForResponse;
        });
      }
    }

    openChat() {
      this.isOpen = true;
      const chatWindow = this.shadowRoot.querySelector('.gl-chat-window');
      const launcher = this.shadowRoot.querySelector('.gl-launcher');

      if (chatWindow) chatWindow.classList.add('open');
      if (launcher) launcher.classList.add('open');

      // Focus input
      const input = this.shadowRoot.querySelector('.gl-input-wrapper input');
      if (input) {
        setTimeout(() => input.focus(), 100);
      }
    }

    closeChat() {
      this.isOpen = false;
      const chatWindow = this.shadowRoot.querySelector('.gl-chat-window');
      const launcher = this.shadowRoot.querySelector('.gl-launcher');

      if (chatWindow) chatWindow.classList.remove('open');
      if (launcher) launcher.classList.remove('open');
    }

    addMessage(msg) {
      this.messages.push(msg);

      const messagesContainer = this.shadowRoot.querySelector('.gl-messages-container');
      if (!messagesContainer) return;

      const messageEl = document.createElement('div');
      messageEl.className = 'gl-message ' + msg.role;

      if (msg.html) {
        const bubbleEl = document.createElement('div');
        bubbleEl.className = 'gl-message-bubble';
        bubbleEl.innerHTML = msg.html;
        messageEl.appendChild(bubbleEl);
      } else {
        const bubbleEl = document.createElement('div');
        bubbleEl.className = 'gl-message-bubble';
        bubbleEl.textContent = msg.content;
        messageEl.appendChild(bubbleEl);
      }

      messagesContainer.appendChild(messageEl);

      // Auto-scroll to bottom
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 0);
    }

    addTypingIndicator() {
      const messagesContainer = this.shadowRoot.querySelector('.gl-messages-container');
      if (!messagesContainer) return;

      const typingEl = document.createElement('div');
      typingEl.className = 'gl-message ai';
      typingEl.innerHTML = `
        <div class="gl-typing-indicator">
          <div class="gl-typing-dot"></div>
          <div class="gl-typing-dot"></div>
          <div class="gl-typing-dot"></div>
        </div>
      `;
      typingEl.id = 'typing-indicator';
      messagesContainer.appendChild(typingEl);

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    removeTypingIndicator() {
      const typingEl = this.shadowRoot.getElementById('typing-indicator');
      if (typingEl) {
        typingEl.remove();
      }
    }

    sendMessage() {
      const input = this.shadowRoot.querySelector('.gl-input-wrapper input');
      if (!input) return;

      const userMessage = input.value.trim();
      if (!userMessage) return;

      // Add user message
      this.addMessage({
        role: 'user',
        content: userMessage
      });

      input.value = '';
      const sendBtn = this.shadowRoot.querySelector('.gl-send-btn');
      if (sendBtn) sendBtn.disabled = true;

      // Hide quick replies
      const quickReplies = this.shadowRoot.querySelector('.gl-quick-replies');
      if (quickReplies) quickReplies.style.display = 'none';

      // Show typing indicator and send to API
      this.isWaitingForResponse = true;
      this.addTypingIndicator();

      this.callChatAPI(userMessage);
    }

    callChatAPI(userMessage) {
      const endpoint = this.config.apiEndpoint + '/api/chat';
      const body = JSON.stringify({
        communityId: this.config.communityId,
        messages: this.messages.map((m) => ({
          role: m.role,
          content: m.content
        })),
        leadData: this.leadData
      });

      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onload = () => {
        this.removeTypingIndicator();

        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            const aiResponse = data.response || 'I apologize, but I could not process that request.';

            this.addMessage({
              role: 'ai',
              content: aiResponse
            });

            // Check for suggested actions
            if (data.suggestedActions && data.suggestedActions.length > 0) {
              this.handleSuggestedActions(data.suggestedActions);
            }
          } catch (e) {
            console.error('[GL Chat] Failed to parse API response:', e);
            this.addMessage({
              role: 'ai',
              content: 'Sorry, something went wrong. Please try again.'
            });
          }
        } else {
          console.error('[GL Chat] API error:', xhr.status);
          this.addMessage({
            role: 'ai',
            content: 'Sorry, I encountered an error. Please try again later.'
          });
        }

        this.isWaitingForResponse = false;
        const sendBtn = this.shadowRoot.querySelector('.gl-send-btn');
        const input = this.shadowRoot.querySelector('.gl-input-wrapper input');
        if (sendBtn) sendBtn.disabled = !input || input.value.trim().length === 0;
      };

      xhr.onerror = () => {
        this.removeTypingIndicator();
        console.error('[GL Chat] Network error');
        this.addMessage({
          role: 'ai',
          content: 'Sorry, I lost connection. Please try again.'
        });
        this.isWaitingForResponse = false;
        const sendBtn = this.shadowRoot.querySelector('.gl-send-btn');
        if (sendBtn) sendBtn.disabled = false;
      };

      xhr.send(body);
    }

    handleSuggestedActions(actions) {
      if (actions.includes('pricing_info')) {
        this.showPricingCard();
      }
      if (actions.includes('schedule_tour')) {
        this.showTourButton();
      }
      if (actions.includes('provide_contact')) {
        this.showContactForm();
      }
    }

    showPricingCard() {
      if (!this.config.careTypes || this.config.careTypes.length === 0) {
        return;
      }

      let html = '<div class="gl-pricing-card"><div class="gl-pricing-card-title">Pricing Options</div>';

      this.config.careTypes.forEach((ct) => {
        const price = ct.startingAt
          ? '$' + parseInt(ct.startingAt).toLocaleString() + '/mo'
          : 'Contact us';
        html += `
          <div class="gl-pricing-item">
            <span class="gl-pricing-name">${ct.name}</span>
            <span class="gl-pricing-price">Starting at ${price}</span>
          </div>
        `;
      });

      html += '</div>';

      this.addMessage({
        role: 'ai',
        html: html
      });
    }

    showTourButton() {
      this.addMessage({
        role: 'ai',
        html: `
          <button class="gl-chip" style="border: none; background-color: var(--brand-color); color: white; font-weight: 600; cursor: pointer; padding: 12px 16px;">
            Schedule a Tour
          </button>
        `
      });

      // Wire up the button (hacky but works in shadow DOM)
      setTimeout(() => {
        const buttons = this.shadowRoot.querySelectorAll('.gl-chip');
        const lastBtn = buttons[buttons.length - 1];
        if (lastBtn) {
          lastBtn.addEventListener('click', () => {
            this.addMessage({
              role: 'user',
              content: 'I would like to schedule a tour'
            });
            this.callChatAPI('I would like to schedule a tour');
          });
        }
      }, 0);
    }

    showContactForm() {
      const formHtml = `
        <div class="gl-contact-form">
          <div class="gl-form-group">
            <label class="gl-form-label">Name</label>
            <input type="text" class="gl-form-input contact-name" placeholder="Your name" />
          </div>
          <div class="gl-form-group">
            <label class="gl-form-label">Email</label>
            <input type="email" class="gl-form-input contact-email" placeholder="your@email.com" />
          </div>
          <div class="gl-form-group">
            <label class="gl-form-label">Phone</label>
            <input type="tel" class="gl-form-input contact-phone" placeholder="(555) 123-4567" />
          </div>
          ${
            this.config.careTypes && this.config.careTypes.length > 0
              ? `
            <div class="gl-form-group">
              <label class="gl-form-label">Care Type (Optional)</label>
              <select class="gl-form-select contact-care-type">
                <option value="">Select care type...</option>
                ${this.config.careTypes
                  .map((ct) => `<option value="${ct.name}">${ct.name}</option>`)
                  .join('')}
              </select>
            </div>
          `
              : ''
          }
          <button class="gl-form-submit contact-submit">Submit</button>
        </div>
      `;

      this.addMessage({
        role: 'ai',
        html: formHtml
      });

      // Wire up form submission
      setTimeout(() => {
        const messagesContainer = this.shadowRoot.querySelector('.gl-messages-container');
        const lastMessage = messagesContainer.lastElementChild;
        if (lastMessage) {
          const submitBtn = lastMessage.querySelector('.contact-submit');
          if (submitBtn) {
            submitBtn.addEventListener('click', () => {
              const nameInput = lastMessage.querySelector('.contact-name');
              const emailInput = lastMessage.querySelector('.contact-email');
              const phoneInput = lastMessage.querySelector('.contact-phone');
              const careTypeSelect = lastMessage.querySelector('.contact-care-type');

              const name = nameInput ? nameInput.value.trim() : '';
              const email = emailInput ? emailInput.value.trim() : '';
              const phone = phoneInput ? phoneInput.value.trim() : '';
              const careType = careTypeSelect ? careTypeSelect.value : '';

              if (name && email && phone) {
                this.submitLead({
                  name,
                  email,
                  phone,
                  care_type: careType
                });
              } else {
                alert('Please fill in all required fields');
              }
            });
          }
        }
      }, 0);
    }

    submitLead(leadInfo) {
      const endpoint = this.config.apiEndpoint + '/api/leads';
      const body = JSON.stringify({
        community: this.config.communityId,
        community_name: this.config.communityName,
        name: leadInfo.name,
        email: leadInfo.email,
        phone: leadInfo.phone,
        care_type: leadInfo.care_type,
        source: 'chat_widget'
      });

      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          this.addMessage({
            role: 'ai',
            html: '<div class="gl-confirmation-message">Thank you! We\'ve received your information. A member of our team will reach out shortly.</div>'
          });

          // Update lead data for future messages
          this.leadData = {
            name: leadInfo.name,
            email: leadInfo.email,
            phone: leadInfo.phone,
            care_type: leadInfo.care_type
          };
        } else {
          this.addMessage({
            role: 'ai',
            content: 'Sorry, there was an error submitting your information. Please try again.'
          });
        }
      };

      xhr.onerror = () => {
        console.error('[GL Chat] Failed to submit lead');
        this.addMessage({
          role: 'ai',
          content: 'Sorry, I lost connection. Please try again.'
        });
      };

      xhr.send(body);
    }

    renderQuickReplies() {
      const quickReplies = this.shadowRoot.querySelector('.gl-quick-replies');
      if (!quickReplies) return;

      const suggestions = [
        'What are the pricing options?',
        'Can I schedule a tour?',
        'What amenities do you offer?',
        'Tell me about dining'
      ];

      suggestions.forEach((text) => {
        const chip = document.createElement('button');
        chip.className = 'gl-chip';
        chip.textContent = text;
        chip.addEventListener('click', () => {
          const input = this.shadowRoot.querySelector('.gl-input-wrapper input');
          if (input) {
            input.value = text;
            input.focus();
            const sendBtn = this.shadowRoot.querySelector('.gl-send-btn');
            if (sendBtn) sendBtn.disabled = false;
            this.sendMessage();
          }
        });
        quickReplies.appendChild(chip);
      });
    }
  }

  // Register the custom element
  customElements.define('gl-chat', GLChat);
})();
