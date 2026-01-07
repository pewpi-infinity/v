/**
 * Crypto Helpers - AES-GCM encryption and ECDH key exchange
 * Production-ready encryption utilities for secure token storage and P2P sync
 */

/**
 * Generate a random encryption key
 */
export async function generateKey() {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export key to raw format
 */
export async function exportKey(key) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  
  const exported = await crypto.subtle.exportKey('raw', key);
  return Array.from(new Uint8Array(exported));
}

/**
 * Import key from raw format
 */
export async function importKey(keyData) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  
  const keyArray = new Uint8Array(keyData);
  
  return await crypto.subtle.importKey(
    'raw',
    keyArray,
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 */
export async function encrypt(data, key) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  
  // Generate a random initialization vector
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Convert data to Uint8Array
  const encoder = new TextEncoder();
  const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    dataBuffer
  );
  
  // Return iv + encrypted data
  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  };
}

/**
 * Decrypt data using AES-GCM
 */
export async function decrypt(encryptedData, key) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  
  const iv = new Uint8Array(encryptedData.iv);
  const data = new Uint8Array(encryptedData.data);
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    data
  );
  
  // Convert to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * ECDH Key Exchange Helpers (stubs for P2P sync)
 */

/**
 * Generate ECDH key pair for P2P key exchange
 */
export async function generateECDHKeyPair() {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  
  return await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Export public key for sharing with peer
 */
export async function exportPublicKey(keyPair) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  
  const exported = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  return Array.from(new Uint8Array(exported));
}

/**
 * Import peer's public key
 */
export async function importPublicKey(keyData) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  
  const keyArray = new Uint8Array(keyData);
  
  return await crypto.subtle.importKey(
    'raw',
    keyArray,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    []
  );
}

/**
 * Derive shared secret from own private key and peer's public key
 */
export async function deriveSharedSecret(ownKeyPair, peerPublicKey) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }
  
  return await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: peerPublicKey
    },
    ownKeyPair.privateKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Helper to convert ArrayBuffer to base64
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper to convert base64 to ArrayBuffer
 */
export function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default {
  generateKey,
  exportKey,
  importKey,
  encrypt,
  decrypt,
  generateECDHKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedSecret,
  arrayBufferToBase64,
  base64ToArrayBuffer
};
