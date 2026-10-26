# Run this script after starting the backend in another PowerShell terminal.
$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:8002'

Write-Host "1. Health check"
Invoke-RestMethod "$base/"

Write-Host "2. Reset simulation"
Invoke-RestMethod -Method Post "$base/api/reset" | ConvertTo-Json -Depth 8

Write-Host "3. Calculate route"
$pathBody = @{ start = @(1,1); goal = @(10,14) } | ConvertTo-Json
Invoke-RestMethod -Method Post "$base/api/path" -ContentType 'application/json' -Body $pathBody | ConvertTo-Json -Depth 8

Write-Host "4. Add an obstacle (backend will replan automatically if the route is affected)"
$obstacleBody = @{ add = @(@(2,2)); remove = @() } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Post "$base/api/obstacles" -ContentType 'application/json' -Body $obstacleBody | ConvertTo-Json -Depth 8

Write-Host "5. Test dynamic obstacle spawn on active path"
Invoke-RestMethod -Method Post "$base/api/path" -ContentType 'application/json' -Body $pathBody | Out-Null
Invoke-RestMethod -Method Post "$base/api/obstacles/dynamic-spawn" | ConvertTo-Json -Depth 8

Write-Host "6. Test preset loading (maze)"
$presetBody = @{ preset = "maze" } | ConvertTo-Json
Invoke-RestMethod -Method Post "$base/api/presets" -ContentType 'application/json' -Body $presetBody | ConvertTo-Json -Depth 8

Write-Host "7. Reset again"
Invoke-RestMethod -Method Post "$base/api/reset" | ConvertTo-Json -Depth 8
Write-Host "All API smoke tests passed successfully!" -ForegroundColor Green

