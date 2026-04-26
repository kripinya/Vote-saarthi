const crypto = require('crypto');

let keyPair = null;

async function generateKeyPair() {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    }, (err, publicKey, privateKey) => {
      if (err) reject(err);
      keyPair = { publicKey, privateKey };
      console.log('🔐 RSA key pair generated for vote encryption');
      resolve(keyPair);
    });
  });
}

function getPublicKey() {
  if (!keyPair) throw new Error('Keys not generated yet');
  return keyPair.publicKey;
}

function decryptVote(encryptedKeyB64, encryptedVoteB64, ivB64) {
  try {
    const encryptedKey = Buffer.from(encryptedKeyB64, 'base64');
    const decryptedAesKey = crypto.privateDecrypt(
      { key: keyPair.privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
      encryptedKey
    );
    const iv = Buffer.from(ivB64, 'base64');
    const encryptedVote = Buffer.from(encryptedVoteB64, 'base64');
    const authTag = encryptedVote.slice(-16);
    const ciphertext = encryptedVote.slice(0, -16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', decryptedAesKey, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, null, 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('Decryption error:', err.message);
    return null;
  }
}

function generateReceiptHash(voterId, timestamp) {
  return crypto.createHash('sha256').update(`${voterId}:${timestamp}:${crypto.randomBytes(16).toString('hex')}`).digest('hex').substring(0, 16).toUpperCase();
}

module.exports = { generateKeyPair, getPublicKey, decryptVote, generateReceiptHash };
