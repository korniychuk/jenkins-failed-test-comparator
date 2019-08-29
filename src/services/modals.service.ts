import {
  MainModalComponent,
  MainModalParams,
  ModalActionButtonDef,
} from '../components/main-modal.component';

import { DomService } from './dom.service';
import { ConfigService } from './config.service';

export class ModalsService {
  public isMainGridOpened = false;

  public constructor(
    private $dom: DomService,
    private readonly $config: ConfigService,
  ) {}

  public openMainGrid(): void {
    const comp = new MainModalComponent(this.$dom, this.$config);

    const actions: ModalActionButtonDef[] = [
      {
        name: 'Retrieve',
        tooltip: 'Retrieve build info from the current page and save to compare in the future',
        cb: () => {
          // const build = this._retrieveBuildInfo();
          // this.db.addBuild(build);
          // this._refreshGrid();
          console.log('retrieve');
        },
      },
      {
        name: 'Cancel',
        tooltip: 'Just closes the modal',
        cb: ({ close }) => {
          close();
        },
      },
    ];


    const params: MainModalParams = {
      content: [],
      actions,
      size: 'lg',
      title: 'Failed Tests Comparator',
      onAfterInsert: () => this.isMainGridOpened = true,
      onBeforeRemove: () => this.isMainGridOpened = false,
    };
    comp.insertToBody(params);
  }
}
