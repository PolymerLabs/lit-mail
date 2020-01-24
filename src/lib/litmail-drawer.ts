import {Drawer} from '@material/mwc-drawer';
import { css, customElement, CSSResult } from 'lit-element';

@customElement('litmail-drawer')
export class LitMailDrawer extends Drawer {
  static styles = [Drawer.styles, css`
    .mdc-drawer-app-content {
      flex: auto;
    }
  `] as any as CSSResult;
}
