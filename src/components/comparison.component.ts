import { DomService } from '../services/dom.service';
import { ConfigService } from '../services/config.service';
import {
  ComparisonResult,
  Component,
  ComponentRef, FailedTest, OnAfterRemove, OnBeforeInsert,
  OnBeforeRemove, TemplateRef,
} from '../models';
import { Hell } from '../hell';
import { BuildsGridComponent } from './builds-grid.component';


export interface ComparisonParams {
  result?: ComparisonResult;
}

interface TestVars {
  link: string;
  id: string;
}

interface ComparisonVars {
  firstId: number;
  secondId: number;

  /** HTML contains <a> elements */
  firstFailed: string;
  /** HTML contains <a> elements */
  secondFailed: string;

  /** HTML contains <a> elements */
  onlyFirstFailed: string;
  /** HTML contains <a> elements */
  onlySecondFailed: string;

  /** HTML contains <a> elements */
  bothFailed: string;
}

interface ComparisonLinks {
  grid: HTMLDivElement;
}

type ComparisonTemplateRef = TemplateRef<ComparisonLinks, {}>;

type ComparisonComponentRef = ComponentRef<Component, ComparisonLinks, {}>;

export class ComparisonComponent implements Component, OnBeforeInsert, OnBeforeRemove, OnAfterRemove {

  private prefix = `${this.$config.prefix}-comparison`;

  private styles = `
        .${ this.prefix } {
          width: 100%;
          height: 100%;
          overflow: auto;
        }
        .${this.prefix}-failed-list a {
          color: #666;
          text-decoration: none;
        }
        .${this.prefix}-failed-list a:hover {
          color: #000;
          text-decoration: underline;
        }
      `;

  private testInterpolator = this.$dom.makeInterpolator<TestVars>(`<a href="{{ link }}" target="_blank">{{ id }}</a>`);
  private mainRenderer = this.$dom.makeRenderer<ComparisonVars, ComparisonTemplateRef>(`
    <div class="${this.prefix}">
      <div class="${this.prefix}-grid" data-select="grid"></div>

      <h3 class="${this.prefix}-heading">All Failed Tests in {{ firstId }}:</h3>
      <div class="${this.prefix}-failed-list">{{ firstFailed }}</div>

      <h3 class="${this.prefix}-heading">All Failed Tests in {{ secondId }}:</h3>
      <div class="${this.prefix}-failed-list">{{ secondFailed }}</div>

      <h3 class="${this.prefix}-heading">Tests Failed in {{ firstId }}, but passed in {{ secondId }}:</h3>
      <div class="${this.prefix}-failed-list">{{ onlyFirstFailed }}</div>

      <h3 class="${this.prefix}-heading">Tests Failed in {{ secondId }}, but passed in {{ firstId }}:</h3>
      <div class="${this.prefix}-failed-list">{{ onlySecondFailed }}</div>

      <h3 class="${this.prefix}-heading">Tests Failed in both builds:</h3>
      <div class="${this.prefix}-failed-list">{{ bothFailed }}</div>
    </div>
  `);

  private ref?: ComparisonComponentRef;

  private destroyCbs = new Hell();
  private renderDestroyCbs = new Hell(this.destroyCbs);

  private params: ComparisonParams = {
    result: undefined,
  };
  private paramKeys = Object.keys(this.params) as (keyof Required<ComparisonParams>)[];

  public constructor(
    private readonly $dom: DomService,
    private readonly $config: ConfigService,
  ) {}

  public getRef(): ComparisonComponentRef {
    return this.ref || this.render();
  }

  public refresh(params: Partial<ComparisonParams>): void {
    this.refreshParams(params);

    if (params.result) {
      this.render();
    }
  }

  public onBeforeInsert(): void {
    this.destroyCbs.add(this.$dom.insertGlobalStyles(this.styles));
  }

  public onBeforeRemove(): void {
    this.destroyCbs.clear();
  }

  public onAfterRemove(): void {
    this.ref = undefined;
  }

  private render(): ComparisonComponentRef {
    this.renderDestroyCbs.clear();

    if (!this.params.result) {
      throw new Error(`No .result param`);
    }
    const res = this.params.result;

    const firstFailed      = this.makeFailedTestsListHtml(res.first.failedTests);
    const secondFailed     = this.makeFailedTestsListHtml(res.second.failedTests);
    const onlyFirstFailed  = this.makeFailedTestsListHtml(res.onlyFirst);
    const onlySecondFailed = this.makeFailedTestsListHtml(res.onlySecond);
    const bothFailed       = this.makeFailedTestsListHtml(res.both);

    const tplRef = this.mainRenderer({
      firstId: res.first.id,
      secondId: res.second.id,
      firstFailed,
      secondFailed,
      onlyFirstFailed,
      onlySecondFailed,
      bothFailed,
    });

    const gridComp = new BuildsGridComponent(this.$dom, this.$config);
    gridComp.refresh({ builds: [res.first, res.second] });
    const gridRef = gridComp.getRef();

    this.$dom.append(tplRef.links.grid, gridRef);
    this.renderDestroyCbs.add(() => this.$dom.remove(gridRef));

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

  private refreshParams(params: Partial<ComparisonParams>): void {
    this.paramKeys
        .filter(key => params[key] !== undefined)
        // @ts-ignore
        .forEach(key => this.params[key] = params[key]);
  }

  private makeFailedTestsListHtml(tests: FailedTest[]): string {
    return tests.map(test => this.makeAnchorHtml(test)).join(' ');
  }

  private makeAnchorHtml(test: FailedTest): string {
    return this.testInterpolator({
      id: test.id,
      link: this.makeJiraLink(test.id),
    });
  }

  private makeJiraLink(testId: string): string {
    const normalizedId = testId.replace('_', '-');
    return this.$config.jiraUrl ? `${this.$config.jiraUrl}/browse/${normalizedId}` : '';
  }

}
