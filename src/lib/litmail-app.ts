/// <reference types="gapi.client" />
/// <reference types="gapi.client.gmail" />

import {LitElement, css, html, customElement, property, query, PropertyValues} from 'lit-element';
import {nothing} from 'lit-html';
import {ifDefined} from 'lit-html/directives/if-defined.js';
import page from 'page';

import '@material/mwc-drawer';
import '@material/mwc-fab';
import '@material/mwc-icon';
import '@material/mwc-icon-button';
import '@material/mwc-linear-progress';
import './top-app-bar.js';
import './litmail-nav-menu.js';
import './litmail-nav-menu-item.js';
import './litmail-thread.js';
import './litmail-login.js';

import { GMailClient, Thread, GoogleUser, Label, BasicProfile } from './gmail-api.js';

// Type-only imports
import { LitMailNavMenuItem } from './litmail-nav-menu-item.js';
import { LitMailNavMenu } from './litmail-nav-menu.js';
import { PendingContainer } from './pending-container.js';

@customElement('litmail-app')
export class LitMailApp extends PendingContainer(LitElement) {

  static styles = css`
    :host {
      display: block;
      height: 100%;
      background: rgb(237, 240, 242);
      --reply-blue-800: #232F34;
      --reply-blue-700: #344955;
      --reply-blue-600: #4A6572;
      --reply-orange-500: #F9AA33;
      --seperator-on-white: #ddd;
      --primary-highlight: var(--reply-blue-600);
      --mdc-theme-primary: var(--reply-blue-700);
      --mdc-theme-on-primary: white;
      --mdc-theme-secondary: var(--reply-orange-500);
      --mdc-theme-on-secondary: var(--reply-blue-800);
    }
    top-app-bar {
      height: 100%;
      background: var(--mdc-theme-primary);
      color: var(--mdc-theme-on-primary);
      padding: 8px;
    }
    #drawer-header {
      position: relative;
    }
    img.profile {
      border-radius: 50%;
      width: 24px;
      height: 24px;
    }
    mwc-linear-progress {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
    }
  `;

  DEBUG = location.search.indexOf('debug') !== -1;
  REFRESH_INTERVAL = 60000; // every 60 sec.

  private _gmailClient?: GMailClient;

  inboxRefreshId: number|undefined = undefined;
  
  private _isSignedIn = false;

  get signedIn() {
    return this._isSignedIn;
  }

  @property({attribute: false})
  threads?: Thread[] = [];

  @property({attribute: false})
  selectedThreads = [];  // <mail-thread>?

  @property({attribute: false})
  headerTitle = 'Inbox';

  @property({attribute: false})
  currentUser?: GoogleUser;

  @property({attribute: false})
  profile?: BasicProfile;

  @property({attribute: false})
  users: GoogleUser[] = [];

  MAX_REFRESH_Y = 150;

  /** True, if the mail is syncing. */
  syncing = false;

  /** True if the pull to refresh has been enabled. */
  refreshStarted = false;
  
  /** True if the user has attempted to archive a thread. */
  _scrollArchiveSetup = false;

  // I don't know where this is set in PolyMail
  narrow = false;

  private _labels?: Label[];

  get labels() {
    return this._labels;
  }

  set labels(v: Label[] | undefined) {
    this._labels = v;
    this.labelMap.clear();
    if (this._labels) {
      for (const label of this._labels) {
        if (label.id !== undefined) {
          this.labelMap.set(label.id, label);
        }
      }
    }
    this.requestUpdate();
  }

  labelMap: Map<string, Label> = new Map();

  previousSearches = [
    'is: chat',
    'to: me',
    'airline tickets',
  ];

  // @query('#search')
  // private _search!: HTMLElement; // <material-search>

  @query('#drawerPanel')
  private _drawerPanel!: HTMLElement;

  @query('#nav')
  private _navMenu!: LitMailNavMenu;

  @property({attribute: false})
  currentLabelIds = ['INBOX'];

  @property({attribute: false})
  currentView: 'inbox' | 'message' = 'inbox';

  constructor() {
    super();
    console.log('litmail-app');

    this._installRoutes();

    this.shadowRoot!.addEventListener('litmail-nav-select', (e: Event) => {
      const target = e.target as LitMailNavMenuItem;
      const labelId = target.labelId!;
      if (labelId === 'INBOX') {
        page(`/inbox`);
      } else {
        page(`/inbox/${labelId}`);
      }
    });

    if (this.DEBUG) {
      this.loadTestData();
    } else {
      (async () => {        
        this._gmailClient = await GMailClient.load();
        // Listen for sign-in state changes.
        this._gmailClient.onSignedInChange(
            (signedIn) => this._setSignedIn(signedIn));
        // Handle the initial sign-in state.
        this._setSignedIn(this._gmailClient.isSignedIn);
      })();
    }
  }

  private _installRoutes() {
    console.log('_installRoutes');
    page.redirect('/', '/inbox');
    page('/inbox', this._inboxRoute);
    page('/inbox/:label', this._inboxRoute);
    page('*', this._notFoundRoute);
    page();
  }

  private _inboxRoute = (context: PageJS.Context) => {
    console.log('_inboxRoute');
    const labelId: string = context.params['label'] ?? 'INBOX';
    this.currentLabelIds = [labelId];
  };

  private _notFoundRoute = (context: PageJS.Context) => {
    console.log(`not found: ${context.path}`);
  };

  private _setSignedIn(signedIn: boolean) {
    if (signedIn === this._isSignedIn) {
      return;
    }
    this._isSignedIn = signedIn;
    if (signedIn) {
      this._onSignInSuccess();
    } else {
      // do sign-out stuff
    }
  }

  private async _onSignInSuccess() {
    this._isSignedIn = true;
    console.log('signed in');
    this.currentUser = this._gmailClient!.currentUser;
    this.profile = this.currentUser.getBasicProfile();
    this._gmailClient!.getLabels().then((labels) => {
      this.labels = labels;
    })
    this._getThreads();
    this.requestUpdate();
  }

  update(changedProperties: PropertyValues) {
    if (changedProperties.has('currentLabelIds')) {
      this._getThreads();
    }
    super.update(changedProperties);
  }

  _getThreads() {
    console.log('fetching threads for ', this.currentLabelIds);
    const promise = this._gmailClient!.getThreads({labelIds: this.currentLabelIds})
      .then((threads) => {
        this.threads = threads;
      });
    const pendingEvent = new CustomEvent('pending-state', {
      composed: true,
      bubbles: true,
      detail: {promise}
    });
    this.dispatchEvent(pendingEvent);
  }

  _renderCurrentView() {
    switch (this.currentView) {
      case 'inbox': return html`<litmail-inbox></litmail-inbox>`;
      case 'message': return html`<litmail-message></litmail-message>`;
    }
  }

  render() {
    console.log('litmail-app render', this.__hasPendingChildren);
    const visibleLabels = this.labels?.filter((l) => 
        l.type === 'user' && l.labelListVisibility === 'labelShow');
    return html`
      ${this.signedIn ? nothing : html`<litmail-login></litmail-login>`}
      <mwc-linear-progress .progress=${this.__progress} .closed=${!this.__hasPendingChildren}></mwc-linear-progress>
      <mwc-drawer id="drawerPanel" type="" .narrow=${this.narrow}>
        <top-app-bar id="drawer-header" .scrollTarget=${this._drawerPanel}>

          <mwc-icon-button icon="arrow_left" slot="navigationIcon"></mwc-icon-button>
          <div slot="title">LitMail</div>
          <img class="profile"
              slot="actionItems"
              src=${ifDefined(this.profile?.getImageUrl())}
              ?hidden=${this.profile === undefined}>
          <mwc-icon-button icon="settings_applications" slot="actionItems"></mwc-icon-button>

          <mwc-fab extended icon="create" label="Compose"></mwc-fab>

          <litmail-nav-menu id="nav">
            <litmail-nav-menu-item label-id="INBOX" icon="inbox">
              Inbox
            </litmail-nav-menu-item>
            <litmail-nav-menu-item label-id="STARRED" icon="star">
              Starred
            </litmail-nav-menu-item>
            <litmail-nav-menu-item label-id="SENT" icon="send">
              Sent
            </litmail-nav-menu-item>
            <litmail-nav-menu-item label-id="all_mail" icon="email">
              All Mail
            </litmail-nav-menu-item>
            <litmail-nav-menu-item label-id="TRASH" icon="delete">
              Trash
            </litmail-nav-menu-item>
            <litmail-nav-menu-item label-id="SPAM" icon="report">
              Spam
            </litmail-nav-menu-item>
            <litmail-nav-menu-item label-id="DRAFT" icon="drafts">
              Drafts
            </litmail-nav-menu-item>
            <hr>
            ${visibleLabels?.map((label) => html`
              <litmail-nav-menu-item 
                  icon="label" 
                  .labelId=${label.id} 
                  .color=${label.color?.backgroundColor}>
                ${label.name}
              </litmail-nav-menu-item>
            `)}
          </litmail-nav-menu>
        </top-app-bar>

        <div slot="appContent">
          ${this.threads?.map((thread) => html`
            <litmail-thread
                .client=${this._gmailClient}
                .thread=${thread}
                .labels=${this.labelMap}
                .users=${this.users}>
            </litmail-thread>
          `)}
        </div>
      </mwc-drawer>
    `;
  }

  firstUpdated() {
    const inboxNavItem = this.shadowRoot?.querySelector('[label-id="INBOX"') as LitMailNavMenuItem;
    this._navMenu.selectedItem = inboxNavItem;
  }

  async hideLoadingSpinner() {
    const el = document.querySelector('#refresh-spinner-container');
    if (el) {
      el.classList.add('shrink');
      // wait for shrink animation to finish.
      // TODO(justinfagnani): listen to animation event?
      await new Promise((res) => setTimeout(res, 300));
      this.syncing = false;
    }
  }

  /**
   * Loads sample data.
   */
  async loadTestData() {
    return Promise.all([
      (async () => {
        const response = await fetch('/data/users.json');
        this.users = await response.json();
      })(),
      (async () => {
        const response = await fetch('/data/threads.json');
        this.threads = await response.json();
      })(),
      (async () => {
        const response = await fetch('/data/labels.json');
        this.labels = await response.json();
      })(),
    ]);    
  }
}
