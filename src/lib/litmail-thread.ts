import {LitElement, css, html, customElement, property, PropertyValues} from 'lit-element';
import {unsafeHTML} from 'lit-html/directives/unsafe-html.js';

import '@material/mwc-icon';
import {DateTime} from 'luxon';

import { Label, Thread, GMailClient, getThreadMetadata } from './gmail-api.js';
import {style} from './lt-thread-css.js';
import './litmail-message.js';

@customElement('litmail-thread')
export class LitMailThread extends LitElement {

  static styles = [
    style,
    css`
    :host {
      display: block;
      box-sizing: border-box;
      margin: 8px;
      cursor: pointer;
      line-height: 1.2;
    }
    :host .mdc-card {
      box-sizing: border-box;
      padding: 24px;
      border-radius: 0;
    }
    :host(:not(:hover)) .mdc-card {
      box-shadow: none;
    }
    mwc-icon {
      margin-right: 12px;
    }    
    @keyframes placeload {
      0% {
        background-position: -468px 0;
      }
      100% {
        background-position: 468px 0;
      }
    }
    .loading {
      animation-duration: 1s;
      animation-fill-mode: forwards;
      animation-iteration-count: infinite;
      animation-name: placeload;
      animation-timing-function: linear;
      background: linear-gradient(to right, #eeeeee 8%, #dddddd 18%, #eeeeee 33%);
      background-size: 1200px 104px;
      position: relative;
    }
    header {
      display: flex;
      font-size: .9em;
    }
    header > span {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    h5 {
      font-size: 1.25em;
      height: calc(1.25em * 1.2);
      font-weight: bold;
      margin: 12px 0;
    }
    :host(:not([open])) h5 {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
    .snippet {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  `];

  @property({attribute: false})
  client?: GMailClient;

  @property({attribute: false})
  thread?: Thread;

  @property({attribute: false})
  fullThread?: Thread;

  /**
   * List of the user's labels. Keys are the label id.
   */
  @property({attribute: false})
  labels?: Map<String, Label>;

  /**
   * The list of messages the thread contains.
   */
  @property({attribute: false})
  messages: any[] = [];

  /**
   * True if the thread has been selected by the user.
   */
  @property({
    type: Boolean,
    reflect: true,
  })
  selected = false;

  @property({
    type: Boolean,
    reflect: true,
  })
  open = false;

  constructor() {
    super();
    this.addEventListener('click', () => {
      this.open = !this.open;
    });
  }

  update(changedProperties: PropertyValues) {
    if (changedProperties.has('thread')) {
      this.fullThread = undefined;
      if (this.thread!.id) {
        this.client!.getFullThread(this.thread!.id).then((fullThread) => {
          this.fullThread = fullThread;
        });
      }
    }
    super.update(changedProperties);
  }

  render() {
    const metadata = this.fullThread ? getThreadMetadata(this.fullThread) : undefined;
    const dateString = metadata?.date
    const date = dateString && DateTime.fromRFC2822(dateString);
    const dateFormatted = date && formatDate(date);

    return html`
      <div class="mdc-card">
        <header>
          <span class="from">${metadata?.from}</span>
          &mdash;
          <span class="date">${dateFormatted}</span>
        </header>
        <h5 class="subject loading">${'' ?? metadata?.subject}</h5>
        ${this.open ? html`
          <div class="messages">
          ${this.fullThread?.messages?.map((message, i) => html`
            <litmail-message
                .message=${message}
                .index=${i}
                .totalCount=${this.fullThread?.messages?.length}>
            </litmail-message>
          `)}
          </div>
        ` : html`
          <div class="snippet">${unsafeHTML(this.thread?.snippet)}</div>
        `}
      </div>
    `;
  }
}


const formatDate = (date: DateTime): string => {
  const now = DateTime.local();
  const daysAgo = now.diff(date, 'days');
  if (daysAgo.days < 30) {
    const hoursAgo = now.diff(date, 'hours');
    if (hoursAgo.hours < 24) {
      const minutesAgo = now.diff(date, 'minutes');
      if (minutesAgo.minutes < 60) {
        return `${Math.floor(minutesAgo.minutes)} minutes ago`;  
      }
      return `${Math.floor(hoursAgo.hours)} hours ago`;  
    }
    return `${Math.floor(daysAgo.days)} days ago`;
  }
  return date.toLocaleString(DateTime.DATE_FULL);
}
