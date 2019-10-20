import {IconButtonToggle as MWCIconButtonToggle} from '@material/mwc-icon-button-toggle';
import { customElement, css, CSSResult } from 'lit-element';

@customElement('icon-button-toggle')
export class IconButtonToggle extends MWCIconButtonToggle {
  static styles = [
    MWCIconButtonToggle.styles,
    css`
      button.mdc-icon-button {
        padding: 0;
        width: 24px;
        height: 24px;
      }
    `
  ] as any as CSSResult;
}
