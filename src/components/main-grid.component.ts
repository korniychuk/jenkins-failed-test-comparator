import { DomService } from '../services/dom.service';
import { ConfigService } from '../services/config.service';
import { TemplateRef } from '../models';
import { Hell } from '../hell';

type MainGridTemplateRef = TemplateRef<any, any>;

export class MainGridComponent {

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

  private rowTpl = `<tr>
                      <td>{{ num }}</td>
                      <td>{{ name }}</td>
                      <td>{{ date }}</td>
                      {{ dynamic }}
                    </tr>`;
  private gridTpl = `<table>
                       <thead>
                         <tr>
                           <th>#</th>
                           <th>Name</th>
                           <th>Date</th>
                           {{ dynamicHeadings }}
                         </tr>
                       </thead>
                       <tbody>{{ rows }}</tbody>
                     </table>`;

  private tdRenderer = this.$dom.vv(`<td>{{ content }}</td>`);
  private thRenderer = this.$dom.vv(`<td>{{ content }}</td>`);
  private rowRenderer = this.$dom.vv(this.rowTpl);

  private ref?: MainGridTemplateRef;

  private lastDestroyCbs = new Hell();
  private destroyCbs = new Hell();
  private renderDestroyCbs = new Hell(this.destroyCbs);

  public constructor(
    private readonly $dom: DomService,
    private readonly $config: ConfigService,
  ) {}


  render(createRoot = false): MainGridTemplateRef {
    this.renderDestroyCbs.clear();

    if (createRoot) {
      const gridHtml = this.({});
      this.ref = this.$dom.compile(gridHtml);
    } else if (!this.ref) {
      throw new Error(`.render() No .ref`);
    } else {
      this.$dom.remove(this.ref.links.modal);
      this.ref.links = {} as any;
      this.ref.linksAll = {} as any;
    }

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
    return this.ref;
  }
}
