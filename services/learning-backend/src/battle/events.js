/** Shared in-process notification bus for REST and Socket.IO adapters. */
export function createBattleNotifier() {
  const listeners = new Set();
  return {
    publish(event) {
      for (const listener of listeners) {
        try { listener(event); } catch { /* Notifications must not break requests. */ }
      }
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('listener must be a function');
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
