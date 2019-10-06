import {LitElement, css, html, customElement, property, PropertyValues} from 'lit-element';
import {messageBody} from './message-body.js';

import '@material/mwc-icon';

import {parseMessage, Message, ParsedMessage } from './gmail-api.js';

@customElement('litmail-message')
export class LitMailMessage extends LitElement {

  static styles = css`
    :host {
      display: block;
      border-bottom: 1px solid var(--seperator-on-white, #ddd);
      padding: 16px 0;
    }
    h5 {
      font-size: .9em;
      font-weight: bold;
      margin: 0 0 12px 0;
    }
    .snippet {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    div.gmail_quote::before {
      content: "...";
      border-radius: 50%;
      height: 1em;
      background: #aaa;
    }
    div.gmail_quote {
      display: none;
    }
  `;

  @property({attribute: false})
  message?: Message;

  private _parsedMessage?: ParsedMessage;

  @property({
    type: Boolean,
    reflect: true,
  })
  open?: boolean = undefined;

  @property({type: Number})
  index?: number;

  @property({type: Number})
  totalCount?: number;

  constructor() {
    super();
    this.addEventListener('click', (e) => {
      console.log('message click', e.target);
      this.open = !this.open;
      e.stopPropagation();
    });
  }

  update(changedProperties: PropertyValues) {
    if (changedProperties.has('message')) {
      if (this.message === undefined) {
        this._parsedMessage = undefined;
      } else {
        this._parsedMessage = parseMessage(this.message);
      }
    }
    this.open = this.open ??
        ((this.index !== undefined && this.index + 1 === this.totalCount) || 
        (this._parsedMessage?.labelIds?.includes('UNREAD') ?? true));
    super.update(changedProperties);
  }

  render () {
    const body = this._parsedMessage?.textHtml || this._parsedMessage?.textPlain;
    const {snippet} = this._parsedMessage ?? {};
    return html`
      <h5 class="from">${this._parsedMessage?.from?.name}</h5>
      ${this.open
        ? html`<div class="body">${messageBody(body)}</div>`
        : html`<div class="snippet">${messageBody(snippet)}</div>`
      }
    `;
  }
}
