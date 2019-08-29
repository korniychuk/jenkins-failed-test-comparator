import { DomService } from './dom.service';
import {
  MainModalComponent,
  MainModalParams,
  ModalActionButtonDef,
} from '../components/main-modal.component';

export class ModalsService {
  public isMainGridOpened = false;

  public constructor(
    private $dom: DomService,
  ) {}

  public openMainGrid(): void {
    const comp = new MainModalComponent(this.$dom);

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
      // onAfterInit: (ref) => {
      //   this._mainModalRef = ref;
      // },
      // onBeforeDestroy: () => this._mainModalRef = undefined,
    };
    comp.insertToBody(params);
    comp.open();
  }
}
