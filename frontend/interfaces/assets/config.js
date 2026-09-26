/* Set hosted API URLs here when preparing a shareable preview. No secrets belong in this file. */
(() => {
  const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  // A static public deployment has no private API/database behind it. Keep the
  // local VS Code workflow connected to Flask, and use guest demo access online.
  window.GOVBRIDGE_DEMO_MODE = window.GOVBRIDGE_DEMO_MODE ?? !localHost;
  window.GOVBRIDGE_API_BASE = window.GOVBRIDGE_API_BASE ||
    (localHost ? 'http://127.0.0.1:5000' : window.location.origin);
  window.GOVBRIDGE_CHAT_API_URL = window.GOVBRIDGE_CHAT_API_URL ||
    (localHost ? 'http://127.0.0.1:5001/api/chat' : `${window.location.origin}/chat/api/chat`);
})();
