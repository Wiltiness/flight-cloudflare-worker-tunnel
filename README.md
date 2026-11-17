# VLESS-over-WebSocket Worker (Rust WASM Core)

基于 **Cloudflare Worker / workerd** 架构构建的高性能 VLESS 隧道节点。采用 **Rust 编译的 WebAssembly 二进制**作为核心安全与解包引擎，实现纯黑盒运行，并在部署过程中自动生成凭证与单行导入链接。

---

## 🌟 核心特性

1. **Rust WASM 混淆二进制黑盒**：
   - 协议首包解析、UUID 身份鉴权、载荷偏移定位全部由 `vless_core.wasm`（编译后仅 2.1 KB）在底层二进制安全执行，代码不可读、不可篡改。
2. **主动防范内网击穿 (SSRF 拦截)**：
   - WASM 内置严格的私网与保留网段过滤（拦截 `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`, `169.254.0.0/16` 云元数据地址及 `localhost` 等内网域名），防止借由边缘节点扫描宿主内网服务。
3. **部署时自动生成凭据**：
   - 默认通过 Web Crypto 标准动态生成高强度随机 UUID，部署完成后在终端日志输出标准的 `vless://...` 单行导入链接。
4. **单文件即拷即用**：
   - 编译后的 WASM 以 Base64 内嵌在 `_worker.js` 中，零外部依赖，直接粘贴即可运行。

---

## 📁 目录结构

```text
.
├── _worker.js         # 生产就绪的 Worker 脚本（含内嵌 WASM 二进制）
├── wrangler.toml      # Cloudflare Worker / workerd 部署配置文件
├── package.json       # 项目依赖与便捷脚本
├── core/              # Rust 核心源代码
│   ├── Cargo.toml     # Rust 配置文件（包含体积极致优化参数）
│   ├── src/lib.rs     # Rust VLESS 解包与 SSRF 过滤实现
│   └── build.ps1      # 自动化编译并同步到 _worker.js 脚本
├── tests/
│   └── test.js        # 本地端到端全链路自动化测试脚本
└── README.md          # 项目文档
```

---

## 🚀 快速使用与部署

### 1. 本地测试
在项目根目录下直接运行测试：
```bash
npm test
```
若能成功输出 `>>> 测试成功！收到来自 www.baidu.com 的 HTTP 回包状态行: HTTP/1.1 200 OK`，即表示本地协议解包与出站连通性完全正常。

### 2. 部署到 Worker 环境
* **使用 Wrangler 命令行部署**：
  ```bash
  npm run deploy
  ```
* **手动导入**：
  直接将 `_worker.js` 的完整内容复制粘贴到你的 Worker 管理控制台并保存部署。

---

## 🔗 客户端连接使用

部署成功后，在控制台日志（或浏览器直接访问 Worker 绑定的域名/地址）中会看到类似如下的一行导入链接：

```text
vless://7e26b48d-6e82-411a-8260-128a38520bf2@your-domain.com:443?encryption=none&security=tls&type=ws&host=your-domain.com&path=%2F#Worker-your-domain.com
```

### 导入方式：
* **v2rayN / Shadowrocket / Clash Verge / Sing-box**：
  复制整行链接，在软件中按快捷键 `Ctrl + V` 或点击 **“从剪贴板导入”** 即可一键完成配置。

---

## 🛠️ 自定义与二次开发

如果需要修改 Rust 底层逻辑（例如扩展支持的协议命令或安全规则）：
1. 确保本地拥有 Rust 环境并添加 WASM 目标：
   ```bash
   rustup target add wasm32-unknown-unknown
   ```
2. 修改 `core/src/lib.rs` 后，在根目录执行编译更新：
   ```bash
   npm run build:core
   ```
   脚本会自动编译生成二进制、转码并更新 `_worker.js` 中的 `WASM_BASE64` 变量。

---

## 📄 License
MIT License
