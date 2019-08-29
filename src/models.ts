export interface FailedTest {
  /** @example XXX_123 */
  id: string;
}

export type Vars = { [key: string]: string | number | boolean | undefined };

export interface TemplateRef<
  Links extends object = { [key: string]: HTMLElement },
  LinkAll extends object = { [key: string]: HTMLElement },
> {
  root$: HTMLElement;
  links: { [key in keyof Links]: Links[key] };
  linksAll: { [key in keyof LinkAll]: LinkAll[key][] };
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
  hotKeys?: {
    openMainModal?: HotKeyConfig;
  };
}

export interface Config extends CustomConfig {
  prefix: string;
  dbName: string;
  hotKeys: {
    openMainModal: HotKeyConfig;
  };
}

export interface OnInit {
  onInit(): void;
}

export interface OnDestroy {
  onDestroy(): void;
}

export interface Component {
  // insertTo(target$: HTMLElement): void;
  // remove(): void;
  refresh(vars: Vars): void;
}
