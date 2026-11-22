/** Full page navigation. Used after sign-in and sign-out so no client state outlives the session. */
export function hardNavigate(url: string) {
  window.location.href = url;
}
