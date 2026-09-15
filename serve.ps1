param(
    [int]$Port = 5173,
    [string]$Path = "dist"
)

$root = (Resolve-Path $Path).Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

# Attempt to listen on port 3000 as well to catch Supabase default Site URL callbacks
$listensOn3000 = $false
if ($Port -ne 3000) {
    try {
        $listener.Prefixes.Add("http://localhost:3000/")
        $listensOn3000 = $true
    } catch {
        # Port 3000 already in use
    }
}

$listener.Start()

Write-Host "Server running at http://localhost:$Port/"
if ($listensOn3000) {
    Write-Host "Also listening on http://localhost:3000/ to forward Supabase auth callbacks."
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
    ".txt"  = "text/plain; charset=utf-8"
    ".xml"  = "application/xml"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # If arrived on port 3000, forward to primary port preserving hash via HTML/JS redirect
        if ($request.Url.Port -eq 3000 -and $Port -ne 3000) {
            $html = @"
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting to Pondtora...</title>
  <script>
    const target = 'http://localhost:$Port' + window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(target);
  </script>
</head>
<body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #334155;">
  <div style="text-align: center;">
    <h2>Redirecting to Pondtora...</h2>
    <p>If you are not redirected automatically, <a href="http://localhost:$Port" style="color: #16a34a; font-weight: bold;">click here</a>.</p>
  </div>
</body>
</html>
"@
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($html)
            $response.ContentType = "text/html; charset=utf-8"
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        $urlPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($urlPath)) {
            $urlPath = "index.html"
        }

        $filePath = Join-Path $root $urlPath

        if (-not (Test-Path $filePath -PathType Leaf)) {
            # SPA fallback: if not a file with extension, serve index.html
            $filePath = Join-Path $root "index.html"
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $contentType = $mimeTypes[$ext]
            }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
