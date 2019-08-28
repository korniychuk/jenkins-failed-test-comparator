import { DomService } from './dom.service';
import { OnDestroy, OnInit } from './models';

class ModalService implements OnInit, OnDestroy {
  _prefix = 'ftc';
  _transitionTimeMs = 250;
  _bodyCssClass           = `${this._prefix}-modal-opened`;
  _backdropOpenedCssClass = `${this._prefix}-backdrop--opened`;

  _mainTpl = `
      <div class="${this._prefix}-backdrop" data-select="backdrop">
        <div class="${this._prefix}-modal ${this._prefix}-modal--{{ size }}" data-select="modal">
          <div class="${this._prefix}-modal__header">
            <a role="button" class="${this._prefix}-modal__close" data-select="close">&times;</a>
            <h3 class="${this._prefix}-modal__title">{{ title }}</h3>
          </div>
          <div class="${this._prefix}-modal__content" data-select="content">{{ content }}</div>
          <div class="${this._prefix}-modal__actions" data-select="actions">{{ actions }}</div>
        </div>
      </div>
    `;

  _actionButtonTpl = `
      <button class="${this._prefix}-modal__action" id="{{ id }}" title="{{ tooltip }}">{{ name }}</button>
    `;

  _globalStyles = `
      body > * {
        transition: filter ${this._transitionTimeMs}ms ease-in-out;
      }
      body.${this._bodyCssClass} > * {
        filter: blur(4px);
      }

      body.${this._bodyCssClass} > .${this._prefix}-backdrop {
        filter: none;
      }

      .${this._prefix}-backdrop {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000000;
        
        transition: background-color ${this._transitionTimeMs}ms ease-in-out;
        background-color: transparent;
      }
      .${this._backdropOpenedCssClass} {
        filter: none;
        background-color: rgba(0, 0, 0, 0.1);
      }
      .${this._prefix}-modal {
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 40px 0 rgba(0,0,0,0.5);
        background: #fff;
        margin-top: 100%;
        opacity: 0;
        transition: all ${this._transitionTimeMs}ms ease-in-out;
      }
      .${this._backdropOpenedCssClass} .${this._prefix}-modal {
        margin-top: 0;
        opacity: 1;
      }
      .${this._prefix}-modal--sm {
        width: 400px;
        height: 300px;
      }
      .${this._prefix}-modal--md {
        width: 600px;
        height: 400px;
      }
      .${this._prefix}-modal--lg {
        width: 900px;
        height: 550px;
      }
      .${this._prefix}-modal__header {
        /*width: 90%;*/
        height: 44px;
        flex: 0 0 44px;
        padding: 12px 30px;
        overflow: hidden;
        background: #e2525c; 
      }
      .${this._prefix}-modal__title {
        margin: 1px 0;
        color: #fff;
      }
      .${this._prefix}-modal__close {
        font-size: 28px;
        display: block;
        float: right;
        color: #fff;
        font-weight: bold;
        line-height: 15px;
        cursor: pointer;
      }
      .${this._prefix}-modal__content {
        padding: 12px 30px;
        flex: 1 0 auto;
        height: 100px;
      }
      .${this._prefix}-modal__actions {
        flex: 0 0 66px;
        height: 66px;
        display: flex;
        justify-content: flex-end;
        padding: 15px;
      }
      .${this._prefix}-modal__action {
        padding: 0 35px;
        font-family: 'Montserrat', Arial, Helvetica, sans-serif;
        text-align: center;
        text-decoration: none;
        /*text-transform: capitalize;*/
        color: #fff;
        border-radius: 0;
        border: none;
        background: #e2525c; 
        font-weight: bold;
        font-size: 1.2em;
        height: 100%;
        line-height: 38px;
        cursor: pointer;
      }
      * + .${this._prefix}-modal__action {
        margin-left: 15px;
      }
    `;

  _toDestroy = [];
  // @todo: test WeekMap
  _openedModalRefs = new Map();

  public constructor(
    private $dom: DomService,
  ) {}

  public onInit(): void {
    this.insertGlobalStyles(this._globalStyles);
  }

  public onDestroy() {
    this._toDestroy.forEach(cb => cb.call(this));
  }

  public open({
     content,
     title = '',
     size = 'md',
     styles = '',
     actions = [
       { name: 'OK', cb: () => {} },
     ],
     onAfterInit = () => {},
     onBeforeDestroy = () => {},
  }: OpenParams): ModalRef {
    const actionsTpl = this._compileActionButtons(actions);

    const vars = {
      size,
      title,
      actions: actionsTpl,
    };

    // Creating DOM
    const modalHtml = this.interpolate(this._mainTpl, vars);
    let container$ = document.createElement('div');
    container$.innerHTML = modalHtml;
    const backdrop$ = container$.children[0];
    container$.removeChild(backdrop$);
    container$ = undefined; // removing link
    const modal$ = backdrop$.querySelector(`.${ this._prefix }-modal`);
    if (!modal$) {
      throw new Error('Can not get modal$ link');
    }

    /** Hash table. Button links by names */
    const buttons = actions
      .map(def => {
        const id = this._makeId(def.name);
        const element$ = modal$.querySelector(`#${ id }`);
        if (!element$) {
          throw new Error('Can not find action button #' + id);
        }

        return { element$, def };
      });

    const destroyCbs = [];
    const ref = { destroyCbs, modal$, backdrop$, buttons, isPending: false };

    // Binding action button callbacks
    const actionButtonCbs = buttons
      .map(({ element$, def }) => {
        const clickCb = event => def.cb({
          event,
          modal$,
          button$: element$,
          close: () => this.close(ref)
        });
        element$.addEventListener('click', clickCb);
        return () => element$.removeEventListener('click', clickCb);
      });
    destroyCbs.push(...actionButtonCbs);

    // Binding close button(times) handlers
    const closeCb = () => this.close(ref);
    const close$ = modal$.querySelector(`.${ this._prefix }-modal__close`);
    if (!close$) throw new Error('Can not find close button');
    close$.addEventListener('click', closeCb);
    destroyCbs.push(() => close$.removeEventListener('click', closeCb));

    // Binding Esc key to close
    const escCloseCb = e => e.code === 'Escape' && this.close(ref);
    document.addEventListener('keydown', escCloseCb);
    destroyCbs.push(() => document.removeEventListener('keydown', escCloseCb));

    // Inserting to the page
    onAfterInit(ref);
    // @todo: .append VS .appendChild
    document.body.appendChild(backdrop$);
    const removeLocalStylesCb = styles && this.insertGlobalStyles(styles);

    // Update modal links
    const destroyModalCb = () => {
      onBeforeDestroy(modal$);
      document.body.removeChild(backdrop$);
      removeLocalStylesCb && removeLocalStylesCb();
    };
    destroyCbs.push(destroyModalCb);

    this._toDestroy.push(...destroyCbs);
    this._openedModalRefs.set(modal$, ref);

    // Open the modal
    // @todo: test without timeout
    setTimeout(() => this._toggle(ref, true));

    return ref;
  } // end .open()

  /**
   * @params {object} modal$
   * @returns {void}
   */
  close(ref) {
    this._toggle(ref, false, () => {
      ref.destroyCbs.forEach(cb => {
        cb();
        this._toDestroy = this._toDestroy.filter(v => v !== cb);
      });

      this._openedModalRefs.delete(ref.modal$);
    });
  }

  /**
   * @param tpl
   * @param vars
   */
  interpolate(tpl, vars) {
    return Object
      .keys(vars)
      .reduce(
        (localTpl, varName) =>
          localTpl.replace(new RegExp(`{{\\s*${varName}\\s*}}`, 'g'), vars[varName]),
        tpl,
      );
  }

  /**
   * @params {string} styles
   * @returns {Function}
   */
  insertGlobalStyles(styles) {
    /** @type HTMLStyleElement */
    const style$ = document.createElement('style');
    /* Create style element */
    style$.setAttribute('type', 'text/css');

    style$.innerHTML = styles;
    document.head.appendChild(style$);

    const removeCb = () => document.head.removeChild(style$);
    this._toDestroy.push(removeCb);

    return () => {
      removeCb();
      this._toDestroy = this._toDestroy.filter(v => v !== removeCb);
    };
  }

  _toggle(ref, show, cb) {
    if (ref.isPending) return;

    ref.isPending = true;
    show
    ? ref.backdrop$.classList.add(this._backdropOpenedCssClass)
    : ref.backdrop$.classList.remove(this._backdropOpenedCssClass);

    if (this._openedModalRefs.size === 1) {
      show
      ? document.body.classList.add(this._bodyCssClass)
      : document.body.classList.remove(this._bodyCssClass);
    }

    setTimeout(() => {
      ref.isPending = false;
      cb && cb();
    }, this._transitionTimeMs);
  }

  /**
   * @param {object} actionCallbacks
   * @returns {string}
   */
  _compileActionButtons(actionCallbacks) {
    return actionCallbacks
      .map(btn => {
        const id = this._makeId(btn.name);
        const name = this._sanitizeHtml(btn.name);
        const tooltip = this._sanitizeAttr(btn.tooltip);

        return this.interpolate(this._actionButtonTpl, { id, name, tooltip });
      })
      .join('\n');
  }

  /**
   * @param {string} raw
   * @returns {string}
   */
  _sanitizeAttr(raw) {
    return String(raw).replace(/['" ]/g, '_');
  }

  /**
   * @param {string} raw
   * @returns {string}
   */
  _sanitizeHtml(raw) {
    return String(raw).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /**
   * @param {string} suffix
   * @returns {string}
   */
  _makeId(suffix) {
    return this._prefix + '-modal-action--' + this._sanitizeAttr(suffix);
  }
}
