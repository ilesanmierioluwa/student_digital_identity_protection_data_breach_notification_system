const crypto = require('crypto');

const KEY = Buffer.from(process.env.AES_ENCRYPTION_KEY, 'hex');
const ALGO = 'aes-256-gcm';

if (!KEY || KEY.length !== 32) {
  throw new Error('AES_ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars)');
}

const encrypt = (plaintext) => {
  if (plaintext === null || plaintext === undefined || plaintext === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

const decrypt = (payload) => {
  if (!payload) return null;
  const [ivHex, tagHex, dataHex] = payload.split(':');
  if (!ivHex || !tagHex || !dataHex) return null;
  try {
    const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch (err) {
    return null;
  }
};

module.exports = { encrypt, decrypt };
