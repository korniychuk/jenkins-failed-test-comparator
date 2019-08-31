import { Build, ComparisonResult, OnInit } from '../models';
import { ConfigService } from './config.service';

interface DbBuildJobData {
  builds: { [id: number]: Build };
  buildsOrder: number[];
  selectedBuildIds: { [buildId: number]: true };
}

interface DbData {
  version: number;
  byBuildJob: { [buildJobName: string]: DbBuildJobData };
}

export class DbService implements OnInit {

  private data: DbData = this.makeInitialDb();

  private currentBuildJobName?: string;


  public get hasSelectedBuildJob(): boolean {
    return !!this.currentBuildJobName;
  }

  public getCurrentBuildJob(): DbBuildJobData {
    if (!this.currentBuildJobName) {
      throw new Error(`An attempt to access current build job until the job selected`);
    }

    return this.data.byBuildJob[this.currentBuildJobName];
  }

  public constructor(
    private readonly $config: ConfigService,
  ) {}

  public onInit(): void {
    this.load()
  }

  public getBuildById(id: number): Build | undefined {
    return this.getCurrentBuildJob().builds[id];
  }

  public getAllBuilds(): Build[] {
    const bj = this.getCurrentBuildJob();
    return bj.buildsOrder.map(id => bj.builds[id]);
  }

  public saveBuild(build: Build): void {
    const bj = this.getCurrentBuildJob();
    const was = !!bj.builds[build.id];
    bj.builds[build.id] = build;
    if (!was) {
      bj.buildsOrder.push(build.id);
      bj.buildsOrder.sort((a, b) => b - a);
    }

    this.save();
  }

  public getSelectedBuildIds(): number[] {
    const bj = this.getCurrentBuildJob();
    return Object.keys(bj.selectedBuildIds).map(v => +v);
  }

  public toggleBuildSelection(buildId: number, select: boolean): void {
    const bj = this.getCurrentBuildJob();
    const prevLen = Object.keys(bj.selectedBuildIds).length;

    if (select) {
      bj.selectedBuildIds[buildId] = true;
    } else {
      const { [buildId]: deleted, ...other } = bj.selectedBuildIds;
      bj.selectedBuildIds = other;
    }

    if (Object.keys(bj.selectedBuildIds).length !== prevLen) {
      this.save();
    }
  }

  public selectBuildJob(buildJobName: string): void {
    this.currentBuildJobName = buildJobName;

    if (!this.data.byBuildJob[this.currentBuildJobName]) {
      this.data.byBuildJob[this.currentBuildJobName] = this.makeEmptyBuildJob();
      this.save();
    }
  }

  public compareTwoSelectedBuild(): ComparisonResult {
    const ids = this.getSelectedBuildIds();
    if (ids.length !== 2) {
      throw new Error(`Comparison requires 2 build selected. Now ${ids.length} build selected`);
    }
    const [first, second] = ids.map(id => this.getBuildById(id)) as Build[];

    const onlyFirst = first.failedTests.filter(a => !second.failedTests.some(b => b.id === a.id));
    const onlySecond = second.failedTests.filter(a => !first.failedTests.some(b => b.id === a.id));
    const both = first.failedTests.filter(a => second.failedTests.some(b => b.id === a.id));

    return {
      first,
      second,
      onlyFirst,
      onlySecond,
      both,
    };
  }

  private save() {
    // Prototype.js breaks JSON.stringify. We should use Prototype.js if it loaded.
    const dataAsStr = typeof Object.toJSON === 'function'
                      ? Object.toJSON(this.data)
                      : JSON.stringify(this.data);

    localStorage.setItem(this.$config.dbName, dataAsStr);
  }

  private load() {
    const dataAsStr = localStorage.getItem(this.$config.dbName);
    this.data = dataAsStr ? JSON.parse(dataAsStr) : this.makeInitialDb();
  }

  private makeInitialDb(): DbData {
    return {
      version: 1,
      byBuildJob: {},
    };
  }

  private makeEmptyBuildJob(): DbBuildJobData {
    return {
      builds: {},
      buildsOrder: [],
      selectedBuildIds: {},
    };
  }

}
