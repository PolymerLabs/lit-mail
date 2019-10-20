/// <reference types="gapi.client" />
/// <reference types="gapi.client.gmail" />

import { API_KEY, CLIENT_ID } from './credentials.js';
import { UpdatingElement } from 'lit-element';

// Array of API discovery doc URLs for APIs used by the quickstart
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

export type GoogleUser = gapi.auth2.GoogleUser;
export type BasicProfile = gapi.auth2.BasicProfile;
export type Label = gapi.client.gmail.Label & {
  color?: {
    textColor: string;
    backgroundColor: string;
  }
};
export type Thread = gapi.client.gmail.Thread;
export type Message = gapi.client.gmail.Message;
export type MessagePart = gapi.client.gmail.MessagePart;
export type MessagePartBody = gapi.client.gmail.MessagePartBody;
export type MessagePartHeader = gapi.client.gmail.MessagePartHeader;

export interface ThreadMetadata {
  from?: string;
  to?: string;
  date?: string;
  subject?: string;
  labelIds: Set<string>;
}

const FROM_HEADER_REGEX = new RegExp(/"?(.*?)"?\s?<(.*)>/);

export interface ParsedMessage {
  id: Message['id'];
  threadId: Message['threadId'];
  labelIds: Message['labelIds'];
  from: ParsedAddress;
  snippet: Message['snippet'];
  historyId:  Message['historyId'];
  internalDate: Message['internalDate'];
  headers: Map<string, string>;

  textHtml?: string;
  textPlain?: string;

  attachments: ParsedAttachment[];
}

export interface ParsedAttachment {
  inline: boolean;
  filename?: string;
  mimeType?: string;
  size?: number;
  attachmentId?: string;
  headers: Map<string, string>;
}

export interface ParsedAddress {
  name: string;
  email: string;
}

export class GMailClient {
  static async load() {
    // Load the gapi script
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.addEventListener('load', () => resolve());
      script.addEventListener('error', (e) => reject(e.error));
      script.src = 'https://apis.google.com/js/api.js';
      document.head.append(script);
    });

    console.log('gapi loaded', gapi);

    // load the client and auth2 APIs
    await new Promise((resolve, reject) => {
      gapi.load('client:auth2', {
        callback: resolve,
        onerror: reject,
      });
    });

    console.log('client:auth2 loaded', gapi.client);

    await gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: SCOPES,
    });

    await gapi.client.load('gmail', 'v1');

    // Why???
    (gapi.client as any).users = (gapi.client as any).gmail.users;

    console.log('gmail loaded', gapi.client.users, gapi.client);

    return new GMailClient();
  }


  get isSignedIn() {
    return gapi.auth2.getAuthInstance().isSignedIn.get();
  }

  onSignedInChange(listener: (signedIn: boolean) => any) {
    gapi.auth2.getAuthInstance().isSignedIn.listen(listener);
  }

  get currentUser() {
    return gapi.auth2.getAuthInstance().currentUser.get();
  }

  private _getLabelsPromise?: Promise<Label[]>;
  private _fullLabels?: Label[];
  private _labelMap?: Map<string, Label>;
  private _labelMapPromise?: Promise<Map<string, Label>>;

  getLabelMapTask(host: UpdatingElement) {
    if (this._labelMap !== undefined) {
      return this._labelMap;
    }
    this.getLabelMap().then(() => host.requestUpdate());
    return;
  }

  async getLabelMap(): Promise<Map<string, Label>> {
    if (this._labelMap !== undefined) {
      return this._labelMap;
    }
    if (this._labelMapPromise === undefined) {
      this._labelMapPromise = this.getLabels().then(() => {
        this._labelMap = new Map<string, Label>();
        for (const label of this._fullLabels!) {
          this._labelMap.set(label.id!, label);
        }
        return this._labelMap!;
      });
    }
    return this._labelMapPromise;
  }

  async getLabels(): Promise<Label[]> {
    if (this._getLabelsPromise === undefined) {
      this._getLabelsPromise = this._getLabels();
      this._fullLabels = await this._getLabelsPromise;
    }
    return this._getLabelsPromise;
  }

  private async _getLabels() {
    const response = await gapi.client.users.labels.list({
      userId: 'me',
    });
    const labels = response.result.labels;
    if (labels === undefined) {
      return [];
    }
    return await Promise.all(labels.map(async (label) => {
      if (label.id === undefined) {
        return label;
      }
      const response = await gapi.client.users.labels.get({
        userId: 'me',
        id: label.id,
      });
      return response.result;
    }));
  }

  async getThreads(options?: {labelIds?: string[]}) {
    const response = await gapi.client.users.threads.list({
      userId: 'me',
      maxResults: 10,
      labelIds: options?.labelIds as any,
    });
    const threads = response.result.threads;
    return threads;
  }

  async getFullThread(id: string): Promise<Thread> {
    const response = await gapi.client.users.threads.get({
      id,
      userId: 'me',
    });
    return response.result;
  }

}

export const getHeaderMap = (headers?: MessagePartHeader[]) => {
  const map = new Map();
  if (headers !== undefined) {
    for (const header of headers) {
      map.set(header.name!.toLowerCase(), header.value);
    }
  }
  return map;
};

export const getThreadMetadata = (thread: Thread): ThreadMetadata => {
  const metadata: ThreadMetadata = {
    labelIds: new Set(),
  };
  // Get the subject from the first message so we don't include "Re:"
  const firstMessage = thread.messages?.[0];
  const firstMessageHeaders = getHeaderMap(firstMessage?.payload?.headers);
  metadata.subject = firstMessageHeaders.get('subject');

  // Get the rest from the last message so we display the most recent date and
  // to list
  const lastMessage = thread.messages?.[thread.messages.length - 1];
  const lastMessageHeaders = getHeaderMap(lastMessage?.payload?.headers);
  metadata.date = lastMessageHeaders.get('date');
  metadata.from = lastMessageHeaders.get('from');
  metadata.to = lastMessageHeaders.get('to');

  if (thread.messages) {
    for (const message of thread.messages) {
      if (message.labelIds) {
        for (const labelId of message.labelIds) {
          metadata.labelIds.add(labelId);
        }
      }
    }
  }

  // TODO: from should be a list
  return metadata;
};

export const parseAddress = (address: string): ParsedAddress => {
  const match = address.match(FROM_HEADER_REGEX);

  let name: string;
  let email: string;

  // Use name if one was found. Otherwise, use email address.
  if (match) {
    // If no a name, use email address for displayName.
    name = match[1].length ? match[1] : match[2];
    email = match[2];
  } else {
    name = address.split('@')[0];
    email = address;
  }
  name = name.split('@')[0]; // Ensure email is split.
  return {name, email};
};

export const parseMessage = (message: Message): ParsedMessage => {

  const parsedMessage = {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds,
    snippet: message.snippet,
    historyId: message.historyId,
    internalDate: message.internalDate,
    headers: getHeaderMap(message.payload!.headers),
    attachments: [],
  } as any as ParsedMessage;

  const handlePart = (part: MessagePart) => {
    const body = part.body;
    if (body !== undefined) {
      const headers = getHeaderMap(part.headers);
      parsedMessage.from = parsedMessage.from ?? (headers.has('from') && parseAddress(headers.get('from')!));

      const mimeType = part.mimeType;
      const isHtml = mimeType?.includes('text/html');
      const isPlain = mimeType?.includes('text/plain');

      const contentDisposition = headers.get('content-disposition');
      const isAttachment = contentDisposition && contentDisposition.includes('attachment');
      const isInline = contentDisposition && contentDisposition.includes('inline');

      if (isAttachment || isInline) {
        parsedMessage.attachments.push({
          inline: isInline,
          filename: part.filename,
          mimeType: part.mimeType,
          size: body.size,
          attachmentId: body.attachmentId,
          headers: getHeaderMap(part.headers),
        });
      } else {
        if (isHtml) {
          parsedMessage.textHtml = body.data && decode(body.data);
        } else if (isPlain) {
          parsedMessage.textPlain = body.data && decode(body.data);
        }
      }
    }
    if (part.parts) {
      for (const subpart of part.parts) {
        handlePart(subpart);
      }
    }
  };

  if (message.payload) {
    handlePart(message.payload);
  }
  return parsedMessage;
};

export const getMessageBody = (message: Message) => {
  if (message.payload?.mimeType === 'multipart/mixed') {
    return getMixedBody(message.payload!);
  }
  if (message.payload?.mimeType === 'multipart/alternative') {
    return getAlternativeBody(message.payload!);
  }
  if (message.payload?.mimeType === 'text/plain') {
    return message.payload?.body?.data && decode(message.payload.body.data);
  }
  console.log('unknown body type', message.payload?.mimeType);
  return;
};

const getMixedBody = (part: MessagePart) => {
  const parts = part.parts;
  const bodyPartsPart = parts?.find((p) => p.mimeType === 'multipart/alternative');
  return bodyPartsPart && getAlternativeBody(bodyPartsPart);
};

const getAlternativeBody = (part: MessagePart) => {
  const htmlBodyPart = part.parts?.find((p) => p.mimeType === 'text/html');
  if (htmlBodyPart?.body?.data) {
    return decode(htmlBodyPart.body.data);
  }
  const plainBodyPart = part.parts?.find((p) => p.mimeType === 'text/plain');
  return plainBodyPart?.body?.data && decode(plainBodyPart.body.data);
};


const decode = (s: string) => decodeURIComponent(escape(atob(s.replace(/\-/g, '+').replace(/\_/g, '/'))));

// function urlB64Decode(string) {
//   return string
//    ? decodeURIComponent(escape(b64Decode(string.replace(/\-/g, '+').replace(/\_/g, '/'))))
//    : '';
// }

  // getMessageHeader(message: Message, headerName: string) {
  //   if (message.payload === undefined || message.payload.headers === undefined) {
  //     return;
  //   }
  //   const headers = message.payload.headers;
  //   for (const header of headers) {
  //     if (header.name === headerName) {
  //       return header.value;
  //     }
  //   }
  //   return;
  // }

