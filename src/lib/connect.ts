import { LitElement, property } from 'lit-element';

export interface Constructor<T> {
  new(...args: any[]): T;
}

export const connect = (store: any) => (Base) => class extends Base {
  props?: any;
  _unsubscribeFromStore?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribeFromStore = store.subscribe(() => {
      const newProps = this.constructor.mapStateToProps(store.getState());
      if (!shallowEqual(this.props, newProps)) {
        this.props = newProps;
        this.requestUpdate();
      }
    });
  }

  disconnectedCallback() {
    this._unsubscribeFromStore!();
    super.disconnectedCallback();
  }
};

// export const ReduxConnected = (base) => class extends base {

//   connectedCallback() {
//     super.connectedCallback();
//   }

// };
