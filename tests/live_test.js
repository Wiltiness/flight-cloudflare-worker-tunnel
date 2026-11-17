import https from 'https';

const UUID_HEX = "d342d11e-d424-4583-b36e-524ab1f0afa4".replace(/-/g, "");

async function testLiveNode() {
  console.log("=== 直连测试 worker-wasm.stamber.workers.dev/stream ===");

  const uuidBytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    uuidBytes[i] = parseInt(UUID_HEX.substr(i * 2, 2), 16);
  }

  const targetHost = "api.ipify.org";
  const targetPort = 80;
  const hostBuf = Buffer.from(targetHost);
  const httpPayload = Buffer.from(`GET / HTTP/1.1\r\nHost: ${targetHost}\r\nConnection: close\r\nUser-Agent: curl/7.88.1\r\n\r\n`);

  const vlessPacket = Buffer.concat([
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

  const req = https.request({
    hostname: 'worker-wasm.stamber.workers.dev',
    port: 443,
    path: '/stream',
    method: 'GET',
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
      'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
      'Sec-WebSocket-Version': '13',
      'Host': 'worker-wasm.stamber.workers.dev'
    }
  });

  req.on('upgrade', (res, socket) => {
    console.log(`[OK] WebSocket 握手成功！HTTP 状态码: ${res.statusCode}`);
    
    // 发送 VLESS 首包
    // 注意：WebSocket 协议帧标准封装：
    // Client-to-Server 必须 mask
    const len = vlessPacket.length;
    const mask = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    const maskedPayload = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      maskedPayload[i] = vlessPacket[i] ^ mask[i % 4];
    }

    const frameHeader = Buffer.from([
      0x82, // FIN + Binary frame
      0x80 | len, // Masked + len (len < 126)
      ...mask
    ]);

    socket.write(Buffer.concat([frameHeader, maskedPayload]));
    console.log("[OK] 已发送 VLESS 握手与请求首包");

    socket.on('data', (data) => {
      console.log(`[OK] 收到节点返回数据！长度: ${data.length} 字节`);
      console.log("原始十六进制 (前 16 字节):", data.subarray(0, 16).toString('hex'));
      console.log("文本内容预览:\n", data.toString('utf-8'));
      socket.destroy();
    });

    socket.on('close', () => {
      console.log("[INFO] WebSocket 连接关闭");
    });
  });

  req.on('response', (res) => {
    console.log(`[FAIL] 未升级为 WebSocket，返回了 HTTP ${res.statusCode}`);
  });

  req.on('error', (err) => {
    console.error(`[ERROR] 连接错误:`, err.message);
  });

  req.end();
}

testLiveNode();
