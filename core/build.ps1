# 自动化构建 Rust WASM 模块并生成 base64 字符串
Write-Host ">>> 正在编译 Rust WASM 模块 (wasm32-unknown-unknown)..." -ForegroundColor Cyan
Set-Location -Path $PSScriptRoot
cargo build --target wasm32-unknown-unknown --release

$wasmPath = "$PSScriptRoot\target\wasm32-unknown-unknown\release\vless_core.wasm"
if (Test-Path $wasmPath) {
    $bytes = [System.IO.File]::ReadAllBytes($wasmPath)
    $b64 = [Convert]::ToBase64String($bytes)
    Write-Host ">>> 构建成功！WASM 字节数: $($bytes.Length) 字节" -ForegroundColor Green
    Write-Host ">>> Base64 编码长度: $($b64.Length) 字符" -ForegroundColor Green
    
    # 自动更新 _worker.js 中的 WASM_BASE64
    $workerFile = "$PSScriptRoot\..\_worker.js"
    if (Test-Path $workerFile) {
        $content = Get-Content -Raw -Encoding utf8 $workerFile
        $pattern = 'const WASM_BASE64 = "[^"]+";'
        $replacement = 'const WASM_BASE64 = "' + $b64 + '";'
        $content = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, $replacement)
        [System.IO.File]::WriteAllText($workerFile, $content, [System.Text.Encoding]::UTF8)
        Write-Host ">>> 已自动同步更新至 _worker.js" -ForegroundColor Yellow
    }
} else {
    Write-Error "编译产物不存在: $wasmPath"
}
