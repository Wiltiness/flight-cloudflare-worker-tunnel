import { connect } from 'cloudflare:sockets';

const _P = "/stream";
const _H = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Status</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f9fafb;color:#111827}.c{background:#fff;padding:2rem;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);text-align:center}h1{font-size:1.5rem;color:#10b981}</style></head><body><div class="c"><h1>OK</h1><p>Service active.</p></div></body></html>`;

let _i = null;

function _pu(s) {
  const c = s.replace(/-/g, "");
  const b = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    b[i] = parseInt(c.substring(i * 2, i * 2 + 2), 16);
  }
  return b;
}

function _cd(d) {
  const s = d.toLowerCase();
  return s === "localhost" || s.endsWith(".local") || s.endsWith(".internal") || s.endsWith(".lan") || s.endsWith(".home.arpa");
}

function _p(b, u) {
  if (b.length < 18) return { _e: 1 };
  if (b[0] !== 0) return { _e: 2 };
  for (let i = 0; i < 16; i++) {
    if (b[1 + i] !== u[i]) return { _e: 3 };
  }
  const al = b[17];
  let c = 18 + al;
  if (c + 4 > b.length) return { _e: 1 };
  const cmd = b[c++];
  if (cmd !== 1 && cmd !== 2) return { _e: 4 };
  const prt = (b[c] << 8) | b[c + 1];
  c += 2;
  const at = b[c++];
  let hst = "";

  if (at === 1) {
    if (c + 4 > b.length) return { _e: 1 };
    const ip = [b[c], b[c + 1], b[c + 2], b[c + 3]];
    c += 4;
    if (ip[0] === 0 || ip[0] === 10 || ip[0] === 127 || (ip[0] === 169 && ip[1] === 254) ||
        (ip[0] === 172 && (ip[1] >= 16 && ip[1] <= 31)) || (ip[0] === 192 && ip[1] === 168) || ip[0] >= 224) {
      return { _e: 5 };
    }
    hst = ip.join(".");
  } else if (at === 2) {
    const dl = b[c++];
    if (c + dl > b.length) return { _e: 1 };
    hst = new TextDecoder().decode(b.subarray(c, c + dl));
    c += dl;
    if (_cd(hst)) return { _e: 5 };
  } else if (at === 3) {
    if (c + 16 > b.length) return { _e: 1 };
    const ip6 = b.subarray(c, c + 16);
    c += 16;
    if (ip6.every((v, idx) => (idx === 15 ? v === 1 : v === 0)) ||
        (ip6[0] & 0xfe) === 0xfc || (ip6[0] === 0xfe && (ip6[1] & 0xc0) === 0x80)) {
      return { _e: 5 };
    }
    const parts = [];
    for (let i = 0; i < 8; i++) {
      parts.push(((ip6[i * 2] << 8) | ip6[i * 2 + 1]).toString(16));
    }
    hst = parts.join(":");
  } else {
    return { _e: 6 };
  }

  return { _e: 0, _c: cmd, _pt: prt, _h: hst, _o: c };
}

const _S = String.fromCharCode(118, 108, 101, 115, 115, 58, 47, 47);

function _bld(h, u) {
  const ts = Date.now();
  const tag = `CloudFlare-Node-Worker-${ts}`;
  const n = `${_S}${u}@${h}:80?encryption=none&security=none&type=ws&host=${h}&path=%2Fstream#${encodeURIComponent(tag)}`;
  return [n];
}

function _rd(h, u) {
  const arr = _bld(h, u);
  const b64 = btoa(arr.join("\n"));
  const feed = `https://${h}/${u}/sub`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Feed</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;margin:0;padding:2rem 1rem;background:#f9fafb;color:#111827;display:flex;justify-content:center}.w{max-width:640px;width:100%;background:#fff;padding:2rem;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}.b{background:#f3f4f6;padding:1rem;border-radius:6px;margin-bottom:1rem;word-break:break-all}input{width:100%;padding:0.5rem;border:1px solid #d1d5db;border-radius:4px;font-family:monospace;font-size:0.85rem;box-sizing:border-box}textarea{width:100%;margin-top:0.5rem;padding:0.5rem;border:1px solid #d1d5db;border-radius:4px;font-family:monospace;font-size:0.8rem;box-sizing:border-box}button{margin-top:0.5rem;background:#2563eb;color:#fff;border:none;padding:0.4rem 0.8rem;border-radius:4px;cursor:pointer}</style></head><body><div class="w"><h2>Feed Configuration</h2><div class="b"><strong>Base64 Feed:</strong><textarea id="t" readonly rows="5">${b64}</textarea><button onclick="navigator.clipboard.writeText(document.getElementById('t').value);alert('Copied');">Copy Base64</button></div><div class="b"><strong>Feed URL:</strong><input type="text" readonly value="${feed}" id="f" style="margin-top:0.5rem"/><button onclick="navigator.clipboard.writeText(document.getElementById('f').value);alert('Copied');">Copy URL</button></div></div></body></html>`;
}

const _PT = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Portal Access</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;margin:0;padding:2rem 1rem;background:#f9fafb;color:#111827;display:flex;justify-content:center}.w{max-width:640px;width:100%;background:#fff;padding:2rem;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}.b{background:#f3f4f6;padding:1rem;border-radius:6px;margin-top:1rem;word-break:break-all}input{width:100%;padding:0.6rem;border:1px solid #d1d5db;border-radius:4px;font-family:monospace;font-size:0.9rem;box-sizing:border-box}textarea{width:100%;margin-top:0.5rem;padding:0.5rem;border:1px solid #d1d5db;border-radius:4px;font-family:monospace;font-size:0.8rem;box-sizing:border-box}button{margin-top:0.6rem;background:#2563eb;color:#fff;border:none;padding:0.5rem 1rem;border-radius:4px;cursor:pointer;font-size:0.9rem}.e{color:#dc2626;font-size:0.85rem;margin-top:0.4rem;display:none}</style></head><body><div class="w"><h3>Portal Authentication</h3><p style="color:#6b7280;font-size:0.9rem">Enter environment UUID to generate configuration feed:</p><input type="text" id="k" placeholder="Enter UUID..." autocomplete="off"/><div id="er" class="e">Invalid UUID provided.</div><button id="btn" onclick="gen()">Generate Feed</button><div id="out" style="display:none;margin-top:1.5rem"><div class="b"><strong>Base64 Feed:</strong><textarea id="b64" readonly rows="5"></textarea><button onclick="navigator.clipboard.writeText(document.getElementById('b64').value);alert('Copied Base64');">Copy Base64</button></div><div class="b"><strong>Feed Subscription URL:</strong><input type="text" id="fu" readonly style="margin-top:0.5rem"/><button onclick="navigator.clipboard.writeText(document.getElementById('fu').value);alert('Copied URL');">Copy URL</button></div></div></div><script>async function gen(){const k=document.getElementById('k').value.trim();const er=document.getElementById('er');const out=document.getElementById('out');er.style.display='none';if(!k)return;try{const res=await fetch('/portal/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:k})});if(!res.ok){er.style.display='block';out.style.display='none';return;}const data=await res.json();document.getElementById('b64').value=data.b64;document.getElementById('fu').value=data.feed;out.style.display='block';}catch(_){er.style.display='block';}}</script></body></html>`;

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);

    if (!_i) {
      _i = crypto.randomUUID();
    }
    const au = env?.UUID || _i;

    if (u.pathname === "/portal" || u.pathname === "/portal/") {
      return new Response(_PT, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (u.pathname === "/portal/verify" && req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      if (b.id !== au) {
        return new Response(JSON.stringify({ error: 1 }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
      const arr = _bld(u.host, au);
      return new Response(JSON.stringify({
        b64: btoa(arr.join("\n")),
        feed: `https://${u.host}/${au}/sub`
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (u.pathname === `/${au}` || u.pathname === `/${au}/`) {
      return new Response(_rd(u.host, au), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (u.pathname === `/${au}/sub`) {
      const arr = _bld(u.host, au);
      return new Response(btoa(arr.join("\n")), {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (!u.pathname.startsWith(_P) || req.headers.get("Upgrade") !== "websocket") {
      return new Response(_H, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const ed = req.headers.get("sec-websocket-protocol");
    let edData = null;
    if (ed) {
      try {
        const b64 = ed.replace(/-/g, "+").replace(/_/g, "/");
        const bin = atob(b64);
        edData = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
          edData[i] = bin.charCodeAt(i);
        }
      } catch (_) {}
    }

    const pair = new WebSocketPair();
    const [cWs, sWs] = Object.values(pair);
    sWs.accept();

    _h(sWs, au, edData).catch(() => {
      try { sWs.close(1011, ""); } catch (_) {}
    });

    const respHeaders = ed ? { "Sec-WebSocket-Protocol": ed } : {};
    return new Response(null, {
      status: 101,
      webSocket: cWs,
      headers: respHeaders,
    });
  }
};

async function _h(ws, uuid, earlyData) {
  const ub = _pu(uuid);
  let inited = false;
  let sock = null;
  let wtr = null;

  const proc = async (d) => {
    if (!inited) {
      const res = _p(d, ub);
      if (res._e !== 0) {
        ws.close(1008, "");
        return;
      }

      sock = connect({
        hostname: res._h,
        port: res._pt,
      });

      wtr = sock.writable.getWriter();
      inited = true;

      _pp(sock.readable, ws);

      if (d.length > res._o) {
        await wtr.write(d.subarray(res._o));
      }
    } else {
      if (wtr) {
        await wtr.write(d);
      }
    }
  };

  if (earlyData && earlyData.length >= 18) {
    await proc(earlyData);
  }

  ws.addEventListener("message", async (ev) => {
    try {
      const d = ev.data instanceof ArrayBuffer 
        ? new Uint8Array(ev.data) 
        : new Uint8Array(await ev.data.arrayBuffer());
      await proc(d);
    } catch (_) {
      try { ws.close(1011, ""); } catch (_) {}
    }
  });

  ws.addEventListener("close", () => {
    if (wtr) {
      try { wtr.releaseLock(); } catch (_) {}
    }
    if (sock) {
      try { sock.close(); } catch (_) {}
    }
  });
}

async function _pp(stm, ws) {
  const rdr = stm.getReader();
  let hs = false;
  try {
    while (true) {
      const { value: v, done: d } = await rdr.read();
      if (d) break;
      if (v && ws.readyState === 1) {
        if (!hs) {
          const comb = new Uint8Array(2 + v.length);
          comb[0] = 0x00;
          comb[1] = 0x00;
          comb.set(v, 2);
          ws.send(comb);
          hs = true;
        } else {
          ws.send(v);
        }
      }
    }
  } catch (_) {
  } finally {
    try { ws.close(); } catch (_) {}
  }
}
