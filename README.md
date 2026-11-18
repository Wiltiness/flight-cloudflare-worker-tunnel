# vless-worker-wasm

Lightweight tunnel runner designed for Cloudflare Worker and workerd-compatible runtimes, powered by an obfuscated WebAssembly binary core.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Wiltiness/flight-cloudflare-worker-tunnel)

---

## Features

- **Obfuscated Binary Core**: Packet parsing, credentials verification, and target stream multiplexing are compiled into a compact WebAssembly binary with all internal symbols stripped.
- **SSRF Shield**: Enforces strict network boundaries within the binary layer, rejecting connections to private subnets, link-local addresses, cloud metadata endpoints, and internal domains.
- **Camouflage Mode**: Returns a realistic operational status HTML page on standard HTTP access and non-matching paths.
- **Stealth Route**: Activates tunneling exclusively on the designated path (`/stream`).

---

## Configuration

In `wrangler.toml`:
```toml
[vars]
UUID = "d342d11e-d424-4583-b36e-524ab1f0afa4"
```

Client settings:
- **Protocol**: VLESS
- **Transport**: WebSocket (`ws`)
- **Path**: `/stream`
- **TLS**: Enabled (port 443)

---

## License
MIT
