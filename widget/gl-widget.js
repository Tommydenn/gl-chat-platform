(function() {
  'use strict';

  /**
   * GreenLiving Chat Widget
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
      background: linear-gradient(135deg, var(--brand-color), var(--accent-color));
      box-shadow: var(--shadow-md);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border: none;
      font-size: 24px;
      user-select: none;
      z-index: 1;
    }

    .gl-launcher:hover {
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

    .gl-launcher-icon {
      color: white;
      font-weight: 600;
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
      height: 600px;
      width: 400px;
      opacity: 0;
      transform: scale(0.8) translateY(20px);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 2;
      overflow: hidden;
    }

    .gl-widget-container[data-position="left"] .gl-chat-window {
      right: auto;
      left: 0;
    }

    .gl-chat-window.open {
      display: flex;
      opacity: 1;
      transform: scale(1) translateY(0);
    }

    @media (max-width: 600px) {
      .gl-chat-window {
        position: fixed;
        bottom: 0;
        right: 0;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        border-radius: 0;
      }

      .gl-widget-container[data-position="left"] .gl-chat-window {
        left: 0;
      }
    }

    /* Chat Header */
    .gl-chat-header {
      background: var(--brand-color);
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      border-radius: 12px 12px 0 0;
    }

    @media (max-width: 600px) {
      .gl-chat-header {
        border-radius: 0;
      }
    }

    .gl-chat-header-title {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .gl-chat-header-community {
      font-weight: 600;
      font-size: 16px;
    }

    .gl-chat-header-advisor {
      font-size: 13px;
      opacity: 0.9;
    }

    .gl-chat-close {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s;
    }

    .gl-chat-close:hover {
      opacity: 0.8;
    }

    /* Messages Container */
    .gl-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
    }

    .gl-messages::-webkit-scrollbar {
      width: 6px;
    }

    .gl-messages::-webkit-scrollbar-track {
      background: transparent;
    }

    .gl-messages::-webkit-scrollbar-thumb {
      background: #ccc;
      border-radius: 3px;
    }

    .gl-messages::-webkit-scrollbar-thumb:hover {
      background: #999;
    }

    /* Message Styles */
    .gl-message {
      display: flex;
      animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      max-width: 100%;
    }

    @keyframes slideIn {
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
      align-self: flex-end;
      max-width: 85%;
    }

    .gl-message.ai {
      justify-content: flex-start;
      align-self: flex-start;
      max-width: 90%;
    }

    .gl-message-bubble {
      padding: 12px 16px;
      border-radius: 12px;
      word-wrap: break-word;
      overflow-wrap: break-word;
      line-height: 1.4;
    }

    .gl-message.user .gl-message-bubble {
      background: var(--message-user-bg);
      color: white;
      border-radius: 12px 4px 12px 12px;
    }

    .gl-message.ai .gl-message-bubble {
      background: var(--message-ai-bg);
      color: var(--text-dark);
      border-radius: 4px 12px 12px 12px;
    }

    .gl-message-time {
      font-size: 12px;
      opacity: 0.6;
      margin-top: 4px;
      margin-left: 12px;
    }

    .gl-message.user .gl-message-time {
      margin-left: auto;
      margin-right: 12px;
      text-align: right;
    }

    /* Typing Indicator */
    .gl-typing-indicator {
      display: flex;
      gap: 4px;
      align-items: center;
      padding: 12px 16px;
      background: var(--message-ai-bg);
      border-radius: 12px;
      width: fit-content;
      max-width: 60px;
    }

    .gl-typing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #999;
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
        transform: translateY(-8px);
      }
    }

    /* Inline Components */
    .gl-inline-component {
      margin: 8px 0;
      padding: 12px;
      background: var(--secondary-color);
      border-radius: 8px;
      border-left: 4px solid var(--accent-color);
    }

    /* Pricing Card */
    .gl-pricing-card {
      margin: 8px 0;
    }

    .gl-pricing-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .gl-pricing-item:last-child {
      border-bottom: none;
    }

    .gl-pricing-name {
      font-weight: 500;
      color: var(--text-dark);
    }

    .gl-pricing-price {
      color: var(--accent-color);
      font-weight: 600;
    }

    /* Quick Replies */
    .gl-quick-replies {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 8px 0;
    }

    .gl-quick-reply {
      background: white;
      border: 1px solid var(--border-color);
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
      font-size: 13px;
      color: var(--text-dark);
    }

    .gl-quick-reply:hover {
      background: var(--secondary-color);
      border-color: var(--brand-color);
    }

    /* Inline Form */
    .gl-inline-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 8px 0;
    }

    .gl-form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .gl-form-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-dark);
    }

    .gl-form-input {
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s;
    }

    .gl-form-input:focus {
      outline: none;
      border-color: var(--brand-color);
      box-shadow: 0 0 0 3px rgba(44, 95, 127, 0.1);
    }

    .gl-form-submit {
      background: var(--brand-color);
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .gl-form-submit:hover {
      background: var(--brand-color-hover);
    }

    /* Inline Button */
    .gl-inline-button {
      background: var(--accent-color);
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
      margin: 8px 0;
      align-self: flex-start;
    }

    .gl-inline-button:hover {
      filter: brightness(0.9);
    }

    /* Tour Scheduler Modal */
    .gl-tour-scheduler {
      margin: 8px 0;
      padding: 12px;
      background: var(--secondary-color);
      border-radius: 8px;
      border-left: 4px solid var(--accent-color);
    }

    .gl-scheduler-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .gl-scheduler-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .gl-scheduler-input {
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
    }

    .gl-scheduler-input:focus {
      outline: none;
      border-color: var(--brand-color);
    }

    .gl-scheduler-submit {
      background: var(--accent-color);
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .gl-scheduler-submit:hover {
      filter: brightness(0.9);
    }

    /* Input Area */
    .gl-input-area {
      padding: 16px;
      border-top: 1px solid var(--border-color);
      display: flex;
      gap: 8px;
      flex-shrink: 0;
      background: white;
      border-radius: 0 0 12px 12px;
    }

    @media (max-width: 600px) {
      .gl-input-area {
        border-radius: 0;
      }
    }

    .gl-input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    .gl-quick-replies-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      max-height: 100px;
      overflow-y: auto;
    }

    .gl-quick-reply-chip {
      background: white;
      border: 1px solid var(--border-color);
      padding: 6px 10px;
      border-radius: 16px;
      cursor: pointer;
      font-size: 12px;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .gl-quick-reply-chip:hover {
      background: var(--secondary-color);
      border-color: var(--brand-color);
    }

    .gl-input-field {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
      resize: none;
      max-height: 100px;
    }

    .gl-input-field:focus {
      outline: none;
      border-color: var(--brand-color);
      box-shadow: 0 0 0 3px rgba(44, 95, 127, 0.1);
    }

    .gl-send-button {
      background: var(--brand-color);
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: background 0.2s;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 40px;
      align-self: flex-end;
    }

    .gl-send-button:hover {
      background: var(--brand-color-hover);
    }

    .gl-send-button:active {
      transform: scale(0.95);
    }

    .gl-send-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Powered By Footer */
    .gl-powered-by {
      font-size: 11px;
      text-align: center;
      color: #999;
      padding: 8px;
      border-top: 1px solid var(--border-color);
    }

    .gl-powered-by a {
      color: var(--brand-color);
      text-decoration: none;
    }

    .gl-powered-by a:hover {
      text-decoration: underline;
    }

    /* Confirmation Message */
    .gl-confirmation {
      padding: 12px;
      background: #e8f5e9;
      border-left: 4px solid #4caf50;
      border-radius: 4px;
      color: #2e7d32;
      font-size: 13px;
    }

    /* Link Styles */
    a {
      color: var(--brand-color);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }
  `;

  class GLChatWidget extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.config = {};
      this.conversationHistory = [];
      this.isOpen = false;
      this.isWaitingForResponse = false;
      this.currentLeadData = {};
      this.suggestionChips = [
        'What are the pricing options?',
        'Can I schedule a tour?',
        'What amenities do you offer?',
      ];
    }

    connectedCallback() {
      this.initializeConfig();
      this.render();
      this.setupEventListeners();
      this.applyBrandColors();
      this.showWelcomeMessage();
    }

    initializeConfig() {
      // Merge attributes and data attributes into config
      this.config = {
        communityId: this.getAttribute('data-community-id') || '',
        communityName: this.getAttribute('data-community-name') || 'Senior Living Community',
        advisorName: this.getAttribute('data-advisor-name') || 'Community Advisor',
        brandColor: this.getAttribute('data-brand-color') || '#2c5f7f',
        brandColorHover: this.getAttribute('data-brand-color-hover') || '#1e4a5f',
        secondaryColor: this.getAttribute('data-secondary-color') || '#f5f5f5',
        accentColor: this.getAttribute('data-accent-color') || '#ff6b35',
        phoneNumber: this.getAttribute('data-phone-number') || '',
        address: this.getAttribute('data-address') || '',
        chatWidth: parseInt(this.getAttribute('data-chat-width')) || 400,
        chatHeight: parseInt(this.getAttribute('data-chat-height')) || 600,
        position: this.getAttribute('data-position') || 'right',
        zIndex: parseInt(this.getAttribute('data-z-index')) || 999999,
        apiEndpoint: this.getAttribute('data-api-endpoint') || this.getScriptOrigin(),
        tourEnabled: this.getAttribute('data-tour-enabled') !== 'false',
        smsEnabled: this.getAttribute('data-sms-enabled') !== 'false',
        careTypes: this.parseJSON(this.getAttribute('data-care-types')) || [],
        communityDescription: this.getAttribute('data-community-description') || '',
        amenities: this.parseJSON(this.getAttribute('data-amenities')) || [],
        diningInfo: this.getAttribute('data-dining-info') || '',
        activities: this.getAttribute('data-activities') || '',
        staffRatios: this.getAttribute('data-staff-ratios') || '',
        floorPlansUrl: this.getAttribute('data-floor-plans-url') || '',
        galleryUrl: this.getAttribute('data-gallery-url') || '',
      };
    }

    parseJSON(str) {
      try {
        return str ? JSON.parse(str) : null;
      } catch {
        return null;
      }
    }

    getScriptOrigin() {
      try {
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          if (script.src && script.src.includes('gl-widget')) {
            return new URL(script.src).origin;
          }
        }
      } catch (e) {
        // Fall back to window.location
      }
      return window.location.origin;
    }

    applyBrandColors() {
      const style = this.shadowRoot.querySelector('style');
      if (!style) return;

      const cssText = style.textContent;
      const updatedCSS = cssText
        .replace(/--brand-color: #2c5f7f/g, `--brand-color: ${this.config.brandColor}`)
        .replace(/--brand-color-hover: #1e4a5f/g, `--brand-color-hover: ${this.config.brandColorHover}`)
        .replace(/--secondary-color: #f5f5f5/g, `--secondary-color: ${this.config.secondaryColor}`)
        .replace(/--accent-color: #ff6b35/g, `--accent-color: ${this.config.accentColor}`);

      style.textContent = updatedCSS;
    }

    render() {
      const template = document.createElement('template');
      template.innerHTML = `
        <style>${style}</style>
        <div class="gl-widget-container" data-position="${this.config.position}">
          <!-- Floating Bubble Launcher -->
          <button class="gl-launcher" aria-label="Open chat" title="Chat with us">
            <span class="gl-launcher-icon">💬</span>
          </button>

          <!-- Chat Window -->
          <div class="gl-chat-window">
            <!-- Header -->
            <div class="gl-chat-header">
              <div class="gl-chat-header-title">
                <div class="gl-chat-header-community">${this.config.communityName}</div>
                <div class="gl-chat-header-advisor">Advisor: ${this.config.advisorName}</div>
              </div>
              <button class="gl-chat-close" aria-label="Close chat" title="Close">×</button>
            </div>

            <!-- Messages -->
            <div class="gl-messages"></div>

            <!-- Input Area -->
            <div class="gl-input-area">
              <div class="gl-input-wrapper">
                <div class="gl-quick-replies-row"></div>
                <div style="display: flex; gap: 8px;">
                  <textarea
                    class="gl-input-field"
                    placeholder="Type your question..."
                    rows="1"
                  ></textarea>
                  <button class="gl-send-button" aria-label="Send message">
                    ↓
                  </button>
                </div>
              </div>
            </div>

            <!-- Powered By Footer -->
            <div class="gl-powered-by">
              Powered by <a href="https://greenlivingai.com" target="_blank">GreenLiving AI</a>
            </div>
          </div>
        </div>
      `;

      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }

    setupEventListeners() {
      const launcher = this.shadowRoot.querySelector('.gl-launcher');
      const closeBtn = this.shadowRoot.querySelector('.gl-chat-close');
      const sendBtn = this.shadowRoot.querySelector('.gl-send-button');
      const inputField = this.shadowRoot.querySelector('.gl-input-field');

      launcher.addEventListener('click', () => this.toggleChat());
      closeBtn.addEventListener('click', () => this.closeChat());
      sendBtn.addEventListener('click', () => this.sendMessage());

      inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      inputField.addEventListener('input', (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
      });
    }

    toggleChat() {
      if (this.isOpen) {
        this.closeChat();
      } else {
        this.openChat();
      }
    }

    openChat() {
      const launcher = this.shadowRoot.querySelector('.gl-launcher');
      const chatWindow = this.shadowRoot.querySelector('.gl-chat-window');

      this.isOpen = true;
      chatWindow.classList.add('open');
      launcher.classList.add('open');

      // Focus input after animation
      setTimeout(() => {
        const inputField = this.shadowRoot.querySelector('.gl-input-field');
        inputField?.focus();
      }, 300);

      this.scrollMessagesDown();
    }

    closeChat() {
      const launcher = this.shadowRoot.querySelector('.gl-launcher');
      const chatWindow = this.shadowRoot.querySelector('.gl-chat-window');

      this.isOpen = false;
      chatWindow.classList.remove('open');
      launcher.classList.remove('open');
    }

    showWelcomeMessage() {
      const greeting = `Hello! 👋 I'm your AI advisor for ${this.config.communityName}. How can I help you today? Would you like to learn about our care options, schedule a tour, or have any other questions?`;
      this.addMessage(greeting, 'ai');
      this.updateQuickReplies();
    }

    updateQuickReplies() {
      const quickRepliesRow = this.shadowRoot.querySelector('.gl-quick-replies-row');
      quickRepliesRow.innerHTML = '';

      this.suggestionChips.forEach((chip) => {
        const chipEl = document.createElement('div');
        chipEl.className = 'gl-quick-reply-chip';
        chipEl.textContent = chip;
        chipEl.addEventListener('click', () => {
          this.sendMessage(chip);
        });
        quickRepliesRow.appendChild(chipEl);
      });
    }

    async sendMessage(content) {
      const inputField = this.shadowRoot.querySelector('.gl-input-field');
      const message = content || inputField.value.trim();

      if (!message) return;

      // Add user message to chat
      this.addMessage(message, 'user');
      this.conversationHistory.push({ role: 'user', content: message });

      // Clear input
      if (!content) {
        inputField.value = '';
        inputField.style.height = 'auto';
      }

      // Show typing indicator
      this.showTypingIndicator();
      this.isWaitingForResponse = true;

      try {
        const response = await this.fetchAIResponse();
        this.removeTypingIndicator();

        if (response && response.message) {
          this.conversationHistory.push({
            role: 'assistant',
            content: response.message,
          });
          this.addMessage(response.message, 'ai');

          // Handle inline components if provided
          if (response.components) {
            this.renderInlineComponents(response.components);
          }

          // Update quick replies if provided
          if (response.suggestedQuestions) {
            this.suggestionChips = response.suggestedQuestions;
            this.updateQuickReplies();
          } else {
            this.updateQuickReplies();
          }
        }
      } catch (error) {
        this.removeTypingIndicator();
        this.addMessage(
          'Sorry, I encountered an error. Please try again.',
          'ai'
        );
        console.error('Chat error:', error);
      }

      this.isWaitingForResponse = false;
    }

    async fetchAIResponse() {
      const endpoint = `${this.config.apiEndpoint}/api/chat`;

      const payload = {
        communityId: this.config.communityId,
        messages: this.conversationHistory,
        leadData: this.currentLeadData,
        context: {
          communityName: this.config.communityName,
          communityDescription: this.config.communityDescription,
          amenities: this.config.amenities,
          careTypes: this.config.careTypes,
          diningInfo: this.config.diningInfo,
          activities: this.config.activities,
          staffRatios: this.config.staffRatios,
          phoneNumber: this.config.phoneNumber,
          address: this.config.address,
        },
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return response.json();
    }

    addMessage(content, role) {
      const messagesContainer = this.shadowRoot.querySelector('.gl-messages');
      const messageEl = document.createElement('div');
      messageEl.className = `gl-message ${role}`;

      const timestamp = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      const bubbleEl = document.createElement('div');
      bubbleEl.className = 'gl-message-bubble';

      // Parse message for markdown-like formatting
      bubbleEl.innerHTML = this.parseMessageContent(content);

      const timeEl = document.createElement('div');
      timeEl.className = 'gl-message-time';
      timeEl.textContent = timestamp;

      messageEl.appendChild(bubbleEl);
      messageEl.appendChild(timeEl);

      messagesContainer.appendChild(messageEl);

      // Add event listeners to interactive elements
      this.attachInteractiveListeners(messageEl);

      this.scrollMessagesDown();
    }

    parseMessageContent(content) {
      // Basic HTML escaping and markdown-like parsing
      let html = this.escapeHTML(content);

      // Convert **bold** to <strong>bold</strong>
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // Convert *italic* to <em>italic</em>
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

      // Convert URLs to links
      html = html.replace(
        /(?<![\[\(])(https?:\/\/[^\s\)]+)/g,
        '<a href="$1" target="_blank" rel="noopener">link</a>'
      );

      // Convert line breaks
      html = html.replace(/\n/g, '<br>');

      return html;
    }

    escapeHTML(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    renderInlineComponents(components) {
      const messagesContainer = this.shadowRoot.querySelector('.gl-messages');

      if (components.pricing) {
        this.renderPricingCard(messagesContainer, components.pricing);
      }

      if (components.contactForm) {
        this.renderContactForm(messagesContainer);
      }

      if (components.tourScheduler) {
        this.renderTourScheduler(messagesContainer);
      }

      this.scrollMessagesDown();
    }

    renderPricingCard(container, careTypes) {
      const componentEl = document.createElement('div');
      componentEl.className = 'gl-inline-component gl-pricing-card';

      const title = document.createElement('div');
      title.style.fontWeight = '500';
      title.style.marginBottom = '8px';
      title.textContent = 'Care Options & Pricing';
      componentEl.appendChild(title);

      careTypes.forEach((care) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'gl-pricing-item';

        const nameEl = document.createElement('span');
        nameEl.className = 'gl-pricing-name';
        nameEl.textContent = care.name;

        const priceEl = document.createElement('span');
        priceEl.className = 'gl-pricing-price';
        priceEl.textContent = care.startingAt ? `Starting at ${care.startingAt}` : 'Contact for pricing';

        itemEl.appendChild(nameEl);
        itemEl.appendChild(priceEl);
        componentEl.appendChild(itemEl);
      });

      container.appendChild(componentEl);
    }

    renderContactForm(container) {
      const componentEl = document.createElement('div');
      componentEl.className = 'gl-inline-component gl-inline-form';

      const titleEl = document.createElement('div');
      titleEl.style.fontWeight = '500';
      titleEl.style.marginBottom = '8px';
      titleEl.textContent = 'Share your contact information';
      componentEl.appendChild(titleEl);

      const fields = [
        { name: 'name', label: 'Full Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'phone', label: 'Phone Number', type: 'tel', required: false },
      ];

      fields.forEach((field) => {
        const groupEl = document.createElement('div');
        groupEl.className = 'gl-form-group';

        const labelEl = document.createElement('label');
        labelEl.className = 'gl-form-label';
        labelEl.textContent = field.label;

        const inputEl = document.createElement('input');
        inputEl.className = 'gl-form-input';
        inputEl.type = field.type;
        inputEl.name = field.name;
        inputEl.placeholder = field.label;
        inputEl.required = field.required;

        groupEl.appendChild(labelEl);
        groupEl.appendChild(inputEl);
        componentEl.appendChild(groupEl);
      });

      const submitBtn = document.createElement('button');
      submitBtn.className = 'gl-form-submit';
      submitBtn.textContent = 'Submit';
      submitBtn.addEventListener('click', () => this.submitContactForm(componentEl));

      componentEl.appendChild(submitBtn);
      container.appendChild(componentEl);
    }

    async submitContactForm(formEl) {
      const inputs = formEl.querySelectorAll('input');
      const leadData = {};
      let isValid = true;

      inputs.forEach((input) => {
        if (input.required && !input.value.trim()) {
          isValid = false;
        }
        leadData[input.name] = input.value.trim();
      });

      if (!isValid) {
        alert('Please fill in all required fields');
        return;
      }

      this.currentLeadData = leadData;

      try {
        const response = await fetch(`${this.config.apiEndpoint}/api/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            communityId: this.config.communityId,
            ...leadData,
          }),
        });

        if (response.ok) {
          // Show confirmation message
          formEl.innerHTML = '<div class="gl-confirmation">✓ Thank you! We\'ll be in touch soon.</div>';

          // Add confirmation to conversation
          this.conversationHistory.push({
            role: 'user',
            content: `Contact info submitted: ${leadData.name} (${leadData.email})`,
          });

          // Continue conversation after brief delay
          setTimeout(() => {
            this.addMessage(
              'Great! I\'ve saved your information. Our team will reach out to you shortly. Is there anything else you\'d like to know about our community?',
              'ai'
            );
          }, 1000);
        }
      } catch (error) {
        console.error('Lead submission error:', error);
        alert('Error submitting information. Please try again.');
      }
    }

    renderTourScheduler(container) {
      const componentEl = document.createElement('div');
      componentEl.className = 'gl-inline-component gl-tour-scheduler';

      const titleEl = document.createElement('div');
      titleEl.style.fontWeight = '500';
      titleEl.style.marginBottom = '8px';
      titleEl.textContent = 'Schedule a Tour';
      componentEl.appendChild(titleEl);

      const groupEl = document.createElement('div');
      groupEl.className = 'gl-scheduler-group';

      const rowEl = document.createElement('div');
      rowEl.className = 'gl-scheduler-row';

      const dateInput = document.createElement('input');
      dateInput.className = 'gl-scheduler-input';
      dateInput.type = 'date';
      dateInput.min = new Date().toISOString().split('T')[0];

      const timeInput = document.createElement('input');
      timeInput.className = 'gl-scheduler-input';
      timeInput.type = 'time';

      rowEl.appendChild(dateInput);
      rowEl.appendChild(timeInput);
      groupEl.appendChild(rowEl);

      const submitBtn = document.createElement('button');
      submitBtn.className = 'gl-scheduler-submit';
      submitBtn.textContent = 'Confirm Tour';
      submitBtn.addEventListener('click', () =>
        this.scheduleTour(dateInput.value, timeInput.value)
      );

      groupEl.appendChild(submitBtn);
      componentEl.appendChild(groupEl);
      container.appendChild(componentEl);
    }

    async scheduleTour(date, time) {
      if (!date || !time) {
        alert('Please select both date and time');
        return;
      }

      try {
        const response = await fetch(`${this.config.apiEndpoint}/api/tours`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            communityId: this.config.communityId,
            date,
            time,
            ...this.currentLeadData,
          }),
        });

        if (response.ok) {
          this.addMessage(
            `✓ Your tour has been scheduled for ${date} at ${time}. We'll send you a confirmation email shortly!`,
            'ai'
          );
          this.conversationHistory.push({
            role: 'assistant',
            content: `Tour scheduled for ${date} at ${time}`,
          });
        }
      } catch (error) {
        console.error('Tour scheduling error:', error);
        this.addMessage('Error scheduling tour. Please try again or call us directly.', 'ai');
      }
    }

    attachInteractiveListeners(messageEl) {
      const buttons = messageEl.querySelectorAll('.gl-quick-reply, .gl-inline-button');
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const text = btn.textContent;
          this.sendMessage(text);
        });
      });
    }

    showTypingIndicator() {
      const messagesContainer = this.shadowRoot.querySelector('.gl-messages');
      const indicatorEl = document.createElement('div');
      indicatorEl.className = 'gl-typing-indicator';
      indicatorEl.innerHTML = `
        <div class="gl-typing-dot"></div>
        <div class="gl-typing-dot"></div>
        <div class="gl-typing-dot"></div>
      `;
      messagesContainer.appendChild(indicatorEl);
      this.scrollMessagesDown();
    }

    removeTypingIndicator() {
      const indicator = this.shadowRoot.querySelector('.gl-typing-indicator');
      if (indicator) {
        indicator.remove();
      }
    }

    scrollMessagesDown() {
      setTimeout(() => {
        const messagesContainer = this.shadowRoot.querySelector('.gl-messages');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 0);
    }
  }

  // Register the custom element
  customElements.define('gl-chat', GLChatWidget);

  // Auto-initialize if data-auto-init attribute is present
  document.addEventListener('DOMContentLoaded', () => {
    const widget = document.querySelector('gl-chat[data-auto-init]');
    if (widget && !widget.initialized) {
      widget.initialized = true;
      // Widget auto-initializes on connectedCallback
    }
  });

  // Export for manual initialization if needed
  window.GLChatWidget = GLChatWidget;
})();
