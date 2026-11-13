export function triggerHaptic(duration = 12) {
  try {
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(duration);
    }
  } catch {}
}
