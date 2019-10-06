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

import {directive, NodePart, Part, isPrimitive} from 'lit-html';

interface PreviousValue {
  readonly value: unknown;
  readonly fragment: DocumentFragment;
}

const previousValues = new WeakMap<NodePart, PreviousValue>();

/**
 * Renders Gmail message bodies as HTML. Inserts <litmail-quote-button> elements
 * before any <div class="gmail_quote"> so the UI can display a discloseure
 * button.
 *
 * Note, this is unsafe to use with any user-provided input that hasn't been
 * sanitized or escaped, as it may lead to cross-site-scripting
 * vulnerabilities.
 */
export const messageBody = directive((value: unknown) => (part: Part): void => {
  if (!(part instanceof NodePart)) {
    throw new Error('messageBody can only be used in text bindings');
  }

  const previousValue = previousValues.get(part);

  if (previousValue !== undefined && isPrimitive(value) &&
      value === previousValue.value && part.value === previousValue.fragment) {
    return;
  }

  const template = document.createElement('template');
  template.innerHTML = value as string;
  const templateDoc = template.content.ownerDocument!;

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const el = walker.currentNode as HTMLElement;
    if (el.tagName === 'div' && el.classList.contains('gmail_quote')) {
      el.parentElement!.insertBefore(templateDoc.createElement('litmail-quote-button'), el);
    }
  }

  const fragment = document.importNode(template.content, true);
  part.setValue(fragment);
  previousValues.set(part, {value, fragment});
});
