import { DomService } from '../services/dom.service';
import { ConfigService } from '../services/config.service';
import {
  Build,
  BuildInfo,
  Component,
  ComponentRef, OnBeforeInsert,
  OnBeforeRemove,
  TemplateRef,
  Vars,
} from '../models';
import { Hell } from '../hell';

type MainGridComponentRef = ComponentRef;

interface MainGridParams {
  builds: Build[];
}

interface CellVars {
  content: string;
}

interface RowVars extends Omit<BuildInfo, 'dynamic'> {
  dynamic: string;
}

interface GridVars {
  dynamicHeadings: string;
  rows: string;
}

export class MainGridComponent implements Component, OnBeforeInsert, OnBeforeRemove {

  private prefix = `${this.$config.prefix}-grid`;

  private styles = `
        .${ this.prefix } {
          width: 100%;
          height: 100%;
          overflow: auto;
        }
        .${ this.prefix } table {
          width: 100%;
          height: 100%;
          border-spacing: 0;
        }
        .${ this.prefix } td, .${ this.prefix } th {
          border-bottom: 1px solid #aaa;
          padding: 7px 5px;
          text-align: center;
        }
        .${ this.prefix } tbody tr {
          cursor: pointer;
        }
        .${ this.prefix } tbody tr:hover {
          background: #f99;
        }
        .${ this.prefix } tr.selected {
          background: #e2525c;
        }
      `;

  private tdInterpolator = this.$dom.makeInterpolator<CellVars>(`<td>{{ content }}</td>`);
  private thInterpolator = this.$dom.makeInterpolator<CellVars>(`<td>{{ content }}</td>`);
  private rowInterpolator = this.$dom.makeInterpolator<RowVars>(`
    <tr>
      <td>{{ num }}</td>
      <td>{{ name }}</td>
      <td>{{ date }}</td>
      {{ dynamic }}
    </tr>
  `);
  private gridRenderer = this.$dom.makeRenderer<GridVars>(`
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

  private ref?: MainGridComponentRef;

  private destroyCbs = new Hell();
  private renderDestroyCbs = new Hell(this.destroyCbs);

  private params: Required<MainGridParams> = {
    builds: [],
  };
  private paramKeys = Object.keys(this.params) as (keyof Required<MainGridParams>)[];

  public constructor(
    private readonly $dom: DomService,
    private readonly $config: ConfigService,
  ) {}

  public makeRef(): MainGridComponentRef {
    return this.render();
  }

  public refresh(params: Partial<MainGridParams>): void {
    this.refreshParams(params);
  }

  public onBeforeInsert(): void {
    this.destroyCbs.add(this.$dom.insertGlobalStyles(this.styles));
  }

  public onBeforeRemove(): void {
    this.destroyCbs.clear();
  }

  private render(): MainGridComponentRef {
    this.renderDestroyCbs.clear();

    if (!this.params.builds) {
      throw new Error(`No builds param`);
    }

    const dynamicKeys = this.params.builds[0] && Object.keys(this.params.builds[0].dynamic) || [];


    const rows = this.params.builds.map((r: Build) =>
      this.rowInterpolator({
        ...r,
        dynamic: dynamicKeys.map(k => this.tdInterpolator({ content: r.dynamic[k] })).join(''),
      }),
    ).join('\n');

    const dynamicHeadings = dynamicKeys.map(k => this.thInterpolator({ content: k })).join('\n');

    const tplRef = this.gridRenderer({
      rows,
      dynamicHeadings,
    });
    this.ref = { ...tplRef, componentInstance: this, childComponentRefs: [] };

    return this.ref;
  }

  private refreshParams(params: Partial<MainGridParams>): void {
    this.paramKeys
        .filter(key => this.params[key] !== undefined)
        // @ts-ignore
        .forEach(key => this.params[key] = params[key]);
  }
}
