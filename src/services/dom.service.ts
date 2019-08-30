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

  // @todo: implement insert method

  public remove<T extends Element | ComponentRef>(node: T): T;
  public remove<T extends Element | ComponentRef>(nodes: T[]): T[];
  public remove<T extends Element | ComponentRef>(arg: T | T[]): T | T[] {
    return arg instanceof Array
           ? arg.map(node => this.removeOne(node))
           : this.removeOne(arg);
  }

  private removeOne<T extends Element | ComponentRef<ComponentDev>>(entity: T): T {
    const comp: ComponentDev | undefined = this.isComponent(entity) ? entity.componentInstance : undefined;
    const node = comp ? (entity as ComponentRef).root$ : entity as Element;
    const parent = node.parentElement || undefined;

    if (parent) {
      comp && comp.onBeforeRemove && comp.onBeforeRemove();
      parent.removeChild(node);
      comp && comp.onAfterRemove && comp.onAfterRemove();
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
  public interpolate<T extends Vars>(tpl: string, vars: T): string {
    return this.makeInterpolator(tpl)(vars);
  }

  public makeInterpolator<T extends Vars>(tpl: string): (vars: T) => string {
    return (vars: Vars) => Object
      .keys(vars)
      .reduce(
        (localTpl, varName) =>
          localTpl.replace(
            new RegExp(`{{\\s*${ varName }\\s*}}`, 'g'),
            vars[varName] !== undefined ? String(vars[varName]) : '',
          ),
        tpl,
      );
  }

  public makeRenderer<
    V extends Vars = {},
    T extends TemplateRef = TemplateRef<{}, {}>
  >(tpl: string): (vars: V) => T {
    const interpolator = this.makeInterpolator(tpl);
    return (vars: Vars) => this.compile(interpolator(vars));
  }

  private isComponent(entity: any): entity is ComponentRef {
    return !!((entity as ComponentRef).root$ && (entity as ComponentRef).componentInstance);
  }

}
