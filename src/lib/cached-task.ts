import { UpdatingElement } from 'lit-element';

/**
 * Computes a value asynchronously and caches it, making it avaiable
 * synchronously.
 * 
 * CachedTask notifies an UpdatingElement implementation when its value has
 * changed.
 */
export class CachedTask<T> {
  private _host: UpdatingElement;
  private _compute: (...args: any[]) => Promise<T>;
  private _getDeps?: () => unknown[];
  private _deps?: unknown[];

  private _resolved = false;
  private _value?: T;
  private _promise?: Promise<void>;

  constructor(host: UpdatingElement, compute: (...args: any[]) => Promise<T>, getDeps?: () => unknown[]) {
    this._host = host;
    this._compute = compute;
    this._getDeps = getDeps;
  }

  /**
   * Gets the current value of the task, or undefined if the task is computing.
   * 
   * Triggers computation of the task if it hasn't been computed before, or if
   * the dependencies have changed.
   */
  get(): T|undefined {
    // By default, compute the first time
    let doCompute = this._promise === undefined;

    // If a getDeps function was provided, call it and check if the dependencies
    // have changed. If so, recompute.
    if (this._getDeps !== undefined) {
      const oldDeps = this._deps;
      const newDeps = this._getDeps();
      this._deps = newDeps;
      if (!(oldDeps === undefined && newDeps === undefined)) {
        if (oldDeps === undefined || newDeps === undefined || 
              oldDeps.length !== newDeps.length) {
          doCompute = true;
        } else {
          for (let i = 0; i < newDeps.length; i++) {
            if (oldDeps[i] !== newDeps[i]) {
              doCompute = true;
              break;
            }
          }
        }
      }
    }
    if (doCompute) {
      // Make sure we're not returning stale values while computing.
      // TODO: are there times when we _do_ want to return the stale value?
      //       Should that be an option?
      this._resolved = false;
      this._promise = this._compute(...(this._deps || [])).then((v) => {
        this._resolved = true;
        this._value = v;
        this._host.requestUpdate();
      });
      const pendingEvent = new CustomEvent('pending-state', {
        composed: true,
        bubbles: true,
        detail: {promise: this._promise}
      });
      this._host.dispatchEvent(pendingEvent);
    }
    return this._resolved ? this._value : undefined;
  }
}
