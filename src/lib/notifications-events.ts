export function emitNotificationUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("notifications:updated"));
  }
}
