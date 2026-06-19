import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { v4 as uuidv4 } from 'uuid';
import { saveVaultItem, getVaultItems, deleteVaultItem } from '../db/database';

const KEY_STORE = 'vault_aes_key';

// Generate or retrieve a vault encryption key
const getOrCreateKey = async (): Promise<string> => {
  let key = await SecureStore.getItemAsync(KEY_STORE);
  if (!key) {
    // Generate 256-bit random key
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    key = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(KEY_STORE, key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  return key;
};

// Convert hex key to CryptoKey
const importKey = async (hexKey: string): Promise<CryptoKey> => {
  const keyBytes = new Uint8Array(hexKey.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
};

// Authenticate user biometrically before vault access
export const authenticateVault = async (): Promise<boolean> => {
  const hasBio = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();

  if (!hasBio || !isEnrolled) return true; // Skip if no biometrics

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to access Vault',
    fallbackLabel: 'Use PIN',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return result.success;
};

// Encrypt a string with AES-GCM
export const encryptData = async (plaintext: string): Promise<{ encrypted: string; iv: string }> => {
  const hexKey = await getOrCreateKey();
  const key = await importKey(hexKey);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  const encrypted = btoa(String.fromCharCode(...new Uint8Array(cipherBuf)));
  const ivStr = Array.from(iv, (b) => b.toString(16).padStart(2, '0')).join('');
  return { encrypted, iv: ivStr };
};

// Decrypt AES-GCM encrypted data
export const decryptData = async (encrypted: string, ivHex: string): Promise<string> => {
  const hexKey = await getOrCreateKey();
  const key = await importKey(hexKey);

  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const cipherBytes = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);

  return new TextDecoder().decode(decrypted);
};

// ─── High-level vault operations ───────────────────────────────────────────────

export const saveVaultDocument = async (
  category: string,
  data: Record<string, string>
): Promise<string> => {
  const id = uuidv4();
  const { encrypted, iv } = await encryptData(JSON.stringify(data));
  await saveVaultItem(id, category, encrypted, iv);
  return id;
};

export const getVaultDocuments = async (category?: string) => {
  const items = await getVaultItems(category);
  const decrypted = [];
  for (const item of items) {
    try {
      const plain = await decryptData(item.encryptedData, item.iv);
      decrypted.push({ id: item.id, category: item.category, data: JSON.parse(plain), createdAt: item.createdAt });
    } catch {
      // Skip corrupted items
    }
  }
  return decrypted;
};

export const deleteVaultDocument = async (id: string) => {
  await deleteVaultItem(id);
};
