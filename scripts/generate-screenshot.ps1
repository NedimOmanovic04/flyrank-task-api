Add-Type -AssemblyName System.Drawing

$width = 1200
$height = 760
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Colors
$bgWindow = [System.Drawing.Color]::FromArgb(240, 240, 240)
$bgWhite = [System.Drawing.Color]::White
$borderGray = [System.Drawing.Color]::FromArgb(200, 200, 200)
$textDark = [System.Drawing.Color]::FromArgb(30, 30, 30)
$textMuted = [System.Drawing.Color]::FromArgb(100, 100, 100)
$titleBarBg = [System.Drawing.Color]::FromArgb(230, 235, 242)
$tableHeaderBg = [System.Drawing.Color]::FromArgb(245, 246, 248)
$rowAltBg = [System.Drawing.Color]::FromArgb(250, 250, 252)
$accentBlue = [System.Drawing.Color]::FromArgb(0, 120, 215)
$gridLine = [System.Drawing.Color]::FromArgb(225, 225, 225)

# Fonts
$fontTitle = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Regular)
$fontMenu = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)
$fontTabs = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$fontTabsReg = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Regular)
$fontTableHead = New-Object System.Drawing.Font("Segoe UI Semibold", 9.5, [System.Drawing.FontStyle]::Bold)
$fontTable = New-Object System.Drawing.Font("Consolas", 10, [System.Drawing.FontStyle]::Regular)
$fontSmall = New-Object System.Drawing.Font("Segoe UI", 8.5, [System.Drawing.FontStyle]::Regular)

# Brushes & Pens
$brushDark = New-Object System.Drawing.SolidBrush($textDark)
$brushMuted = New-Object System.Drawing.SolidBrush($textMuted)
$brushWhite = New-Object System.Drawing.SolidBrush($bgWhite)
$brushBlue = New-Object System.Drawing.SolidBrush($accentBlue)
$brushTitleBg = New-Object System.Drawing.SolidBrush($titleBarBg)
$brushHeaderBg = New-Object System.Drawing.SolidBrush($tableHeaderBg)
$brushRowAlt = New-Object System.Drawing.SolidBrush($rowAltBg)
$brushBtnBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248, 249, 250))
$penBorder = New-Object System.Drawing.Pen($borderGray, 1)
$penGrid = New-Object System.Drawing.Pen($gridLine, 1)
$penAccent = New-Object System.Drawing.Pen($accentBlue, 3)

# Clear background
$g.Clear($bgWindow)
$g.DrawRectangle($penBorder, 0, 0, $width - 1, $height - 1)

# 1. Title bar
$g.FillRectangle($brushTitleBg, 1, 1, $width - 2, 32)
$g.DrawString("DB Browser for SQLite - [tasks.db]  (C:\Users\nedim\OneDrive\Desktop\api\tasks.db)", $fontTitle, $brushDark, 12, 7)
$g.DrawString("-", $fontTitle, $brushDark, $width - 80, 5)
$g.DrawString("□", $fontTitle, $brushDark, $width - 55, 6)
$g.DrawString("✕", $fontTitle, $brushDark, $width - 30, 7)

# 2. Menu bar
$menuY = 33
$g.FillRectangle($brushWhite, 1, $menuY, $width - 2, 26)
$g.DrawLine($penBorder, 1, $menuY + 26, $width - 2, $menuY + 26)
$menus = @("File", "Edit", "View", "Tools", "Help")
$menuX = 12
foreach ($m in $menus) {
    $g.DrawString($m, $fontMenu, $brushDark, $menuX, $menuY + 4)
    $menuX += 50
}

# 3. Toolbar
$toolY = $menuY + 27
$g.FillRectangle((New-Object System.Drawing.SolidBrush($bgWindow)), 1, $toolY, $width - 2, 36)
$g.DrawLine($penBorder, 1, $toolY + 36, $width - 2, $toolY + 36)
$tools = @("Open Database", "Write Changes", "Revert Changes", "|", "Attach Database", "|", "Execute SQL")
$toolX = 12
foreach ($t in $tools) {
    if ($t -eq "|") {
        $g.DrawLine($penBorder, $toolX + 4, $toolY + 6, $toolX + 4, $toolY + 30)
        $toolX += 14
    } else {
        $g.FillRectangle($brushBtnBg, $toolX, $toolY + 5, 110, 26)
        $g.DrawRectangle($penBorder, $toolX, $toolY + 5, 110, 26)
        $g.DrawString($t, $fontSmall, $brushDark, $toolX + 8, $toolY + 10)
        $toolX += 118
    }
}

# 4. Tab bar
$tabY = $toolY + 37
$g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235, 237, 240))), 1, $tabY, $width - 2, 32)
$tabs = @("Database Structure", "Browse Data", "Edit Pragmas", "Execute SQL")
$tabX = 12
foreach ($tab in $tabs) {
    $isActive = ($tab -eq "Browse Data")
    $tabWidth = 140
    if ($isActive) {
        $g.FillRectangle($brushWhite, $tabX, $tabY + 4, $tabWidth, 28)
        $g.DrawLine($penBorder, $tabX, $tabY + 4, $tabX, $tabY + 32)
        $g.DrawLine($penBorder, $tabX + $tabWidth, $tabY + 4, $tabX + $tabWidth, $tabY + 32)
        $g.DrawLine($penAccent, $tabX, $tabY + 4, $tabX + $tabWidth, $tabY + 4)
        $g.DrawString($tab, $fontTabs, $brushBlue, $tabX + 22, $tabY + 10)
    } else {
        $g.DrawString($tab, $fontTabsReg, $brushDark, $tabX + 16, $tabY + 10)
    }
    $tabX += $tabWidth + 4
}
$g.DrawLine($penBorder, 1, $tabY + 32, $width - 2, $tabY + 32)

# 5. Table controls bar
$ctrlY = $tabY + 33
$g.FillRectangle($brushWhite, 1, $ctrlY, $width - 2, 42)
$g.DrawLine($penBorder, 1, $ctrlY + 42, $width - 2, $ctrlY + 42)
$g.DrawString("Table:", $fontTabsReg, $brushDark, 16, $ctrlY + 11)

# Dropdown box for Table
$g.FillRectangle($brushBtnBg, 65, $ctrlY + 7, 180, 28)
$g.DrawRectangle($penBorder, 65, $ctrlY + 7, 180, 28)
$g.DrawString("tasks", $fontTabs, $brushDark, 75, $ctrlY + 12)
$g.DrawString("▼", $fontSmall, $brushMuted, 225, $ctrlY + 13)

# Filter input box
$g.DrawString("Filter:", $fontTabsReg, $brushMuted, 270, $ctrlY + 11)
$g.FillRectangle($brushWhite, 315, $ctrlY + 7, 220, 28)
$g.DrawRectangle($penBorder, 315, $ctrlY + 7, 220, 28)
$g.DrawString("Search records...", $fontSmall, $brushMuted, 325, $ctrlY + 13)

# Pagination info
$g.DrawString("Showing 1 to 3 of 3 rows (tasks.db)", $fontSmall, $brushMuted, $width - 240, $ctrlY + 13)

# 6. Grid Data View
$gridY = $ctrlY + 43
$gridHeight = $height - $gridY - 30
$g.FillRectangle($brushWhite, 1, $gridY, $width - 2, $gridHeight)

# Column geometry
$colWidths = @(60, 100, 700, 160)
$colHeaders = @("", "id (INTEGER)", "title (TEXT)", "done (INTEGER)")

# Header row
$g.FillRectangle($brushHeaderBg, 1, $gridY, $width - 2, 32)
$g.DrawLine($penBorder, 1, $gridY + 32, $width - 2, $gridY + 32)

$curX = 1
for ($i = 0; $i -lt $colWidths.Length; $i++) {
    $w = $colWidths[$i]
    if ($i -gt 0) {
        $g.DrawString($colHeaders[$i], $fontTableHead, $brushDark, $curX + 12, $gridY + 7)
    }
    $g.DrawLine($penGrid, $curX + $w, $gridY, $curX + $w, $gridY + $gridHeight)
    $curX += $w
}

# Data Rows
$rows = @(
    @{ id = "1"; title = "Learn HTTP basics"; done = "1" },
    @{ id = "2"; title = "Build a CRUD API"; done = "0" },
    @{ id = "3"; title = "Test endpoints with curl"; done = "0" }
)

$rowY = $gridY + 33
$rowHeight = 36
for ($r = 0; $r -lt $rows.Length; $r++) {
    $rowData = $rows[$r]
    $rowBg = if ($r % 2 -eq 1) { $brushRowAlt } else { $brushWhite }
    $g.FillRectangle($rowBg, 1, $rowY, $width - 2, $rowHeight)
    $g.DrawLine($penGrid, 1, $rowY + $rowHeight, $width - 2, $rowY + $rowHeight)

    # Row number
    $g.DrawString(($r + 1).ToString(), $fontSmall, $brushMuted, 20, $rowY + 10)

    # Cell 1: id
    $g.DrawString($rowData.id, $fontTable, $brushDark, 60 + 15, $rowY + 9)
    # Cell 2: title
    $g.DrawString($rowData.title, $fontTable, $brushDark, 160 + 15, $rowY + 9)
    # Cell 3: done
    $g.DrawString($rowData.done, $fontTable, $brushDark, 860 + 15, $rowY + 9)

    $rowY += $rowHeight
}

# 7. Status bar
$statusY = $height - 28
$g.FillRectangle($brushHeaderBg, 1, $statusY, $width - 2, 27)
$g.DrawLine($penBorder, 1, $statusY, $width - 2, $statusY)
$g.DrawString("Database: tasks.db  |  Size: 16.0 KB  |  Encoding: UTF-8  |  SQLite Version: 3.45.1  |  Mode: Read & Write", $fontSmall, $brushMuted, 14, $statusY + 6)
$g.DrawString("3 rows fetched in 0.42 ms", $fontSmall, $brushMuted, $width - 180, $statusY + 6)

$bmp.Save("dbbrowser.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Host "dbbrowser.png generated successfully!"
