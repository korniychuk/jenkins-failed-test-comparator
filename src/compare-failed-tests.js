(() => {

  class FailedTestsGridComponent {
    _prefix = 'ftc-grid';

    styles = `
        .${ gridCssClass } {
          width: 100%;
          height: 100%;
          overflow: auto;
        }
        .${ gridCssClass } table {
          width: 100%;
          height: 100%;
          border-spacing: 0;
        }
        .${ gridCssClass } td, .${ gridCssClass } th {
          border-bottom: 1px solid #aaa;
          padding: 7px 5px;
          text-align: center; 
        }
        .${ gridCssClass } tbody tr {
          cursor: pointer;
        }
        .${ gridCssClass } tbody tr:hover {
          background: #f99;
        }
        .${ gridCssClass } tr.selected {
          background: #e2525c; 
        }
      `;

    constructor(modal) {
      this._modal = modal;
    }

    render(data) {
      const builds = data.builds;
      if (!builds) {
        throw new Error(`No builds param`);
      }

      const dynamicKeys = builds[0] && Object.keys(builds[0].dynamic) || [];

      const row = `<tr>
                     <td>{{ num }}</td>
                     <td>{{ name }}</td>
                     <td>{{ date }}</td>
                     {{ dynamic }}
                   </tr>`;

      const rows = builds.map(r =>
        this._modal.interpolate(row, {
          ...r,
          dynamic: dynamicKeys.map(k => `<td>${ r.dynamic[k] }</td>`).join('\n'),
        }),
      ).join('\n');

      const dynamicHeads = dynamicKeys.map(k => `<th>${ k }</th>`).join('\n');
      const gridHtml = `<table>
                         <thead>
                           <tr>
                             <th>#</th>
                             <th>Name</th>
                             <th>Date</th>
                             ${dynamicHeads}
                           </tr>
                         </thead>
                         <tbody>${rows}</tbody>
                       </table>
                      `;

      this._mainModalGrid$.innerHTML = gridHtml;
    }
  }

  class FailedTestsComparator {

    _prefix = 'ftc-main';
    _mainModalRef = undefined;
    _mainModalGrid$ = undefined;

    /**
     * @param {DB} db
     * @param {Modal} modal
     */
    constructor(db, modal) {
      this.db = db;
      this.modal = modal;
    }

    /**
     * @returns {void}
     */
    init() {
      document.addEventListener('keypress', v =>
           v.code === 'KeyZ'
        && v.altKey
        && v.ctrlKey
        && v.shiftKey
        && !this._isMainModalOpen
        && this._openMainModal()
      );
    }

    get _isMainModalOpen() {
      return !!this._mainModalRef;
    }

    _openMainModal() {
      const gridCssClass = `${this._prefix}-grid`;
      const content = `<div class="${gridCssClass}"></div>`;

      const actions = [
        {
          name: 'Retrieve',
          tooltip: 'Retrieve build info from the current page and save to compare in the future',
          cb: () => {
            const build = this._retrieveBuildInfo();
            this.db.addBuild(build);
            this._refreshGrid();
          },
        },
        {
          name: 'Cancel',
          tooltip: 'Just closes the modal',
          cb: ({ close }) => {
            close();
          },
        },
      ];


      const ref = this.modal.open({
        content,
        actions,
        styles,
        size: 'lg',
        title: 'Failed Tests Comparator',
        onAfterInit: (ref) => {
          this._mainModalRef = ref;
        },
        onBeforeDestroy: () => this._mainModalRef = undefined,
      });

      this._mainModalGrid$ = ref.modal$.querySelector(`.${gridCssClass}`);
      if (!this._mainModalGrid$) throw new Error(`Can not find grid container .${gridCssClass}`);
      this._refreshGrid();
    }

    /**
     * @returns {void}
     */
    _refreshGrid() {
      if (!this._mainModalGrid$) {
        throw new Error(`Can not refresh grid because of container not found`);
      }

      const builds = this.db.getAllBuilds();
      console.log('builds', builds);
      const dynamicKeys = builds[0] && Object.keys(builds[0].dynamic) || [];

      const row = `<tr>
                     <td>{{ num }}</td>
                     <td>{{ name }}</td>
                     <td>{{ date }}</td>
                     {{ dynamic }}
                   </tr>`;

      const rows = builds.map(r =>
        this.modal.interpolate(row, {
          ...r,
          dynamic: dynamicKeys.map(k => `<td>${ r.dynamic[k] }</td>`).join('\n'),
        }),
      ).join('\n');

      const dynamicHeads = dynamicKeys.map(k => `<th>${ k }</th>`).join('\n');
      const gridHtml = `<table>
                         <thead>
                           <tr>
                             <th>#</th>
                             <th>Name</th>
                             <th>Date</th>
                             ${dynamicHeads}
                           </tr>
                         </thead>
                         <tbody>${rows}</tbody>
                       </table>
                      `;

      this._mainModalGrid$.innerHTML = gridHtml;
    }

    _retrieveBuildInfo() {
      const { num, name, date } = document
        .querySelector('h1')
        .textContent
        .match(/Build (?<num>\d+):\s+(?<name>\w+)\s*\((?<date>[^()]+)\)/)
        .groups;

      const dynamic = document
        .querySelector('#description')
        .innerText
        .split('\n')
        .map(v => v.split(/\s*:\s*/))
        .reduce((res, [key, value]) => ({...res, [key]: value}), {});

      return { num, name, date, dynamic };
    }

    /**
     * @returns {string[]}
     */
    _retrieveFailedTests() {
      return new Array(...document
        .querySelectorAll('a[href="testReport/"] + ul a[href^="testReport/junit/"]')
      ).map(v => v
        .textContent
        .replace(/^.+?([A-Z]{2,10}_\d+).+?$/, '$1')
      );
    }

    /**
     * @param {string[]} a
     * @param {string[]} b
     * @returns {string[]}
     */
    _diff(a, b) {
      return a.filter(v => b.indexOf(v) < 0);
    }

    /**
     * @param {string[]} a
     * @param {string[]} b
     * @returns {string[]}
     */
    _intersection(a, b) {
      return a.filter(v => b.indexOf(v) >= 0);
    }
  }

  class DB {

    /**
     * @param {string} name
     */
    constructor(name) {
      this.name = name;
    }

    /**
     * @returns {void}
     */
    init() {
      this._load()
    }

    getAllBuilds() {
      return this._data.builds;
    }

    addBuild(build) {
      this._data.builds.push(build);
      this._save();
    }

    /**
     * @returns {void}
     */
    _save() {
      // Prototype.js breaks JSON.stringify. We should use Prototype.js if it loaded.
      const dataAsStr = typeof Object.toJSON === 'function'
                        ? Object.toJSON(this._data)
                        : JSON.stringify(this._data);

      localStorage.setItem(this.name, dataAsStr);
    }

    /**
     * @returns {void}
     */
    _load() {
      const dataAsStr = localStorage.getItem(this.name);
      this._data = dataAsStr ? JSON.parse(dataAsStr) : this._makeInitialDb();
    }

    /**
     * @returns {object}
     */
    _makeInitialDb() {
      return {
        builds: [],
      };
    }
  }

  class Modal {
    _prefix = 'ftc';
    _transitionTimeMs = 250;
    _bodyCssClass           = `${this._prefix}-modal-opened`;
    _backdropOpenedCssClass = `${this._prefix}-backdrop--opened`;

    _mainTpl = `
      <div class="${this._prefix}-backdrop">
        <div class="${this._prefix}-modal ${this._prefix}-modal--{{ size }}">
          <div class="${this._prefix}-modal__header">
            <a role="button" class="${this._prefix}-modal__close">&times;</a>
            <h3 class="${this._prefix}-modal__title">{{ title }}</h3>
          </div>
          <div class="${this._prefix}-modal__content">{{ content }}</div>
          <div class="${this._prefix}-modal__actions">{{ actions }}</div>
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

    constructor() {
    }

    /**
     * @returns {void}
     */
    init() {
      this.insertGlobalStyles(this._globalStyles);
    }

    /**
     * @returns {void}
     */
    destroy() {
      this._toDestroy.forEach(cb => cb.call(this));
    }


    /**
     * Create and open modal
     *
     * @param {string}   content          Modal body HTML template
     * @param {string}   string           Modal title
     * @param {string}   size             Available sizes sm/md/lg
     * @param {string}   styles           Styles that will be inserted as a separate <style> tag to
     *                                    the page at the moment modal creation and remove after
     *                                    the modal closed
     * @param {object}   actions          Action button names with templates
     * @param {Function} onAfterInit      When modal DOM created, but before inserted to the page
     * @param {Function} onBeforeDestroy  After internal all listeners removed, before removed from
     *                                    the page
     *
     * @returns {object}
     */
    open({
           content,
           title,
           size = 'md',
           styles = '',
           actions = [
             {
               name: 'OK',
               cb: ({ event, modal$, button$, close }) => {},
             }
           ],
           onAfterInit = (ref) => {},
           onBeforeDestroy = (modal$) => {},
    }) {
      const actionsTpl = this._compileActionButtons(actions);

      const vars = {
        size,
        title,
        content: content,
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

  const db = new DB('failed-tests-comparator');
  const modal = new Modal();
  const comparator = new FailedTestsComparator(db, modal);

  db.init();
  modal.init();
  comparator.init();
})();

/*
((a, b) => {
  if (!a || typeof a !== 'string') throw new Error('Wrong a');
  if (!b || typeof b !== 'string') throw new Error('Wrong b');

  a = a.split(',');
  b = b.split(',');

  const aWithoutB = a.filter(s => !b.some(e => e === s)).join('\n');
  const bWithoutA = b.filter(s => !a.some(e => e === s)).join('\n');

  console.log('A^B: %s\n', aWithoutB);
  console.log('B^A: %s\n', bWithoutA);
})(a, b);
*/

/*
A^B:
XDM_18920
XDM_18895
POS_1268
XDM_14943
XDM_14865
XDM_13890
XDM_16910
XDM_13816
XDM_14972
XDM_15832
XDM_14676
XDM_19944
XDM_18761
XNU_10441
XDM_18879
XDM_18876

B^A:
XDM_18905
POS_1298
XDM_13366
XDM_17473
XDM_12343
XDM_14812
XDM_14902
XDM_12887
XDM_18748
XDM_15625
XDM_12648
XDM_19938


XDM_18895 POS_1268 XDM_14943 XDM_14865 XDM_13890 XDM_16910 XDM_13816 XDM_14972 XDM_15832 XDM_14676 XDM_19944 XDM_18761 XNU_10441 XDM_18879 XDM_18876 POS_1298 XDM_13366 XDM_17473 XDM_12343 XDM_14812 XDM_14902 XDM_12887 XDM_18748 XDM_15625 XDM_12648 XDM_19938
*/
