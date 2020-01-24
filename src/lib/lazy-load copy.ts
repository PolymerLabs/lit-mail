/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {directive, NodePart} from 'lit-html';

interface LoadingState {
  importPromise?: Promise<unknown>;
  importResolved: boolean;
}

const states = new WeakMap<NodePart, LoadingState>();

export const lazyLoad = directive((doImport: () => Promise<unknown>, t: any) => {

  return (part: NodePart) => {
    let state = states.get(part);
    if (state === undefined) {
      state = {importResolved: false};
      states.set(part, state);
    }
    if (state.importPromise === undefined) {
      state.importPromise = doImport().then(() => {
        state!.importResolved = true;
      });
    }
    part.setValue(t);
    if (!state.importResolved) {
      const event = new CustomEvent('pending-state', {
        composed: true,
        bubbles: true,
        detail: {promise: state.importPromise}
      });
      part.startNode.parentNode!.dispatchEvent(event);
    }
  };
});
