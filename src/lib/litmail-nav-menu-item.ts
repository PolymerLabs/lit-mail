import {LitElement, css, html, customElement, property, PropertyValues} from 'lit-element';
import {styleMap} from 'lit-html/directives/style-map.js';

import '@material/mwc-icon';

@customElement('litmail-nav-menu-item')
export class LitMailNavMenuItem extends LitElement {

  static styles = [css`
    :host {
      display: flex;
      align-items: center;
      height: 48px;
      padding: 0 16px;
      text-overflow: ellipsis;
      border-radius: 24px;
      cursor: pointer;
    }
    :host(:hover) {
      background: var(--primary-highlight);
    }
    :host([selected]) {
      color: var(--mdc-theme-secondary);
    }
    mwc-icon {
      margin-right: 12px;
    }
  `];

  @property({
    type: Boolean,
    reflect: true,
  })
  selected = false;

  @property()
  icon?: string;

  @property()
  color?: string;

  @property({
    attribute: 'label-id',
    reflect: true,
  })
  labelId?: string;

  constructor() {
    super();
    this.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('litmail-nav-select', {
        bubbles: true,
        detail: { labelId: this.labelId }
      }));
    });
  }

  render() {
    return html`
      <mwc-icon style=${styleMap({color: this.color || 'inherit'})}>
        ${this.icon}
      </mwc-icon>
      <slot></slot>
    `;
  }

}
