import { UpdatingElement } from 'lit-element';

export class CachedPromise<T> {
  private _host: UpdatingElement;
  private _compute: Promise<T>;
  private _value: T|undefined;

  constructor(host: UpdatingElement, compute: () => Promise<T>) {
    this._host = host;
    this._compute = compute;
    promise.then(() => host.requestUpdate());
  }

  get value() {
    
  }
}
