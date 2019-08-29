/**
 * @example XXX_123
 */
export type FailedTestId = string;

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
  failedTests: FailedTestId[];
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
