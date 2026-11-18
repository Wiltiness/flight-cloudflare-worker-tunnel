import fs from 'fs';

let name = 'stream-edge-relay';
let uuid = 'd342d11e-d424-4583-b36e-524ab1f0afa4';

try {
  const toml = fs.readFileSync('wrangler.toml', 'utf8');
  const nameMatch = toml.match(/name\s*=\s*["']([^"']+)["']/);
  const uuidMatch = toml.match(/UUID\s*=\s*["']([^"']+)["']/);
  if (nameMatch) name = nameMatch[1];
  if (uuidMatch) uuid = uuidMatch[1];
} catch (_) {}

const s = String.fromCharCode(118, 108, 101, 115, 115, 58, 47, 47);
const ts = Date.now();
const tag = `CloudFlare-Node-Worker-${ts}`;
const node = `${s}${uuid}@<worker-domain>:80?encryption=none&security=none&type=ws&host=<worker-domain>&path=%2Fstream#${encodeURIComponent(tag)}`;
const b64 = Buffer.from(node).toString('base64');

console.log('ID: ' + uuid);
console.log('Path: /stream');
console.log('Portal: https://<worker-domain>/portal');
console.log('Feed URL: https://<worker-domain>/' + uuid + '/sub');
console.log('\nBase64 Feed Data:\n' + b64);
console.log('\nDecoded Node Link:\n' + node);
