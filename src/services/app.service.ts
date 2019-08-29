import { OnInit } from '../models';

import { ModalsService } from './modals.service';
import { DbService } from './db.service';
import { JenkinsService } from './jenkins.service';
import { ConfigService } from './config.service';

export class AppService implements OnInit {

  public constructor(
    private readonly $modals: ModalsService,
    private readonly $db: DbService,
    private readonly $jenkins: JenkinsService,
    private readonly $config: ConfigService,
  ) {}

  public onInit(): void {
    this.buildOpenHotKey();
  }

  private buildOpenHotKey(): void {
    const hk = this.$config.hotKeys.openMainModal;

    document.addEventListener('keypress', v =>
      v.code === `Key${ hk.key }`
      && v.altKey === hk.alt
      && v.ctrlKey === hk.ctrl
      && v.shiftKey === hk.shift
      && !this.$modals.isMainGridOpened
      && this.$modals.openMainGrid()
    );

    const hotKeyLabel = (hk.ctrl  ? 'Ctrl+'  : '')
                      + (hk.alt   ? 'Alt+'   : '')
                      + (hk.shift ? 'Shift+' : '')
                      +  hk.key;

    console.info(`[Failed Test Comparator] loaded\nPress ${hotKeyLabel} to open`);
  }

}
