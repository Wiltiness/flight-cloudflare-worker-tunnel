import { connect } from 'cloudflare:sockets';

const _B64 = "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";

let _id = null;
let _log_done = false;
let _core_mod = null;

async function _ld() {
  if (!_core_mod) {
    const _s = atob(_B64);
    const _len = _s.length;
    const _u = new Uint8Array(_len);
    for (let _i = 0; _i < _len; _i++) {
      _u[_i] = _s.charCodeAt(_i);
    }
    const { instance: _ins } = await WebAssembly.instantiate(_u);
    _core_mod = _ins.exports;
  }
  return _core_mod;
}

function _parse_u(_str) {
  const _c = _str.replace(/-/g, "");
  const _b = new Uint8Array(16);
  for (let _i = 0; _i < 16; _i++) {
    _b[_i] = parseInt(_c.substring(_i * 2, _i * 2 + 2), 16);
  }
  return _b;
}

function _fmt_url(_u, _h, _p, _tls) {
  const _sec = _tls ? "tls" : "none";
  const _tag = encodeURIComponent(`node-${_h}`);
  return `vless://${_u}@${_h}:${_p}?encryption=none&security=${_sec}&type=ws&host=${_h}&path=%2F#${_tag}`;
}

export default {
  async fetch(_req, _env, _ctx) {
    if (!_id) {
      _id = crypto.randomUUID();
    }
    const _act_u = _env?.UUID || _id;
    const _u = new URL(_req.url);
    const _h = _req.headers.get("Host") || _u.hostname;
    const _is_tls = _u.protocol === "https:" || _req.headers.get("x-forwarded-proto") === "https";
    const _port = _u.port || (_is_tls ? "443" : "80");
    const _link = _fmt_url(_act_u, _h, _port, _is_tls);

    if (!_log_done) {
      console.log(`[ONLINE] Access URL:\n${_link}`);
      _log_done = true;
    }

    if (_req.headers.get("Upgrade") !== "websocket") {
      return new Response(`[SERVICE ONLINE]\n\nUUID: ${_act_u}\n\nSHARE LINK:\n${_link}\n`, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const _pair = new WebSocketPair();
    const [_c_ws, _s_ws] = Object.values(_pair);
    _s_ws.accept();

    _handle(_s_ws, _act_u).catch(() => {
      try { _s_ws.close(1011, "Internal Error"); } catch (_) {}
    });

    return new Response(null, {
      status: 101,
      webSocket: _c_ws,
    });
  }
};

async function _handle(_ws, _uuid) {
  const _m = await _ld();
  const _ub = _parse_u(_uuid);

  let _init = false;
  let _sock = null;
  let _wtr = null;

  _ws.addEventListener("message", async (_ev) => {
    try {
      const _d = _ev.data instanceof ArrayBuffer 
        ? new Uint8Array(_ev.data) 
        : new Uint8Array(await _ev.data.arrayBuffer());

      if (!_init) {
        const _rp = _m._a(_d.length);
        const _up = _m._a(16);
        const _op = _m._a(512);

        const _mem = new Uint8Array(_m.memory.buffer);
        _mem.set(_d, _rp);
        _mem.set(_ub, _up);

        const _res = _m._p(_rp, _d.length, _up, _op, 512);
        if (_res !== 0) {
          _ws.close(1008, "Rejected");
          return;
        }

        const _ov = new Uint8Array(_m.memory.buffer, _op, 512);
        const _dst_prt = (_ov[2] << 8) | _ov[3];
        const _po = (_ov[4] << 8) | _ov[5];
        const _al = _ov[7];
        const _dst_hst = new TextDecoder().decode(_ov.subarray(8, 8 + _al));

        _ws.send(new Uint8Array([0x00, 0x00]));

        _sock = connect({
          hostname: _dst_hst,
          port: _dst_prt,
        });

        _wtr = _sock.writable.getWriter();
        _init = true;

        _pipe(_sock.readable, _ws);

        if (_d.length > _po) {
          await _wtr.write(_d.subarray(_po));
        }
      } else {
        if (_wtr) {
          await _wtr.write(_d);
        }
      }
    } catch (_) {
      try { _ws.close(1011, "Stream Error"); } catch (_) {}
    }
  });

  _ws.addEventListener("close", () => {
    if (_wtr) {
      try { _wtr.releaseLock(); } catch (_) {}
    }
    if (_sock) {
      try { _sock.close(); } catch (_) {}
    }
  });
}

async function _pipe(_stm, _ws) {
  const _rdr = _stm.getReader();
  try {
    while (true) {
      const { value: _v, done: _d } = await _rdr.read();
      if (_d) break;
      if (_v && _ws.readyState === 1) {
        _ws.send(_v);
      }
    }
  } catch (_) {
  } finally {
    try { _ws.close(); } catch (_) {}
  }
}
