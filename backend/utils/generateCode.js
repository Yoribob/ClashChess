const { webcrypto } = require("crypto");

function generateCode(length = 6) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const arr = new Uint32Array(length);
  webcrypto.getRandomValues(arr);
  return Array.from(arr, (n) => alphabet[n % alphabet.length]).join("");
}

module.exports = { generateCode };
