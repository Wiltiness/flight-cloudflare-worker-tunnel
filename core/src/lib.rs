#![no_std]
use core::panic::PanicInfo;

#[panic_handler]
fn _ph(_: &PanicInfo) -> ! {
    loop {}
}

static mut _MB: [u8; 65536] = [0; 65536];
static mut _MO: usize = 0;

#[no_mangle]
pub extern "C" fn _a(s: usize) -> *mut u8 {
    unsafe {
        let a = 8;
        let o = (_MO + a - 1) & !(a - 1);
        if o + s > _MB.len() {
            _MO = 0;
            return _MB.as_mut_ptr();
        }
        _MO = o + s;
        _MB.as_mut_ptr().add(o)
    }
}

#[no_mangle]
pub extern "C" fn _r() {
    unsafe {
        _MO = 0;
    }
}

#[no_mangle]
pub extern "C" fn _p(
    _bp: *const u8,
    _bl: usize,
    _up: *const u8,
    _op: *mut u8,
    _oc: usize,
) -> i32 {
    if _bl < 18 { return 1; }
    let _b = unsafe { core::slice::from_raw_parts(_bp, _bl) };
    let _u = unsafe { core::slice::from_raw_parts(_up, 16) };

    if _b[0] != 0 || &_b[1..17] != _u { return 2; }

    let _al = _b[17] as usize;
    let mut _c = 18 + _al;
    if _c + 4 > _bl { return 1; }

    let _cmd = _b[_c];
    _c += 1;
    if _cmd != 1 && _cmd != 2 { return 3; }

    let _prt = ((_b[_c] as u16) << 8) | (_b[_c + 1] as u16);
    _c += 2;

    if _c >= _bl { return 1; }
    let _at = _b[_c];
    _c += 1;

    let mut _ab: [u8; 256] = [0; 256];
    let _al_out: usize;

    match _at {
        1 => {
            if _c + 4 > _bl { return 1; }
            let _ip = [_b[_c], _b[_c + 1], _b[_c + 2], _b[_c + 3]];
            _c += 4;
            if _ip[0] == 0 || _ip[0] == 10 || _ip[0] == 127 
               || (_ip[0] == 169 && _ip[1] == 254) 
               || (_ip[0] == 172 && (_ip[1] >= 16 && _ip[1] <= 31)) 
               || (_ip[0] == 192 && _ip[1] == 168) 
               || _ip[0] >= 224 {
                return 4;
            }
            _al_out = _f4(&_ip, &mut _ab);
        }
        2 => {
            let _dl = _b[_c] as usize;
            _c += 1;
            if _c + _dl > _bl || _dl > 255 { return 1; }
            let _d = &_b[_c.._c + _dl];
            _c += _dl;
            if _chk(_d) { return 4; }
            for _i in 0.._dl { _ab[_i] = _d[_i]; }
            _al_out = _dl;
        }
        3 => {
            if _c + 16 > _bl { return 1; }
            let _ip6 = &_b[_c.._c + 16];
            _c += 16;
            if _ip6 == &[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] 
               || (_ip6[0] & 0xfe) == 0xfc 
               || (_ip6[0] == 0xfe && (_ip6[1] & 0xc0) == 0x80) {
                return 4;
            }
            _al_out = _f6(_ip6, &mut _ab);
        }
        _ => return 5,
    }

    if _oc < 8 + _al_out { return 6; }
    let _po = _c as u16;

    unsafe {
        let _o = core::slice::from_raw_parts_mut(_op, _oc);
        _o[0] = 0;
        _o[1] = _cmd;
        _o[2] = (_prt >> 8) as u8;
        _o[3] = (_prt & 0xff) as u8;
        _o[4] = (_po >> 8) as u8;
        _o[5] = (_po & 0xff) as u8;
        _o[6] = _at;
        _o[7] = _al_out as u8;
        for _i in 0.._al_out {
            _o[8 + _i] = _ab[_i];
        }
    }
    0
}

fn _f4(_ip: &[u8; 4], _o: &mut [u8; 256]) -> usize {
    let mut _p = 0;
    for (_i, &_v) in _ip.iter().enumerate() {
        if _i > 0 { _o[_p] = b'.'; _p += 1; }
        if _v >= 100 {
            _o[_p] = b'0' + (_v / 100); _p += 1;
            _o[_p] = b'0' + ((_v % 100) / 10); _p += 1;
            _o[_p] = b'0' + (_v % 10); _p += 1;
        } else if _v >= 10 {
            _o[_p] = b'0' + (_v / 10); _p += 1;
            _o[_p] = b'0' + (_v % 10); _p += 1;
        } else {
            _o[_p] = b'0' + _v; _p += 1;
        }
    }
    _p
}

fn _f6(_ip6: &[u8], _o: &mut [u8; 256]) -> usize {
    const _H: &[u8; 16] = b"0123456789abcdef";
    let mut _p = 0;
    for _i in 0..8 {
        if _i > 0 { _o[_p] = b':'; _p += 1; }
        let _b1 = _ip6[_i * 2];
        let _b2 = _ip6[_i * 2 + 1];
        _o[_p] = _H[(_b1 >> 4) as usize]; _p += 1;
        _o[_p] = _H[(_b1 & 0x0f) as usize]; _p += 1;
        _o[_p] = _H[(_b2 >> 4) as usize]; _p += 1;
        _o[_p] = _H[(_b2 & 0x0f) as usize]; _p += 1;
    }
    _p
}

fn _chk(_d: &[u8]) -> bool {
    if _ew(_d, b"localhost") 
       || _ew(_d, b".local") 
       || _ew(_d, b".internal") 
       || _ew(_d, b".lan") 
       || _ew(_d, b".home.arpa") {
        return true;
    }
    false
}

fn _ew(_a: &[u8], _s: &[u8]) -> bool {
    if _a.len() < _s.len() { return false; }
    let _st = _a.len() - _s.len();
    for _i in 0.._s.len() {
        let _c1 = if _a[_st + _i].is_ascii_uppercase() { _a[_st + _i] + 32 } else { _a[_st + _i] };
        let _c2 = if _s[_i].is_ascii_uppercase() { _s[_i] + 32 } else { _s[_i] };
        if _c1 != _c2 { return false; }
    }
    true
}
