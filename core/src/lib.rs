#![no_std]
use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

// 供 JS 侧调用的无锁内存分配池
static mut MEMORY_POOL: [u8; 65536] = [0; 65536];
static mut MEMORY_OFFSET: usize = 0;

#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut u8 {
    unsafe {
        let align = 8;
        let offset = (MEMORY_OFFSET + align - 1) & !(align - 1);
        if offset + size > MEMORY_POOL.len() {
            MEMORY_OFFSET = 0;
            return MEMORY_POOL.as_mut_ptr();
        }
        MEMORY_OFFSET = offset + size;
        MEMORY_POOL.as_mut_ptr().add(offset)
    }
}

#[no_mangle]
pub extern "C" fn reset_allocator() {
    unsafe {
        MEMORY_OFFSET = 0;
    }
}

// 状态码：
// 0: 校验成功
// 1: 数据包长度不足
// 2: VLESS 版本不匹配
// 3: UUID 鉴权失败
// 4: 不支持的命令
// 5: 触发 SSRF 拦截（私网/回环/云元数据目标）
// 6: 未知的地址类型
// 7: 输出缓冲区不足

#[no_mangle]
pub extern "C" fn parse_vless(
    buf_ptr: *const u8,
    buf_len: usize,
    expected_uuid_ptr: *const u8,
    out_ptr: *mut u8,
    out_cap: usize,
) -> i32 {
    if buf_len < 18 {
        return 1;
    }

    let input = unsafe { core::slice::from_raw_parts(buf_ptr, buf_len) };
    let expected_uuid = unsafe { core::slice::from_raw_parts(expected_uuid_ptr, 16) };

    // 1. 版本检查
    if input[0] != 0 {
        return 2;
    }

    // 2. UUID 鉴权
    if &input[1..17] != expected_uuid {
        return 3;
    }

    // 3. Addons 跳过
    let addons_len = input[17] as usize;
    let mut cursor = 18 + addons_len;

    if cursor + 4 > buf_len {
        return 1;
    }

    // 4. Command 检查 (1=TCP, 2=UDP)
    let command = input[cursor];
    cursor += 1;
    if command != 1 && command != 2 {
        return 4;
    }

    // 5. Port 端口
    let port = ((input[cursor] as u16) << 8) | (input[cursor + 1] as u16);
    cursor += 2;

    // 6. 地址类型与安全过滤
    if cursor >= buf_len {
        return 1;
    }
    let addr_type = input[cursor];
    cursor += 1;

    let mut addr_bytes: [u8; 256] = [0; 256];
    let addr_len: usize;

    match addr_type {
        1 => {
            // IPv4
            if cursor + 4 > buf_len {
                return 1;
            }
            let ip = [input[cursor], input[cursor + 1], input[cursor + 2], input[cursor + 3]];
            cursor += 4;

            // SSRF 防御拦截：
            // 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8
            if ip[0] == 0 || ip[0] == 10 || ip[0] == 127 { return 5; }
            // 169.254.0.0/16 (Link Local / Cloud Metadata)
            if ip[0] == 169 && ip[1] == 254 { return 5; }
            // 172.16.0.0/12
            if ip[0] == 172 && (ip[1] >= 16 && ip[1] <= 31) { return 5; }
            // 192.168.0.0/16
            if ip[0] == 192 && ip[1] == 168 { return 5; }
            // 广播与多播
            if ip[0] >= 224 { return 5; }

            addr_len = format_ipv4(&ip, &mut addr_bytes);
        }
        2 => {
            // 域名
            if cursor >= buf_len {
                return 1;
            }
            let dlen = input[cursor] as usize;
            cursor += 1;
            if cursor + dlen > buf_len || dlen > 255 {
                return 1;
            }
            let domain_slice = &input[cursor..cursor + dlen];
            cursor += dlen;

            // 域名防 SSRF (拦截 localhost / 内部网段)
            if is_ssrf_domain(domain_slice) {
                return 5;
            }

            for i in 0..dlen {
                addr_bytes[i] = domain_slice[i];
            }
            addr_len = dlen;
        }
        3 => {
            // IPv6
            if cursor + 16 > buf_len {
                return 1;
            }
            let ip6 = &input[cursor..cursor + 16];
            cursor += 16;

            // ::1
            if ip6 == &[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] {
                return 5;
            }
            // fc00::/7 (ULA)
            if (ip6[0] & 0xfe) == 0xfc {
                return 5;
            }
            // fe80::/10 (Link-Local)
            if ip6[0] == 0xfe && (ip6[1] & 0xc0) == 0x80 {
                return 5;
            }

            addr_len = format_ipv6(ip6, &mut addr_bytes);
        }
        _ => return 6,
    }

    if out_cap < 8 + addr_len {
        return 7;
    }

    let payload_offset = cursor as u16;

    unsafe {
        let out = core::slice::from_raw_parts_mut(out_ptr, out_cap);
        out[0] = 0;
        out[1] = command;
        out[2] = (port >> 8) as u8;
        out[3] = (port & 0xff) as u8;
        out[4] = (payload_offset >> 8) as u8;
        out[5] = (payload_offset & 0xff) as u8;
        out[6] = addr_type;
        out[7] = addr_len as u8;
        for i in 0..addr_len {
            out[8 + i] = addr_bytes[i];
        }
    }

    0
}

fn format_ipv4(ip: &[u8; 4], out: &mut [u8; 256]) -> usize {
    let mut pos = 0;
    for (i, &octet) in ip.iter().enumerate() {
        if i > 0 {
            out[pos] = b'.';
            pos += 1;
        }
        if octet >= 100 {
            out[pos] = b'0' + (octet / 100);
            pos += 1;
            out[pos] = b'0' + ((octet % 100) / 10);
            pos += 1;
            out[pos] = b'0' + (octet % 10);
            pos += 1;
        } else if octet >= 10 {
            out[pos] = b'0' + (octet / 10);
            pos += 1;
            out[pos] = b'0' + (octet % 10);
            pos += 1;
        } else {
            out[pos] = b'0' + octet;
            pos += 1;
        }
    }
    pos
}

fn format_ipv6(ip6: &[u8], out: &mut [u8; 256]) -> usize {
    const HEX_CHARS: &[u8; 16] = b"0123456789abcdef";
    let mut pos = 0;
    for i in 0..8 {
        if i > 0 {
            out[pos] = b':';
            pos += 1;
        }
        let b1 = ip6[i * 2];
        let b2 = ip6[i * 2 + 1];
        out[pos] = HEX_CHARS[(b1 >> 4) as usize];
        pos += 1;
        out[pos] = HEX_CHARS[(b1 & 0x0f) as usize];
        pos += 1;
        out[pos] = HEX_CHARS[(b2 >> 4) as usize];
        pos += 1;
        out[pos] = HEX_CHARS[(b2 & 0x0f) as usize];
        pos += 1;
    }
    pos
}

fn is_ssrf_domain(domain: &[u8]) -> bool {
    if domain.eq_ignore_ascii_case(b"localhost") {
        return true;
    }
    if ends_with_ignore_case(domain, b".local")
        || ends_with_ignore_case(domain, b".internal")
        || ends_with_ignore_case(domain, b".lan")
        || ends_with_ignore_case(domain, b".home.arpa")
    {
        return true;
    }
    false
}

fn ends_with_ignore_case(a: &[u8], suffix: &[u8]) -> bool {
    if a.len() < suffix.len() {
        return false;
    }
    let start = a.len() - suffix.len();
    for i in 0..suffix.len() {
        let c1 = if a[start + i].is_ascii_uppercase() {
            a[start + i] + 32
        } else {
            a[start + i]
        };
        let c2 = if suffix[i].is_ascii_uppercase() {
            suffix[i] + 32
        } else {
            suffix[i]
        };
        if c1 != c2 {
            return false;
        }
    }
    true
}
