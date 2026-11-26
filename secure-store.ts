import { safeStorage } from 'electron';
import { getSecret, setSecret } from './db';

/** Fail closed when the operating system cannot protect credentials. */
export async function assertSecureStorageAvailable(): Promise<void> {
  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    throw new Error('OS secure credential storage is unavailable. NOVA will not save API keys or refresh tokens on this device. Configure a protected environment variable or enable your OS keychain and restart NOVA.');
  }

  // Electron may fall back to basic_text on Linux when no desktop keyring exists.
  // That backend does not provide OS-backed encryption, so reject it explicitly.
  if (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text') {
    throw new Error('Linux secure storage is using the insecure basic_text backend. Start a supported Secret Service (for example GNOME Keyring or KWallet), then restart NOVA. No credential was saved.');
  }
}

export async function storeSecret(name: string, value: string): Promise<void> {
  const normalized = value.trim();
  if (!normalized) {
    setSecret(name, null);
    return;
  }
  await assertSecureStorageAvailable();
  const encrypted = await safeStorage.encryptStringAsync(normalized);
  setSecret(name, encrypted.toString('base64'));
}

export async function loadSecret(name: string): Promise<string | null> {
  const encrypted = getSecret(name);
  if (!encrypted) return process.env[name] ?? null;

  await assertSecureStorageAvailable();
  const decoded = await safeStorage.decryptStringAsync(Buffer.from(encrypted, 'base64'));
  if (decoded.shouldReEncrypt) {
    const replacement = await safeStorage.encryptStringAsync(decoded.result);
    setSecret(name, replacement.toString('base64'));
  }
  return decoded.result;
}

export async function isSecretSet(name: string): Promise<boolean> {
  try { return Boolean(await loadSecret(name)); }
  catch { return false; }
}
