import { DomService } from '../services/dom.service';
import { ConfigService } from '../services/config.service';
import {
  Build,
  BuildInfo,
  Component,
  ComponentRef, OnAfterInsert, OnAfterRemove, OnBeforeInsert,
  OnBeforeRemove, TemplateRef,
} from '../models';
import { Hell } from '../hell';

export interface BuildsGridClickParams {
  build: Build;
  selected: boolean;
}

export interface BuildsGridParams {
  builds: Build[];
  selectedBuildIds: number[];
  onBuildClick: (params: BuildsGridClickParams) => void;
}

interface CellVars {
  content: string;
}

interface RowVars extends Omit<BuildInfo, 'dynamic'> {
  dynamic: string;
  rowCssClasses: string;
}

interface GridVars {
  dynamicHeadings: string;
  rows: string;
}

interface GridLinksAll {
  build: HTMLTableRowElement[];
}
type BuildsGridTemplateRef = TemplateRef<{}, GridLinksAll>;

type BuildsGridComponentRef = ComponentRef<Component, {}, GridLinksAll>;

export class BuildsGridComponent implements Component, OnBeforeInsert, OnAfterInsert, OnBeforeRemove, OnAfterRemove {

  private prefix = `${this.$config.prefix}-grid`;

  private styles = `
        .${ this.prefix } {
          width: 100%;
          height: 100%;
          overflow: auto;
        }
        .${ this.prefix } table {
          width: 100%;
          border-spacing: 0;
        }
        .${ this.prefix } td, .${ this.prefix } th {
          border-bottom: 1px solid #aaa;
          padding: 7px 5px;
          text-align: center;
        }
        .${ this.prefix } tbody tr {
          cursor: pointer;
          transition: background-color .25s ease-in-out;
        }
        .${ this.prefix } tbody tr:hover {
          background-color: #A1EEEA;
          transition: background-color .15s ease-in-out;
        }
        .${ this.prefix } tbody tr.selected {
          background-color: #ABFFAB;
        }
      `;

  private tdInterpolator = this.$dom.makeInterpolator<CellVars>(`<td>{{ content }}</td>`);
  private thInterpolator = this.$dom.makeInterpolator<CellVars>(`<td>{{ content }}</td>`);
  private rowInterpolator = this.$dom.makeInterpolator<RowVars>(`
    <tr class="{{ rowCssClasses }}" data-select-all="build">
      <td>{{ id }}</td>
      <td>{{ name }}</td>
      <td>{{ date }}</td>
      {{ dynamic }}
    </tr>
  `);
  private gridRenderer = this.$dom.makeRenderer<GridVars, BuildsGridTemplateRef>(`
    <div class="${this.prefix}">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Date</th>
            {{ dynamicHeadings }}
          </tr>
        </thead>
        <tbody>{{ rows }}</tbody>
      </table>
    </div>
  `);

  private ref?: BuildsGridComponentRef;

  private destroyCbs = new Hell();
  private renderDestroyCbs = new Hell(this.destroyCbs);

  private params: Required<BuildsGridParams> = {
    builds: [],
    selectedBuildIds: [],
    onBuildClick: () => {},
  };
  private paramKeys = Object.keys(this.params) as (keyof Required<BuildsGridParams>)[];

  public constructor(
    private readonly $dom: DomService,
    private readonly $config: ConfigService,
  ) {}

  public getRef(): BuildsGridComponentRef {
    return this.ref || this.render();
  }

  public refresh(params: Partial<BuildsGridParams>): void {
    this.refreshParams(params);

    if (params.selectedBuildIds || params.builds) {
      this.render();
    }
  }

  public onBeforeInsert(): void {
    this.destroyCbs.add(this.$dom.insertGlobalStyles(this.styles));
  }

  public onAfterInsert(): void {
    const cb = (e: MouseEvent): void => {
      const row$: HTMLTableRowElement | undefined = e.target
      && (e.target as HTMLElement).nodeName === 'TD'
      && (e.target as HTMLElement).parentElement!.getAttribute('data-select-all') === 'build'
      && (e.target as HTMLElement).parentElement as HTMLTableRowElement
      || undefined;

      if (!row$) return;

      const idx = Array.from(row$.parentElement!.children).indexOf(row$);
      if (idx < 0) throw new Error(`Can not find row index`);

      const build = this.params.builds[idx];
      if (!build) throw new Error(`Can not find build by the row index`);

      const selected = this.params.selectedBuildIds.indexOf(build.id) > -1;

      this.params.onBuildClick({ build, selected });
    };
    this.destroyCbs.add(this.$dom.addEventListener(this.ref!.root$, 'click', cb));
  }

  public onBeforeRemove(): void {
    this.destroyCbs.clear();
  }

  public onAfterRemove(): void {
    this.ref = undefined;
  }

  private render(): BuildsGridComponentRef {
    this.renderDestroyCbs.clear();

    if (!this.params.builds) {
      throw new Error(`No builds param`);
    }

    const dynamicKeys = this.params.builds[0] && Object.keys(this.params.builds[0].dynamic) || [];

    const rows = this.params.builds.map((r: Build) =>
      this.rowInterpolator({
        ...r,
        dynamic: dynamicKeys.map(k => this.tdInterpolator({ content: r.dynamic[k] })).join(''),
        rowCssClasses: this.params.selectedBuildIds.indexOf(r.id) > -1 ? 'selected' : '',
      }),
    ).join('\n');

    const dynamicHeadings = dynamicKeys.map(k => this.thInterpolator({ content: k })).join('\n');

    const tplRef = this.gridRenderer({
      rows,
      dynamicHeadings,
    });

    if (!this.ref) {
      this.ref = { ...tplRef, componentInstance: this, childComponentRefs: [] };
    } else {
      this.$dom.remove(Array.from(this.ref.root$.children));
      this.$dom.append(this.ref, Array.from(tplRef.root$.children));
      this.ref.links = tplRef.links;
      this.ref.linksAll = tplRef.linksAll;
    }

    return this.ref;
  }

  private refreshParams(params: Partial<BuildsGridParams>): void {
    this.paramKeys
        .filter(key => params[key] !== undefined)
        // @ts-ignore
        .forEach(key => this.params[key] = params[key]);
  }
}
