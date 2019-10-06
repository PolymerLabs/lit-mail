import {LitElement, css, html, customElement} from 'lit-element';

import '@material/mwc-button';


@customElement('litmail-login')
export class LitMailLogin extends LitElement {
  static styles = css`
    :host {
      display: flex;
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      background: rgba(127, 127, 127, 0.5);
      z-index: 9999;
      align-items: center;
      justify-content: center;
    }
    #dialog {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 600px;
      height: 400px;
      background: white;
    }
  `;

  render() {
    return html`
      <div id="dialog">
        <mwc-button raised
          label="Sign-In with Google"
          @click=${this._onSignInClick}>
        </mwc-button>
        <mwc-button raised
          label="Sign Out"
          @click=${this._onSignOutClick}>
        </mwc-button>
      </div>
    `;
  }

  _onSignInClick() {
    gapi.auth2.getAuthInstance().signIn();
  }

  _onSignOutClick() {
    gapi.auth2.getAuthInstance().signOut();
  }

}
