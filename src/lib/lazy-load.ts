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

const resolved = new WeakSet<NodePart>();

export const lazyLoad = directive((importPromise: Promise<unknown>, t: any) =>
  (part: NodePart) => {
    if (!resolved.has(part)) {
      importPromise.then(() => resolved.add(part));
      const event = new CustomEvent('pending-state', {
        composed: true,
        bubbles: true,
        detail: {promise: importPromise}
      });
      part.startNode.parentNode!.dispatchEvent(event);
    }
    part.setValue(t);
  }
);
