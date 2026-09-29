# Run in an elevated Windows PowerShell. Only TCP 4317 on the current Wi-Fi
# address is allowed, from that interface's IPv4 subnet and an optional phone IP.
# WSL mirrored networking: https://learn.microsoft.com/windows/wsl/networking
param(
    [string]$InterfaceAlias = 'WLAN',
    [string]$PhoneIP,
    [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
$addresses = @(Get-NetIPAddress -InterfaceAlias $InterfaceAlias -AddressFamily IPv4 |
    Where-Object { $_.AddressState -eq 'Preferred' -and $_.IPAddress -notlike '169.254.*' })
if ($addresses.Count -ne 1) {
    throw 'Expected one active Wi-Fi IPv4 address; check Get-NetIPConfiguration.'
}
$address = $addresses[0]
$bytes = [System.Net.IPAddress]::Parse($address.IPAddress).GetAddressBytes()
$network = for ($i = 0; $i -lt 4; $i++) {
    $bits = [Math]::Min(8, [Math]::Max(0, $address.PrefixLength - 8 * $i))
    $mask = if ($bits -eq 0) { 0 } else { (255 -shl (8 - $bits)) -band 255 }
    $bytes[$i] -band $mask
}
$subnet = ($network -join '.') + '/' + $address.PrefixLength
$allowedSources = @($subnet)
if ($PhoneIP) {
    $phoneAddress = $null
    if (-not [System.Net.IPAddress]::TryParse($PhoneIP, [ref]$phoneAddress) -or
        $phoneAddress.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
        throw 'PhoneIP must be a single IPv4 address, not a range or hostname.'
    }
    $allowedSources += $phoneAddress.ToString() + '/32'
}
$windowsName = 'Shiguang-Mobile-LAN-4317'
$hypervName = 'Shiguang-Mobile-WSL-4317'
$wslCreator = '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}'
Get-Command New-NetFirewallHyperVRule, Set-NetFirewallHyperVRule -ErrorAction Stop | Out-Null
Write-Host "Allow TCP 4317 on $($address.IPAddress), sources $($allowedSources -join ', '), interface $InterfaceAlias."
Write-Host "Phone check: http://$($address.IPAddress):4317/api/health"
if ($CheckOnly) { Write-Host 'Check only: no firewall changes made.'; return }
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Open Windows PowerShell as Administrator and run this script again.'
}
$windows = @{
    Name = $windowsName; Direction = 'Inbound'; Action = 'Allow'; Enabled = 'True'
    Protocol = 'TCP'; LocalPort = 4317; LocalAddress = $address.IPAddress
    RemoteAddress = $allowedSources; InterfaceAlias = $InterfaceAlias; Profile = 'Any'
}
if (Get-NetFirewallRule -Name $windowsName -ErrorAction SilentlyContinue) {
    Set-NetFirewallRule @windows
} else {
    New-NetFirewallRule @windows -DisplayName 'Shiguang mobile LAN TCP 4317' | Out-Null
}
$hyperv = @{
    Name = $hypervName; Direction = 'Inbound'; Action = 'Allow'; Enabled = 'True'
    VMCreatorId = $wslCreator; Protocol = 'TCP'; LocalPorts = '4317'
    LocalAddresses = $address.IPAddress; RemoteAddresses = $allowedSources
}
if (Get-NetFirewallHyperVRule -Name $hypervName -ErrorAction SilentlyContinue) {
    Set-NetFirewallHyperVRule @hyperv
} else {
    New-NetFirewallHyperVRule @hyperv -DisplayName 'Shiguang mobile WSL TCP 4317' | Out-Null
}
Write-Host 'Rules applied. Keep the backend running and retry the phone health URL.'
Write-Host 'If Wi-Fi or phone IP changes, rerun with the current PhoneIP. Omitting PhoneIP removes that extra allowance.'
# Rollback (Administrator PowerShell):
# Remove-NetFirewallRule -Name Shiguang-Mobile-LAN-4317
# Remove-NetFirewallHyperVRule -Name Shiguang-Mobile-WSL-4317
