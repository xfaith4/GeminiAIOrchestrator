# Save as: export-sqlite.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$DatabasePath,
    
    [string]$OutputPath = "exported.sql"
)

# Check if sqlite3 is available
try {
    $sqliteCmd = Get-Command sqlite3 -ErrorAction Stop
} catch {
    Write-Error "sqlite3 not found. Install from: https://www.sqlite.org/download.html"
    exit 1
}

# Export database
Write-Host "Exporting $DatabasePath to $OutputPath..."
sqlite3 $DatabasePath .dump | Out-File -FilePath $OutputPath -Encoding UTF8
Write-Host "✅ Export complete!"


.\export-sqlite.ps1 -DatabasePath "G:\Development\10_Active\FamilyTreeModern\Database\FamilyTree_new.sqlite" -OutputPath "mydata.sql"