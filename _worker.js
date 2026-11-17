import { connect } from 'cloudflare:sockets';

const _PATH_PREFIX = "/stream";

const _CAMOUFLAGE_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Service Status</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f9fafb;color:#111827}
.card{background:#fff;padding:2rem;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);text-align:center}
h1{font-size:1.5rem;color:#10b981}</style></head>
<body><div class="card"><h1>System Operational</h1><p>All edge systems are currently operating normally.</p></div></body>
</html>`;

let _id = null;

function _parse_u(_str) {
  const _c = _str.replace(/-/g, "");
  const _b = new Uint8Array(16);
  for (let _i = 0; _i < 16; _i++) {
    _b[_i] = parseInt(_c.substring(_i * 2, _i * 2 + 2), 16);
  }
  return _b;
}

function _chk_d(_d) {
  const _s = _d.toLowerCase();
  return _s === "localhost" || _s.endsWith(".local") || _s.endsWith(".internal") || _s.endsWith(".lan") || _s.endsWith(".home.arpa");
}

function _p(_b, _u) {
  if (_b.length < 18) return { _err: 1 };
  if (_b[0] !== 0) return { _err: 2 };
  for (let _i = 0; _i < 16; _i++) {
    if (_b[1 + _i] !== _u[_i]) return { _err: 3 };
  }
  const _al = _b[17];
  let _c = 18 + _al;
  if (_c + 4 > _b.length) return { _err: 1 };
  const _cmd = _b[_c++];
  if (_cmd !== 1 && _cmd !== 2) return { _err: 4 };
  const _prt = (_b[_c] << 8) | _b[_c + 1];
  _c += 2;
  const _at = _b[_c++];
  let _hst = "";

  if (_at === 1) {
    if (_c + 4 > _b.length) return { _err: 1 };
    const _ip = [_b[_c], _b[_c + 1], _b[_c + 2], _b[_c + 3]];
    _c += 4;
    if (_ip[0] === 0 || _ip[0] === 10 || _ip[0] === 127 || (_ip[0] === 169 && _ip[1] === 254) ||
        (_ip[0] === 172 && (_ip[1] >= 16 && _ip[1] <= 31)) || (_ip[0] === 192 && _ip[1] === 168) || _ip[0] >= 224) {
      return { _err: 5 };
    }
    _hst = _ip.join(".");
  } else if (_at === 2) {
    const _dl = _b[_c++];
    if (_c + _dl > _b.length) return { _err: 1 };
    _hst = new TextDecoder().decode(_b.subarray(_c, _c + _dl));
    _c += _dl;
    if (_chk_d(_hst)) return { _err: 5 };
  } else if (_at === 3) {
    if (_c + 16 > _b.length) return { _err: 1 };
    const _ip6 = _b.subarray(_c, _c + 16);
    _c += 16;
    if (_ip6.every((_v, _idx) => (_idx === 15 ? _v === 1 : _v === 0)) ||
        (_ip6[0] & 0xfe) === 0xfc || (_ip6[0] === 0xfe && (_ip6[1] & 0xc0) === 0x80)) {
      return { _err: 5 };
    }
    const _parts = [];
    for (let _i = 0; _i < 8; _i++) {
      _parts.push(((_ip6[_i * 2] << 8) | _ip6[_i * 2 + 1]).toString(16));
    }
    _hst = _parts.join(":");
  } else {
    return { _err: 6 };
  }

  return { _err: 0, _cmd, _prt, _hst, _po: _c };
}

export default {
  async fetch(_req, _env, _ctx) {
    const _u = new URL(_req.url);

    if (!_u.pathname.startsWith(_PATH_PREFIX) || _req.headers.get("Upgrade") !== "websocket") {
      return new Response(_CAMOUFLAGE_HTML, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (!_id) {
      _id = crypto.randomUUID();
    }
    const _act_u = _env?.UUID || _id;

    // Support Early Data (Xray Sec-WebSocket-Protocol 0-RTT header)
    const _ed_hdr = _req.headers.get("sec-websocket-protocol");
    let _early_d = null;
    if (_ed_hdr) {
      try {
        const _b64 = _ed_hdr.replace(/-/g, "+").replace(/_/g, "/");
        const _bin = atob(_b64);
        _early_d = new Uint8Array(_bin.length);
        for (let _i = 0; _i < _bin.length; _i++) {
          _early_d[_i] = _bin.charCodeAt(_i);
        }
      } catch (_) {}
    }

    const _pair = new WebSocketPair();
    const [_c_ws, _s_ws] = Object.values(_pair);
    _s_ws.accept();

    _handle(_s_ws, _act_u, _early_d).catch(() => {
      try { _s_ws.close(1011, "Internal Error"); } catch (_) {}
    });

    const _resp_headers = _ed_hdr ? { "Sec-WebSocket-Protocol": _ed_hdr } : {};
    return new Response(null, {
      status: 101,
      webSocket: _c_ws,
      headers: _resp_headers,
    });
  }
};

async function _handle(_ws, _uuid, _early_d) {
  const _ub = _parse_u(_uuid);
  let _init = false;
  let _sock = null;
  let _wtr = null;

  const _proc = async (_d) => {
    if (!_init) {
      const _res = _p(_d, _ub);
      if (_res._err !== 0) {
        _ws.close(1008, "Rejected");
        return;
      }

      _sock = connect({
        hostname: _res._hst,
        port: _res._prt,
      });

      _wtr = _sock.writable.getWriter();
      _init = true;

      _pipe(_sock.readable, _ws);

      if (_d.length > _res._po) {
        await _wtr.write(_d.subarray(_res._po));
      }
    } else {
      if (_wtr) {
        await _wtr.write(_d);
      }
    }
  };

  if (_early_d && _early_d.length >= 18) {
    await _proc(_early_d);
  }

  _ws.addEventListener("message", async (_ev) => {
    try {
      const _d = _ev.data instanceof ArrayBuffer 
        ? new Uint8Array(_ev.data) 
        : new Uint8Array(await _ev.data.arrayBuffer());
      await _proc(_d);
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
  let _head_sent = false;
  try {
    while (true) {
      const { value: _v, done: _d } = await _rdr.read();
      if (_d) break;
      if (_v && _ws.readyState === 1) {
        if (!_head_sent) {
          // Prepend VLESS response header [0x00, 0x00] to the first incoming data packet
          const _comb = new Uint8Array(2 + _v.length);
          _comb[0] = 0x00;
          _comb[1] = 0x00;
          _comb.set(_v, 2);
          _ws.send(_comb);
          _head_sent = true;
        } else {
          _ws.send(_v);
        }
      }
    }
  } catch (_) {
  } finally {
    try { _ws.close(); } catch (_) {}
  }
}
