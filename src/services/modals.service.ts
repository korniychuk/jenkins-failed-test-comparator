import {
  MainModalComponent,
  MainModalParams,
  ModalActionButtonDef,
} from '../components/main-modal.component';
import { BuildsGridClickParams, BuildsGridComponent } from '../components/builds-grid.component';
import { ComparisonResult } from '../models';
import { ComparisonComponent } from '../components/comparison.component';

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
        name: 'Clear',
        tooltip: 'Clear whole retrieved for the builds',
        cb: () => {
          this.$db.clearCurrentBuildJob();
          refreshGrid();
          validateClearBtn();
        }
      },
      {
        name: 'Compare',
        cb: () => {
          const result = this.$db.compareTwoSelectedBuild();
          this.openComparisonModal(result);
        }
      },
      {
        name: 'Retrieve',
        cb: () => {
          const build = this.$jenkins.retrieveBuild();
          this.$db.saveBuild(build);
          refreshGrid();
          validateClearBtn();
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

    const onBuildClick = ({ build, selected }: BuildsGridClickParams): void => {
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

    const clearBtn$ = buttons$[0];
    const compareBtn$ = buttons$[1];
    const retrieveBtn$ = buttons$[2];

    // Validate retrieve button on modal open
    const canRetrieve = this.$jenkins.isPageHasInfoAboutFailedTests();
    retrieveBtn$.disabled = !canRetrieve;
    retrieveBtn$.title = canRetrieve
         ? 'Retrieve build info from the current page and save to compare in the future'
         : 'This page doesn\'t have any information about failed tests';

    const validateCompareBtn = () => {
      const isValid = this.$db.getSelectedBuildIds().length === 2;
      compareBtn$.disabled = !isValid;
      compareBtn$.title = isValid
         ? 'Compare two selected builds'
         : 'Select two builds first';
    };
    const validateClearBtn = () => {
      const isValid = this.$db.getAllBuilds().length > 0;
      clearBtn$.disabled = !isValid;
    };

    validateCompareBtn();
    validateClearBtn();
  } // end .openMainGrid()

  public openComparisonModal(result: ComparisonResult): void {
    const comparisonComp = new ComparisonComponent(this.$dom, this.$config);
    comparisonComp.refresh({ result });
    const comparisonRef = comparisonComp.getRef();


    const modal = new MainModalComponent(this.$dom, this.$config);
    const params: MainModalParams = {
      content: [ comparisonRef ],
      size: 'lg',
      title: 'Comparison Results',
    };
    modal.insertToBody(params);
  }
}
