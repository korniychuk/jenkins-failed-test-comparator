import { Build, BuildInfo, FailedTest } from '../models';

interface ESNextRegExpMatchArray extends RegExpMatchArray {
  groups: { [key: string]: string };
}

export class JenkinsService {

  public isPageHasInfoAboutFailedTests(): boolean {
    return !!document.querySelector('a[href="testReport/"]');
  }

  public retrieveBuild(): Build {
    if (!this.isPageHasInfoAboutFailedTests()) {
      throw new Error(`The page doesn't contain any info about failed tests`);
    }

    return {
      ...this.retrieveBuildInfo(),
      failedTests: this.retrieveFailedTests(),
    };
  }

  public retrieveBuildJobName(): string | undefined {
    // TODO: last job name removed, because we need to have cross job comparing
    // const name = location.pathname.replace(/^((?:\/job\/[\w-]+)+).*?$/, '$1');
    const name = location.pathname.replace(/^((?:\/job\/[\w-]+)+)\/job\/[\w-]+.*?$/, '$1');
    return name.length > 5 ? name : undefined;
  }

  private retrieveBuildInfo(): BuildInfo {
    const h1$ = document.querySelector('h1');
    if (!h1$ || !h1$.textContent) {
      throw new Error(`Can't find <h1> or it hasn't .textContent`);
    }

    const match = h1$.textContent.match(/Build (?<id>\d+):\s+(?<name>.+?)\s*\((?<date>[^()]+)\)/) as ESNextRegExpMatchArray | null;
    if (!match) {
      throw new Error(`Can not parse <h1>`);
    }

    const { id, name, date } = match.groups;

    const description$ = document.querySelector('#description') as HTMLElement | null;
    if (!description$) {
      throw new Error(`Can't find #description`);
    }

    const dynamic = description$.innerText
      .split('\n')
      .map(v => v.split(/\s*:\s*/))
      .reduce((res, [key, value]) => ({...res, [key]: value}), {});

    return { id: +id, name, date, dynamic };
  }

  private retrieveFailedTests(): FailedTest[] {
    const q = document.querySelectorAll('a[href="testReport/"] + ul a[href^="testReport/junit/"]');

    return (new Array(...q) as HTMLAnchorElement[])
      .map(v =>
        (v.textContent || '').replace(/^.+?([A-Z]{2,10}_\d+).+?$/, '$1'),
      )
      .map(id => ({ id }));
  }
}
