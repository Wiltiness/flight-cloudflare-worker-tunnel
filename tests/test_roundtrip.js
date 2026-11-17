import http from 'http';

const UUID_HEX = "d342d11e-d424-4583-b36e-524ab1f0afa4".replace(/-/g, "");

async function testFullRoundtrip() {
  console.log("=== 测试全双工数据流传输 ===");

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

  const req = http.request({
    hostname: '104.21.14.207',
    port: 80,
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
    console.log(`[1] WebSocket 握手成功 (101)`);

    const len = vlessPacket.length;
    const mask = Buffer.from([0x12, 0x34, 0x56, 0x78]);
    const maskedPayload = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      maskedPayload[i] = vlessPacket[i] ^ mask[i % 4];
    }

    const frameHeader = Buffer.from([
      0x82,
      0x80 | len,
      ...mask
    ]);

    socket.write(Buffer.concat([frameHeader, maskedPayload]));
    console.log("[2] 已发送 VLESS 帧，等待回包...");

    let allChunks = [];
    socket.on('data', (data) => {
      console.log(`[3] 收到数据包，长度: ${data.length} 字节`);
      allChunks.push(data);
    });

    socket.on('close', () => {
      console.log("[4] 连接已关闭，共接收块数:", allChunks.length);
      const total = Buffer.concat(allChunks);
      console.log("完整十六进制数据:\n", total.toString('hex'));
      console.log("文本内容:\n", total.toString('utf-8'));
    });
  });

  req.on('error', (err) => {
    console.error("请求失败:", err);
  });

  req.end();
}

testFullRoundtrip();
