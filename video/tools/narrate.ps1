# Narration for the 30-second pitch, synthesized offline with the Windows voice Microsoft Zira (English).
# Picks the slowest speech rate whose total (speech + gaps) fits the budget, then writes one WAV per segment
# and src/timing.json with the start, duration and English caption of each segment.
# Aborts if a segment's duration is implausible for its word count.
Add-Type -AssemblyName System.Speech
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'public\narration'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $root 'src') | Out-Null

# k = 'n' normal, '!' strong emphasis. 'cap' is the on-screen English subtitle.
$segments = @(
  @{ id = 's1'; cap = 'We are AIneedHealth.'; parts = @(@{ k = 'n'; t = 'We are, AI need health.' }) },
  @{ id = 's2'; cap = 'Astronauts now judge their own health and make decisions.'; parts = @(@{ k = 'n'; t = 'Astronauts now judge their own health and make decisions.' }) },
  @{ id = 's3'; cap = 'Monitor your vitals. Make decisions!'; parts = @(@{ k = 'n'; t = 'Monitor your vitals.' }, @{ k = '!'; t = 'Make decisions!' }) },
  @{ id = 's4'; cap = 'Every reading is compared with your baseline, set by the flight surgeons.'; parts = @(@{ k = 'n'; t = 'Every reading is compared with your baseline, set by the flight surgeons.' }) },
  @{ id = 's5'; cap = 'Designed for equipment NASA and CSA already use in research.'; parts = @(@{ k = 'n'; t = 'Designed for equipment NASA and C S A already use in research.' }) },
  @{ id = 's6'; cap = 'Referenced to NASA-STD-3001, the system tells you what to do.'; parts = @(@{ k = 'n'; t = 'Referenced to the NASA standard three thousand one, the system tells you what to do.' }) },
  @{ id = 's7'; cap = 'Based on NASA and CSA sources.'; parts = @(@{ k = 'n'; t = 'Based on NASA and C S A sources.' }) },
  @{ id = 's8'; cap = 'Astronauts must never depend on chance!'; parts = @(@{ k = '!'; t = 'Astronauts must never depend on chance!' }) }
)
$gap = 0.2
$budget = 29.0

function Build-Prompt($seg) {
  # SAPI emphasis only slows the voice down, so emphasis (k = '!') is carried by the visuals instead.
  $pb = New-Object System.Speech.Synthesis.PromptBuilder
  foreach ($p in $seg.parts) { $pb.AppendText($p.t + ' ') }
  return $pb
}
# Trim the silence SAPI adds at both ends (16-bit PCM, 44-byte header), keeping a short margin.
function Trim-Wav($f) {
  $b = [IO.File]::ReadAllBytes($f)
  $d = 12
  while ($d -lt $b.Length - 8 -and [Text.Encoding]::ASCII.GetString($b, $d, 4) -ne 'data') { $d += 8 + [BitConverter]::ToInt32($b, $d + 4) }
  $off = $d + 8; $n = [int](($b.Length - $off) / 2)
  $first = -1; $last = -1
  for ($i = 0; $i -lt $n; $i++) {
    $v = [BitConverter]::ToInt16($b, $off + 2 * $i)
    if ([math]::Abs($v) -gt 500) { if ($first -lt 0) { $first = $i }; $last = $i }
  }
  if ($first -lt 0) { return }
  $rate = [BitConverter]::ToInt32($b, 24); $m = [int]($rate * 0.06)
  $s = [math]::Max(0, $first - $m); $e = [math]::Min($n - 1, $last + $m)
  $cnt = $e - $s + 1
  $out = New-Object byte[] (44 + 2 * $cnt)
  [Array]::Copy($b, 0, $out, 0, 36)
  [BitConverter]::GetBytes([int]16).CopyTo($out, 16)
  [Text.Encoding]::ASCII.GetBytes('data').CopyTo($out, 36)
  [Array]::Copy($b, $off + 2 * $s, $out, 44, 2 * $cnt)
  [BitConverter]::GetBytes([int](36 + 2 * $cnt)).CopyTo($out, 4)
  [BitConverter]::GetBytes([int](2 * $cnt)).CopyTo($out, 40)
  [IO.File]::WriteAllBytes($f, $out)
}
function Wav-Duration($f) { $b = [IO.File]::ReadAllBytes($f); return ($b.Length - 44) / [BitConverter]::ToInt32($b, 28) }
function Word-Count($seg) { $txt = ($seg.parts | ForEach-Object { $_.t }) -join ' '; return @($txt -split '\s+' | Where-Object { $_ }).Count }

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('Microsoft Zira Desktop')
$chosen = $null
foreach ($rate in 0..4) {
  $synth.Rate = $rate
  $durs = @{}; $total = 0
  foreach ($seg in $segments) {
    $f = Join-Path $outDir ($seg.id + '.wav')
    $synth.SetOutputToWaveFile($f); $synth.Speak((Build-Prompt $seg)); $synth.SetOutputToNull()
    Trim-Wav $f
    $d = Wav-Duration $f; $w = Word-Count $seg
    $wps = $w / $d
    if ($wps -lt 1.0 -or $wps -gt 4.5) { throw ("segmento {0} implausivel: {1} palavras em {2:N2} s ({3:N2} pal/s)" -f $seg.id, $w, $d, $wps) }
    $durs[$seg.id] = $d; $total += $d
  }
  $total += $gap * ($segments.Count - 1)
  Write-Host ("rate {0}: total {1:N1} s" -f $rate, $total)
  if ($total -le $budget) { $chosen = $rate; break }
}
if ($null -eq $chosen) { Write-Host "AVISO: nem a velocidade maxima coube em $budget s"; $chosen = 4 }

$timeline = @(); $t = 0.35
foreach ($seg in $segments) {
  $d = $durs[$seg.id]; $w = Word-Count $seg
  $timeline += [ordered]@{ id = $seg.id; cap = $seg.cap; words = $w; start = [math]::Round($t, 3); dur = [math]::Round($d, 3) }
  Write-Host ("{0}: {1} palavras, {2:N2} s ({3:N2} pal/s)" -f $seg.id, $w, $d, ($w / $d))
  $t += $d + $gap
}
$result = [ordered]@{ rate = $chosen; end = [math]::Round($t - $gap, 3); segments = $timeline }
$result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $root 'src\timing.json') -Encoding utf8
Write-Host ("escolhido: rate {0}; fala termina em {1:N1} s" -f $chosen, $result.end)
