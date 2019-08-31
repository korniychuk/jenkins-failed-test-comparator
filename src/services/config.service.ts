import { Config, HotKeyConfig, OnInit } from '../models';

export class ConfigService implements OnInit, Config {

  public jiraUrl: string = '';
  public prefix: string = 'ftc';
  public dbName: string = `${ this.prefix }-db`;
  public hotKeys: Config['hotKeys'] = {
    openMainModal: {
      ctrl: true,
      alt: true,
      shift: true,
      key: 'Z',
    },
  };

  public onInit(): void {
    const openMainModalHotKey = window.ftcConfig
                             && window.ftcConfig.hotKeys
                             && window.ftcConfig.hotKeys.openMainModal;

    if (openMainModalHotKey) {
      if (this.validateHotKey(openMainModalHotKey)) {
        this.hotKeys.openMainModal = openMainModalHotKey;
      } else {
        console.warn(new Error('.openMainModal Hot Key is invalid.'), openMainModalHotKey);
      }
    }

    const jiraUrl = window.ftcConfig
                    && window.ftcConfig.jiraUrl;
    if (jiraUrl) {
      this.jiraUrl = jiraUrl;
    } else {
      console.error('Please specify .jiraUrl in the config');
    }
  }

  private validateHotKey(hotkey: any): hotkey is HotKeyConfig {
    return hotkey
        && typeof hotkey === 'object'
        && typeof hotkey.ctrl  === 'boolean'
        && typeof hotkey.alt   === 'boolean'
        && typeof hotkey.shift === 'boolean'
        && typeof hotkey.key   === 'string'
        && /^[A-Z]$/.test(hotkey.key)
      ;
  }

}
