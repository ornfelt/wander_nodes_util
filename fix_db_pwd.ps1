# Get required env vars
$codeRootDir = $env:code_root_dir
if (-not $codeRootDir) {
    Write-Error "Environment variable 'code_root_dir' is not set."
    exit 1
}

$mysqlRootPwd = $env:MYSQL_ROOT_PWD
if ([string]::IsNullOrWhiteSpace($mysqlRootPwd)) {
    Write-Error "Environment variable 'MYSQL_ROOT_PWD' is not set or is empty."
    exit 1
}

# Files to modify
$files = @(
    Join-Path $codeRootDir 'Code2/Python/wander_nodes_util/py_map/app_cmangos.py'
    Join-Path $codeRootDir 'Code2/Python/wander_nodes_util/js_map_tbc/server.js'
    Join-Path $codeRootDir 'Code2/Python/wander_nodes_util/ts_map_tbc/src/server.ts'
)

# UTF-8 without BOM encoding
$utf8NoBomEncoding = New-Object System.Text.UTF8Encoding($false)

foreach ($filePath in $files) {
    if (-not (Test-Path $filePath)) {
        Write-Warning "File not found: $filePath"
        continue
    }

    # Read content
    $content = Get-Content -Raw -Encoding UTF8 $filePath

    # Replace all occurrences of "xxx" with MYSQL_ROOT_PWD value
    $newContent = $content -replace 'xxx', [Regex]::Escape($mysqlRootPwd)

    # Write back only if changed
    if ($newContent -ne $content) {
        [System.IO.File]::WriteAllText($filePath, $newContent, $utf8NoBomEncoding)
        Write-Host "Modified: $filePath"
    } else {
        Write-Host "No change: $filePath"
    }
}
