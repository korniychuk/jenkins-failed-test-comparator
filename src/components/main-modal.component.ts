import { TemplateRef, Component, Vars, ComponentRef } from '../models';
import { DomService } from '../services/dom.service';
import { ConfigService } from '../services/config.service';
import { later } from '../utils';
import { Hell } from '../hell';

export type ModalSizes = 'sm' | 'md' | 'lg';

interface ModalLinks {
  modal: HTMLDivElement;
  close: HTMLAnchorElement;
  content: HTMLDivElement;
  actions: HTMLDivElement;
}
interface ActionButtonLinksAll {
  action: HTMLButtonElement;
}
type ActionButtonTemplateRef = TemplateRef<{}, ActionButtonLinksAll>;
type ModalTemplateRef = TemplateRef<ModalLinks, {}>;
type MainModalComponentRef = ComponentRef<MainModalComponent, ModalLinks, ActionButtonLinksAll>;

interface ActionButtonVars extends Vars{
  internalId: number;
  name: string;
  tooltip: string;
}

interface MainModalVars extends Vars {
  title: string;
  size: string;
  actions: string;
}

export interface ActionButtonArgs {
  event: MouseEvent;
  component: MainModalComponent;
  button$: HTMLButtonElement;
  close: () => void;
}

export interface ModalActionButtonDef {
  cb: (ref: ActionButtonArgs) => void;
  name: string;
  tooltip?: string;
}

export interface MainModalParams {
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
  onAfterInsert?: (ref: MainModalComponentRef) => void;
  /**
   * After internal all listeners removed, before removed from the page
   */
  onBeforeRemove?: (ref: MainModalComponentRef) => void;
}

export class MainModalComponent implements Component {

  private static openedModalRefs = new Set<MainModalComponent>();

  private prefix = `${this.$config.prefix}-main-modal`;
  private transitionTimeMs = 200;
  private openedBodyCssClass     = `${ this.prefix }-opened`;
  private openedBackdropCssClass = `${ this.prefix }-backdrop--opened`;

  private params: Required<MainModalParams> = {
    content: [],
    title: '',
    size: 'md',
    styles: '',
    actions: [
      { name: 'OK', cb: () => {} },
    ],
    onAfterInsert: () => {},
    onBeforeRemove: () => {},
  };
  private paramKeys = Object.keys(this.params) as (keyof Required<MainModalParams>)[];

  private isShown = false;
  private isPending = false;
  private get isInserted(): boolean {
    return MainModalComponent.openedModalRefs.has(this);
  };
  private ref?: MainModalComponentRef;

  private lastDestroyCbs = new Hell();
  private destroyCbs = new Hell();
  private renderDestroyCbs = new Hell(this.destroyCbs);

  private styles = `
      body > * {
        transition: filter ${this.transitionTimeMs}ms ease-in-out;
      }
      body.${this.openedBodyCssClass} > * {
        filter: blur(4px);
      }

      body.${this.openedBodyCssClass} > .${this.prefix}-backdrop {
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
      .${this.openedBackdropCssClass} {
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
      .${this.openedBackdropCssClass} .${this.prefix} {
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

  private backdropRenderer = this.$dom.makeRenderer(`<div class="${ this.prefix }-backdrop"></div>`);
  private actionButtonRenderer = this.$dom.makeRenderer<ActionButtonVars, ActionButtonTemplateRef>(`
      <button class="${this.prefix}__action"
              title="{{ tooltip }}"
              data-select-all="action"
              data-internal-id="{{ internalId }}"
      >{{ name }}</button>
  `);
  private modalRenderer = this.$dom.makeRenderer<MainModalVars, ModalTemplateRef>(`
    <div class="${ this.prefix } ${ this.prefix }--{{ size }}" data-select="modal">
      <div class="${ this.prefix }__header">
        <a role="button" class="${ this.prefix }__close" data-select="close">&times;</a>
        <h3 class="${ this.prefix }__title">{{ title }}</h3>
      </div>
      <div class="${ this.prefix }__content" data-select="content"></div>
      <div class="${ this.prefix }__actions" data-select="actions">{{ actions }}</div>
    </div>
  `);

  public constructor(
    private readonly $dom: DomService,
    private readonly $config: ConfigService,
  ) {}

  public insertToBody(params: Partial<MainModalParams>): MainModalComponentRef {
    if (this.isInserted) {
      throw new Error(`An attempt to insert the same MainModalComponent instance twice`);
    }
    MainModalComponent.openedModalRefs.add(this);

    // Refreshing params & rerender
    this.refreshParams(params);
    const ref = this.render(true);

    // Inserting root element to the <body>
    document.body.appendChild(ref.root$);

    // Inserting styles
    if (MainModalComponent.openedModalRefs.size === 1) {
      this.lastDestroyCbs.add(this.$dom.insertGlobalStyles(this.styles));
      this.bindEscToClose();
    }
    if (this.params.styles) {
      this.destroyCbs.add(this.$dom.insertGlobalStyles(this.params.styles));
    }

    this.params.onAfterInsert(ref);
    this.toggle(true);

    return ref;
  }

  public async remove(): Promise<void> {
    if (!this.isInserted) {
      throw new Error(`An attempt to remove not inserted MainModalComponent`);
    }

    // @todo: check condition
    if (!await this.toggle(false)) return;

    this.params.onBeforeRemove(this.ref!);
    MainModalComponent.openedModalRefs.delete(this);

    // Removing global styles
    if (!MainModalComponent.openedModalRefs.size) {
      this.lastDestroyCbs.clear();
    }

    this.destroyCbs.clear();

    this.$dom.remove(this.ref!.root$);
    this.ref = undefined;
  }

  public refresh(params: Partial<MainModalParams>): void {
    this.refreshParams(params);

    if (this.isInserted) this.render();
  }

  /**
   * @returns false in case toggling is in pending. Otherwise true.
   */
  private async toggle(show: boolean): Promise<boolean> {
    if (this.isPending || !this.isInserted) return Promise.resolve(false);
    if (this.isShown === show) return Promise.resolve(true);
    this.isPending = true;
    this.isShown = show;

    const isOne = MainModalComponent.openedModalRefs.size === 1;

    if (isOne && show) {
      document.body.classList.add(this.openedBodyCssClass);
      await later(this.transitionTimeMs);
    }

    const backdrop$ = this.ref!.root$;
    show
      ? backdrop$.classList.add(this.openedBackdropCssClass)
      : backdrop$.classList.remove(this.openedBackdropCssClass);

    if (isOne && !show) {
      await later(this.transitionTimeMs);
      document.body.classList.remove(this.openedBodyCssClass);
    }

    await later(this.transitionTimeMs);

    this.isPending = false;
    return true;
  }

  private render(createRoot = false): MainModalComponentRef {
    this.renderDestroyCbs.clear();

    if (createRoot) {
      // @todo: wrong typings on the next lines
      const tplRef: TemplateRef<ModalLinks, ActionButtonLinksAll> = this.backdropRenderer({}) as any;
      this.ref = { ...tplRef, componentInstance: this };
    } else if (!this.ref) {
      throw new Error(`.render() No .ref`);
    } else {
      this.$dom.remove(this.ref.links.modal);
      this.ref.links = {} as any;
      this.ref.linksAll = {} as any;
    }

    const actionButtonsHtml = this.params.actions
      .map(({ name, tooltip }, i) => this.actionButtonRenderer({
        name,
        tooltip: tooltip !== undefined ? this.$dom.sanitizeAttrValue(tooltip) : '',
        internalId: i,
      }))
      .join('');

    const modalRef = this.modalRenderer({
      actions: actionButtonsHtml,
      size: this.params.size,
      title: this.params.title,
    });

    this.ref.root$.appendChild(modalRef.root$);
    this.ref.links = { ...this.ref.links, ...modalRef.links };
    this.ref.linksAll = { ...this.ref.linksAll, ...modalRef.linksAll };

    this.bindEvents(this.ref);

    const content$ = this.ref.links.content;
    this.params.content.forEach(el$ => content$.appendChild(el$));
    this.renderDestroyCbs.add(() => this.$dom.remove(Array.from(content$.children)));

    return this.ref;
  }

  private bindEvents(ref: MainModalComponentRef): void {
    const baseArgs = {
      component: this,
      close: () => this.remove(),
    };
    const actionButtons: HTMLButtonElement[] = ref.linksAll.action;

    actionButtons.forEach(button$ => {
      const idx = button$.getAttribute('data-internal-id');
      if (idx === null) {
        throw new Error(`Action doesn't have data-internal-id attribute`);
      }
      const def = this.params.actions[+idx];
      if (!def) {
        throw new Error(`Can not find button definition by index: ${idx}`);
      }

      const cb = (event: MouseEvent) => def.cb({ ...baseArgs, event, button$ });
      this.renderDestroyCbs.add(this.$dom.addEventListener(button$, 'click', cb));
    });

    this.renderDestroyCbs.add(
      this.$dom.addEventListener(
        ref.links.close,
        'click',
        () => this.remove(),
      ),
    );
  }

  private bindEscToClose(): void {
    const destroyCb = this.$dom.addEventListener(
      document,
      'keydown',
      (e: KeyboardEvent) => {
        if (e.code !== 'Escape') return;
        const last = this.getLastInsertedMainModal();
        if (!last) {
          throw new Error(`Don't have last inserted MainModalComponent, but Esc event not removed`);
        }
        last.remove();
      },
    );

    this.lastDestroyCbs.add(destroyCb);
  }

  private refreshParams(params: Partial<MainModalParams>): void {
    this.paramKeys
        .filter(key => this.params[key] !== undefined)
        // @ts-ignore
        .forEach(key => this.params[key] = params[key]);
  }

  private getLastInsertedMainModal(): MainModalComponent | undefined {
    let value: MainModalComponent | undefined;
    for (value of MainModalComponent.openedModalRefs);
    return value;
  }

}
