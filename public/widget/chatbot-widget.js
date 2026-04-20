(function () {
  var STORAGE_PREFIX = 'chatbot_rag';
  var RESPONSE_DEBOUNCE_MS = 3000;
  var ASSISTANT_MESSAGE_GAP_MS = 2000;

  function trimTrailingSlash(value) {
    return String(value || '').replace(/\/+$/, '');
  }

  function createElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (typeof text === 'string') element.textContent = text;
    return element;
  }

  function parseJsonSafely(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function now() {
    return Date.now();
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function Widget(config) {
    this.config = {
      baseUrl: trimTrailingSlash(config.baseUrl),
      clienteId: String(config.clienteId || '').trim(),
      titulo: config.titulo || 'Atendimento',
      subtitulo: config.subtitulo || 'Chat online',
      nomeAgente: config.nomeAgente || '',
      primaryColor: config.primaryColor || '#1f7a5a',
      launcherLabel: config.launcherLabel || 'Chat',
      welcomeFallback: config.welcomeFallback || 'Oi, como posso ajudar?',
      mountTo: config.mountTo || document.body,
      autoOpen: Boolean(config.autoOpen),
      zIndex: Number(config.zIndex || 9999),
      widgetKey: config.widgetKey || null,
    };

    this.state = {
      open: Boolean(config.autoOpen),
      active: true,
      statusText: 'Pronto para conversar',
      conversaId: null,
      tokenConversa: null,
      messages: [],
      initialized: false,
      destroyed: false,
      sessionPromise: null,
      sendQueue: Promise.resolve(),
      waitingForAssistant: false,
      assistantTyping: false,
      pendingReplyLocalIds: [],
      debounceTimer: null,
      localMessageSeq: 0,
    };

    this.elements = {};
    this.styleTag = null;
    this.handleSendBound = this.handleSend.bind(this);
    this.toggleOpenBound = this.toggleOpen.bind(this);
    this.handleInputBound = this.handleInput.bind(this);
  }

  Widget.prototype.storageKeys = function () {
    var suffix = this.config.widgetKey || this.config.clienteId || 'default';
    return {
      token: STORAGE_PREFIX + ':' + suffix + ':token',
      conversaId: STORAGE_PREFIX + ':' + suffix + ':conversa_id',
    };
  };

  Widget.prototype.saveSession = function () {
    var keys = this.storageKeys();
    if (this.state.tokenConversa) {
      localStorage.setItem(keys.token, this.state.tokenConversa);
    }
    if (this.state.conversaId) {
      localStorage.setItem(keys.conversaId, this.state.conversaId);
    }
  };

  Widget.prototype.clearSession = function () {
    var keys = this.storageKeys();
    localStorage.removeItem(keys.token);
    localStorage.removeItem(keys.conversaId);
    this.state.conversaId = null;
    this.state.tokenConversa = null;
    this.state.messages = [];
    this.state.pendingReplyLocalIds = [];
    this.clearDebounce();
    this.setAssistantTyping(false);
  };

  Widget.prototype.loadSession = function () {
    var keys = this.storageKeys();
    this.state.tokenConversa = localStorage.getItem(keys.token);
    this.state.conversaId = localStorage.getItem(keys.conversaId);
  };

  Widget.prototype.injectStyles = function () {
    if (this.styleTag) return;

    var color = this.config.primaryColor;
    var style = document.createElement('style');
    style.setAttribute('data-chatbot-rag-style', 'true');
    style.textContent =
      '.chatbot-rag-root{position:fixed;right:20px;bottom:20px;z-index:' + this.config.zIndex + ';font-family:Segoe UI,Arial,sans-serif;}' +
      '.chatbot-rag-launcher{border:0;border-radius:999px;padding:14px 18px;background:' + color + ';color:#fff;cursor:pointer;font-weight:600;box-shadow:0 16px 40px rgba(0,0,0,.18);}' +
      '.chatbot-rag-panel{width:min(360px,calc(100vw - 24px));height:min(620px,calc(100vh - 32px));background:#fff;border:1px solid #d9e3df;border-radius:20px;box-shadow:0 28px 70px rgba(0,0,0,.22);display:none;overflow:hidden;}' +
      '.chatbot-rag-root.is-open .chatbot-rag-panel{display:flex;flex-direction:column;}' +
      '.chatbot-rag-root.is-open .chatbot-rag-launcher{display:none;}' +
      '.chatbot-rag-header{padding:16px 18px;background:linear-gradient(135deg,' + color + ',#163d35);color:#fff;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}' +
      '.chatbot-rag-header h3{margin:0;font-size:16px;line-height:1.2;}' +
      '.chatbot-rag-header p{margin:4px 0 0;font-size:12px;opacity:.82;}' +
      '.chatbot-rag-close{border:0;background:rgba(255,255,255,.15);color:#fff;width:36px;height:36px;border-radius:999px;cursor:pointer;font-size:18px;line-height:1;}' +
      '.chatbot-rag-status{padding:10px 16px;border-bottom:1px solid #edf2f0;font-size:12px;color:#466056;background:#f7fbfa;min-height:18px;}' +
      '.chatbot-rag-messages{flex:1;overflow:auto;padding:16px;background:linear-gradient(180deg,#f6fbf9 0%,#ffffff 100%);display:flex;flex-direction:column;gap:10px;}' +
      '.chatbot-rag-empty{margin:auto;text-align:center;color:#61756d;font-size:13px;max-width:220px;}' +
      '.chatbot-rag-message{max-width:84%;padding:12px 14px;border-radius:16px;white-space:pre-wrap;word-break:break-word;line-height:1.4;font-size:14px;}' +
      '.chatbot-rag-message.usuario{align-self:flex-end;background:' + color + ';color:#fff;border-bottom-right-radius:6px;}' +
      '.chatbot-rag-message.assistente{align-self:flex-start;background:#fff;color:#23312d;border:1px solid #dae5e1;border-bottom-left-radius:6px;}' +
      '.chatbot-rag-message.is-pending{opacity:.7;}' +
      '.chatbot-rag-message.is-error{background:#fff1f1;color:#8a2020;border:1px solid #f0c9c9;}' +
      '.chatbot-rag-typing{align-self:flex-start;background:#fff;color:#23312d;border:1px solid #dae5e1;border-bottom-left-radius:6px;padding:12px 16px;border-radius:16px;display:flex;align-items:center;gap:5px;min-width:68px;}' +
      '.chatbot-rag-typing-dot{width:9px;height:9px;border-radius:999px;background:#8b9d97;animation:chatbot-rag-bounce 1s infinite ease-in-out;}' +
      '.chatbot-rag-typing-dot:nth-child(2){animation-delay:.16s;}' +
      '.chatbot-rag-typing-dot:nth-child(3){animation-delay:.32s;}' +
      '@keyframes chatbot-rag-bounce{0%,80%,100%{transform:translateY(0);opacity:.45;}40%{transform:translateY(-6px);opacity:1;}}' +
      '.chatbot-rag-footer{padding:12px;border-top:1px solid #edf2f0;background:#fff;display:flex;gap:8px;align-items:flex-end;}' +
      '.chatbot-rag-input{flex:1;border:1px solid #cfdbd6;border-radius:14px;padding:12px 14px;font-size:14px;outline:none;resize:none;min-height:48px;max-height:120px;line-height:1.4;}' +
      '.chatbot-rag-input:focus{border-color:' + color + ';box-shadow:0 0 0 3px rgba(31,122,90,.14);}' +
      '.chatbot-rag-send{border:0;border-radius:14px;background:' + color + ';color:#fff;padding:0 16px;font-weight:600;cursor:pointer;min-width:84px;height:48px;}' +
      '.chatbot-rag-send[disabled]{opacity:.65;cursor:not-allowed;}' +
      '@media (max-width:600px){.chatbot-rag-root{right:12px;bottom:12px;left:12px;}.chatbot-rag-panel{width:100%;height:min(76vh,620px);}.chatbot-rag-launcher{width:100%;}}';

    document.head.appendChild(style);
    this.styleTag = style;
  };

  Widget.prototype.renderShell = function () {
    this.injectStyles();

    var root = createElement('div', 'chatbot-rag-root');
    var launcher = createElement('button', 'chatbot-rag-launcher', this.config.launcherLabel);
    launcher.type = 'button';
    launcher.addEventListener('click', this.toggleOpenBound);

    var panel = createElement('section', 'chatbot-rag-panel');
    var header = createElement('header', 'chatbot-rag-header');
    var headerContent = createElement('div', '');
    var title = createElement('h3', '', this.config.titulo);
    var subtitle = createElement('p', '', this.resolverSubtituloHeader());
    headerContent.appendChild(title);
    headerContent.appendChild(subtitle);

    var closeButton = createElement('button', 'chatbot-rag-close', 'x');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Fechar chat');
    closeButton.addEventListener('click', this.toggleOpenBound);
    header.appendChild(headerContent);
    header.appendChild(closeButton);

    var status = createElement('div', 'chatbot-rag-status', this.state.statusText);
    var messages = createElement('div', 'chatbot-rag-messages');
    var footer = createElement('form', 'chatbot-rag-footer');
    var input = createElement('textarea', 'chatbot-rag-input');
    input.rows = 1;
    input.placeholder = 'Digite sua mensagem';
    input.addEventListener('input', this.handleInputBound);
    input.addEventListener('keydown', this.handleKeyDown.bind(this));

    var send = createElement('button', 'chatbot-rag-send', 'Enviar');
    send.type = 'submit';
    footer.addEventListener('submit', this.handleSendBound);
    footer.appendChild(input);
    footer.appendChild(send);

    panel.appendChild(header);
    panel.appendChild(status);
    panel.appendChild(messages);
    panel.appendChild(footer);
    root.appendChild(launcher);
    root.appendChild(panel);
    this.config.mountTo.appendChild(root);

    this.elements.root = root;
    this.elements.launcher = launcher;
    this.elements.panel = panel;
    this.elements.headerTitle = title;
    this.elements.headerSubtitle = subtitle;
    this.elements.status = status;
    this.elements.messages = messages;
    this.elements.footer = footer;
    this.elements.input = input;
    this.elements.send = send;

    this.syncOpenState();
    this.renderMessages();
  };

  Widget.prototype.syncOpenState = function () {
    if (!this.elements.root) return;
    this.elements.root.classList.toggle('is-open', this.state.open);
    this.elements.root.style.display = this.state.active ? '' : 'none';
  };

  Widget.prototype.resolverSubtituloHeader = function () {
    return this.config.nomeAgente || this.config.subtitulo;
  };

  Widget.prototype.atualizarNomeAgente = function (nomeAgente) {
    if (!nomeAgente) return;
    this.config.nomeAgente = nomeAgente;
    if (this.elements.headerSubtitle) {
      this.elements.headerSubtitle.textContent = this.resolverSubtituloHeader();
    }
  };

  Widget.prototype.setActive = function (value) {
    this.state.active = value !== false;
    if (!this.state.active) {
      this.state.open = false;
      this.clearDebounce();
      this.setAssistantTyping(false);
    }
    this.syncOpenState();
  };

  Widget.prototype.toggleOpen = function () {
    this.state.open = !this.state.open;
    this.syncOpenState();
    if (this.state.open && this.elements.input) {
      this.elements.input.focus();
    }
  };

  Widget.prototype.setStatus = function (text) {
    this.state.statusText = text;
    if (this.elements.status) {
      this.elements.status.textContent = text;
    }
  };

  Widget.prototype.autoResizeInput = function () {
    if (!this.elements.input) return;
    this.elements.input.style.height = 'auto';
    this.elements.input.style.height = Math.min(this.elements.input.scrollHeight, 120) + 'px';
  };

  Widget.prototype.renderMessages = function () {
    if (!this.elements.messages) return;

    var container = this.elements.messages;
    container.innerHTML = '';

    if (!this.state.messages.length && !this.state.assistantTyping) {
      container.appendChild(createElement('div', 'chatbot-rag-empty', 'Nenhuma mensagem ainda. Inicie a conversa para testar o fluxo.'));
      return;
    }

    for (var i = 0; i < this.state.messages.length; i += 1) {
      var item = this.state.messages[i];
      var classes = ['chatbot-rag-message', item.papel];
      if (item.localStatus === 'enviando') classes.push('is-pending');
      if (item.localStatus === 'erro') classes.push('is-error');
      var message = createElement('div', classes.join(' '), item.mensagem);
      container.appendChild(message);
    }

    if (this.state.assistantTyping) {
      var typing = createElement('div', 'chatbot-rag-typing');
      typing.appendChild(createElement('span', 'chatbot-rag-typing-dot'));
      typing.appendChild(createElement('span', 'chatbot-rag-typing-dot'));
      typing.appendChild(createElement('span', 'chatbot-rag-typing-dot'));
      container.appendChild(typing);
    }

    container.scrollTop = container.scrollHeight;
  };

  Widget.prototype.http = async function (path, payload) {
    var response = await fetch(this.config.baseUrl + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      var errorBody = await response.text();
      var parsed = parseJsonSafely(errorBody);
      var message =
        (parsed && parsed.message && (Array.isArray(parsed.message) ? parsed.message.join(', ') : parsed.message)) ||
        'Falha na requisicao.';
      var error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return response.json();
  };

  Widget.prototype.createConversation = async function () {
    var data = await this.http('/ia/conversas', {
      clienteId: this.config.clienteId,
    });

    this.atualizarNomeAgente(data.nomeAgente);
    this.setActive(data.ativo !== false);

    if (data.ativo === false) {
      this.clearSession();
      this.setStatus('O agente esta inativo no momento.');
      return;
    }

    this.state.conversaId = data.conversaId;
    this.state.tokenConversa = data.tokenConversa;
    this.saveSession();
    this.state.messages = [];

    if (data.mensagemBoasVindas) {
      this.state.messages.push({
        papel: 'assistente',
        mensagem: data.mensagemBoasVindas,
      });
    }
  };

  Widget.prototype.renewConversation = async function () {
    if (!this.state.tokenConversa) {
      throw new Error('Sessao indisponivel');
    }

    var data = await this.http('/ia/conversas/renovar-token', {
      tokenConversa: this.state.tokenConversa,
    });

    this.atualizarNomeAgente(data.nomeAgente);
    this.setActive(data.ativo !== false);

    if (data.ativo === false) {
      this.clearSession();
      this.setStatus('O agente esta inativo no momento.');
      return;
    }

    this.state.tokenConversa = data.tokenConversa;
    this.saveSession();
    this.state.messages = Array.isArray(data.historico)
      ? data.historico.map(function (item) {
          return {
            papel: item.papel,
            mensagem: item.mensagem,
          };
        })
      : [];
  };

  Widget.prototype.ensureSession = async function () {
    if (!this.config.baseUrl || !this.config.clienteId) {
      this.setStatus('Configure baseUrl e clienteId.');
      throw new Error('Configure baseUrl e clienteId.');
    }

    if (this.state.initialized) {
      return;
    }

    if (!this.state.active) {
      return;
    }

    if (this.state.sessionPromise) {
      return this.state.sessionPromise;
    }

    this.loadSession();
    this.setStatus('Conectando ao atendimento...');

    var self = this;
    this.state.sessionPromise = (async function () {
      try {
        if (self.state.tokenConversa) {
          await self.renewConversation();
          if (self.state.active) {
            self.setStatus('Sessao restaurada.');
          }
        } else {
          await self.createConversation();
          if (self.state.active) {
            self.setStatus('Conversa iniciada.');
          }
        }
        self.state.initialized = self.state.active;
      } catch (error) {
        self.clearSession();
        try {
          await self.createConversation();
          self.state.initialized = self.state.active;
          if (self.state.active) {
            self.setStatus('Nova sessao criada.');
          }
        } catch (createError) {
          self.setStatus(createError.message || 'Nao foi possivel iniciar o chat.');
          throw createError;
        }
      } finally {
        self.renderMessages();
        self.state.sessionPromise = null;
      }
    })();

    return this.state.sessionPromise;
  };

  Widget.prototype.findMessageIndexByLocalId = function (localId) {
    for (var i = 0; i < this.state.messages.length; i += 1) {
      if (this.state.messages[i].localId === localId) {
        return i;
      }
    }
    return -1;
  };

  Widget.prototype.markMessageAsSent = function (localId, data) {
    var index = this.findMessageIndexByLocalId(localId);
    if (index === -1) return;

    this.state.messages[index] = {
      localId: localId,
      papel: data.papel || 'usuario',
      mensagem: data.mensagem || this.state.messages[index].mensagem,
    };
  };

  Widget.prototype.markMessageAsError = function (localId, error) {
    var index = this.findMessageIndexByLocalId(localId);
    if (index === -1) return;

    this.state.messages[index].localStatus = 'erro';
    this.state.messages[index].mensagem = this.state.messages[index].mensagem + '\n\n[falha no envio]';
    this.state.messages[index].erro = error.message || 'Falha ao enviar mensagem.';
  };

  Widget.prototype.trackPendingReply = function (localId) {
    this.state.pendingReplyLocalIds.push(localId);
  };

  Widget.prototype.clearDebounce = function () {
    if (this.state.debounceTimer) {
      clearTimeout(this.state.debounceTimer);
      this.state.debounceTimer = null;
    }
  };

  Widget.prototype.setAssistantTyping = function (value) {
    this.state.assistantTyping = value;
    this.renderMessages();
  };

  Widget.prototype.scheduleAssistantReply = function () {
    if (!this.state.pendingReplyLocalIds.length || this.state.waitingForAssistant) {
      return;
    }

    this.clearDebounce();
    var self = this;
    this.state.debounceTimer = setTimeout(function () {
      self.state.debounceTimer = null;
      self.requestAssistantReply();
    }, RESPONSE_DEBOUNCE_MS);
  };

  Widget.prototype.handleInput = function () {
    this.autoResizeInput();
    if (this.state.pendingReplyLocalIds.length && !this.state.waitingForAssistant) {
      this.scheduleAssistantReply();
    }
  };

  Widget.prototype.sendUserMessage = async function (text, localId) {
    var data = await this.http('/ia/mensagens', {
      tokenConversa: this.state.tokenConversa,
      mensagem: text,
    });

    this.markMessageAsSent(localId, data);
    this.trackPendingReply(localId);
    this.renderMessages();
    this.scheduleAssistantReply();
  };

  Widget.prototype.generateAssistantReply = async function () {
    var data = await this.http('/ia/conversas/' + encodeURIComponent(this.state.conversaId) + '/responder', {
      tokenConversa: this.state.tokenConversa,
    });

    var mensagensAssistente = Array.isArray(data && data.mensagens) ? data.mensagens : [];
    await this.renderAssistantMessagesGradually(mensagensAssistente);
    return data;
  };

  Widget.prototype.renderAssistantMessagesGradually = async function (mensagensAssistente) {
    if (!mensagensAssistente.length) {
      return;
    }

    for (var i = 0; i < mensagensAssistente.length; i += 1) {
      var item = mensagensAssistente[i];
      this.state.messages.push({
        papel: item.papel || 'assistente',
        mensagem: item.mensagem || '',
      });
      this.renderMessages();

      if (i < mensagensAssistente.length - 1) {
        this.setAssistantTyping(true);
        this.setStatus('Assistente digitando...');
        await wait(ASSISTANT_MESSAGE_GAP_MS);
      }
    }
  };

  Widget.prototype.requestAssistantReply = async function () {
    if (this.state.waitingForAssistant || !this.state.pendingReplyLocalIds.length) {
      return;
    }

    var batchIds = this.state.pendingReplyLocalIds.slice();
    this.state.pendingReplyLocalIds = [];
    this.state.waitingForAssistant = true;
    this.setAssistantTyping(true);
    this.setStatus('Assistente digitando...');

    try {
      await this.ensureSession();
      await this.generateAssistantReply();
      this.setStatus('Atendimento pronto.');
    } catch (error) {
      this.state.pendingReplyLocalIds = batchIds.concat(this.state.pendingReplyLocalIds);
      this.setStatus(error.message || 'Falha ao gerar resposta.');
    } finally {
      this.state.waitingForAssistant = false;
      this.setAssistantTyping(false);

      if (this.state.pendingReplyLocalIds.length) {
        this.scheduleAssistantReply();
      }
    }
  };

  Widget.prototype.enqueueUserMessage = function (text, localId) {
    var self = this;
    this.state.sendQueue = this.state.sendQueue
      .then(async function () {
        await self.ensureSession();

        if (!self.state.active) {
          return;
        }

        if (!self.state.tokenConversa || !self.state.conversaId) {
          throw new Error('Nao foi possivel preparar a sessao da conversa.');
        }

        await self.sendUserMessage(text, localId);
      })
      .catch(function (error) {
        if (error && error.status === 403) {
          self.clearSession();
          self.state.initialized = false;
          self.setActive(false);
        }

        self.markMessageAsError(localId, error);
        self.renderMessages();
        self.setStatus(error.message || 'Falha ao enviar mensagem.');
      });
  };

  Widget.prototype.handleSend = function (event) {
    event.preventDefault();

    if (!this.elements.input) return;

    var text = this.elements.input.value.trim();
    if (!text) {
      this.setStatus('Digite uma mensagem antes de enviar.');
      return;
    }

    var localId = 'local-' + now() + '-' + (this.state.localMessageSeq += 1);

    this.state.messages.push({
      localId: localId,
      papel: 'usuario',
      mensagem: text,
      localStatus: 'enviando',
    });

    this.elements.input.value = '';
    this.autoResizeInput();
    this.renderMessages();
    this.setStatus('Mensagem enviada. Aguarde a pausa para o assistente responder.');
    this.enqueueUserMessage(text, localId);
  };

  Widget.prototype.handleKeyDown = function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.handleSend(event);
    }
  };

  Widget.prototype.mount = function () {
    if (this.state.destroyed) return;
    this.renderShell();
    this.autoResizeInput();
    this.setActive(true);
    this.ensureSession().catch(function () {});
  };

  Widget.prototype.destroy = function () {
    this.state.destroyed = true;
    this.clearDebounce();
    if (this.elements.launcher) {
      this.elements.launcher.removeEventListener('click', this.toggleOpenBound);
    }
    if (this.elements.footer) {
      this.elements.footer.removeEventListener('submit', this.handleSendBound);
    }
    if (this.elements.input) {
      this.elements.input.removeEventListener('input', this.handleInputBound);
    }
    if (this.elements.root && this.elements.root.parentNode) {
      this.elements.root.parentNode.removeChild(this.elements.root);
    }
  };

  function resolveConfigFromScript() {
    var currentScript = document.currentScript;
    if (!currentScript) return null;

    var dataBaseUrl = currentScript.getAttribute('data-base-url');
    var dataClienteId = currentScript.getAttribute('data-cliente-id');
    var dataTitulo = currentScript.getAttribute('data-titulo');

    if (!dataBaseUrl && !dataClienteId) {
      return null;
    }

    return {
      baseUrl: dataBaseUrl || '',
      clienteId: dataClienteId || '',
      titulo: dataTitulo || 'Atendimento',
    };
  }

  function createWidget(config) {
    var widget = new Widget(config);
    widget.mount();
    return widget;
  }

  window.ChatbotRagWidget = {
    create: createWidget,
    initFromGlobals: function () {
      var scriptConfig = resolveConfigFromScript();
      var globalConfig = window.ChatbotRagConfig || {};
      var config = Object.assign({}, globalConfig, scriptConfig || {});

      if (!config.baseUrl || !config.clienteId) {
        console.warn('ChatbotRagWidget: baseUrl e clienteId sao obrigatorios.');
        return null;
      }

      if (window.__chatbotRagWidgetInstance) {
        window.__chatbotRagWidgetInstance.destroy();
      }

      window.__chatbotRagWidgetInstance = createWidget(config);
      return window.__chatbotRagWidgetInstance;
    },
  };

  if (window.ChatbotRagConfig && window.ChatbotRagConfig.autoInit !== false) {
    window.ChatbotRagWidget.initFromGlobals();
  } else {
    var autoConfig = resolveConfigFromScript();
    if (autoConfig) {
      window.ChatbotRagConfig = autoConfig;
      window.ChatbotRagWidget.initFromGlobals();
    }
  }
})();
