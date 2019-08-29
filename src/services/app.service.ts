import { OnInit } from '../models';
import { ModalsService } from './modals.service';

export class AppService implements OnInit {

  public constructor(
    private readonly $modals: ModalsService,
  ) {}

  public onInit(): void {
    document.addEventListener('keypress', v =>
      v.code === 'KeyZ'
      && v.altKey
      && v.ctrlKey
      && v.shiftKey
      && !this.$modals.isMainGridOpened
      && this.$modals.openMainGrid()
    );

    console.info('[Failed Test Comparator] loaded\nPress Ctrl+Alt+Shift+Z to open');
  }

}
