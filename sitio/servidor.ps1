# ============================================================
# NORTE · servidor local con guardado (admin -> catalogo.js)
# Uso:  .\servidor.ps1   ->  http://127.0.0.1:8750/
#   Panel:      http://127.0.0.1:8750/
#   Admin:      http://127.0.0.1:8750/admin.html
# ============================================================
$raiz = $PSScriptRoot
$puerto = 8750
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$puerto/")
$listener.Start()
Write-Host "Norte en http://127.0.0.1:$puerto/  (Ctrl+C para parar)"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".md"   = "text/markdown; charset=utf-8"
  # tablero de ideas
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif"  = "image/gif"
  ".webp" = "image/webp"
  ".svg"  = "image/svg+xml"
  ".bmp"  = "image/bmp"
  ".mp3"  = "audio/mpeg"
  ".wav"  = "audio/wav"
  ".ogg"  = "audio/ogg"
  ".m4a"  = "audio/mp4"
  ".mp4"  = "video/mp4"
  ".webm" = "video/webm"
  ".mov"  = "video/quicktime"
  ".pdf"  = "application/pdf"
  ".txt"  = "text/plain; charset=utf-8"
  ".zip"  = "application/zip"
  ".ico"  = "image/x-icon"
}
$utf8 = New-Object System.Text.UTF8Encoding($false)
$carpetaTablero = Join-Path $raiz "tablero-archivos"
if (-not (Test-Path $carpetaTablero)) { New-Item -ItemType Directory -Path $carpetaTablero | Out-Null }

# ---------- localiza ffmpeg (para acelerar los audios) ----------
$script:RutaFFmpeg = $null
try {
  $wg = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter 'ffmpeg.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($wg) { $script:RutaFFmpeg = $wg.FullName }
  else {
    $enPath = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($enPath) { $script:RutaFFmpeg = $enPath.Source }
  }
} catch { }
if ($script:RutaFFmpeg) { Write-Host ("ffmpeg: " + $script:RutaFFmpeg) } else { Write-Host "ffmpeg no encontrado: los audios van a velocidad normal" }

function LeerCuerpo($ctx) {
  $enc = [System.Text.Encoding]::UTF8
  if ($ctx.Request.ContentType -and $ctx.Request.ContentType -match 'charset=([\w-]+)') {
    try { $enc = [System.Text.Encoding]::GetEncoding($Matches[1]) } catch { $enc = [System.Text.Encoding]::UTF8 }
  }
  $lector = New-Object System.IO.StreamReader($ctx.Request.InputStream, $enc)
  $txt = $lector.ReadToEnd()
  $lector.Close()
  return $txt
}

function Responder($ctx, $codigo, $texto, $tipo) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($texto)
  $ctx.Response.StatusCode = $codigo
  $ctx.Response.ContentType = $tipo
  $ctx.Response.Headers["Cache-Control"] = "no-store"
  $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $ctx.Response.Close()
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $ruta = $ctx.Request.Url.LocalPath

    # ---------- CORS simple (por si abres admin en file://) ----------
    if ($ctx.Request.HttpMethod -eq "OPTIONS") {
      $ctx.Response.StatusCode = 204
      $ctx.Response.Headers["Access-Control-Allow-Origin"] = "*"
      $ctx.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
      $ctx.Response.Headers["Access-Control-Allow-Headers"] = "Content-Type"
      $ctx.Response.Close()
      continue
    }
    $ctx.Response.Headers["Access-Control-Allow-Origin"] = "*"

    # ---------- POST /api/guardar  (escribe catalogo.js) ----------
    if ($ctx.Request.HttpMethod -eq "POST" -and $ruta -eq "/api/guardar") {
      try {
        # codificación según lo que declare el cliente (el admin envía utf-8)
        $enc = [System.Text.Encoding]::UTF8
        if ($ctx.Request.ContentType -and $ctx.Request.ContentType -match 'charset=([\w-]+)') {
          try { $enc = [System.Text.Encoding]::GetEncoding($Matches[1]) } catch { $enc = [System.Text.Encoding]::UTF8 }
        }
        $lector = New-Object System.IO.StreamReader($ctx.Request.InputStream, $enc)
        $cuerpo = $lector.ReadToEnd()
        $lector.Close()

        if ([string]::IsNullOrWhiteSpace($cuerpo) -or $cuerpo -notmatch "window\.CATALOGO") {
          Responder $ctx 400 '{"ok":false,"error":"El contenido debe ser el archivo catalogo.js (window.CATALOGO = ...)"}' "application/json; charset=utf-8"
          continue
        }
        # valida que el JSON dentro sea correcto antes de escribir
        # (busca la asignación "window.CATALOGO = {…}", no el texto en comentarios)
        $coinc = [regex]::Match($cuerpo, 'window\.CATALOGO\s*=\s*')
        if (-not $coinc.Success) {
          Responder $ctx 400 '{"ok":false,"error":"Falta la asignacion window.CATALOGO = {...}"}' "application/json; charset=utf-8"
          continue
        }
        $json = $cuerpo.Substring($coinc.Index + $coinc.Length).TrimEnd() -replace ';\s*$', ''
        # el archivo admite comentarios JS: se quitan sólo para validar
        $json = [regex]::Replace($json, '(?m)^\s*//.*$', '')
        $json = [regex]::Replace($json, '(?s)/\*.*?\*/', '')
        try { $obj = $json | ConvertFrom-Json -ErrorAction Stop }
        catch {
          Responder $ctx 400 ('{"ok":false,"error":' + (ConvertTo-Json $_.Exception.Message) + '}') "application/json; charset=utf-8"
          continue
        }
        # red de seguridad: nada se escribe si no parece el catálogo completo
        if (-not $obj.ui -or -not $obj.planes) {
          Responder $ctx 400 '{"ok":false,"error":"No parece el catalogo completo: faltan las claves ui y planes"}' "application/json; charset=utf-8"
          continue
        }

        $destino = Join-Path $raiz "catalogo.js"
        [System.IO.File]::WriteAllText($destino, $cuerpo, $utf8)
        Responder $ctx 200 '{"ok":true}' "application/json; charset=utf-8"
      } catch {
        Responder $ctx 500 ('{"ok":false,"error":' + (ConvertTo-Json $_.Exception.Message) + '}') "application/json; charset=utf-8"
      }
      continue
    }

    # ---------- POST /api/subir  (tablero: guarda un archivo en tablero-archivos/) ----------
    if ($ctx.Request.HttpMethod -eq "POST" -and $ruta -eq "/api/subir") {
      try {
        $cuerpo = LeerCuerpo $ctx
        $obj = $cuerpo | ConvertFrom-Json -ErrorAction Stop
        if (-not $obj.datos -or -not ($obj.datos -match '^data:.*?;base64,')) {
          Responder $ctx 400 '{"ok":false,"error":"Falta datos (dataURL base64)"}' "application/json; charset=utf-8"
          continue
        }
        $base64 = $obj.datos -replace '^data:.*?;base64,', ''
        $bytes = [Convert]::FromBase64String($base64)
        # nombre seguro: se quita cualquier caracter de ruta y lo no imprimible
        $nombre = [System.IO.Path]::GetFileName([string]$obj.nombre)
        $nombre = $nombre -replace '[\\/:*?"<>|]', '_'
        $nombre = $nombre -replace '[\x00-\x1F]', '_'
        $nombre = $nombre.Trim().Trim('.')
        if ([string]::IsNullOrWhiteSpace($nombre)) { $nombre = "archivo-" + (Get-Date -Format "yyyyMMdd-HHmmss") }
        $destino = Join-Path $carpetaTablero $nombre
        # si ya existe, se añade marca de tiempo para no pisar nada
        if (Test-Path $destino) {
          $marca = Get-Date -Format "yyyyMMdd-HHmmss"
          $nombre = [System.IO.Path]::GetFileNameWithoutExtension($nombre) + "-" + $marca + [System.IO.Path]::GetExtension($nombre)
          $destino = Join-Path $carpetaTablero $nombre
        }
        [System.IO.File]::WriteAllBytes($destino, $bytes)
        $res = @{ ok = $true; nombre = $nombre; bytes = $bytes.Length } | ConvertTo-Json -Compress
        Responder $ctx 200 $res "application/json; charset=utf-8"
      } catch {
        Responder $ctx 500 ('{"ok":false,"error":' + (ConvertTo-Json $_.Exception.Message) + '}') "application/json; charset=utf-8"
      }
      continue
    }

    # ---------- GET /api/tablero  (lista de archivos del tablero) ----------
    if ($ctx.Request.HttpMethod -eq "GET" -and $ruta -eq "/api/tablero") {
      try {
        $lista = @()
        if (Test-Path $carpetaTablero) {
          Get-ChildItem -Path $carpetaTablero -File | ForEach-Object {
            $lista += @{
              nombre = $_.Name
              bytes  = $_.Length
              fecha  = $_.LastWriteTime.ToString("yyyy-MM-dd")
            }
          }
        }
        $res = ConvertTo-Json -InputObject @($lista) -Compress -Depth 4
        Responder $ctx 200 $res "application/json; charset=utf-8"
      } catch {
        Responder $ctx 500 ('{"ok":false,"error":' + (ConvertTo-Json $_.Exception.Message) + '}') "application/json; charset=utf-8"
      }
      continue
    }

    # ---------- POST /api/borrar-archivo ----------
    if ($ctx.Request.HttpMethod -eq "POST" -and $ruta -eq "/api/borrar-archivo") {
      try {
        $obj = (LeerCuerpo $ctx) | ConvertFrom-Json -ErrorAction Stop
        $nombre = [System.IO.Path]::GetFileName([string]$obj.nombre)
        $destino = Join-Path $carpetaTablero $nombre
        # sólo se borra dentro de tablero-archivos
        if ($destino.StartsWith($carpetaTablero) -and (Test-Path $destino -PathType Leaf)) {
          Remove-Item $destino -Force
          Responder $ctx 200 '{"ok":true}' "application/json; charset=utf-8"
        } else {
          Responder $ctx 404 '{"ok":false,"error":"Archivo no encontrado"}' "application/json; charset=utf-8"
        }
      } catch {
        Responder $ctx 500 ('{"ok":false,"error":' + (ConvertTo-Json $_.Exception.Message) + '}') "application/json; charset=utf-8"
      }
      continue
    }

    # ---------- GET /api/tts  (proxy de voz: genera MP3; trocea textos largos) ----------
    if ($ctx.Request.HttpMethod -eq "GET" -and $ruta -eq "/api/tts") {
      try {
        $texto = [Uri]::UnescapeDataString([string]$ctx.Request.QueryString["texto"])
        $lang  = [string]$ctx.Request.QueryString["tl"]
        if (-not $lang -or $lang -notmatch '^[a-zA-Z]{2}(-[a-zA-Z]{2})?$') { $lang = "es" }
        if (-not $texto) {
          Responder $ctx 400 '{"ok":false,"error":"Falta texto"}' "application/json; charset=utf-8"
          continue
        }
        if ($texto.Length -gt 3000) { $texto = $texto.Substring(0, 3000) }

        # Google TTS acepta ~220 caracteres: troceamos en fragmentos de a lo sumo 200,
        # cortando siempre en fin de frase o palabra.
        $trozos = New-Object System.Collections.Generic.List[string]
        $resto = $texto.Trim()
        while ($resto.Length -gt 0) {
          if ($resto.Length -le 200) { $trozos.Add($resto); break }
          $corte = $resto.Substring(0, 200)
          $pos = -1
          foreach ($sep in '.', '!', '?', ';', ',', ' ') {
            $i = $corte.LastIndexOf($sep)
            if ($i -gt $pos) { $pos = $i }
          }
          if ($pos -gt 80) { $pos = $pos + 1 } else { $pos = 200 }
          $pedazo = $resto.Substring(0, $pos).Trim()
          if ($pedazo) { $trozos.Add($pedazo) }
          $resto = $resto.Substring($pos).Trim()
        }

        # pide cada fragmento y concatena los MP3 (mismo formato → suenan seguidos)
        $ms = New-Object System.IO.MemoryStream
        foreach ($t in $trozos) {
          $q   = [Uri]::EscapeDataString($t)
          $url = "https://translate.google.com/translate_tts?ie=UTF-8&q=$q&tl=$lang&client=tw-ob"
          $w   = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30 -Headers @{ 'User-Agent' = 'Mozilla/5.0' }
          $bytes = $w.Content
          $ms.Write($bytes, 0, $bytes.Length)
        }
        $salida = $ms.ToArray()
        $ms.Close()

        # ---- acelera el audio con ffmpeg (voz rápida) ----
        $vel = 1.35
        try { $vq = [string]$ctx.Request.QueryString["velocidad"]; if ($vq) { $vel = [double]$vq } } catch { $vel = 1.35 }
        if ($vel -lt 0.5) { $vel = 0.5 }
        if ($vel -gt 2.0) { $vel = 2.0 }

        if ($script:RutaFFmpeg -and (Test-Path $script:RutaFFmpeg) -and [Math]::Abs($vel - 1.0) -gt 0.01) {
          $tmpIn  = Join-Path ([IO.Path]::GetTempPath()) ("bean_tts_" + [guid]::NewGuid().ToString() + "_in.mp3")
          $tmpOut = Join-Path ([IO.Path]::GetTempPath()) ("bean_tts_" + [guid]::NewGuid().ToString() + "_out.mp3")
          try {
            [IO.File]::WriteAllBytes($tmpIn, $salida)
            $p = New-Object System.Diagnostics.Process
            $p.StartInfo.FileName = $script:RutaFFmpeg
            $p.StartInfo.Arguments = '-y -i "' + $tmpIn + '" -filter:a "atempo=' + $vel + '" -codec:a libmp3lame -q:a 4 "' + $tmpOut + '"'
            $p.StartInfo.UseShellExecute = $false
            $p.StartInfo.RedirectStandardOutput = $true
            $p.StartInfo.RedirectStandardError = $true
            $p.StartInfo.CreateNoWindow = $true
            [void]$p.Start()
            [void]$p.WaitForExit(45000)
            if ($p.ExitCode -eq 0 -and (Test-Path $tmpOut)) {
              $nuevo = [IO.File]::ReadAllBytes($tmpOut)
              if ($nuevo.Length -gt 500) { $salida = $nuevo }
            }
          } catch { } finally {
            Remove-Item $tmpIn, $tmpOut -Force -ErrorAction SilentlyContinue
          }
        }

        $ctx.Response.StatusCode = 200
        $ctx.Response.ContentType = "audio/mpeg"
        $ctx.Response.Headers["Cache-Control"] = "no-store"
        $ctx.Response.ContentLength64 = $salida.Length
        $ctx.Response.OutputStream.Write($salida, 0, $salida.Length)
        $ctx.Response.Close()
      } catch {
        Responder $ctx 502 ('{"ok":false,"error":' + (ConvertTo-Json $_.Exception.Message) + '}') "application/json; charset=utf-8"
      }
      continue
    }

    # ---------- POST /api/notion  (proxy CORS a api.notion.com) ----------
    if ($ctx.Request.HttpMethod -eq "POST" -and $ruta -eq "/api/notion") {
      try {
        $obj = (LeerCuerpo $ctx) | ConvertFrom-Json -ErrorAction Stop
        if (-not $obj.token -or -not $obj.ruta) {
          Responder $ctx 400 '{"ok":false,"error":"Faltan token y ruta"}' "application/json; charset=utf-8"
          continue
        }
        $rutaNotion = "/" + ([string]$obj.ruta).TrimStart("/")
        if ($rutaNotion -match '[^A-Za-z0-9/_.:-]') {
          Responder $ctx 400 '{"ok":false,"error":"Ruta no valida"}' "application/json; charset=utf-8"
          continue
        }
        $metodo = "GET"
        if ($obj.metodo) { $metodo = ([string]$obj.metodo).ToUpper() }
        if (@("GET","POST","PATCH","DELETE") -notcontains $metodo) { $metodo = "GET" }
        $h = @{ "Authorization" = "Bearer " + $obj.token; "Notion-Version" = "2022-06-28" }
        $url = "https://api.notion.com/v1" + $rutaNotion
        $arg = @{ Uri = $url; Method = $metodo; Headers = $h; UseBasicParsing = $true; ContentType = "application/json; charset=utf-8" }
        if ($obj.cuerpo) { $arg.Body = ($obj.cuerpo | ConvertTo-Json -Depth 20 -Compress) }
        try {
          $w = Invoke-WebRequest @arg
          Responder $ctx ([int]$w.StatusCode) $w.Content "application/json; charset=utf-8"
        } catch {
          $resp = $_.Exception.Response
          if ($resp) {
            $st = [int]$resp.StatusCode
            $texto = ""
            if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $texto = $_.ErrorDetails.Message }
            if (-not $texto) {
              try {
                $sr = New-Object System.IO.StreamReader($resp.GetResponseStream(), [System.Text.Encoding]::UTF8)
                $texto = $sr.ReadToEnd(); $sr.Close()
              } catch {}
            }
            if (-not $texto) { $texto = '{"message":"Error de Notion"}' }
            Responder $ctx $st $texto "application/json; charset=utf-8"
          } else {
            Responder $ctx 502 ('{"ok":false,"error":' + (ConvertTo-Json $_.Exception.Message) + '}') "application/json; charset=utf-8"
          }
        }
      } catch {
        Responder $ctx 500 ('{"ok":false,"error":' + (ConvertTo-Json $_.Exception.Message) + '}') "application/json; charset=utf-8"
      }
      continue
    }

    # ---------- GET de archivos ----------
    if ($ruta -eq "/") { $ruta = "/index.html" }
    $archivo = Join-Path $raiz ($ruta.TrimStart("/").Replace("/", "\"))
    if ($archivo.StartsWith($raiz) -and (Test-Path $archivo -PathType Leaf)) {
      $bytes = [System.IO.File]::ReadAllBytes($archivo)
      $ext = [System.IO.Path]::GetExtension($archivo).ToLower()
      $ctx.Response.StatusCode = 200
      $ctx.Response.ContentType = $(if ($mime[$ext]) { $mime[$ext] } else { "application/octet-stream" })
      $ctx.Response.Headers["Cache-Control"] = "no-store"
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      $ctx.Response.Close()
    } else {
      Responder $ctx 404 "No encontrado" "text/plain; charset=utf-8"
    }
  } catch {
    Write-Host "Error: $_"
  }
}
