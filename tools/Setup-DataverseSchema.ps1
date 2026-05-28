#Requires -Version 5.1
<#
.SYNOPSIS
  Bootstraps the BOQ & Vendor Management schema in a Dataverse environment.

.DESCRIPTION
  Reads tools/dataverse-schema.json and creates the choice columns, tables,
  columns and one-to-many relationships described there, using the
  Dataverse Web API. Idempotent: anything that already exists is skipped.

.PARAMETER OrgUrl
  Dataverse environment URL, e.g. https://contoso.crm.dynamics.com

.PARAMETER SchemaPath
  Path to dataverse-schema.json. Defaults to the file next to this script.

.PARAMETER Token
  Optional bearer token. If omitted, the script uses Azure CLI to fetch one:
    az login
    az account get-access-token --resource <OrgUrl>

.EXAMPLE
  ./Setup-DataverseSchema.ps1 -OrgUrl https://asia-strategic.crm5.dynamics.com

.NOTES
  Prerequisites:
   - Azure CLI:        https://aka.ms/installazurecli
   - PowerShell 5.1+   (Windows PowerShell or PowerShell 7)
   - A user/service principal with the System Customizer role in the target
     Dataverse environment.

  What this script DOES create:
   - Global option sets (choice columns)
   - Tables (entities) with primary name column
   - Standard columns on each table
   - One-to-many relationships (lookup columns)

  What this script does NOT create (do these in Power Apps Studio):
   - Rollup columns         (e.g. Project.as_boqbudgetedtotal)
   - Formula columns        (e.g. BOQ Item.as_budgetedtotal)
   - Business rules
   - Views, forms, charts, dashboards
   - Power Automate flows
   - Security roles
  See docs/POWER_APP_Build_Guide.md sections 5-12 for those.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$OrgUrl,

  [string]$SchemaPath = (Join-Path $PSScriptRoot 'dataverse-schema.json'),

  [string]$Token
)

$ErrorActionPreference = 'Stop'
$OrgUrl = $OrgUrl.TrimEnd('/')
$apiBase = "$OrgUrl/api/data/v9.2"

# ---------- Auth ----------
if (-not $Token) {
  Write-Host "Acquiring access token via Azure CLI for $OrgUrl ..."
  try {
    $tokenJson = az account get-access-token --resource $OrgUrl --output json 2>$null
    if (-not $tokenJson) { throw "az returned no token. Run 'az login' first." }
    $Token = ($tokenJson | ConvertFrom-Json).accessToken
  } catch {
    throw "Failed to get access token via 'az'. Install Azure CLI (https://aka.ms/installazurecli), then 'az login' and re-run. Underlying error: $_"
  }
}

$headers = @{
  Authorization     = "Bearer $Token"
  'OData-MaxVersion' = '4.0'
  'OData-Version'    = '4.0'
  Accept             = 'application/json'
  'Content-Type'     = 'application/json; charset=utf-8'
  Prefer             = 'return=representation'
}

# ---------- Helpers ----------
function Invoke-Dv {
  param([string]$Method, [string]$Path, $Body, [switch]$NoBody)
  $url = if ($Path -match '^https?://') { $Path } else { "$apiBase/$Path" }
  $params = @{
    Method  = $Method
    Uri     = $url
    Headers = $headers
  }
  if ($Body -and -not $NoBody) {
    $params['Body'] = ($Body | ConvertTo-Json -Depth 25 -Compress)
  }
  try {
    return Invoke-RestMethod @params
  } catch {
    $err = $_.ErrorDetails.Message
    if (-not $err) { $err = $_.Exception.Message }
    throw "Dataverse API call failed: $Method $url`n$err"
  }
}

function Localized($text) {
  return @{
    '@odata.type'           = 'Microsoft.Dynamics.CRM.Label'
    LocalizedLabels         = @(@{
      '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'
      Label         = $text
      LanguageCode  = $schema.languageCode
    })
  }
}

function Exists-OptionSet($name) {
  try {
    $r = Invoke-Dv -Method GET -Path "GlobalOptionSetDefinitions(Name='$name')`?`$select=Name"
    return $true
  } catch { return $false }
}

function Exists-Entity($logicalName) {
  try {
    $r = Invoke-Dv -Method GET -Path "EntityDefinitions(LogicalName='$logicalName')`?`$select=LogicalName"
    return $true
  } catch { return $false }
}

function Exists-Attribute($entity, $attribute) {
  try {
    $r = Invoke-Dv -Method GET -Path "EntityDefinitions(LogicalName='$entity')/Attributes(LogicalName='$attribute')`?`$select=LogicalName"
    return $true
  } catch { return $false }
}

function Exists-Relationship($schemaName) {
  try {
    $r = Invoke-Dv -Method GET -Path "RelationshipDefinitions(SchemaName='$schemaName')`?`$select=SchemaName"
    return $true
  } catch { return $false }
}

# ---------- Load schema ----------
if (-not (Test-Path $SchemaPath)) { throw "Schema file not found: $SchemaPath" }
$schema = Get-Content $SchemaPath -Raw | ConvertFrom-Json
Write-Host "`nLoaded schema: $($schema.tables.Count) tables, $($schema.choices.Count) choices, $($schema.relationships.Count) relationships."

# ---------- 1. Choice columns ----------
Write-Host "`n=== Choice columns ===" -ForegroundColor Cyan
foreach ($c in $schema.choices) {
  if (Exists-OptionSet $c.name) {
    Write-Host "  - $($c.name)  [exists, skipped]"
    continue
  }
  $body = @{
    '@odata.type'         = 'Microsoft.Dynamics.CRM.OptionSetMetadata'
    Name                  = $c.name
    DisplayName           = (Localized $c.displayName)
    Description           = (Localized "$($c.displayName) — managed by Setup-DataverseSchema.ps1")
    IsGlobal              = $true
    OptionSetType         = 'Picklist'
    Options               = @($c.options | ForEach-Object {
      @{
        Value = $_.value
        Label = (Localized $_.label)
      }
    })
  }
  Invoke-Dv -Method POST -Path 'GlobalOptionSetDefinitions' -Body $body | Out-Null
  Write-Host "  + $($c.name)  [created]" -ForegroundColor Green
}

# ---------- 2. Tables ----------
Write-Host "`n=== Tables ===" -ForegroundColor Cyan
foreach ($t in $schema.tables) {
  if (Exists-Entity $t.name) {
    Write-Host "  - $($t.name)  [exists, skipped]"
    continue
  }
  $primary = $t.primaryName
  $primaryAttr = @{
    '@odata.type' = 'Microsoft.Dynamics.CRM.StringAttributeMetadata'
    SchemaName    = $primary.schema
    LogicalName   = $primary.schema.ToLower()
    DisplayName   = (Localized $primary.display)
    RequiredLevel = @{ Value = 'ApplicationRequired' }
    MaxLength     = $primary.maxLength
    FormatName    = @{ Value = 'Text' }
    IsPrimaryName = $true
  }
  if ($primary.autoNumberFormat) {
    $primaryAttr['AutoNumberFormat'] = $primary.autoNumberFormat
  }

  $body = @{
    '@odata.type'        = 'Microsoft.Dynamics.CRM.EntityMetadata'
    SchemaName           = $t.name
    LogicalName          = $t.name.ToLower()
    DisplayName          = (Localized $t.displayName)
    DisplayCollectionName= (Localized $t.displayPlural)
    Description          = (Localized "Managed by Setup-DataverseSchema.ps1")
    OwnershipType        = 'UserOwned'
    HasActivities        = $false
    HasNotes             = $true
    Attributes           = @($primaryAttr)
  }
  Invoke-Dv -Method POST -Path 'EntityDefinitions' -Body $body | Out-Null
  Write-Host "  + $($t.name)  [created]" -ForegroundColor Green
}

# ---------- 3. Columns ----------
Write-Host "`n=== Columns ===" -ForegroundColor Cyan
foreach ($t in $schema.tables) {
  foreach ($col in $t.columns) {
    if (Exists-Attribute $t.name $col.name) {
      Write-Host "  - $($t.name).$($col.name)  [exists, skipped]"
      continue
    }

    $base = @{
      SchemaName    = $col.name
      LogicalName   = $col.name.ToLower()
      DisplayName   = (Localized $col.display)
      Description   = (Localized $col.display)
      RequiredLevel = @{ Value = if ($col.required) { $col.required } else { 'None' } }
    }

    switch ($col.type) {
      'String' {
        $body = $base + @{
          '@odata.type' = 'Microsoft.Dynamics.CRM.StringAttributeMetadata'
          MaxLength     = $col.maxLength
          FormatName    = @{ Value = if ($col.format) { $col.format } else { 'Text' } }
        }
      }
      'Memo' {
        $body = $base + @{
          '@odata.type' = 'Microsoft.Dynamics.CRM.MemoAttributeMetadata'
          MaxLength     = $col.maxLength
          Format        = 'TextArea'
        }
      }
      'DateOnly' {
        $body = $base + @{
          '@odata.type' = 'Microsoft.Dynamics.CRM.DateTimeAttributeMetadata'
          Format        = 'DateOnly'
          DateTimeBehavior = @{ Value = 'DateOnly' }
        }
      }
      'Decimal' {
        $body = $base + @{
          '@odata.type' = 'Microsoft.Dynamics.CRM.DecimalAttributeMetadata'
          Precision     = if ($col.precision) { $col.precision } else { 2 }
          MinValue      = if ($null -ne $col.minValue) { $col.minValue } else { -100000000000 }
          MaxValue      = if ($null -ne $col.maxValue) { $col.maxValue } else {  100000000000 }
        }
      }
      'Money' {
        $body = $base + @{
          '@odata.type' = 'Microsoft.Dynamics.CRM.MoneyAttributeMetadata'
          PrecisionSource = 2
          MinValue      = 0
          MaxValue      = 922337203685477
        }
      }
      'Picklist' {
        $body = $base + @{
          '@odata.type' = 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata'
          OptionSet     = @{
            '@odata.type' = 'Microsoft.Dynamics.CRM.OptionSetMetadata'
            Name          = $col.optionSet
            IsGlobal      = $true
          }
          DefaultFormValue = if ($col.defaultValue) { $col.defaultValue } else { -1 }
        }
      }
      default {
        Write-Warning "  ? $($t.name).$($col.name) — unsupported type '$($col.type)', skipping"
        continue
      }
    }

    Invoke-Dv -Method POST -Path "EntityDefinitions(LogicalName='$($t.name)')/Attributes" -Body $body | Out-Null
    Write-Host "  + $($t.name).$($col.name)  [$($col.type)]" -ForegroundColor Green
  }
}

# ---------- 4. One-to-many relationships ----------
Write-Host "`n=== Relationships ===" -ForegroundColor Cyan
$cascadeMap = @{
  'Cascade'    = 1
  'Active'     = 2
  'UserOwned'  = 3
  'NoCascade'  = 4
  'RemoveLink' = 5
  'Restrict'   = 6
}
foreach ($rel in $schema.relationships) {
  if (Exists-Relationship $rel.schema) {
    Write-Host "  - $($rel.schema)  [exists, skipped]"
    continue
  }
  $cascade = if ($rel.cascadeDelete) { $rel.cascadeDelete } else { 'RemoveLink' }
  $cascadeValue = $cascadeMap[$cascade]
  if ($null -eq $cascadeValue) { throw "Unknown cascadeDelete '$cascade'" }

  $body = @{
    '@odata.type'           = 'Microsoft.Dynamics.CRM.OneToManyRelationshipMetadata'
    SchemaName              = $rel.schema
    ReferencedEntity        = $rel.parent
    ReferencingEntity       = $rel.child
    Lookup                  = @{
      '@odata.type' = 'Microsoft.Dynamics.CRM.LookupAttributeMetadata'
      SchemaName    = $rel.lookupSchema
      LogicalName   = $rel.lookupSchema.ToLower()
      DisplayName   = (Localized $rel.lookupDisplay)
      Description   = (Localized $rel.lookupDisplay)
      RequiredLevel = @{ Value = if ($rel.required) { $rel.required } else { 'None' } }
    }
    AssociatedMenuConfiguration = @{
      Behavior = 'UseLabel'
      Group    = 'Details'
      Label    = (Localized $rel.child)
      Order    = 10000
    }
    CascadeConfiguration = @{
      Assign    = $cascadeValue
      Delete    = $cascadeValue
      Merge     = 1
      Reparent  = $cascadeValue
      Share     = $cascadeValue
      Unshare   = $cascadeValue
    }
  }
  Invoke-Dv -Method POST -Path 'RelationshipDefinitions' -Body $body | Out-Null
  Write-Host "  + $($rel.schema)  [$($rel.parent) 1→N $($rel.child)]" -ForegroundColor Green
}

Write-Host "`nDone. Open $OrgUrl in your browser → Power Apps → Tables to verify, then follow docs/POWER_APP_Build_Guide.md §5 onwards for rollups, business rules, flows, views, forms and the model-driven app." -ForegroundColor Cyan
