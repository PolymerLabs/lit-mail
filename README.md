# LitMail

This is a very rough start of a Gmail client written in TypeScript with LitElement for UI components. The goal is to find and solve real-world application-level coordination problems, not build a real email client.

lit-mail was initially forked from https://github.com/ebidel/polymer-gmail

Not all vestigages of polymer-gmail have been removed, so if something in here looks unrelated to the rest, that might be why.

## Setup

### Gmail API Key

Create a file named `/src/lib/credentials.ts` that exports `CLIENT_ID` and `API_KEY`. You can get the API key here: https://developers.google.com/gmail/api/quickstart/js


```ts
// Client ID and API key from the Developer Console
// DO NOT CHECK THIS FILE IN
export const CLIENT_ID = '...';
export const API_KEY = '...';
```

### Build and Run

```sh
npm i
npm run build
npm run serve
```
