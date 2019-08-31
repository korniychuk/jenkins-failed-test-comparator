import { TemplateRef, OnDestroy, Vars, ComponentRef, ComponentDev } from '../models';

export class DomService implements OnDestroy {

  private destroyCbs = new Set<() => void>();

  public onDestroy(): void {
    this.destroyCbs.forEach(cb => {
      cb();
      this.destroyCbs.delete(cb);
    });
  }

  public compile<T extends TemplateRef>(html: string): T {
    const wrapper$ = document.createElement('div');
    wrapper$.innerHTML = html;
    const root$ = wrapper$.children[0] as HTMLElement | null;
    if (!root$) {
      throw new Error(`Can not compile HTML: ` + html.slice(100));
    }

    const links = (new Array(...wrapper$.querySelectorAll('[data-select]')) as HTMLElement[])
      .reduce(
        (all: TemplateRef['links'], element$: HTMLElement) => {
          Object.assign(all);
          const name: string | null = element$.getAttribute('data-select');
          if (!name) {
            console.warn(new Error('Empty data-select attribute'));
            return all;
          }
          if (all[name]) {
            console.warn(new Error('Multiple links with the same name: ' + name));
          }
          all[name] = element$;

          return all;
        },
        {},
      );

    const linksAll = (new Array(...wrapper$.querySelectorAll('[data-select-all]')) as HTMLElement[])
      .reduce(
        (all: TemplateRef['linksAll'], element$: HTMLElement) => {
          Object.assign(all);
          const name: string | null = element$.getAttribute('data-select-all');
          if (!name) {
            console.warn(new Error('Empty data-select-all attribute'));
            return all;
          }
          if (!all[name]) all[name] = [];

          all[name].push(element$);

          return all;
        },
        {},
      );

    // for collect link to wrapper$
    this.remove(root$);

    return {
      root$,
      links,
      linksAll,
    } as T;
  } // end compile()

  public async append<T extends Node | ComponentRef<ComponentDev, any, any> | TemplateRef<any, any>>(parent: Node | ComponentRef<ComponentDev, any, any> | TemplateRef<any, any>, newChild: T): Promise<T>;
  public async append<T extends Node | ComponentRef<ComponentDev, any, any> | TemplateRef<any, any>>(parent: Node | ComponentRef<ComponentDev, any, any> | TemplateRef<any, any>, newChild: T[]): Promise<T[]>;
  public async append<T extends Element | ComponentRef<ComponentDev, any, any> | TemplateRef<any, any>>(parent: Node | ComponentRef<ComponentDev, any, any> | TemplateRef<any, any>, newChild: T | T[]): Promise<T | T[]> {
    return newChild instanceof Array
           ? Promise.all(newChild.map(async (one) => await this.appendOne(parent, one)))
           : await this.appendOne(parent, newChild);
  }

  private async appendOne<T extends Node | ComponentRef<ComponentDev, any, any> | TemplateRef<any, any>>(
    parent: Node | ComponentRef<ComponentDev, any, any> | TemplateRef<any, any>,
    newChild: T,
  ): Promise<T> {
    const parent$: Node = this.isTemplateRef(parent) ? parent.root$ : parent as Node;
    const child$: Node = this.isTemplateRef(newChild) ? newChild.root$ : newChild as Node;
    const comp: ComponentDev | undefined = this.isComponentRef(newChild) ? newChild.componentInstance : undefined;

    comp && comp.onBeforeInsert && await comp.onBeforeInsert();
    parent$.appendChild(child$);
    comp && comp.onAfterInsert && await comp.onAfterInsert();

    return newChild;
  }

  public async remove<T extends Node | ComponentRef<ComponentDev, any, any> | TemplateRef<any, any>>(node: T): Promise<T>;
  public async remove<T extends Node | ComponentRef<ComponentDev, any, any> | TemplateRef<any, any>>(nodes: T[]): Promise<T[]>;
  public async remove<T extends Node | ComponentRef<ComponentDev, any, any> | TemplateRef<any, any>>(arg: T | T[]): Promise<T | T[]> {
    return arg instanceof Array
           ? Promise.all(arg.map(async (node) => await this.removeOne(node)))
           : await this.removeOne(arg);
  }

  private async removeOne<T extends Node | ComponentRef<ComponentDev, any, any> | TemplateRef<any, any>>(entity: T): Promise<T> {
    const node = this.isTemplateRef(entity) ? entity.root$ : entity as Node;
    const parent = node.parentElement || undefined;
    const comp: ComponentDev | undefined = this.isComponentRef(entity) ? entity.componentInstance : undefined;

    if (parent) {
      comp && comp.onBeforeRemove && await comp.onBeforeRemove();
      parent.removeChild(node);
      comp && comp.onAfterRemove && await comp.onAfterRemove();
    }

    return entity;
  }

  public insertGlobalStyles(styles: string): () => void {
    const style$: HTMLStyleElement = document.createElement('style');
    style$.setAttribute('type', 'text/css');

    style$.innerHTML = styles;
    document.head.appendChild(style$);

    const removeCb = () => this.remove(style$);
    this.destroyCbs.add(removeCb);

    return () => {
      removeCb();
      this.destroyCbs.delete(removeCb);
    };
  }

  public sanitizeAttrValue(raw: string | number): string {
    return String(raw).replace(/['" ]/g, '_');
  }

  public sanitizeHtml(raw: string): string {
    return String(raw).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }


  public addEventListener<K extends keyof DocumentEventMap>(element$: Document, type: K, listener: (this: Document, ev: DocumentEventMap[K]) => any, options?: boolean | AddEventListenerOptions): () => void;
  public addEventListener<K extends keyof ElementEventMap>(element$: Element, type: K, listener: (this: Element, ev: ElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions, ): () => void;
  public addEventListener<K extends keyof GlobalEventHandlersEventMap>(element$: HTMLElement, type: K, listener: ( this: GlobalEventHandlers, ev: GlobalEventHandlersEventMap[K], ) => any, options?: boolean | AddEventListenerOptions, ): () => void;
  public addEventListener(
    element$: Element | Document,
    type: string,
    listener: (...args: any[]) => any,
    options?: object,
  ): () => void {
    element$.addEventListener(type, listener, options);
    return () => element$.removeEventListener(type, listener);
  }

  /**
   * Insert variables to the template
   */
  public interpolate<T>(tpl: string, vars: T): string {
    return this.makeInterpolator(tpl)(vars);
  }

  public makeInterpolator<T>(tpl: string): (vars: T) => string {
    return (vars: T) => Object
      .keys(vars)
      .reduce(
        (localTpl, varName) =>
          localTpl.replace(
            new RegExp(`{{\\s*${ varName }\\s*}}`, 'g'),
            // @ts-ignore
            vars[varName] !== undefined ? String(vars[varName]) : '',
          ),
        tpl,
      );
  }

  public makeRenderer<
    V = {},
    T extends TemplateRef<any, any> = TemplateRef<{}, {}>
  >(tpl: string): (vars?: V) => T {
    const interpolator = this.makeInterpolator(tpl);
    return (vars: V = {} as V) => this.compile(interpolator(vars));
  }

  public isComponentRef(entity: ComponentRef | unknown): entity is ComponentRef {
    return !!((entity as ComponentRef).root$ && (entity as ComponentRef).componentInstance);
  }

  private isTemplateRef(entity: TemplateRef | unknown): entity is TemplateRef {
    return !!((entity as TemplateRef).root$ && (entity as TemplateRef).linksAll);
  }

}
