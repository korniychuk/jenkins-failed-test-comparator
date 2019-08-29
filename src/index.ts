import { DomService } from './services/dom.service';
import { ModalsService } from './services/modals.service';
import { AppService } from './services/app.service';
import { ConfigService } from './services/config.service';
import { DbService } from './services/db.service';
import { JenkinsService } from './services/jenkins.service';


const $config = new ConfigService();
// ConfigService is the only service in which .onInit() should be executed immediately
$config.onInit();

const $jenkins = new JenkinsService();
const $dom = new DomService();
const $db = new DbService($config);
const $modals = new ModalsService($dom);
const $app = new AppService($modals, $db, $jenkins, $config);

$app.onInit();
