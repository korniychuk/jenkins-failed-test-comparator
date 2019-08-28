import { CompiledTemplate, Component, OnDestroy, OnInit, Vars } from '../models';
import { prefix } from '../config';
import { DomService } from '../services/dom.service';

export type ModalSizes = 'sm' | 'md' | 'lg';

type LinkKeys =
  | 'backdrop'
  | 'modal'
  | 'close'
  | 'content'
  | 'actions'
  ;
type LinkAllKeys = 'action';

export interface ModalRef {

}

interface ActionButtonArgs {
  event: MouseEvent;
  component: MainModalComponent;
  button$: HTMLButtonElement;
  close: () => void;
}

interface ActionButtonVars {
  internalId: number;
  name: string;
  tooltip: string;
}

interface MainModalVars {
  title: string;
  size: string;
  actions: string;
}

interface ModalActionButtonDef {
  cb: (ref: ActionButtonArgs) => void;
  name: string;
  tooltip?: string;
}

interface MainModalParams {
  content: HTMLElement[];
  title?: string;
  size?: ModalSizes;

  /**
   * Styles that will be inserted as a separate <style> tag to the page at the moment modal creation
   * and remove after the modal closed
   */
  styles?: string;
  actions?: ModalActionButtonDef[];
  /**
   * When modal DOM created, but before inserted to the page
   */
  onAfterInit?: (ref: ModalRef) => void;
  /**
   * After internal all listeners removed, before removed from the page
   */
  onBeforeDestroy?: (ref: ModalRef) => void;
}

export class MainModalComponent implements Component, OnInit, OnDestroy {

  private prefix = `${prefix}-main-modal`;
  private transitionTimeMs = 250;
  private bodyCssClass = `${ this.prefix }-opened`;
  private backdropOpenedCssClass = `${this.prefix}-backdrop--opened`;

  private params: Required<MainModalParams> = {
    content: [],
    title: '',
    size: 'md',
    styles: '',
    actions: [
      { name: 'OK', cb: () => {} },
    ],
    onAfterInit: () => {},
    onBeforeDestroy: () => {},
  };
  private paramKeys = Object.keys(this.params) as (keyof Required<MainModalParams>)[];

  private isInserted = false;
  private compiled?: CompiledTemplate<LinkKeys, LinkAllKeys>;

  private template = `
      <div class="${ this.prefix }-backdrop" data-select="backdrop">
        <div class="${ this.prefix } ${ this.prefix }--{{ size }}" data-select="modal">
          <div class="${ this.prefix }__header">
            <a role="button" class="${ this.prefix }__close" data-select="close">&times;</a>
            <h3 class="${ this.prefix }__title">{{ title }}</h3>
          </div>
          <div class="${ this.prefix }__content" data-select="content"></div>
          <div class="${ this.prefix }__actions" data-select="actions">{{ actions }}</div>
        </div>
      </div>
    `;

  private actionButtonTpl = `
      <button class="${this.prefix}__action"
              title="{{ tooltip }}"
              data-select-all="action"
              data-internal-id="{{ internalId }}"
      >{{ name }}</button>
  `;

  private styles = `
      body > * {
        transition: filter ${this.transitionTimeMs}ms ease-in-out;
      }
      body.${this.bodyCssClass} > * {
        filter: blur(4px);
      }

      body.${this.bodyCssClass} > .${this.prefix}-backdrop {
        filter: none;
      }

      .${this.prefix}-backdrop {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000000;
        
        transition: background-color ${this.transitionTimeMs}ms ease-in-out;
        background-color: transparent;
      }
      .${this.backdropOpenedCssClass} {
        filter: none;
        background-color: rgba(0, 0, 0, 0.1);
      }
      .${this.prefix} {
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 40px 0 rgba(0,0,0,0.5);
        background: #fff;
        margin-top: 100%;
        opacity: 0;
        transition: all ${this.transitionTimeMs}ms ease-in-out;
      }
      .${this.backdropOpenedCssClass} .${this.prefix} {
        margin-top: 0;
        opacity: 1;
      }
      .${this.prefix}--sm {
        width: 400px;
        height: 300px;
      }
      .${this.prefix}--md {
        width: 600px;
        height: 400px;
      }
      .${this.prefix}--lg {
        width: 900px;
        height: 550px;
      }
      .${this.prefix}__header {
        /*width: 90%;*/
        height: 44px;
        flex: 0 0 44px;
        padding: 12px 30px;
        overflow: hidden;
        background: #e2525c; 
      }
      .${this.prefix}__title {
        margin: 1px 0;
        color: #fff;
      }
      .${this.prefix}__close {
        font-size: 28px;
        display: block;
        float: right;
        color: #fff;
        font-weight: bold;
        line-height: 15px;
        cursor: pointer;
      }
      .${this.prefix}__content {
        padding: 12px 30px;
        flex: 1 0 auto;
        height: 100px;
      }
      .${this.prefix}__actions {
        flex: 0 0 66px;
        height: 66px;
        display: flex;
        justify-content: flex-end;
        padding: 15px;
      }
      .${this.prefix}__action {
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
      * + .${this.prefix}__action {
        margin-left: 15px;
      }
    `;

  private mainRenderer = this.$dom.vv<MainModalVars>(this.template);
  private actionButtonRenderer = this.$dom.vv<ActionButtonVars>(this.actionButtonTpl);

  public constructor(
    private readonly $dom: DomService,
  ) {}

  public onInit(): void {

  }

  public insertTo(target$: HTMLElement): void {
    if (this.isInserted) {
      throw new Error(`An attempt to insert the same component instance twice`);
    }
  }

  public remove(): void {
    if (!this.isInserted) {
      throw new Error(`An attempt to remove not inserted component`);
    }
  }

  public refresh(params: Partial<MainModalParams>): void {
    this.paramKeys
        .filter(key => this.params[key] !== undefined)
        // @ts-ignore
        .forEach(key => this.params[key] = params[key]);

    this.render();
  }

  private render(): void {
    const actionButtonsHtml = this.params.actions
      .map(({ name, tooltip }, i) => this.actionButtonRenderer({
        name,
        tooltip: tooltip !== undefined ? tooltip : '',
        internalId: i,
      }))
      .join('');

    const html = this.mainRenderer({
      actions: actionButtonsHtml,
      size: this.params.size,
      title: this.params.title,
    });

    this.compiled = this.$dom.compile(html);
    this.bindActionsCallbacks();

  }

  private bindActionsCallbacks(): void {
    const baseArgs = {
      component: this,
      close: () => this.close(),
    };
    const actions = this.compiled!.linksAll.action as HTMLButtonElement[];

    // @todo: assign to somewhere
    const destroyCbs = actions.map(button$ => {
      const idx = button$.getAttribute('data-internal-id');
      if (idx === null) {
        throw new Error(`Action doesn't have data-internal-id attribute`);
      }
      const def = this.params.actions[+idx];
      if (!def) {
        throw new Error(`Can not find button definition by index: ${idx}`);
      }

      const cb = (event: MouseEvent) => def.cb({ ...baseArgs, event, button$ });
      button$.addEventListener('click', cb);
      return () => button$.removeEventListener('click', cb);
    });
  }

  private close(): void {
      /*
       * @todo: Закончил на том, что нужно:
       * 1. Придумать как передавать интерфейсы в .vv
       * 2. Придумать лучшие имена для Link...
       * 3. Рализовать close
       * 4. Реализовать вставку стилей
       * 5. insertTo возможно убрать и вместо него сделать вставку в body. Хотя лучше какой-то ComponentFactory сделать.
       */

  }

}
