#!/usr/bin/env pwsh
# Setup script: creates 45 experiment folders for Claude Opus 4.7 runs.
# - Writes input.md (full SYSV31 + process prompt + DSL-only instruction)
# - Writes run-info.json with status=pending and empty output.dsl
# - Writes a placeholder notes.md
# - Does NOT overwrite folders whose output.dsl is non-empty.

$ErrorActionPreference = "Stop"

$repoRoot   = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$promptsDir = Join-Path $repoRoot "apps\tfm-lab\prompts"
$systemPath = Join-Path $promptsDir "system\bpmn_sketch_miner_system_prompt_v3_1.md"
$processDir = Join-Path $promptsDir "processes"
$indexPath  = Join-Path $processDir "index.json"
$expRoot    = Join-Path $promptsDir "experiments"

if (-not (Test-Path $systemPath)) { throw "Missing system prompt: $systemPath" }
if (-not (Test-Path $indexPath))  { throw "Missing process index: $indexPath" }

$systemPrompt = Get-Content -Raw -Path $systemPath
$index = Get-Content -Raw -Path $indexPath | ConvertFrom-Json

$createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$summary = @{
    planned = 0
    created = 0
    skipped = 0
    existingCompleted = 0
    folders = @()
}

foreach ($proc in $index) {
    $processPath = Join-Path $processDir $proc.filename
    if (-not (Test-Path $processPath)) {
        Write-Warning "Missing process prompt: $processPath"
        continue
    }
    $processPrompt = Get-Content -Raw -Path $processPath

    foreach ($runNumber in 1..3) {
        $summary.planned++
        $runTag = "R{0:D2}" -f $runNumber
        $expId  = "EXP-$($proc.process_id)-SYSV31-CLAUDE-OPUS_4_7-$runTag"
        $expDir = Join-Path $expRoot $expId

        $existingOutput = Join-Path $expDir "output.dsl"
        if (Test-Path $existingOutput) {
            $size = (Get-Item $existingOutput).Length
            if ($size -gt 0) {
                Write-Host "SKIP existing non-empty output: $expId"
                $summary.skipped++
                $summary.existingCompleted++
                $summary.folders += @{ id = $expId; status = "skipped_existing" }
                continue
            }
        }

        if (-not (Test-Path $expDir)) {
            New-Item -ItemType Directory -Path $expDir | Out-Null
        }

        $inputMd = @"
You are a BPMN Sketch Miner DSL generator.

Use the system prompt and process prompt provided below.
Return only the final BPMN Sketch Miner DSL.
Do not include markdown fences.
Do not include explanations.
Do not include JSON.
Do not include comments outside the DSL.

SYSTEM PROMPT:
$systemPrompt

PROCESS PROMPT:
$processPrompt

Output only the DSL.
"@

        $inputPath = Join-Path $expDir "input.md"
        $inputMd | Out-File -FilePath $inputPath -Encoding utf8 -NoNewline

        $expectedFeaturesJson = $proc.expected_features | ConvertTo-Json -Compress
        if ($null -eq $expectedFeaturesJson) { $expectedFeaturesJson = "[]" }

        $runInfo = [ordered]@{
            experimentId                     = $expId
            processId                        = $proc.process_id
            processFilename                  = $proc.filename
            processTitle                     = $proc.title
            processSource                    = "synthetic"
            difficulty                       = $proc.difficulty
            expectedFeatures                 = $proc.expected_features
            systemPromptVersion              = "SYSV31"
            provider                         = "CLAUDE"
            modelLabel                       = "OPUS_4_7"
            executionSetting                 = "Claude Opus 4.7 (Agent SDK, fresh subagent context)"
            reasoningMode                    = "Adaptive"
            runNumber                        = $runNumber
            interfaceType                    = "agent"
            status                           = "pending"
            officialResultJsonGeneratedByApp = $false
            createdAt                        = $createdAt
            notes                            = ""
        }
        $runInfoPath = Join-Path $expDir "run-info.json"
        $runInfo | ConvertTo-Json -Depth 6 | Out-File -FilePath $runInfoPath -Encoding utf8 -NoNewline

        # Placeholder output.dsl (empty until subagent fills it)
        $outputPath = Join-Path $expDir "output.dsl"
        if (-not (Test-Path $outputPath)) {
            New-Item -ItemType File -Path $outputPath | Out-Null
        }

        $notesPath = Join-Path $expDir "notes.md"
        $notesContent = @"
# Run notes — $expId

- Provider: Claude (Opus 4.7)
- Model label: OPUS_4_7
- Reasoning mode: Adaptive (Agent SDK; no separate thinking-mode toggle)
- Interface: agent / subagent (fresh isolated context per experiment)
- System prompt: SYSV31 (bpmn_sketch_miner_system_prompt_v3_1.md)
- Process: $($proc.process_id) — $($proc.title)
- Run number: $runNumber

Status: pending — output.dsl will be filled by a fresh isolated Claude Opus 4.7 subagent.
"@
        $notesContent | Out-File -FilePath $notesPath -Encoding utf8 -NoNewline

        $summary.created++
        $summary.folders += @{ id = $expId; status = "scaffolded" }
        Write-Host "OK $expId"
    }
}

Write-Host ""
Write-Host "Planned:           $($summary.planned)"
Write-Host "Scaffolded:        $($summary.created)"
Write-Host "Skipped (exists):  $($summary.skipped)"
