/**
 * @example XXX_123
 */
export type FailedTestId = string;

export type Vars = { [key: string]: string | number | boolean | undefined };

export interface CompiledTemplate<LinkKeys extends string = string, LinkAllKeys extends string = string> {
  root$: HTMLElement;
  links: { [key in LinkKeys]: HTMLElement };
  linksAll: { [key in LinkAllKeys]: HTMLElement[] };
}

export interface Build {
  id: number;
  name: string;
  date: string;
  dynamic: { [name: string]: string };
  failedTests: FailedTestId[];
}

export interface OnInit {
  onInit(): void;
}

export interface OnDestroy {
  onDestroy(): void;
}

export interface Component {
  insertTo(target$: HTMLElement): void;
  remove(): void;
  refresh(vars: Vars): void;
}
