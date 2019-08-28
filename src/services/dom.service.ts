import { CompiledTemplate, OnDestroy, Vars } from '../models';

export class DomService implements OnDestroy{

  private destroyCbs = new Set<() => void>();

  public onDestroy(): void {
    this.destroyCbs.forEach(cb => {
      cb();
      this.destroyCbs.delete(cb);
    });
  }

  public compile<T>(html: string): CompiledTemplate {
    const wrapper$ = document.createElement('div');
    wrapper$.innerHTML = html;
    const root$ = wrapper$.children[0] as HTMLElement | null;
    if (!root$) {
      throw new Error(`Can not compile HTML: ` + html.slice(100));
    }

    const links = (new Array(...wrapper$.querySelectorAll('[data-select]')) as HTMLElement[])
      .reduce(
        (all: CompiledTemplate['links'], element$: HTMLElement) => {
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
        (all: CompiledTemplate['linksAll'], element$: HTMLElement) => {
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
    };
  } // end compile()

  public remove<T extends Node>(node: T): T {
    const parent = node.parentElement;
    if (!parent) return node;

    return parent.removeChild(node);
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

  /**
   * Insert variables to the template
   */
  public v<T extends Vars>(tpl: string, vars: T): string {
    return this.vv(tpl)(vars);
  }

  public vv<T extends Vars>(tpl: string): (vars: T) => string {
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

}
