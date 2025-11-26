import { x25519 } from '@noble/curves/ed25519';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { get, set } from 'idb-keyval';

const PRIVATE_KEY_STORAGE_KEY = 'algonive:messaging:private-key';
const PUBLIC_KEY_STORAGE_KEY = 'algonive:messaging:public-key';
const SESSION_KEY_LENGTH = 32;
const AES_KEY_LENGTH = 32;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ENVELOPE_INFO = encoder.encode('algonive-messaging-envelope');
const PAYLOAD_INFO = encoder.encode('algonive-messaging-payload');
const HKDF_ZERO_SALT = new Uint8Array(32);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const base64FromBytes = (bytes) => btoa(String.fromCharCode(...bytes));

const bytesFromBase64 = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const importAesKey = (rawKey) =>
  crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt', 'decrypt']);

const aesGcmEncrypt = async (keyBytes, data) => {
  const key = await importAesKey(keyBytes);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = typeof data === 'string' ? encoder.encode(data) : data;
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const cipherBytes = new Uint8Array(cipherBuffer);
  const authTag = cipherBytes.slice(cipherBytes.length - 16);
  const ciphertext = cipherBytes.slice(0, cipherBytes.length - 16);

  return {
    ciphertext: base64FromBytes(ciphertext),
    authTag: base64FromBytes(authTag),
    iv: base64FromBytes(iv)
  };
};

const aesGcmDecrypt = async (keyBytes, { ciphertext, authTag, iv }, asText = true) => {
  const key = await importAesKey(keyBytes);
  const cipherBytes = bytesFromBase64(ciphertext);
  const tagBytes = bytesFromBase64(authTag);
  const combined = new Uint8Array(cipherBytes.length + tagBytes.length);
  combined.set(cipherBytes, 0);
  combined.set(tagBytes, cipherBytes.length);

  const ivBytes = bytesFromBase64(iv);

  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, key, combined);
  const plainBytes = new Uint8Array(plainBuffer);
  return asText ? decoder.decode(plainBytes) : plainBytes;
};

const hkdfExpand = (secret, info, length = AES_KEY_LENGTH) =>
  hkdf(sha256, secret, HKDF_ZERO_SALT, info, length);

const deriveSharedSecret = (privateKeyBase64, publicKeyBase64) => {
  if (!privateKeyBase64 || !publicKeyBase64) {
    throw new Error('Missing keys for E2EE');
  }
  const privateKey = bytesFromBase64(privateKeyBase64);
  const publicKey = bytesFromBase64(publicKeyBase64);
  return x25519.scalarMult(privateKey, publicKey);
};

const ensureKeyMaterial = async () => {
  const privateKey = await get(PRIVATE_KEY_STORAGE_KEY);
  const publicKey = await get(PUBLIC_KEY_STORAGE_KEY);

  if (!privateKey || !publicKey) {
    throw new Error('Secure messaging keys missing. Please refresh.');
  }

  return { privateKey, publicKey };
};

export const getSocketBaseUrl = () => {
  const baseUrl = API_URL.replace(/\/api$/, '');
  console.log('Socket base URL:', baseUrl);
  return baseUrl;
};

export const loadOrCreateKeyPair = async () => {
  const existingPrivate = await get(PRIVATE_KEY_STORAGE_KEY);
  const existingPublic = await get(PUBLIC_KEY_STORAGE_KEY);

  if (existingPrivate && existingPublic) {
    return { privateKey: existingPrivate, publicKey: existingPublic };
  }

  const privateKeyBytes = x25519.utils.randomPrivateKey();
  const publicKeyBytes = x25519.getPublicKey(privateKeyBytes);

  const serialized = {
    privateKey: base64FromBytes(privateKeyBytes),
    publicKey: base64FromBytes(publicKeyBytes)
  };

  await set(PRIVATE_KEY_STORAGE_KEY, serialized.privateKey);
  await set(PUBLIC_KEY_STORAGE_KEY, serialized.publicKey);

  return serialized;
};

export const encryptMessagePayload = async ({
  plaintext,
  participantMap,
  recipientIds,
  senderId
}) => {
  const { privateKey, publicKey } = await ensureKeyMaterial();
  const sessionKey = crypto.getRandomValues(new Uint8Array(SESSION_KEY_LENGTH));

  const payloadEncryptionKey = hkdfExpand(sessionKey, PAYLOAD_INFO);
  const payloadResult = await aesGcmEncrypt(payloadEncryptionKey, plaintext);

  const envelopes = {};
  const targets = Array.from(new Set([...recipientIds, senderId]));

  await Promise.all(targets.map(async (targetId) => {
    const participant = participantMap[targetId];
    const targetPublicKey = participant?.publicKey || (targetId === senderId ? publicKey : null);

    if (!targetPublicKey) {
      throw new Error(`Missing public key for participant ${targetId}`);
    }

    const sharedSecret = deriveSharedSecret(privateKey, targetPublicKey);
    const envelopeKey = hkdfExpand(sharedSecret, ENVELOPE_INFO);
    const wrapped = await aesGcmEncrypt(envelopeKey, sessionKey);
    envelopes[targetId] = wrapped;
  }));

  return {
    ciphertext: payloadResult.ciphertext,
    iv: payloadResult.iv,
    authTag: payloadResult.authTag,
    metadata: {
      envelopes,
      senderPublicKey: publicKey
    }
  };
};

export const decryptMessagePayload = async ({
  ciphertext,
  iv,
  authTag,
  metadata,
  currentUserId
}) => {
  if (!metadata?.envelopes || !metadata?.senderPublicKey) {
    throw new Error('Encrypted metadata missing');
  }

  const envelope = metadata.envelopes[currentUserId];
  if (!envelope) {
    throw new Error('No session envelope for current user');
  }

  const { privateKey } = await ensureKeyMaterial();
  const sharedSecret = deriveSharedSecret(privateKey, metadata.senderPublicKey);
  const envelopeKey = hkdfExpand(sharedSecret, ENVELOPE_INFO);
  const sessionKeyBytes = await aesGcmDecrypt(envelopeKey, envelope, false);
  const payloadKey = hkdfExpand(sessionKeyBytes, PAYLOAD_INFO);
  return aesGcmDecrypt(payloadKey, { ciphertext, iv, authTag }, true);
};
