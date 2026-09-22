#requires -Version 5.1
<#
.SYNOPSIS
    One command: render every missing experiment artifact, then evaluate all
    experiments — no manual app interaction.

.DESCRIPTION
    Stage 1 (Node + Playwright): scans the experiment folders, and for each run
    that has a model output (raw_output.txt) generates any missing diagram.bpmn
    / diagram.svg / diagram.png / result.json using the real bpmn-js engine.

    Stage 2 (Python): scores every processed experiment with the 10 BPMN metrics
    and writes a per-experiment CSV + JSON (aggregated by process / model /
    provider / system-prompt / run) to TFM-eval/results/experiments/.

    Evaluation is semantic-only and never depends on rendering, so -SkipRender
    still produces metrics from whatever diagram.bpmn / result.json already exist.

.PARAMETER Experiments
    Folder of EXP-* directories. Default: apps/tfm-lab/prompts/experiments.

.PARAMETER Force
    Recompute and overwrite ALL artifacts with the current engine (use for the
    final, version-consistent dataset). Passed to the render stage only.

.PARAMETER SkipRender
    Skip stage 1 (evaluate already-generated artifacts only).

.PARAMETER SkipEval
    Skip stage 2 (only (re)generate artifacts).

.EXAMPLE
    pwsh scripts/run-evaluation.ps1

.EXAMPLE
    pwsh scripts/run-evaluation.ps1 -Force
#>
[CmdletBinding()]
param(
    [string]$Experiments,
    [switch]$Force,
    [switch]$SkipRender,
    [switch]$SkipEval
)

# pnpm and Python write progress / INFO lines to stderr. Under
# $ErrorActionPreference = "Stop" (with Windows PowerShell 5.1) those stderr
# writes are promoted to terminating errors and would abort the script, so we
# keep the default action and check $LASTEXITCODE explicitly after each stage.
$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path -Parent $PSScriptRoot

if (-not $Experiments) {
    $Experiments = Join-Path $RepoRoot "apps\tfm-lab\prompts\experiments"
}
if (-not (Test-Path $Experiments)) {
    throw "Experiments directory not found: $Experiments"
}
$Experiments = (Resolve-Path $Experiments).Path

$VenvPython = Join-Path $RepoRoot "TFM-eval\.venv\Scripts\python.exe"
$SchemaDir  = Join-Path $RepoRoot "TFM-eval\schemas"
$OutDir     = Join-Path $RepoRoot "TFM-eval\results\experiments"
$env:COREPACK_ENABLE_DOWNLOAD_PROMPT = "0"

Write-Host "Repo root:   $RepoRoot"
Write-Host "Experiments: $Experiments"

if (-not $SkipRender) {
    Write-Host "`n=== Stage 1/2: render missing artifacts (Node + Playwright) ===" -ForegroundColor Cyan
    Push-Location $RepoRoot
    try {
        $renderArgs = @("pnpm", "--filter", "tfm-lab", "render:experiments", "--", "--experiments", $Experiments)
        if ($Force) { $renderArgs += "--force" }
        & corepack @renderArgs
        if ($LASTEXITCODE -ne 0) { throw "Render stage failed (exit $LASTEXITCODE)." }
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Host "`nSkipping render stage (-SkipRender)." -ForegroundColor Yellow
}

if (-not $SkipEval) {
    Write-Host "`n=== Stage 2/2: evaluate experiments (Python metrics) ===" -ForegroundColor Cyan
    if (-not (Test-Path $VenvPython)) {
        throw "Python venv not found at $VenvPython.`n" +
              "Create it and install the package:`n" +
              "  cd TFM-eval; python -m venv .venv; .\.venv\Scripts\python.exe -m pip install -e `".[dev]`""
    }
    & $VenvPython -m bpmn_eval.cli_experiments `
        --experiments $Experiments `
        --schema-dir $SchemaDir `
        -o $OutDir `
        --format both
    if ($LASTEXITCODE -ne 0) { throw "Evaluation stage failed (exit $LASTEXITCODE)." }
    Write-Host "`nReports written to: $OutDir" -ForegroundColor Green
}
else {
    Write-Host "`nSkipping evaluation stage (-SkipEval)." -ForegroundColor Yellow
}

Write-Host "`nDone." -ForegroundColor Green
# Both stages verify success via $LASTEXITCODE + throw above; make the success
# exit code explicit so stderr from pnpm/Python can't muddy it under redirection.
exit 0
