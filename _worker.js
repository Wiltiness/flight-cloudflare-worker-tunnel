/**
 * VLESS-over-WebSocket Worker (Powered by Rust WASM Binary Core)
 * 
 * 特性：
 * 1. 协议解包、UUID 鉴权与 SSRF 安全拦截全部由 Rust 编译的 WASM 二进制黑盒执行
 * 2. 部署时自动生成随机 UUID（亦可通过 env.UUID 自定义配置）
 * 3. 部署控制台及 HTTP 根路径自动输出标准单行 vless:// 导入链接
 * 4. 单文件零构建依赖，即拷即用
 */

import { connect } from 'cloudflare:sockets';

// 预编译的 Rust VLESS WASM 二进制 (优化后仅 2.1KB)
const WASM_BASE64 = "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";

// 全局运行时缓存生成的 UUID
const AUTO_GENERATED_UUID = crypto.randomUUID();
let hasLoggedDeployment = false;

let wasmInstancePromise = null;
async function getWasmCore() {
  if (!wasmInstancePromise) {
    wasmInstancePromise = (async () => {
      const binaryString = atob(WASM_BASE64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const { instance } = await WebAssembly.instantiate(bytes);
      return instance.exports;
    })();
  }
  return wasmInstancePromise;
}

function parseUuidToBytes(uuidStr) {
  const clean = uuidStr.replace(/-/g, "");
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function generateVlessLink(uuid, host, port, isTls) {
  const security = isTls ? "tls" : "none";
  const nodeName = encodeURIComponent(`Worker-${host}`);
  return `vless://${uuid}@${host}:${port}?encryption=none&security=${security}&type=ws&host=${host}&path=%2F#${nodeName}`;
}

export default {
  async fetch(request, env, ctx) {
    const currentUuid = env?.UUID || AUTO_GENERATED_UUID;

    const url = new URL(request.url);
    const host = request.headers.get("Host") || url.hostname;
    const isTls = url.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
    const port = url.port || (isTls ? "443" : "80");

    const vlessLink = generateVlessLink(currentUuid, host, port, isTls);

    // 部署日志输出单行导入链接
    if (!hasLoggedDeployment) {
      console.log("\n================ [节点部署成功] ================");
      console.log("接入 UUID:", currentUuid);
      console.log("一键导入链接 (复制下方整行):");
      console.log(vlessLink);
      console.log("================================================\n");
      hasLoggedDeployment = true;
    }

    // 浏览器直接访问 HTTP 时的引导界面
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response(
        `[VLESS 隧道节点运行正常]\n\nUUID: ${currentUuid}\n\n单行导入链接 (复制整行到代理客户端)：\n${vlessLink}\n`,
        {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      );
    }

    // 处理 WebSocket 隧道连接
    const webSocketPair = new WebSocketPair();
    const [clientSocket, serverSocket] = Object.values(webSocketPair);
    serverSocket.accept();

    handleSession(serverSocket, currentUuid).catch(err => {
      try { serverSocket.close(1011, err.message); } catch (_) {}
    });

    return new Response(null, {
      status: 101,
      webSocket: clientSocket,
    });
  }
};

async function handleSession(ws, uuidStr) {
  const wasm = await getWasmCore();
  const uuidBytes = parseUuidToBytes(uuidStr);

  let isInitialized = false;
  let remoteTcpSocket = null;
  let tcpWriter = null;

  ws.addEventListener("message", async (event) => {
    try {
      const rawData = event.data instanceof ArrayBuffer 
        ? new Uint8Array(event.data) 
        : new Uint8Array(await event.data.arrayBuffer());

      if (!isInitialized) {
        // 首包送入 WASM 执行安全校验与协议解析
        const reqPtr = wasm.alloc(rawData.length);
        const uuidPtr = wasm.alloc(16);
        const outPtr = wasm.alloc(512);

        const mem = new Uint8Array(wasm.memory.buffer);
        mem.set(rawData, reqPtr);
        mem.set(uuidBytes, uuidPtr);

        const retCode = wasm.parse_vless(reqPtr, rawData.length, uuidPtr, outPtr, 512);
        if (retCode !== 0) {
          ws.close(1008, "Rejected");
          return;
        }

        const out = new Uint8Array(wasm.memory.buffer, outPtr, 512);
        const targetPort = (out[2] << 8) | out[3];
        const payloadOffset = (out[4] << 8) | out[5];
        const addrLen = out[7];
        const targetHost = new TextDecoder().decode(out.subarray(8, 8 + addrLen));

        // 回复客户端 VLESS Response Header (2 字节)
        ws.send(new Uint8Array([0x00, 0x00]));

        // 建立出站 TCP 链接
        remoteTcpSocket = connect({
          hostname: targetHost,
          port: targetPort,
        });

        tcpWriter = remoteTcpSocket.writable.getWriter();
        isInitialized = true;

        pipeRemoteToClient(remoteTcpSocket.readable, ws);

        if (rawData.length > payloadOffset) {
          await tcpWriter.write(rawData.subarray(payloadOffset));
        }
      } else {
        if (tcpWriter) {
          await tcpWriter.write(rawData);
        }
      }
    } catch (_) {
      ws.close(1011, "Stream error");
    }
  });

  ws.addEventListener("close", () => {
    if (tcpWriter) {
      try { tcpWriter.releaseLock(); } catch (_) {}
    }
    if (remoteTcpSocket) {
      try { remoteTcpSocket.close(); } catch (_) {}
    }
  });
}

async function pipeRemoteToClient(readableStream, ws) {
  const reader = readableStream.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value && ws.readyState === 1) {
        ws.send(value);
      }
    }
  } catch (_) {
  } finally {
    try { ws.close(); } catch (_) {}
  }
}
