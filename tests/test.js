import net from 'net';

// 动态从 _worker.js 中提取内嵌的 WASM 进行测试
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerContent = fs.readFileSync(path.join(__dirname, '../_worker.js'), 'utf-8');
const match = workerContent.match(/const WASM_BASE64 = "([^"]+)";/);
if (!match) throw new Error("无法从 _worker.js 中提取 WASM_BASE64");

const WASM_BASE64 = match[1];
const UUID_HEX = "d342d11e-d424-4583-b36e-524ab1f0afa4".replace(/-/g, "");

async function runTest() {
  console.log("=== 正在运行 VLESS + Rust WASM 本地验证测试 ===");

  const wasmBuf = Buffer.from(WASM_BASE64, 'base64');
  const { instance } = await WebAssembly.instantiate(wasmBuf);
  const wasm = instance.exports;

  const uuidBytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    uuidBytes[i] = parseInt(UUID_HEX.substr(i * 2, 2), 16);
  }

  const targetHost = "www.baidu.com";
  const targetPort = 80;
  const hostBuf = Buffer.from(targetHost);
  const httpPayload = Buffer.from(`GET / HTTP/1.1\r\nHost: ${targetHost}\r\nConnection: close\r\nUser-Agent: curl/7.88.1\r\n\r\n`);

  const vlessClientPacket = Buffer.concat([
    Buffer.from([0x00]),
    Buffer.from(uuidBytes),
    Buffer.from([0x00]),
    Buffer.from([0x01]),
    Buffer.from([(targetPort >> 8) & 0xff, targetPort & 0xff]),
    Buffer.from([0x02]),
    Buffer.from([hostBuf.length]),
    hostBuf,
    httpPayload
  ]);

  const reqPtr = wasm.alloc(vlessClientPacket.length);
  const uuidPtr = wasm.alloc(16);
  const outPtr = wasm.alloc(512);

  const mem = new Uint8Array(wasm.memory.buffer);
  mem.set(vlessClientPacket, reqPtr);
  mem.set(uuidBytes, uuidPtr);

  const code = wasm.parse_vless(reqPtr, vlessClientPacket.length, uuidPtr, outPtr, 512);
  if (code !== 0) throw new Error(`WASM 校验错误: ${code}`);

  const out = new Uint8Array(wasm.memory.buffer, outPtr, 512);
  const parsedPort = (out[2] << 8) | out[3];
  const payloadOffset = (out[4] << 8) | out[5];
  const addrLen = out[7];
  const parsedHost = new TextDecoder().decode(out.subarray(8, 8 + addrLen));

  console.log(`[WASM 校验成功] 目标: ${parsedHost}:${parsedPort}`);

  const socket = net.createConnection({ host: parsedHost, port: parsedPort }, () => {
    socket.write(vlessClientPacket.subarray(payloadOffset));
  });

  let responseChunks = [];
  socket.on("data", (chunk) => responseChunks.push(chunk));
  socket.on("end", () => {
    const full = Buffer.concat(responseChunks).toString();
    console.log(">>> 测试成功！收到来自", targetHost, "的 HTTP 回包状态行:", full.split("\r\n")[0]);
  });
  socket.on("error", (err) => console.error("TCP 连接错误:", err));
}

runTest().catch(console.error);
