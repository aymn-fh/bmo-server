const admin = require('firebase-admin');

let _initialized = false;
let _initErrorLogged = false;

function _tryInit() {
  if (_initialized) return true;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const jsonBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  try {
    if (admin.apps.length) {
      _initialized = true;
      return true;
    }

    const rawJson =
      (jsonBase64 && jsonBase64.trim()
        ? Buffer.from(jsonBase64.trim(), 'base64').toString('utf8')
        : null) || (json && json.trim() ? json.trim() : null);

    if (rawJson) {
      const serviceAccount = JSON.parse(rawJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      _initialized = true;
      return true;
    }

    // Optional: allow ADC / managed envs
    if (projectId && projectId.trim()) {
      admin.initializeApp({
        projectId: projectId.trim(),
      });
      _initialized = true;
      return true;
    }

    if (!_initErrorLogged) {
      console.warn(
        '⚠️ Push disabled: missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID'
      );
      _initErrorLogged = true;
    }
    return false;
  } catch (e) {
    if (!_initErrorLogged) {
      console.warn('⚠️ Push disabled: firebase-admin init failed:', e.message);
      _initErrorLogged = true;
    }
    return false;
  }
}

async function sendToTokens({ tokens, notification, data }) {
  if (!tokens || tokens.length === 0) return { successCount: 0, failureCount: 0 };
  if (!_tryInit()) return { successCount: 0, failureCount: tokens.length };

  // firebase-admin v12 supports sendEachForMulticast
  const message = {
    tokens,
    notification,
    data,
    android: {
      priority: 'high',
    },
  };

  const res = await admin.messaging().sendEachForMulticast(message);
  return { successCount: res.successCount, failureCount: res.failureCount, responses: res.responses };
}

module.exports = {
  sendToTokens,
};
