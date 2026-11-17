# vless-worker-wasm

Lightweight VLESS over WebSocket tunnel runner designed for Cloudflare Worker and workerd-compatible runtimes, powered by an obfuscated WebAssembly binary core.

---

## Features

- **Obfuscated Binary Core**: Packet parsing, credentials verification, and target stream multiplexing are compiled into a compact WebAssembly binary with all internal symbols stripped.
- **SSRF Shield**: Enforces strict network boundaries within the binary layer, rejecting connections to private subnets, link-local addresses, cloud metadata endpoints, and internal domains.
- **Dynamic Credentials**: Automatically provisions a cryptographically random UUID on startup if none is set via `env.UUID`.
- **Zero Build Dependencies**: Single-file runtime with embedded WebAssembly bytecode.

---

## Project Structure

```text
.
├── _worker.js         # Production Worker script with embedded WebAssembly core
├── wrangler.toml      # Runtime configuration for Cloudflare Workers / workerd
├── package.json       # Deployment scripts
└── README.md          # Project documentation
```

---

## Deployment

Deploy directly via Wrangler:

```bash
npm run deploy
```

---

## License
MIT
