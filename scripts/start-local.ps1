param(
    [ValidateSet('all','backend','simulator','stop','status','check')][string]$Mode='all',
    [string]$StateDirectory
)
$ErrorActionPreference = 'Stop'
$front = Split-Path -Parent $PSScriptRoot
$state = if ($StateDirectory) { [IO.Path]::GetFullPath($StateDirectory) } else { Join-Path $front '.prisaly-local' }
$configPath = Join-Path $state 'config.json'
$cfg = if (Test-Path -LiteralPath $configPath) { Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json }
$profile = if ($cfg.profile) { [string]$cfg.profile } else { 'academico' }
if ($profile -cnotin 'academico','demo-ops85') { throw "Perfil local no admitido: $profile" }
$demo = $profile -ceq 'demo-ops85'
$pgVolume = if ($demo) { 'prisaly_ops85_demo_pg_data' } else { 'prisaly_pg_data' }
$secretName = if ($demo) { 'ops85-app.dpapi' } else { 'prisaly-app.dpapi' }
$pgPort = if ($null -ne $cfg.postgresPort) { [int]$cfg.postgresPort } elseif ($demo) { 55440 } else { 5435 }
if ($pgPort -lt 1 -or $pgPort -gt 65535 -or $pgPort -in 4200,8080,8898,8899) {
    throw 'Puerto PostgreSQL inválido o reservado por otro componente de PRISALY.'
}
$ports = [ordered]@{Angular=4200; Backend=8080; PostgreSQL=$pgPort; PlayerPS2=8898; StreamerPS2=8899}
function Listener($port) { Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue }
if ($Mode -eq 'status') {
    Write-Host "Perfil configurado: $profile · volumen previsto: $pgVolume"
    foreach ($name in $ports.Keys) {
        $owners = @(Listener $ports[$name] | Select-Object -ExpandProperty OwningProcess -Unique)
        [pscustomobject]@{ Servicio=$name; Puerto=$ports[$name]; PID=($owners -join ',') }
    }
    return
}
$lock = Join-Path $state 'running.lock'
$stop = Join-Path $state 'stop'
if ($Mode -eq 'stop') {
    try {
        $idle = [IO.File]::Open($lock,'Open','ReadWrite','None')
        $idle.Dispose()
        Write-Host 'No hay ejecución administrada.'
        return
    } catch [IO.FileNotFoundException] { Write-Host 'No hay ejecución administrada.'; return }
      catch [IO.DirectoryNotFoundException] { Write-Host 'No hay ejecución administrada.'; return }
      catch [IO.IOException] { if (!$_.Exception.HResult.Equals(-2147024864)) { throw } }
    New-Item -ItemType File -Path $stop -Force | Out-Null
    Write-Host 'Apagado solicitado al orquestador.'
    return
}
if (!$cfg) { throw "Falta la configuración local $configPath" }
$db = $Mode -ne 'simulator'
$sim = $Mode -ne 'backend'
$children = [Collections.Generic.List[Diagnostics.Process]]::new()
$compose = @()
$containerId = $null
$handle = [IO.File]::Open($lock,'OpenOrCreate','ReadWrite','None')
try {
    Remove-Item -LiteralPath $stop -ErrorAction SilentlyContinue
    $logs = Join-Path $state ('logs-' + (Get-Date -Format yyyyMMdd-HHmmss))
    New-Item -ItemType Directory -Path $logs | Out-Null
    Write-Host "Logs $logs"
    function Need($p) { if (!(Test-Path -LiteralPath $p -PathType Leaf)) { throw "Falta el archivo $p" } }
    function Wait-Ready($name, [scriptblock]$probe, $seconds=90) {
        $end = [DateTime]::UtcNow.AddSeconds($seconds)
        do {
            if (Test-Path -LiteralPath $stop) { throw 'Apagado solicitado.' }
            foreach ($child in $children) { if ($child.HasExited) { throw "Finalizó un proceso administrado. Revisa $logs" } }
            if (& $probe) { Write-Host "$name disponible"; return }
            Start-Sleep -Seconds 1
        } while ([DateTime]::UtcNow -lt $end)
        throw "Tiempo agotado esperando $name. Revisa $logs"
    }
    function Start-Owned($name,$exe,$arguments,$cwd,$environment=@{}) {
        Write-Host "Iniciando $name"
        $children.Add((Start-Process -FilePath $exe -ArgumentList $arguments -WorkingDirectory $cwd -Environment $environment -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logs "$name.out.log") -RedirectStandardError (Join-Path $logs "$name.err.log")))
    }
    $node = (Get-Command node.exe).Source
    if ($Mode -in 'all','check') { Need (Join-Path $front 'node_modules/@angular/cli/bin/ng.js') }
    if ($db) {
        $backend = (Resolve-Path -LiteralPath $cfg.backendDir).Path
        $jar = [IO.Path]::GetFullPath($cfg.backendJar)
        $java = (Get-Command java.exe).Source
        Need (Join-Path $backend 'mvnw.cmd')
        $credentialPath = Join-Path $state $secretName
        Need $credentialPath
        $credential = ConvertTo-SecureString (Get-Content -LiteralPath $credentialPath -Raw).Trim()
        if ($env:APP_PORT -and $env:APP_PORT -ne '8080') { throw 'APP_PORT debe ser 8080 para development.' }
    }
    if ($sim) {
        $signal = (Resolve-Path -LiteralPath $cfg.signallingScript).Path
        $game = (Resolve-Path -LiteralPath $cfg.unrealExe).Path
        $gameDir = Split-Path -Parent $game
        Need (Join-Path $gameDir '../../../protocolo/esquemas/v1/catalogo.json')
    }
    $required = @()
    if($db){$required += $pgPort,8080}
    if($sim){$required += 8898,8899}
    if($Mode -in 'all','check'){$required += 4200}
    foreach($port in $required){ if(Listener $port){throw "Puerto $port ocupado. Se conserva la instancia existente."} }
    if ($Mode -eq 'check') { Write-Host 'Configuración y puertos listos. Verificación JDBC pendiente de arranque.'; return }
    if ($db) {
        $docker = (Get-Command docker.exe).Source
        & $docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
            $desktop = Join-Path $env:ProgramFiles 'Docker/Docker/Docker Desktop.exe'
            Need $desktop
            Start-Process -FilePath $desktop -WindowStyle Hidden
            Wait-Ready 'Docker' { & $docker info --format '{{.ServerVersion}}' 2>$null | Out-Null; $LASTEXITCODE -eq 0 } 120
        }
        & $docker volume inspect $pgVolume 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Falta el volumen $pgVolume ya provisionado. Este arranque no ejecuta migraciones." }
        $existing = & $docker ps -aq --filter "volume=$pgVolume"
        if ($LASTEXITCODE -ne 0 -or $existing) { throw "El volumen $pgVolume ya está asociado a un contenedor o Docker no pudo identificarlo." }
        # Arranque directo del clúster existente, sin pasar por el inicializador de la imagen.
        $containerId = & $docker run -d --pull never -p "127.0.0.1:${pgPort}:5432" --mount "type=volume,src=$pgVolume,dst=/var/lib/postgresql/data" --health-cmd 'pg_isready -U prisaly_app -d prisaly' --health-interval 2s --entrypoint gosu postgres:16.15 postgres postgres -D /var/lib/postgresql/data -c listen_addresses=*
        if ($LASTEXITCODE -ne 0 -or $containerId -notmatch '^[a-f0-9]{64}$') { throw 'Falló el arranque de PostgreSQL.' }
        Wait-Ready 'PostgreSQL' { (& $docker inspect --format '{{.State.Health.Status}}' $containerId 2>$null) -eq 'healthy' }
        & $docker exec $containerId psql -v ON_ERROR_STOP=1 -U prisaly_app -d prisaly -c 'SELECT current_database(), 1' *> (Join-Path $logs 'postgres-conexion.log')
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL anunció salud, pero falló SELECT 1.' }
        if (!(Test-Path -LiteralPath $jar -PathType Leaf)) {
            Push-Location -LiteralPath $backend
            try {
                & .\mvnw.cmd -B -o -pl app -am package -DskipTests *> (Join-Path $logs 'maven.log')
                if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación Maven.' }
            } finally { Pop-Location }
            Need $jar
        }
        $backendEnv = @{
            DATABASE_URL="jdbc:postgresql://127.0.0.1:${pgPort}/prisaly"
            DATABASE_USER='prisaly_app'
            DATABASE_PASSWORD=[Net.NetworkCredential]::new('', $credential).Password
            SPRING_FLYWAY_ENABLED='false'
            SPRING_JPA_HIBERNATE_DDL_AUTO='validate'
            SERVER_ADDRESS='127.0.0.1'
        }
        try { Start-Owned 'backend' $java @('-jar',('"' + $jar + '"')) $backend $backendEnv }
        finally { $backendEnv.Clear(); $credential.Dispose() }
        Wait-Ready 'Backend' {
            $response = & curl.exe --noproxy '*' --fail --silent --max-time 3 http://127.0.0.1:8080/api/health
            if ($LASTEXITCODE -ne 0) { return $false }
            try { ($response | ConvertFrom-Json).service -eq 'prisaly-backend' } catch { $false }
        } 120
    }
    if ($sim) {
        Start-Owned 'signalling' $node @(('"' + $signal + '"'),'--inicio-local-autorizado') (Split-Path -Parent $signal)
        Wait-Ready 'Señalización PS2' { (Listener 8898) -and (Listener 8899) }
        $ws = [Net.WebSockets.ClientWebSocket]::new()
        $timeout = [Threading.CancellationTokenSource]::new(5000)
        try {
            $ws.Options.SetRequestHeader('Origin','http://127.0.0.1:4213')
            $ws.ConnectAsync([uri]'ws://127.0.0.1:8898/', $timeout.Token).GetAwaiter().GetResult() | Out-Null
            if ($ws.State -ne 'Open') { throw 'WebSocket de señalización sin confirmar.' }
        } finally { $ws.Dispose(); $timeout.Dispose() }
        Start-Owned 'unreal' $game @('-RenderOffscreen','-ResX=1280','-ResY=720','-ForceRes','-ExecCmds="scalability 1"','-PixelStreamingConnectionURL=ws://127.0.0.1:8899/','-PixelStreamingID=PRISALY-LAB-03','-PixelStreamingEncoderCodec=H264','-PixelStreamingWebRTCFps=30','-PixelStreamingWebRTCMinPort=49152','-PixelStreamingWebRTCMaxPort=49215','-PixelStreamingAllowPixelStreamingCommands=false','-PrisalyTransporte=ps2','-PrisalySesion=ses-lab-ps2-0001',('-abslog="' + (Join-Path $logs 'mundo-24.log') + '"')) $gameDir
        Wait-Ready 'Conexión WebSocket del streamer' { Select-String -LiteralPath (Join-Path $logs 'signalling.out.log') -Pattern 'CONEXION_UNREAL_RECIBIDA_IDENTIDAD_PENDIENTE' -Quiet }
        Write-Host 'Identidad del streamer, video y DataChannel pendientes de comprobación en el visor.'
    }
    if ($Mode -eq 'all') {
        Start-Owned 'angular' $node @('node_modules/@angular/cli/bin/ng.js','serve') $front
        Wait-Ready 'Angular' {
            (& curl.exe --noproxy '*' --silent --max-time 3 -o NUL -w '%{http_code}' http://localhost:4200/acceso) -eq '200'
        } 120
        Write-Host 'http://localhost:4200/acceso'
    }
    Write-Host 'Ctrl+C o npm run stop para cerrar esta ejecución.'
    while (!(Test-Path -LiteralPath $stop)) {
        foreach ($child in $children) { if ($child.HasExited) { throw "Finalizó un proceso administrado. Revisa $logs" } }
        Start-Sleep -Seconds 1
    }
} finally {
    for ($i=$children.Count-1;$i -ge 0;$i--) {
        $child = $children[$i]
        if (!$child.HasExited) {
            $requested = $child.CloseMainWindow()
            if (!$requested -or !$child.WaitForExit(5000)) { $child.Kill(); $null=$child.WaitForExit(5000) }
        }
    }
    if ($containerId -match '^[a-f0-9]{64}$') {
        & $docker logs $containerId *> (Join-Path $logs 'postgres.log')
        & $docker stop $containerId | Out-Null
        & $docker rm $containerId | Out-Null
    }
    Remove-Item -LiteralPath $stop -ErrorAction SilentlyContinue
    $handle.Dispose()
}
