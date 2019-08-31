import {
  MainModalComponent,
  MainModalParams,
  ModalActionButtonDef,
} from '../components/main-modal.component';
import { MainGridBuildClickParams, BuildsGridComponent } from '../components/main-grid.component';

import { DomService } from './dom.service';
import { ConfigService } from './config.service';
import { JenkinsService } from './jenkins.service';
import { DbService } from './db.service';

export class ModalsService {
  public isMainGridOpened = false;

  public constructor(
    private readonly $dom: DomService,
    private readonly $config: ConfigService,
    private readonly $jenkins: JenkinsService,
    private readonly $db: DbService,
  ) {}

  public alert(text: string, title = 'Warning!'): void {
    const comp = new MainModalComponent(this.$dom, this.$config);
    const text$ = document.createTextNode(text);
    const params: MainModalParams = {
      title,
      content: [ text$ ],
      size: 'smw',
    };
    comp.insertToBody(params);
  }

  // @todo: decompose this method
  public async openMainGrid(): Promise<void> {
    const comp = new MainModalComponent(this.$dom, this.$config);

    const actions: ModalActionButtonDef[] = [
      {
        name: 'Compare',
        cb: () => {
          const result = this.$db.compareTwoSelectedBuild();
          console.log('Compare', result);
        }
      },
      {
        name: 'Retrieve',
        cb: () => {
          const build = this.$jenkins.retrieveBuild();
          this.$db.saveBuild(build);
          refreshGrid();
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

    const onBuildClick = ({ build, selected }: MainGridBuildClickParams): void => {
      this.$db.toggleBuildSelection(build.id, !selected);
      refreshGrid();
      validateCompareBtn();
    };
    const gridComp = new BuildsGridComponent(this.$dom, this.$config);
    gridComp.refresh({ onBuildClick });

    const refreshGrid = () => {
      const builds = this.$db.getAllBuilds();
      const selectedBuildIds = this.$db.getSelectedBuildIds();
      gridComp.refresh({ builds, selectedBuildIds })
    };
    refreshGrid();
    const gridRef = gridComp.getRef();

    const params: MainModalParams = {
      content: [ gridRef ],
      actions,
      size: 'lg',
      title: 'Failed Tests Comparator',
      onAfterInsert: () => this.isMainGridOpened = true,
      onBeforeRemove: () => this.isMainGridOpened = false,
    };
    const modalRef = await comp.insertToBody(params);

    // find buttons links
    const buttons$ = modalRef.linksAll.action
       .map(btn$ => [parseInt(btn$.getAttribute('data-action-button-idx') || '', 10), btn$])
       .sort(([a], [b]) => +a - +b)
       .map(([, btn$]) => btn$) as HTMLButtonElement[];

    const compareBtn$ = buttons$[0];
    const retrieveBtn$ = buttons$[1];

    // Validate retrieve button on modal open
    const canRetrieve = this.$jenkins.isPageHasInfoAboutFailedTests();
    retrieveBtn$.disabled = !canRetrieve;
    retrieveBtn$.title = canRetrieve
         ? 'Retrieve build info from the current page and save to compare in the future'
         : 'This page doesn\'t have any information about failed tests';

    const validateCompareBtn = () => {
      const valid = this.$db.getSelectedBuildIds().length == 2;
      compareBtn$.disabled = !valid;
      compareBtn$.title = valid
         ? 'Compare two selected builds'
         : 'Select two builds first';
    };

    validateCompareBtn();
  }
}
