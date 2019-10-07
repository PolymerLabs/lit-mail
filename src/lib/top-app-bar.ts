import {css, customElement, CSSResult} from 'lit-element';
import {TopAppBar as MWCTopAppBar} from '@material/mwc-top-app-bar';

@customElement('top-app-bar')
export class TopAppBar extends MWCTopAppBar {
  static styles = [
    MWCTopAppBar.styles,
    css`
      .mdc-top-app-bar {
        position: absolute;
      }
    `,
  ] as any as CSSResult;
}
