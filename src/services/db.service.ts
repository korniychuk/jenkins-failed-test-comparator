import { Build, OnInit } from '../models';

interface DbData {
  version: number;
  builds: { [id: number]: Build };
  buildsOrder: number[];
}

export class DbService implements OnInit {

  private data: DbData = this.makeInitialDb();

  public constructor(
    private name: string,
  ) {}

  public onInit(): void {
    this.load()
  }

  public getBuildById(id: number): Build | undefined {
    return this.data.builds[id];
  }

  public getAllBuilds(): Build[] {
    return this.data.buildsOrder.map(id => this.data.builds[id]);
  }

  public saveBuild(build: Build) {
    this.data.builds[build.id] = build;
    this.data.buildsOrder.push(build.id);
    this.data.buildsOrder.sort((a, b) => b - a);

    this.save();
  }

  private save() {
    // Prototype.js breaks JSON.stringify. We should use Prototype.js if it loaded.
    const dataAsStr = typeof Object.toJSON === 'function'
                      ? Object.toJSON(this.data)
                      : JSON.stringify(this.data);

    localStorage.setItem(this.name, dataAsStr);
  }

  private load() {
    const dataAsStr = localStorage.getItem(this.name);
    this.data = dataAsStr ? JSON.parse(dataAsStr) : this.makeInitialDb();
  }

  private makeInitialDb(): DbData {
    return {
      version: 1,
      builds: [],
      buildsOrder: [],
    };
  }
}
