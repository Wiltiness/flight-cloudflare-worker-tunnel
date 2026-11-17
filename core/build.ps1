Set-Location -Path $PSScriptRoot
cargo build --target wasm32-unknown-unknown --release

$wasmPath = "$PSScriptRoot\target\wasm32-unknown-unknown\release\vless_core.wasm"
if (Test-Path $wasmPath) {
    $bytes = [System.IO.File]::ReadAllBytes($wasmPath)
    $b64 = [Convert]::ToBase64String($bytes)
    Write-Host "[OK] Size: $($bytes.Length) bytes" -ForegroundColor Green
    
    $workerFile = "$PSScriptRoot\..\_worker.js"
    if (Test-Path $workerFile) {
        $content = Get-Content -Raw -Encoding utf8 $workerFile
        $pattern = 'const _B64 = "[^"]+";'
        $replacement = 'const _B64 = "' + $b64 + '";'
        $content = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, $replacement)
        [System.IO.File]::WriteAllText($workerFile, $content, [System.Text.Encoding]::UTF8)
        Write-Host "[OK] Synced to _worker.js" -ForegroundColor Yellow
    }
}
