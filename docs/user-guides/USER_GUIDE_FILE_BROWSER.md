# User Guide: File Browser & Table Management

**Version**: 1.0
**Date**: 2026-03-08
**Audience**: Future Pinball Web users (all skill levels)

---

## Welcome to the File Browser! 👋

Future Pinball Web includes a powerful file browser that lets you **load custom pinball tables** directly from your computer. This guide shows you how to use it like a pro!

---

## 🎯 What You Can Do

✅ Browse FPT table files on your computer
✅ Select library (.FPL/.LIB) files for extra resources
✅ Load multiple tables at once
✅ Search for files by name
✅ Save favorite tables for quick access
✅ Track recently loaded tables
✅ See file information (size, date modified)

---

## Getting Started

### Step 1: Open the File Browser

1. Click the **"📁 DATEIBROWSER"** tab at the top
2. You'll see two panels: **TISCHVERZEICHNIS** (Tables) and **BIBLIOTHEKEN** (Libraries)

### Step 2: Select a Table Directory

1. Click **"🔍 Verzeichnis wählen"** under "📚 TISCHVERZEICHNIS"
2. A folder picker appears
3. Navigate to a folder containing `.fpt` files (Future Pinball tables)
4. Click **Select** or **Open**

```
📁 My Computer
  └─ Future Pinball Tables
     ├─ Dragon's Castle.fpt
     ├─ Pharaoh's Gold.fpt
     ├─ Space Quest.fpt
     └─ ...
```

### Step 3: Choose a Table

1. A list of tables appears below the button
2. Click on any table to select it
   - Selected table shows: ✓ (checkmark) and highlights in green
   - Shows file size and modification date
3. Table appears in "⚙️ AKTUELLE AUSWAHL" status area

### Step 4: Select Libraries (Optional)

1. Click **"🔍 Verzeichnis wählen"** under "📦 BIBLIOTHEKEN"
2. Select a folder with library files (`.fpl` or `.lib`)
3. All libraries in that folder are **automatically selected** (checkboxes)
4. You can **uncheck** any you don't want to use

```
☑️ Standard Library.fpl (2.1 MB)
☑️ Custom Music.fpl (3.5 MB)
☑️ Addon Pack.lib (1.2 MB)
☐ Old Version.fpl (deselected)
```

### Step 5: Load the Table

1. Click **"▶ TISCHNAME LADEN"** button
2. A loading overlay appears showing progress
3. Watch as files are extracted:
   - "Loading images..." (Stage 1)
   - "Loading audio..." (Stage 2)
   - "Loading scripts..." (Stage 3)
4. Table loads and appears in the game!

---

## 🔍 Finding Tables Faster

### Search/Filter Files

**Want to find a specific table?**

1. When you browse a directory, a search box appears above the file list
2. Type table name (e.g., "dragon")
3. List updates **instantly** to show matches only

```
[🔍 Tisch durchsuchen...]
↓
Dragon's Castle.fpt
↓
(Other files hidden)
```

### View File Details

Hover over any file to see:
- 📄 **Filename** (full name with extension)
- 📊 **Size** (in MB, KB, or B)
- 🕐 **Modified date** (when file was last changed)
- 🏷️ **Type badge** (FPT, FPL, or LIB)

```
Dragon's Castle.fpt
2.3 MB • Mar 8, 2026 2:30 PM [FPT]
```

---

## ⭐ Saving Favorites (Quick Access)

### Add a Favorite

1. Select any table from the list
2. Click **"⭐ Add to Favorites"** button
3. Table is saved to your favorites list

```
⭐ FAVORITEN
├─ Dragon's Castle.fpt ✕
├─ Pharaoh's Gold.fpt ✕
└─ Neon City.fpt ✕
```

### Use a Favorite

**Next time you use Future Pinball Web:**

1. Open the File Browser tab
2. Your favorites appear in the "⭐ FAVORITEN" section
3. Click any favorite to load it immediately
4. Favorites **persist across browser sessions** ✓

### Remove a Favorite

1. Hover over a favorite in the list
2. Click the **✕** button
3. It's removed from favorites

---

## 📋 Batch Loading (Load Multiple Tables)

### Create a Batch Job

1. Select a table (or browse to get multiple tables)
2. Click **"📋 Create Batch Job"**
3. Game loads multiple tables in sequence

### Monitor Progress

A progress panel appears showing:
```
📋 Batch Job: abc123
[████████░░░░░░░░░░░░░░░░░░░░░░░░░] 40%
Status: loading (4/10 completed)
Loading: Dragon's Castle.fpt
```

### View Results

After all tables load, see:
- ✓ Which tables loaded successfully
- ✗ Any that failed (with error reason)
- ⏱️ How long each took to load

---

## 🎯 Status Display (Current Selection)

The "⚙️ AKTUELLE AUSWAHL" section shows:

```
📚 Tische
    1
   2.3 MB

📦 Bibliotheken
    2
   5.9 MB

💾 Gesamt
    8.2 MB
```

**What it means:**
- **Tische** = Number of tables selected + their total size
- **Bibliotheken** = Number of libraries selected + their total size
- **Gesamt** = Total size of everything (tables + libraries)

---

## 📱 Drag & Drop (Advanced)

### Drag Files onto the Game

1. Have your file explorer open (Windows Explorer, Finder, etc.)
2. Open Future Pinball Web
3. **Drag** an `.fpt` file from your file explorer
4. **Drop** it onto the game canvas
5. Table loads automatically!

```
File Explorer            Game Window
│                        │
├─ table.fpt ──drag──→ [DROP HERE]
│                        │
└─ result: loads! ──────→ ✓ Loading...
```

---

## 🔄 Recent Files

**Recently loaded tables appear in:**
```
🕐 ZULETZT VERWENDET
├─ Dragon's Castle.fpt    (5 min ago)
├─ Pharaoh's Gold.fpt     (2 hours ago)
├─ Neon City.fpt          (yesterday)
└─ Jungle Adventure.fpt   (2 days ago)
```

Click any recent file to **load it instantly** (no need to browse again)

---

## 📊 Viewing File Information

### Quick File Stats

When you browse a directory, you see:

```
TISCHVERZEICHNIS
├─ Dragon's Castle.fpt        2.3 MB  Mar 8, 2026 [FPT]
├─ Pharaoh's Gold.fpt         2.1 MB  Mar 6, 2026 [FPT]
├─ Neon City.fpt              3.1 MB  Mar 5, 2026 [FPT]
└─ Jungle Adventure.fpt       1.8 MB  Mar 4, 2026 [FPT]
```

**What each column means:**
- **Name** = Table filename
- **Size** = File size (larger files = more content)
- **Date** = When file was last modified (updated)
- **Type** = File type badge

### Understanding File Sizes

| Size | Typical Content |
|------|---|
| < 1 MB | Small tables, minimal graphics |
| 1-3 MB | Standard tables, good content |
| 3-5 MB | Large tables, lots of graphics |
| 5+ MB | Very large, high-quality tables |

**Larger files may take longer to load but usually have:**
- More detailed visuals
- Better music/sound effects
- More table features and complexity

---

## ✨ Tips & Tricks

### Tip 1: Organize Your Tables

Keep your FPT files in well-organized folders:

```
📁 Future Pinball Tables
  ├─ 📁 Egyptian Theme
  │  ├─ Pharaoh's Gold.fpt
  │  └─ Pyramid Quest.fpt
  ├─ 📁 Sci-Fi Theme
  │  ├─ Space Quest.fpt
  │  └─ Cyber Nexus.fpt
  └─ 📁 Fantasy Theme
     ├─ Dragon's Castle.fpt
     └─ Wizard's Tower.fpt
```

Then when you browse, you'll see organized lists!

### Tip 2: Use Search for Quick Access

Instead of scrolling through 100+ files:

1. Type first few letters of table name
2. List filters instantly
3. Click the table you want

Examples:
- Type "dra" → shows "Dragon's Castle.fpt"
- Type "space" → shows "Space Quest.fpt"
- Type "sky" → shows any file with "sky" in name

### Tip 3: Favorite Your Most-Played Tables

1. Add frequently-played tables to favorites
2. Next session, they appear in "⭐ FAVORITEN"
3. Click favorite to load in seconds (no browsing needed)

### Tip 4: Check File Size Before Loading

**Large files (~5MB+):**
- Take longer to load (30-60 seconds)
- Use more memory
- Have more content to enjoy!

**Small files (<1MB):**
- Load very quickly
- Use less memory
- Perfect for testing

---

## 🐛 Troubleshooting

### "No tables appear after browsing"

**Problem**: You selected a folder but no files show up

**Solutions**:
1. Make sure folder contains `.fpt` files (not `.fp` or other formats)
2. Check that files aren't hidden (on Mac, press Cmd+Shift+.)
3. Try a different folder

### "Table loaded but I see a blank screen"

**Problem**: Loading completed but game doesn't appear

**Solutions**:
1. Wait a few more seconds (graphics still rendering)
2. Press **R** key to reset the game
3. Try loading a smaller table first
4. Check browser console (F12) for error messages

### "File is huge and takes forever to load"

**Problem**: Waiting longer than expected (5+ minutes)

**Solutions**:
1. This is normal for very large files (5MB+)
2. Close other browser tabs to free up memory
3. Close other applications running in the background
4. Try a smaller table to test if problem is file or browser

### "Can't find the File Browser"

**Problem**: Don't see the file browser tab

**Solutions**:
1. Look at top of game window for tabs
2. Should see: **PARSER**, **BROWSER**, **INFO**, **SCRIPT**
3. Click **BROWSER** tab
4. If tabs not visible, try refreshing browser (Ctrl+R or Cmd+R)

### "Favorites disappeared after closing browser"

**Problem**: Added favorites but they're gone next time

**Solutions**:
1. Make sure you're using the same browser (Chrome, Firefox, etc.)
2. Check if you're in Private/Incognito mode (disables storage)
3. Browser storage might be cleared - re-add favorites
4. Try a different browser

### "Drag & drop isn't working"

**Problem**: Can't drag files onto game window

**Solutions**:
1. Make sure you have at least one table loaded
2. Try clicking "Setup Drag & Drop" button first
3. Drag from file explorer (not desktop shortcuts)
4. Try a different browser (Chrome/Firefox/Edge)

---

## 📚 Getting More Help

### In-Game Help

1. Open **INFO** tab (top of window)
2. See supported formats, controls, and system info
3. Check **SCRIPT** tab for VBScript details

### Online Documentation

Full documentation available at:
- `PHASE7_FILE_BROWSER.md` — Complete technical guide
- `OPTION_A_ADVANCED_TABLE_MANAGEMENT.md` — Advanced features
- `USER_GUIDE_ADVANCED_FEATURES.md` — Advanced user guide

### Video Tutorials

Coming soon! We'll have step-by-step video guides:
- 📹 "Loading Your First Table" (5 min)
- 📹 "Using Favorites & Recent Files" (3 min)
- 📹 "Batch Loading Multiple Tables" (4 min)
- 📹 "Organizing Your Table Library" (5 min)

---

## ✅ Quick Checklist: Your First Table

- [ ] Click **"BROWSER"** tab
- [ ] Click **"🔍 Verzeichnis wählen"** under Tables
- [ ] Select folder with `.fpt` files
- [ ] Click on a table name
- [ ] (Optional) Browse and select libraries
- [ ] Click **"▶ TABLE NAME LADEN"** button
- [ ] Watch as table loads
- [ ] Game appears and you can play!
- [ ] (Optional) Add table to favorites

---

## 🎉 Enjoy!

You're all set to enjoy custom pinball tables! Here's what you now know:

✓ How to browse and select tables
✓ How to add libraries
✓ How to load tables with a click
✓ How to search for specific tables
✓ How to save favorites
✓ How to track recently loaded tables
✓ How to troubleshoot common issues

**Happy pinballing!** 🎮

---

**Need help?** Check the FAQ section or troubleshooting guide above!

**Want to learn more?** Read the technical documentation for advanced features and performance tuning.

**Version**: 1.0 | **Last Updated**: 2026-03-08
