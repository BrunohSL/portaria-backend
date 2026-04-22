const crypto = require('crypto');

function generateSecurePassword(length = 14) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%&*';
  const all = upper + lower + digits + special;

  let password = '';
  // Garantir pelo menos um de cada tipo
  password += upper[crypto.randomInt(upper.length)];
  password += lower[crypto.randomInt(lower.length)];
  password += digits[crypto.randomInt(digits.length)];
  password += special[crypto.randomInt(special.length)];

  // Preencher o restante
  for (let i = password.length; i < length; i++) {
    password += all[crypto.randomInt(all.length)];
  }

  // Embaralhar
  return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
}

module.exports = { generateSecurePassword };
