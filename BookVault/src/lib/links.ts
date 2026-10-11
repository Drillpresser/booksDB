// Public pages served by GitHub Pages from the repo's docs/ folder
export const SUPPORT_URL = 'https://drillpresser.github.io/booksDB/';
export const PRIVACY_URL = `${SUPPORT_URL}privacy.html`;
export const TERMS_URL = `${SUPPORT_URL}terms.html`;
export const SUPPORT_EMAIL = 'bookhoarder.app@gmail.com';

// A bookvault:// link isn't tappable in many messaging apps and does nothing
// without the app installed, so invites go through a web page that opens the
// app. The token rides in the fragment, which is never sent to the server.
export function inviteUrl(token: string): string {
  return `${SUPPORT_URL}invite.html#${token}`;
}
