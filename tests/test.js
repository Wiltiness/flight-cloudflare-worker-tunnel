import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerContent = fs.readFileSync(path.join(__dirname, '../_worker.js'), 'utf-8');
const match = workerContent.match(/const _B64 = "([^"]+)";/);
if (!match) throw new Error("Missing _B64 in _worker.js");

const _B64 = match[1];
const UUID_HEX = "d342d11e-d424-4583-b36e-524ab1f0afa4".replace(/-/g, "");

async function _run() {
  const _wb = Buffer.from(_B64, 'base64');
  const { instance: _ins } = await WebAssembly.instantiate(_wb);
  const _m = _ins.exports;

  const _ub = new Uint8Array(16);
  for (let _i = 0; _i < 16; _i++) {
    _ub[_i] = parseInt(UUID_HEX.substr(_i * 2, 2), 16);
  }

  const _tgt_h = "www.baidu.com";
  const _tgt_p = 80;
  const _hb = Buffer.from(_tgt_h);
  const _pay = Buffer.from(`GET / HTTP/1.1\r\nHost: ${_tgt_h}\r\nConnection: close\r\nUser-Agent: curl/7.88.1\r\n\r\n`);

  const _pkt = Buffer.concat([
    Buffer.from([0x00]),
    Buffer.from(_ub),
    Buffer.from([0x00]),
    Buffer.from([0x01]),
    Buffer.from([(_tgt_p >> 8) & 0xff, _tgt_p & 0xff]),
    Buffer.from([0x02]),
    Buffer.from([_hb.length]),
    _hb,
    _pay
  ]);

  const _rp = _m._a(_pkt.length);
  const _up = _m._a(16);
  const _op = _m._a(512);

  const _mem = new Uint8Array(_m.memory.buffer);
  _mem.set(_pkt, _rp);
  _mem.set(_ub, _up);

  const _code = _m._p(_rp, _pkt.length, _up, _op, 512);
  if (_code !== 0) throw new Error(`Parse failed with code: ${_code}`);

  const _ov = new Uint8Array(_m.memory.buffer, _op, 512);
  const _port = (_ov[2] << 8) | _ov[3];
  const _offset = (_ov[4] << 8) | _ov[5];
  const _len = _ov[7];
  const _host = new TextDecoder().decode(_ov.subarray(8, 8 + _len));

  const _sock = net.createConnection({ host: _host, port: _port }, () => {
    _sock.write(_pkt.subarray(_offset));
  });

  const _res = [];
  _sock.on("data", (_c) => _res.push(_c));
  _sock.on("end", () => {
    const _txt = Buffer.concat(_res).toString();
    console.log(`[PASS] Remote target: ${_host}:${_port}`);
    console.log(`[PASS] Response: ${_txt.split("\r\n")[0]}`);
  });
  _sock.on("error", (_e) => console.error("Socket error:", _e));
}

_run().catch(console.error);
