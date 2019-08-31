export interface FailedTest {
  /** @example XXX_123 */
  id: string;
}

export type Vars = { [key: string]: string | number | boolean | undefined };

export interface TemplateRef<
  Links extends object = { [key: string]: HTMLElement },
  LinksAll extends object = { [key: string]: HTMLElement },
> {
  root$: HTMLElement;
  links: { [key in keyof Links]: Links[key] };
  linksAll: { [key in keyof LinksAll]: LinksAll[key][] };
}
export interface ComponentRef<
  Comp extends Component = Component,
  Links extends object = { [key: string]: HTMLElement },
  LinksAll extends object = { [key: string]: HTMLElement },
> extends TemplateRef<Links, LinksAll> {
  componentInstance: Comp;
  childComponentRefs: ComponentRef[];
}


export interface BuildInfo {
  id: number;
  name: string;
  date: string;
  dynamic: { [name: string]: string };
}

export interface Build extends BuildInfo {
  failedTests: FailedTest[];
}

export interface HotKeyConfig {
  key: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

export interface CustomConfig {
  dbName?: string;
  jiraUrl?: string;
  hotKeys?: {
    openMainModal?: HotKeyConfig;
  };
}

export interface Config extends CustomConfig {
  prefix: string;
  dbName: string;
  jiraUrl: string;
  hotKeys: {
    openMainModal: HotKeyConfig;
  };
}

export interface ComparisonResult {
  first: Build;
  second: Build;
  onlyFirst: FailedTest[];
  onlySecond: FailedTest[];
  both: FailedTest[];
}

export interface OnInit {
  onInit(): void;
}

export interface OnDestroy {
  onDestroy(): void;
}

export interface OnBeforeInsert {
  onBeforeInsert(): void | Promise<void>;
}

export interface OnAfterInsert {
  onAfterInsert(): void | Promise<void>;
}

export interface OnBeforeRemove {
  onBeforeRemove(): void | Promise<void>;
}

export interface OnAfterRemove {
  onAfterRemove(): void | Promise<void>;
}

export interface Component extends Partial<OnAfterInsert & OnBeforeInsert & OnBeforeRemove & OnAfterRemove> {
  // insertTo(target$: HTMLElement): void;
  // remove(): void;
  refresh(vars: Vars): void;
}

export interface ComponentDev
  extends Component,
          Partial<OnAfterInsert & OnBeforeInsert & OnBeforeRemove & OnAfterRemove> {
}
