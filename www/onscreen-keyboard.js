class OnScreenKeyboard extends HTMLElement {
  constructor() {
    super();

    /* Shadow DOM & default state */
    this.attachShadow({ mode: 'open' });
    this._config = {
      theme: 'light',
      animationSpeed: 300,
      layout: 'qwerty'
    };

    this._keyboardVisible = false;
    this._currentInput = null;

    this._isShifted = false;
    this._isCapsLock = false;
    this._isSymbols = false;
    this._isMoreSymbols = false;

    /* Track if global listeners have been added */
    this._eventsAttached = false;

    /* Bind once so we can add / remove safely */
    this._onFocusIn      = this._onFocusIn.bind(this);
    this._onDocMouseDown = this._onDocMouseDown.bind(this);
    this._handleKeyPress = this._handleKeyPress.bind(this);
    this._preventTouch   = this._preventTouch.bind(this);

    /* Initial render */
    this._render();
  }

  /* ───────────────────────── PUBLIC API ───────────────────────── */
  setConfig(config = {}) {
    this._config = {
      theme:           config.theme           || this._config.theme,
      animationSpeed:  config.animation_speed || this._config.animationSpeed,
      layout:          config.keyboard_layout || this._config.layout
    };

    /* Re‑render with new settings */
    requestAnimationFrame(() => this._render());
  }

  /* ───────────────────────── RENDERING ───────────────────────── */
  _render() {
    /* Build CSS */
    const style = document.createElement('style');
    style.textContent = `
      :host {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        font-family: sans-serif;
      }

      .keyboard {
        background: var(--ha-card-background, #fff);
        border-top: 1px solid var(--divider-color, #ddd);
        padding: 10px;
        transform: translateY(100%);
        transition: transform ${this._config.animationSpeed}ms ease-in-out;
        box-shadow: 0 -2px 10px rgba(0,0,0,.1);
      }
      .keyboard.visible { transform: translateY(0); }

      .keyboard-row {
        display: flex;
        justify-content: center;
        margin-bottom: 5px;
      }

      .key {
        background: var(--primary-color, #03a9f4);
        color: var(--text-primary-color, #fff);
        border: none;
        border-radius: 4px;
        padding: 10px 15px;
        margin: 2px;
        min-width: 40px;
        font-size: 16px;
        cursor: pointer;
        user-select: none;
        transition: background-color .2s;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        position: relative;
      }
      .key:hover       { background: var(--primary-color-dark, #0288d1); }
      .key.special     { background: var(--secondary-text-color, #666); }
      .key.space       { min-width: 200px; }
      .key.active      { background: var(--primary-color-dark, #0288d1); }
      .key.shift::after{ content: "⇧"; position:absolute; top:2px; right:2px; font-size:12px; }
      .key.caps::after { content: "⇪"; position:absolute; top:2px; right:2px; font-size:12px; }
    `;

    /* Build keyboard markup */
    const keyboard = document.createElement('div');
    keyboard.className = 'keyboard' + (this._keyboardVisible ? ' visible' : '');
    keyboard.innerHTML = this._getKeyboardLayout();

    /* Clear old nodes and append */
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.append(style, keyboard);

    /* Attach listeners once */
    if (!this._eventsAttached) this._setupEventListeners();
  }

  _getKeyboardLayout() {
    /* iOS‑style QWERTY layout + symbols */
    const layouts = {
      qwerty: {
        letters: [
          ['q','w','e','r','t','y','u','i','o','p',{ key:'backspace',label:'⌫' }],
          ['a','s','d','f','g','h','j','k','l',{ key:'enter',label:'⏎' }],
          [{ key:'shift',label:'⇧' },'z','x','c','v','b','n','m'],
          [{ key:'symbols',label:'123' },',',{ key:'space',label:'space' },'.']
        ],
        symbols: [
          ['1','2','3','4','5','6','7','8','9','0',{ key:'backspace',label:'⌫' }],
          ['-','/',':',';','(',')','$','&','@',{ key:'enter',label:'⏎' }],
          [{ key:'more',label:'#+=' },'.',',','?','!','"'],
          [{ key:'letters',label:'ABC' },{ key:'space',label:'space' }]
        ],
        more: [
          ['[',']','{','}','#','%','^','*','+','=',{ key:'backspace',label:'⌫' }],
          ['_','\\','|','~','<','>','€','£','¥','•',{ key:'enter',label:'⏎' }],
          [{ key:'symbols',label:'123' },'.',',','?','!','"'],
          [{ key:'letters',label:'ABC' },{ key:'space',label:'space' }]
        ]
      }
    };

    const layout = layouts[this._config.layout] || layouts.qwerty;

    let current;
    if (this._isSymbols && this._isMoreSymbols) current = layout.more;
    else if (this._isSymbols) current = layout.symbols;
    else current = layout.letters;

    return current.map(row => `
      <div class="keyboard-row">
        ${row.map(key => this._renderKey(key)).join('')}
      </div>`).join('');
  }

  _renderKey(key) {
    const isObj = typeof key === 'object';
    const dataKey = isObj ? key.key : key;
    const label   = isObj ? key.label : this._getKeyDisplay(key);

    let cls = 'key';
    if (isObj || ['backspace','enter','shift','symbols','letters','space','more'].includes(dataKey)) cls += ' special';
    if (dataKey === 'shift' && (this._isShifted || this._isCapsLock)) cls += ' active';
    if (dataKey === 'shift' && this._isCapsLock) cls += ' caps';
    if (dataKey === 'space') cls += ' space';

    return `<button type="button" class="${cls}" data-key="${dataKey}">${label}</button>`;
  }

  _getKeyDisplay(key) {
    if (this._isSymbols || this._isMoreSymbols) return key;
    return (this._isShifted || this._isCapsLock) ? key.toUpperCase() : key.toLowerCase();
  }

  /* ───────────────────────── EVENT HANDLERS ───────────────────────── */
  _setupEventListeners() {
    this._eventsAttached = true;

    document.addEventListener('focusin',   this._onFocusIn);
    document.addEventListener('mousedown', this._onDocMouseDown);

    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) {
      this.shadowRoot.addEventListener('touchend',   this._handleKeyPress);
      this.shadowRoot.addEventListener('touchstart', this._preventTouch, { passive: false });
    } else {
      this.shadowRoot.addEventListener('mousedown', this._handleKeyPress);
    }
  }

  _onFocusIn(e) {
    if (['INPUT','TEXTAREA'].includes(e.target.tagName)) {
      this._currentInput = e.target;
      this._showKeyboard();
    }
  }

  _onDocMouseDown(e) {
    const path = e.composedPath();
    if (this._keyboardVisible && !path.includes(this.shadowRoot) && !path.includes(this._currentInput)) {
      this._hideKeyboard();
    }
  }

  _handleKeyPress(e) {
    if (!e.target.classList.contains('key')) return;
    e.preventDefault();
    e.stopPropagation();

    const dataKey = e.target.getAttribute('data-key');
    if (!this._currentInput) return;

    switch (dataKey) {
      case 'backspace':
        this._currentInput.value = this._currentInput.value.slice(0, -1);
        break;
      case 'space':
        this._currentInput.value += ' ';
        break;
      case 'enter':
        this._currentInput.blur();
        break;
      case 'shift':
        if (this._isCapsLock) {
          this._isCapsLock = false;
          this._isShifted  = false;
        } else if (this._isShifted) {
          this._isShifted  = false;
          this._isCapsLock = true;
        } else {
          this._isShifted  = true;
        }
        /* Defer re-render so click bubbling finishes with old DOM */
        requestAnimationFrame(() => this._render());
        break;
      case 'symbols':
        this._isSymbols     = true;
        this._isMoreSymbols = false;
        this._render();
        break;
      case 'letters':
        this._isSymbols     = false;
        this._isMoreSymbols = false;
        this._render();
        break;
      case 'more':
        this._isMoreSymbols = true;
        this._render();
        break;
      default:
        this._currentInput.value += this._getKeyDisplay(dataKey);
        if (this._isShifted && !this._isCapsLock) {
          this._isShifted = false;
          this._render();
        }
    }

    /* Dispatch real input event so frameworks pick it up */
    this._currentInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  _preventTouch(e) {
    if (e.target.classList.contains('key')) e.preventDefault();
  }

  /* ───────────────────────── VISIBILITY ───────────────────────── */
  _showKeyboard() {
    const kb = this.shadowRoot.querySelector('.keyboard');
    if (kb) kb.classList.add('visible');
    this._keyboardVisible = true;
  }

  _hideKeyboard() {
    const kb = this.shadowRoot.querySelector('.keyboard');
    if (kb) kb.classList.remove('visible');
    this._keyboardVisible = false;
    this._currentInput = null;

    /* Reset transient shift state */
    if (this._isShifted && !this._isCapsLock) {
      this._isShifted = false;
      this._render();
    }
  }

  /* ───────────────────────── HOUSEKEEPING ───────────────────────── */
  disconnectedCallback() {
    /* Clean up global listeners when element is removed */
    if (this._eventsAttached) {
      document.removeEventListener('focusin',   this._onFocusIn);
      document.removeEventListener('mousedown', this._onDocMouseDown);
    }
  }
}

customElements.define('onscreen-keyboard', OnScreenKeyboard);

// Lovelace custom card wrapper
class OnScreenKeyboardCard extends HTMLElement {
  setConfig(config) {
    if (this._keyboard) {
      this._keyboard.setConfig(config);
      return;
    }
    this.innerHTML = '';
    this._keyboard = document.createElement('onscreen-keyboard');
    this._keyboard.setConfig(config);
    this.appendChild(this._keyboard);
  }

  getCardSize() {
    return 1;
  }
}

customElements.define('onscreen-keyboard-card', OnScreenKeyboardCard);

// For Lovelace: register as custom:onscreen-keyboard
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'onscreen-keyboard',
  name: 'On‑Screen Keyboard',
  description: 'A smooth, animated on‑screen keyboard for Home Assistant dashboards'
});
