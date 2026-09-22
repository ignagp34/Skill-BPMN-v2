#requires -Version 5.1
<#
.SYNOPSIS
    One command to ingest direct BPMN XML, render DSL experiments, and produce
    representation-aware comparative reports.

.DESCRIPTION
    Stage 1 validates each ZSXML folder's untouched output.bpmn with the Python
    M1 implementation, then probes bpmn-js import/render behavior. Missing DI is
    added only to diagram.bpmn for visualization; output.bpmn remains untouched.

    Stage 2 runs the existing DSL renderer unchanged.

    Stage 3 estimates input/output token usage offline with tiktoken o200k_base.

    Stage 4 evaluates all EXP folders. Direct XML metrics and feature coverage
    always read output.bpmn; DSL metrics retain the existing diagram/layout
    precedence.
#>
[CmdletBinding()]
param(
    [string]$Experiments,
    [switch]$Force,
    [switch]$SkipIngest,
    [switch]$SkipDslRender,
    [switch]$SkipUsage,
    [switch]$SkipEval
)

$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path -Parent $PSScriptRoot

if (-not $Experiments) {
    $Experiments = Join-Path $RepoRoot "apps\tfm-lab\prompts\experiments"
}
if (-not (Test-Path $Experiments)) {
    throw "Experiments directory not found: $Experiments"
}
$Experiments = (Resolve-Path $Experiments).Path

$Python = Join-Path $RepoRoot "TFM-eval\.venv\Scripts\python.exe"
$Schema = Join-Path $RepoRoot "TFM-eval\schemas\BPMN20.xsd"
$SchemaDir = Join-Path $RepoRoot "TFM-eval\schemas"
$OutDir = Join-Path $RepoRoot "TFM-eval\results\experiments"
$SystemPrompts = Join-Path $RepoRoot "apps\tfm-lab\prompts\system"
$env:COREPACK_ENABLE_DOWNLOAD_PROMPT = "0"

if (-not (Test-Path $Python)) {
    throw "Python venv not found: $Python"
}

if (-not $SkipIngest) {
    Write-Host "`n=== Stage 1/4: ingest zero-shot BPMN XML ===" -ForegroundColor Cyan
    Push-Location $RepoRoot
    try {
        $args = @(
            "pnpm", "--filter", "tfm-lab", "ingest:zero-shot-xml", "--",
            "--experiments", $Experiments,
            "--python", $Python,
            "--schema", $Schema
        )
        if ($Force) { $args += "--force" }
        & corepack @args
        if ($LASTEXITCODE -ne 0) { throw "Zero-shot ingestion failed." }
    }
    finally {
        Pop-Location
    }
}

if (-not $SkipDslRender) {
    Write-Host "`n=== Stage 2/4: render DSL experiments ===" -ForegroundColor Cyan
    Push-Location $RepoRoot
    try {
        $args = @(
            "pnpm", "--filter", "tfm-lab", "render:experiments", "--",
            "--experiments", $Experiments
        )
        if ($Force) { $args += "--force" }
        & corepack @args
        if ($LASTEXITCODE -ne 0) { throw "DSL render stage failed." }
    }
    finally {
        Pop-Location
    }
}

if (-not $SkipUsage) {
    Write-Host "`n=== Stage 3/4: estimate offline token usage ===" -ForegroundColor Cyan
    & $Python -m bpmn_eval.cli_experiments usage `
        --experiments $Experiments `
        --system-prompts $SystemPrompts
    if ($LASTEXITCODE -ne 0) { throw "Token usage estimation failed." }
}

if (-not $SkipEval) {
    Write-Host "`n=== Stage 4/4: evaluate and compare ===" -ForegroundColor Cyan
    & $Python -m bpmn_eval.cli_experiments `
        --experiments $Experiments `
        --schema-dir $SchemaDir `
        -o $OutDir `
        --format both
    if ($LASTEXITCODE -ne 0) { throw "Evaluation stage failed." }
    Write-Host "`nReports written to: $OutDir" -ForegroundColor Green
}

Write-Host "`nDone." -ForegroundColor Green
exit 0
