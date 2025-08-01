# Ensure environment variable is set
$codeRootDir = $env:code_root_dir
if (-not $codeRootDir) {
    Write-Error "Environment variable 'code_root_dir' is not set."
    exit 1
}

# Define diff pairs
$diffPairs = @(
    @{
        Path1 = "$codeRootDir/Code2/Python/wander_nodes_util/py_map/app.py"
        Path2 = "$codeRootDir/Code2/Python/wander_nodes_util/py_map/app_cmangos.py"
        Out   = "diff_app_py.diff"
    },
    @{
        Path1 = "$codeRootDir/Code2/Python/wander_nodes_util/py_map/templates/index.html"
        Path2 = "$codeRootDir/Code2/Python/wander_nodes_util/py_map/templates/index_cmangos.html"
        Out   = "diff_index_html.diff"
    },
    @{
        Path1 = "$codeRootDir/Code2/Python/wander_nodes_util/ts_map/src/server.ts"
        Path2 = "$codeRootDir/Code2/Python/wander_nodes_util/ts_map_tbc/src/server.ts"
        Out   = "diff_server_ts.diff"
    },
    @{
        Path1 = "$codeRootDir/Code2/Python/wander_nodes_util/js_map/server.js"
        Path2 = "$codeRootDir/Code2/Python/wander_nodes_util/js_map_tbc/server.js"
        Out   = "diff_server_js.diff"
    }
)

# Loop through and generate diffs
foreach ($pair in $diffPairs) {
    $path1 = $pair.Path1
    $path2 = $pair.Path2
    $outFile = $pair.Out

    Write-Host "Generating diff: $outFile"

    # Run git diff and redirect output
    git diff --no-index --relative -- "$path1" "$path2" > $outFile
}

