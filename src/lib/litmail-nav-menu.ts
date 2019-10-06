import {LitElement, css, html, customElement, property, query, PropertyValues} from 'lit-element';
import { LitMailNavMenuItem } from './litmail-nav-menu-item';

@customElement('litmail-nav-menu')
export class LitMailNavMenu extends LitElement {
  static styles = [css`
    :host {
      display: block;
      padding: 8px 0;
    }
    ::slotted(hr) {
      height: 0;
      border: 0;
      border-bottom: 1px solid var(--reply-blue-600);
    }
  `];

  private _selectedItem?: LitMailNavMenuItem;

  @property({attribute: false})
  get selectedItem(): LitMailNavMenuItem|undefined {
    return this._selectedItem;
  }

  set selectedItem(v: LitMailNavMenuItem|undefined) {
    if (v === this._selectedItem) {
      return;
    }
    if (this._selectedItem) {
      this._selectedItem.selected = false;
    }
    this._selectedItem = v;
    if (this._selectedItem) {
      this._selectedItem.selected = true;
    }
  }

  constructor() {
    super();
    this.addEventListener('litmail-nav-select', (e: Event) => {
      console.log('litmail-nav-menu litmail-nav-select', (e.target as any).labelId);
      this.selectedItem = e.target as LitMailNavMenuItem;
    });
  }

  render() {
    return html`<slot></slot>`
  }

}
