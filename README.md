# vless-worker-wasm

Lightweight VLESS over WebSocket tunnel runner designed for Cloudflare Worker and workerd-compatible runtimes, powered by an obfuscated Rust WebAssembly core.

---

## Features

- **Obfuscated Binary Core**: VLESS packet decoding, UUID authentication, and target parsing are compiled into a tiny (2.1 KB) WebAssembly binary without external symbols.
- **SSRF Shield**: Built-in network boundary validation in WebAssembly prevents access to private IPv4 ranges, link-local addresses, cloud metadata endpoints, and internal domains.
- **Dynamic Credentials**: Generates a random UUID on deployment if none is provided via `env.UUID`.
- **Zero Build Dependencies**: Pre-compiled WebAssembly is embedded as Base64 in `_worker.js` for single-file deployment.

---

## Project Structure

```text
.
├── _worker.js         # Deployment script with embedded WebAssembly module
├── wrangler.toml      # Runtime configuration for Cloudflare Workers / workerd
├── package.json       # Project scripts
├── core/              # Rust source code
│   ├── Cargo.toml     # Cargo configuration with size optimization
│   ├── src/lib.rs     # WebAssembly protocol decoder implementation
│   └── build.ps1      # PowerShell rebuild script
└── tests/
    └── test.js        # End-to-end integration test
```

---

## Quick Start

### 1. Verification Test
```bash
npm test
```

### 2. Deploy
```bash
npm run deploy
```

---

## License
MIT
