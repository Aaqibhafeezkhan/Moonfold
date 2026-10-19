/**
 * The Windows computer-use helper, run by PowerShell. It reads one JSON request per line on stdin
 * and answers one JSON line on stdout. Kept free of backticks and dollar-brace sequences so it can
 * live in this raw template string; see docs/COMPUTER-USE.md for what it may do.
 */
export const WINDOWS_HELPER_SCRIPT = String.raw`# Moonfold computer-use helper for Windows. Reads one JSON request per line on stdin and writes
# one JSON response per line on stdout. Coordinates are window-relative, in the window's image
# space: the window's pixels scaled so the image is at most MaxImageWidth wide.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

public static class MoonfoldWin {
  public delegate bool EnumProc(IntPtr hwnd, IntPtr lparam);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr lparam);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int max);
  [DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr hwnd);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr hwnd, uint cmd);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hwnd);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hwnd, int cmd);
  [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hwnd);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern IntPtr WindowFromPoint(POINT point);
  [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr hwnd, uint flags);
  [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] static extern uint SendInput(uint count, INPUT[] inputs, int size);
  [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr value);
  [DllImport("user32.dll")] static extern bool IsWindow(IntPtr hwnd);
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr hwnd, int attribute, out int value, int size);
  [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")] static extern IntPtr GetWindowLongPtr(IntPtr hwnd, int index);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr hwnd, StringBuilder name, int max);

  /** An edit control that hides its text: Windows' ES_PASSWORD style, whatever UI Automation says. */
  public static bool IsPasswordEdit(long handle) {
    if (handle == 0) return false;
    var hwnd = new IntPtr(handle);
    var name = new StringBuilder(256); GetClassName(hwnd, name, name.Capacity);
    if (name.ToString().IndexOf("EDIT", StringComparison.OrdinalIgnoreCase) < 0) return false;
    return (GetWindowLongPtr(hwnd, -16).ToInt64() & 0x20) != 0;
  }

  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [StructLayout(LayoutKind.Sequential)] struct MOUSEINPUT { public int dx, dy; public uint mouseData, dwFlags, time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Sequential)] struct KEYBDINPUT { public ushort wVk, wScan; public uint dwFlags, time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Explicit)] struct INPUTUNION { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
  [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public INPUTUNION u; }

  const uint INPUT_MOUSE = 0, INPUT_KEYBOARD = 1;
  const uint KEYEVENTF_KEYUP = 0x2, KEYEVENTF_UNICODE = 0x4;
  const uint MOUSE_LEFTDOWN = 0x2, MOUSE_LEFTUP = 0x4, MOUSE_RIGHTDOWN = 0x8, MOUSE_RIGHTUP = 0x10, MOUSE_WHEEL = 0x800;

  public static void UseDpiAwareness() {
    // Per-monitor v2, so window rectangles, UI Automation and the cursor share physical pixels.
    try { if (SetProcessDpiAwarenessContext(new IntPtr(-4))) return; } catch {}
    try { SetProcessDPIAware(); } catch {}
  }

  public class WindowInfo { public long Handle; public string Title; public uint Pid; public string Process; public int X, Y, Width, Height; public bool Minimized; }

  public static List<WindowInfo> ListWindows() {
    var result = new List<WindowInfo>();
    EnumWindows((hwnd, lparam) => {
      if (!IsWindowVisible(hwnd) || GetWindow(hwnd, 4) != IntPtr.Zero) return true;
      int cloaked; if (DwmGetWindowAttribute(hwnd, 14, out cloaked, 4) == 0 && cloaked != 0) return true;
      int length = GetWindowTextLength(hwnd); if (length == 0) return true;
      var title = new StringBuilder(length + 1); GetWindowText(hwnd, title, title.Capacity);
      uint pid; GetWindowThreadProcessId(hwnd, out pid);
      string process; try { process = Process.GetProcessById((int)pid).ProcessName.ToLowerInvariant() + ".exe"; } catch { return true; }
      RECT rect; GetWindowRect(hwnd, out rect);
      result.Add(new WindowInfo { Handle = hwnd.ToInt64(), Title = title.ToString(), Pid = pid, Process = process,
        X = rect.Left, Y = rect.Top, Width = rect.Right - rect.Left, Height = rect.Bottom - rect.Top, Minimized = IsIconic(hwnd) });
      return true;
    }, IntPtr.Zero);
    return result;
  }

  public static string ProcessOf(long handle) {
    uint pid; GetWindowThreadProcessId(new IntPtr(handle), out pid);
    try { return Process.GetProcessById((int)pid).ProcessName.ToLowerInvariant() + ".exe"; } catch { return null; }
  }

  public static bool Exists(long handle) { return IsWindow(new IntPtr(handle)) && IsWindowVisible(new IntPtr(handle)); }

  public static RECT Rect(long handle) { RECT rect; GetWindowRect(new IntPtr(handle), out rect); return rect; }

  public static bool Focus(long handle) {
    var hwnd = new IntPtr(handle);
    if (IsIconic(hwnd)) ShowWindow(hwnd, 9);
    if (GetForegroundWindow() == hwnd) return true;
    // A key event from this process lets Windows hand it the foreground.
    Key(0x12, false); Key(0x12, true);
    SetForegroundWindow(hwnd);
    System.Threading.Thread.Sleep(80);
    return GetAncestor(GetForegroundWindow(), 2) == hwnd;
  }

  /** The top-level window under a screen point, so a click never lands on another app. */
  public static long WindowAt(int x, int y) {
    var hwnd = WindowFromPoint(new POINT { X = x, Y = y });
    return GetAncestor(hwnd, 2).ToInt64();
  }

  public static string Capture(long handle, double scale) {
    var hwnd = new IntPtr(handle);
    RECT rect; GetWindowRect(hwnd, out rect);
    int width = Math.Max(1, rect.Right - rect.Left), height = Math.Max(1, rect.Bottom - rect.Top);
    using (var full = new Bitmap(width, height, PixelFormat.Format32bppArgb)) {
      using (var g = Graphics.FromImage(full)) {
        var hdc = g.GetHdc();
        bool printed = PrintWindow(hwnd, hdc, 2);
        g.ReleaseHdc(hdc);
        if (!printed) g.CopyFromScreen(rect.Left, rect.Top, 0, 0, new Size(width, height));
      }
      int outWidth = Math.Max(1, (int)Math.Round(width * scale)), outHeight = Math.Max(1, (int)Math.Round(height * scale));
      using (var scaled = new Bitmap(outWidth, outHeight, PixelFormat.Format24bppRgb)) {
        using (var g = Graphics.FromImage(scaled)) {
          g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
          g.DrawImage(full, 0, 0, outWidth, outHeight);
        }
        using (var stream = new MemoryStream()) { scaled.Save(stream, ImageFormat.Png); return Convert.ToBase64String(stream.ToArray()); }
      }
    }
  }

  static INPUT KeyInput(ushort vk, ushort scan, uint flags) {
    var input = new INPUT { type = INPUT_KEYBOARD };
    input.u.ki = new KEYBDINPUT { wVk = vk, wScan = scan, dwFlags = flags };
    return input;
  }

  static void Send(params INPUT[] inputs) { SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT))); }

  public static void Key(ushort vk, bool up) { Send(KeyInput(vk, 0, up ? KEYEVENTF_KEYUP : 0)); }

  public static void Chord(ushort[] keys) {
    foreach (var key in keys) Key(key, false);
    for (int i = keys.Length - 1; i >= 0; i--) Key(keys[i], true);
  }

  public static void TypeText(string text) {
    foreach (var c in text) {
      if (c == '\n') { Key(0x0D, false); Key(0x0D, true); continue; }
      if (c == '\r') continue;
      Send(KeyInput(0, c, KEYEVENTF_UNICODE), KeyInput(0, c, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP));
    }
  }

  static INPUT MouseInput(uint flags, uint data) {
    var input = new INPUT { type = INPUT_MOUSE };
    input.u.mi = new MOUSEINPUT { dwFlags = flags, mouseData = data };
    return input;
  }

  public static void Click(int x, int y, bool right, int count) {
    SetCursorPos(x, y);
    for (int i = 0; i < count; i++) {
      if (right) Send(MouseInput(MOUSE_RIGHTDOWN, 0), MouseInput(MOUSE_RIGHTUP, 0));
      else Send(MouseInput(MOUSE_LEFTDOWN, 0), MouseInput(MOUSE_LEFTUP, 0));
    }
  }

  public static void Scroll(int x, int y, int clicks) {
    SetCursorPos(x, y);
    Send(MouseInput(MOUSE_WHEEL, unchecked((uint)(clicks * 120))));
  }
}
'@ -ReferencedAssemblies System.Drawing

[MoonfoldWin]::UseDpiAwareness()

$MaxImageWidth = 1280
$KeyCodes = @{
  'ctrl' = 0x11; 'control' = 0x11; 'shift' = 0x10; 'alt' = 0x12; 'win' = 0x5B; 'meta' = 0x5B;
  'enter' = 0x0D; 'return' = 0x0D; 'tab' = 0x09; 'escape' = 0x1B; 'esc' = 0x1B; 'space' = 0x20;
  'backspace' = 0x08; 'delete' = 0x2E; 'del' = 0x2E; 'insert' = 0x2D; 'home' = 0x24; 'end' = 0x23;
  'pageup' = 0x21; 'pagedown' = 0x22; 'left' = 0x25; 'up' = 0x26; 'right' = 0x27; 'down' = 0x28
}

function Get-Scale($width) { if ($width -le $MaxImageWidth) { return 1.0 } else { return $MaxImageWidth / $width } }

function Get-Window($request) {
  $handle = [long]$request.window
  if (-not [MoonfoldWin]::Exists($handle)) { throw 'That window is gone. Call computer_list_apps again.' }
  $rect = [MoonfoldWin]::Rect($handle)
  $width = $rect.Right - $rect.Left
  $scale = Get-Scale $width
  return @{ handle = $handle; rect = $rect; width = $width; height = $rect.Bottom - $rect.Top; scale = $scale }
}

# A window-image point as a screen point, refusing points that land on another window.
function Get-ScreenPoint($window, $x, $y) {
  $sx = [int]([Math]::Round($window.rect.Left + ($x / $window.scale)))
  $sy = [int]([Math]::Round($window.rect.Top + ($y / $window.scale)))
  if ($x -lt 0 -or $y -lt 0 -or $sx -ge $window.rect.Right -or $sy -ge $window.rect.Bottom) { throw 'That point is outside the window.' }
  if ([MoonfoldWin]::WindowAt($sx, $sy) -ne $window.handle) { throw 'Another window covers that point. Bring the app to the front or close what covers it.' }
  return @{ x = $sx; y = $sy }
}

function Require-Focus($window) {
  if (-not [MoonfoldWin]::Focus($window.handle)) { throw 'Windows did not bring the app to the front. Ask the user to click it once.' }
}

function Get-KeyCode([string]$name) {
  $lower = $name.ToLowerInvariant()
  if ($KeyCodes.ContainsKey($lower)) { return [uint16]$KeyCodes[$lower] }
  if ($lower -match '^f([1-9]|1[0-9]|2[0-4])$') { return [uint16](0x6F + [int]$Matches[1]) }
  if ($lower.Length -eq 1) {
    $c = [char]$lower.ToUpperInvariant()
    if (($c -ge [char]'A' -and $c -le [char]'Z') -or ($c -ge [char]'0' -and $c -le [char]'9')) { return [uint16][int]$c }
  }
  throw ('Unknown key: ' + $name)
}

function Read-Tree($window, $maxNodes) {
  $root = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]$window.handle)
  $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
  $queue = New-Object System.Collections.Generic.Queue[object]
  $queue.Enqueue([pscustomobject]@{ element = $root; depth = 0 })
  $nodes = New-Object System.Collections.Generic.List[object]
  while ($queue.Count -gt 0 -and $nodes.Count -lt $maxNodes) {
    $entry = $queue.Dequeue(); $element = $entry.element; $depth = [int]$entry.depth
    try {
      $current = $element.Current
      $bounds = $current.BoundingRectangle
      $node = [ordered]@{
        depth = $depth
        type = $current.ControlType.ProgrammaticName -replace '^ControlType\.', ''
        name = if ($current.Name.Length -gt 200) { $current.Name.Substring(0, 200) } else { $current.Name }
        enabled = $current.IsEnabled
      }
      if ($current.AutomationId) { $node.automationId = $current.AutomationId }
      if (-not $bounds.IsEmpty -and -not [double]::IsInfinity($bounds.X)) {
        $node.rect = @(
          [int][Math]::Round(($bounds.X - $window.rect.Left) * $window.scale),
          [int][Math]::Round(($bounds.Y - $window.rect.Top) * $window.scale),
          [int][Math]::Round($bounds.Width * $window.scale),
          [int][Math]::Round($bounds.Height * $window.scale))
      }
      if ($current.IsPassword -or [MoonfoldWin]::IsPasswordEdit([long]$current.NativeWindowHandle)) {
        # Never return what a password field holds, through its value or its name.
        $node.name = ''
        $node.password = $true
      } else {
        $pattern = $null
        if ($element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$pattern)) {
          $value = $pattern.Current.Value
          if ($value) { $node.value = if ($value.Length -gt 500) { $value.Substring(0, 500) } else { $value } }
        }
      }
      $nodes.Add($node)
      if ($depth -lt 12) {
        $child = $walker.GetFirstChild($element)
        while ($child -ne $null) { $queue.Enqueue([pscustomobject]@{ element = $child; depth = $depth + 1 }); $child = $walker.GetNextSibling($child) }
      }
    } catch {}
  }
  return @{ elements = $nodes; truncated = ($queue.Count -gt 0) }
}

function Invoke-Request($request) {
  switch ($request.op) {
    'ping' { return @{ pong = $true } }
    'listWindows' {
      return @{ windows = @([MoonfoldWin]::ListWindows() | ForEach-Object {
        @{ window = [string]$_.Handle; title = $_.Title; app = $_.Process; pid = $_.Pid; width = $_.Width; height = $_.Height; minimized = $_.Minimized }
      }) }
    }
    'appOf' {
      if (-not [MoonfoldWin]::Exists([long]$request.window)) { throw 'That window is gone. Call computer_list_apps again.' }
      return @{ app = [MoonfoldWin]::ProcessOf([long]$request.window); title = '' }
    }
    'screenshot' {
      $window = Get-Window $request
      $png = [MoonfoldWin]::Capture($window.handle, $window.scale)
      return @{ png = $png; width = [int][Math]::Round($window.width * $window.scale); height = [int][Math]::Round($window.height * $window.scale) }
    }
    'read' {
      $window = Get-Window $request
      $max = if ($request.maxElements) { [int]$request.maxElements } else { 300 }
      return Read-Tree $window $max
    }
    'click' {
      $window = Get-Window $request
      Require-Focus $window
      $point = Get-ScreenPoint $window $request.x $request.y
      $count = if ($request.double) { 2 } else { 1 }
      [MoonfoldWin]::Click($point.x, $point.y, [bool]$request.right, $count)
      return @{}
    }
    'type' {
      $window = Get-Window $request
      Require-Focus $window
      [MoonfoldWin]::TypeText([string]$request.text)
      return @{}
    }
    'key' {
      $window = Get-Window $request
      Require-Focus $window
      $codes = @(([string]$request.keys).Split('+') | ForEach-Object { Get-KeyCode $_.Trim() })
      [MoonfoldWin]::Chord([uint16[]]$codes)
      return @{}
    }
    'scroll' {
      $window = Get-Window $request
      $point = Get-ScreenPoint $window $request.x $request.y
      [MoonfoldWin]::Scroll($point.x, $point.y, [int]$request.clicks)
      return @{}
    }
    default { throw ('Unknown request: ' + $request.op) }
  }
}

[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$stdin = [Console]::In
while ($true) {
  $line = $stdin.ReadLine()
  if ($line -eq $null) { break }
  if ($line.Trim().Length -eq 0) { continue }
  $id = $null
  try {
    $request = $line | ConvertFrom-Json
    $id = $request.id
    $result = Invoke-Request $request
    $response = @{ id = $id; ok = $true; result = $result }
  } catch {
    $response = @{ id = $id; ok = $false; error = $_.Exception.Message }
  }
  [Console]::Out.WriteLine(($response | ConvertTo-Json -Depth 8 -Compress))
  [Console]::Out.Flush()
}
`;
