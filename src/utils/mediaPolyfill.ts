/**
 * Media playback protection utility.
 * Intercepts HTMLMediaElement.prototype.play and unhandledrejection events
 * to gracefully handle benign browser-level DOMExceptions:
 * "The play() request was interrupted because the media was removed from the document."
 * (https://goo.gl/LdLk22)
 */

if (typeof window !== 'undefined') {
  // 1. Safe patch for HTMLMediaElement.prototype.play
  if (window.HTMLMediaElement && typeof window.HTMLMediaElement.prototype.play === 'function') {
    const originalPlay = window.HTMLMediaElement.prototype.play;

    window.HTMLMediaElement.prototype.play = function (...args: unknown[]) {
      try {
        const result = originalPlay.apply(this, args as []);
        if (result && typeof result.catch === 'function') {
          return result.catch((err: unknown) => {
            const error = err as Error | null;
            const msg = String(error?.message || err || '').toLowerCase();
            const name = error?.name || '';

            // Check for interruption or abort when video/audio element is removed or paused
            if (
              name === 'AbortError' ||
              name === 'NotAllowedError' ||
              msg.includes('interrupted') ||
              msg.includes('removed from the document') ||
              msg.includes('pause()')
            ) {
              // Harmless interruption when component unmounts or media resets
              return;
            }
            throw err;
          });
        }
        return result;
      } catch (err: unknown) {
        const error = err as Error | null;
        const msg = String(error?.message || err || '').toLowerCase();
        const name = error?.name || '';

        if (
          name === 'AbortError' ||
          msg.includes('interrupted') ||
          msg.includes('removed from the document')
        ) {
          return Promise.resolve();
        }
        throw err;
      }
    };
  }

  // 2. Window-level unhandled rejection listener for any lingering media interruptions
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const msg = String(reason?.message || reason || '').toLowerCase();
    const name = reason?.name || '';

    if (
      name === 'AbortError' ||
      msg.includes('interrupted') ||
      msg.includes('removed from the document') ||
      msg.includes('the play() request was interrupted')
    ) {
      // Prevent the error from escalating to console unhandled rejection / error report
      event.preventDefault();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
    }
  });
}

export {};
