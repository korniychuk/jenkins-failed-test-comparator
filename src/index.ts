import { DomService } from './services/dom.service';
import { ModalsService } from './services/modals.service';
import { AppService } from './services/app.service';

const $dom = new DomService();
const $modals = new ModalsService($dom);
const $app = new AppService($modals);

$app.onInit();
