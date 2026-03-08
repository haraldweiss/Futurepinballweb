# Frequently Asked Questions (FAQ) & Troubleshooting

**Version**: 1.0
**Date**: 2026-03-08
**Updated**: Regularly based on user feedback

---

## Quick Answers

### Q: How do I load a table?
**A:** Click "BROWSER" tab → Click "🔍 Verzeichnis wählen" → Select folder with `.fpt` files → Click table → Click "LOAD"

### Q: Where do I get FPT files?
**A:** FPT files are Future Pinball table files. You create them in Future Pinball (Windows) or find them online from the community.

### Q: Can I use tables from the original Future Pinball?
**A:** Yes! Any `.fpt` file from Future Pinball should work. Just place the file in a folder and browse to it.

### Q: Is it free?
**A:** Yes! Future Pinball Web is completely free, open-source software.

### Q: Which browser should I use?
**A:** Chrome, Firefox, Safari, or Edge all work. Chrome and Firefox are recommended for best performance.

---

## File Browser Issues

### "I don't see the File Browser tab"

**What's happening:** File Browser tab is hidden or not visible

**Solutions:**
1. Look for tabs at top of window: PARSER | BROWSER | INFO | SCRIPT
2. Click **BROWSER** tab
3. If tabs are hidden:
   - Try refreshing browser (Ctrl+R / Cmd+R)
   - Try closing and reopening Future Pinball Web
   - Try a different browser

### "I clicked browse but no files appear"

**What's happening:** Folder selected but files not showing

**Why it happens:**
- Folder is empty
- Folder doesn't contain `.fpt` files
- Files are hidden
- Wrong folder selected

**Solutions:**
1. **Check folder has FPT files:**
   - Open folder in file explorer
   - Look for files ending in `.fpt`
   - If no `.fpt` files, select different folder

2. **Unhide files (Mac):**
   - Press Cmd+Shift+. (period)
   - Hidden files now visible
   - Try browsing again

3. **Try different folder:**
   - Select different folder
   - Should see files listed

### "I see files but they're grayed out"

**What's happening:** Files exist but can't be selected

**Why it happens:**
- Files aren't `.fpt` format
- File permissions prevent access
- Files are corrupted

**Solutions:**
1. Check filename ends in `.fpt` (not `.fp` or `.fpt.bak`)
2. Right-click file → Properties → Check it's readable
3. Try different file
4. If all files grayed out, folder might be empty of FPT files

### "File list is too long, I can't find my table"

**What's happening:** Too many files to scroll through

**Solutions:**
1. **Use search:**
   - Type name in search box above file list
   - List filters instantly
   - Example: Type "dragon" to find "Dragon's Castle.fpt"

2. **Organize files:**
   - Create subfolders: Egyptian/ Medieval/ SciFi/
   - Browse subfolder instead
   - Smaller lists easier to navigate

3. **Sort files:**
   - Click sort buttons (Name, Size, Date, Type)
   - Files reorganize by your choice

---

## Loading Issues

### "Table is loading forever (5+ minutes)"

**What's happening:** Table stuck loading

**Why it happens:**
- Very large file (5-10MB+)
- System is very slow
- File is corrupted
- Browser out of memory

**Solutions:**
1. **For large files:**
   - This is normal! Very large files take time
   - Wait 5-15 minutes
   - Come back in a bit
   - Keep doing something else while it loads

2. **If browser seems frozen:**
   - Try pressing Escape to cancel
   - Check browser tab (spinning circle?)
   - If truly frozen, close browser and restart

3. **Free up memory:**
   - Close other browser tabs
   - Close other applications
   - Try loading smaller table (test)
   - If that works, original file might be too big

4. **Last resort:**
   - Restart browser completely
   - Try different file
   - If nothing works, file might be corrupted

### "Table loaded but screen is blank"

**What's happening:** Loading completed but game doesn't appear

**Why it happens:**
- Graphics still rendering (takes a few seconds)
- Game window is hidden
- Graphics error
- Compatibility issue

**Solutions:**
1. **Wait a few seconds:**
   - Graphics take time to render
   - After 5-10 seconds, table should appear
   - Be patient!

2. **Press keys to test:**
   - Press R → ball should reset
   - Press arrow keys → ball should roll
   - If something happens, game is working (just invisible)

3. **Reset graphics:**
   - Press R key
   - Try resizing browser window
   - Try fullscreen mode (F11)

4. **Try different table:**
   - Load a different, smaller table
   - If that works, original file might have graphics issue
   - If nothing works, see "Still having problems?" section

### "Table loads but has errors in console"

**What's happening:** Game runs but shows error messages

**Why it happens:**
- Minor compatibility issues
- Missing features
- Small bugs (usually don't affect gameplay)

**Solutions:**
1. **If game plays fine:**
   - Errors might not matter
   - Continue playing
   - Report to developers if interested

2. **If game doesn't work:**
   - Note the error message
   - Check troubleshooting guide
   - Visit community forums

---

## Performance Issues

### "Game is loading very slowly"

**What's happening:** Tables take too long to load

**Why it happens:**
- Large file (5+ MB)
- System is busy
- Slow internet connection
- Browser performance degradation

**Solutions - Quick Fixes:**
1. Close other browser tabs (free up memory)
2. Close other applications (free up CPU)
3. Try smaller table (test)
4. Restart browser completely

**Solutions - Advanced:**
1. Clear browser cache:
   - Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
   - Select "All time"
   - Check "Cached images and files"
   - Click "Clear"

2. Disable browser extensions:
   - Extensions use memory
   - Disable all, then re-test
   - Re-enable if still slow

3. Check network speed:
   - Your internet might be slow
   - Close other downloads
   - On WiFi? Try wired internet
   - Try again during off-peak hours

### "Game is using too much memory"

**What's happening:** Browser memory usage very high

**Why it happens:**
- Multiple large tables loaded
- Browser memory leak
- System low on RAM
- Too many browser tabs

**Solutions:**
1. **Immediately:**
   - Close other browser tabs
   - Close other applications
   - Restart browser

2. **If persistent:**
   - Check how much RAM you have (Settings)
   - If <4GB, close other programs
   - Load smaller tables
   - Avoid loading many tables at once

3. **Memory leak test:**
   - Load one table
   - Wait 10 minutes
   - Check if memory keeps growing
   - If yes, might be memory leak (report to devs)

### "Game is lagging / FPS dropping"

**What's happening:** Game is stuttering, not smooth

**Why it happens:**
- System can't keep up
- Too many effects
- Other programs using CPU
- Graphics issues

**Solutions:**
1. **Check FPS:**
   - Press P key to show performance monitor
   - Look at FPS counter
   - Should show 50+ (desktop) or 30+ (mobile)
   - If below, system is struggling

2. **Free up system:**
   - Close all other applications
   - Close other browser tabs
   - Disable background processes (Task Manager / Activity Monitor)
   - Restart computer

3. **Reduce visual effects:**
   - Try lowering quality preset (if available)
   - Play in windowed mode (not fullscreen)
   - Reduce monitor resolution
   - Close developer tools (F12)

4. **Hardware issue:**
   - If still slow, your computer might be too slow
   - Older computers might struggle
   - But should still playable at 30+ FPS

---

## Library & File Issues

### "Libraries won't load"

**What's happening:** Libraries selected but not loading with table

**Why it happens:**
- Libraries not in right folder
- Compatibility issue
- File format wrong
- Libraries not selected properly

**Solutions:**
1. **Check libraries selected:**
   - In status area, check "📦 Bibliotheken" count
   - Should show number of libraries selected
   - If 0, click browse and select them

2. **Check library files:**
   - Make sure files end in `.fpl` or `.lib`
   - Not `.fpl.bak` or `.lib.old`
   - Wrong format won't load

3. **Try loading table first:**
   - Load table without libraries first
   - Does table work alone?
   - If yes, problem is libraries
   - If no, problem is table

4. **Check compatibility:**
   - Some old libraries might not work
   - Try different library folder
   - Report if still not working

### "I'm getting "File not found" error"

**What's happening:** System can't find or read file

**Why it happens:**
- File deleted or moved
- Folder no longer accessible
- File name changed
- Permission issue

**Solutions:**
1. Check file still exists:
   - Open file explorer
   - Navigate to folder
   - Is file still there?
   - If not, it's been deleted/moved

2. Re-browse folder:
   - Click browse button again
   - Select same folder
   - File should appear
   - Try loading again

3. Move file to accessible location:
   - Move file to Desktop or Documents
   - Try browsing from there
   - If works, original location had permission issue

---

## Browser Issues

### "Future Pinball Web won't load"

**What's happening:** Website won't open or shows error

**Why it happens:**
- Internet connection issue
- Website server down
- Browser cache corrupted
- Wrong URL

**Solutions:**
1. **Check internet:**
   - Try visiting another website (Google.com)
   - If other sites work, it's the app
   - If no other sites work, check your internet

2. **Check URL:**
   - Make sure you're at correct website
   - Should be: your-server.com/fpw or similar
   - Typos in URL won't load

3. **Clear cache:**
   - Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
   - Clear all cached data
   - Reload Future Pinball Web

4. **Try different browser:**
   - Try Chrome, Firefox, Safari, Edge
   - See if app loads in different browser
   - If yes, problem is your browser settings

5. **Check server:**
   - Website might be down
   - Try again in 5-10 minutes
   - Check status page if available

### "App runs but with errors in console"

**What's happening:** Game works but shows error messages (F12)

**Why it happens:**
- Minor bugs
- Compatibility issues
- Minor missing features
- Network issues

**Solutions:**
1. **If game works:**
   - Errors might be minor
   - Ignore them and play
   - Report to developers if interested

2. **If game doesn't work:**
   - Copy error message
   - Search online for error
   - Check troubleshooting guide
   - Report to support

---

## Still Having Problems?

### Getting Help

1. **Check this FAQ first**
   - Most issues covered here
   - Try solutions in order

2. **Check documentation**
   - USER_GUIDE_FILE_BROWSER.md
   - USER_GUIDE_ADVANCED_FEATURES.md
   - PERFORMANCE_TUNING_HANDBOOK.md

3. **Report the issue**
   - Describe the problem clearly
   - Include error message (if any)
   - Mention your browser and OS
   - Include steps to reproduce

### Information to Provide

When reporting issues, helpful info includes:

```
Browser: Chrome 120
OS: Windows 11
Table name: Dragon's Castle.fpt
File size: 2.3 MB
Error message: "Cannot load resource"
Steps to reproduce:
1. Click browse
2. Select folder
3. Click Dragon's Castle.fpt
4. Error appears
```

---

## Common Error Messages

### "Cannot decode audio file"
**Means:** Audio file is corrupted or incompatible
**Solution:** File might be broken, try different table

### "Out of memory"
**Means:** System ran out of RAM
**Solution:** Close other apps, load smaller tables

### "Shader compilation error"
**Means:** Graphics card has compatibility issue
**Solution:** Update graphics drivers

### "CORS error"
**Means:** Security issue loading resources
**Solution:** Usually temporary, try reloading

### "Uncaught TypeError"
**Means:** JavaScript code error
**Solution:** Refresh page, try different browser

---

## Tips to Avoid Problems

1. **Organize files well**
   - Create folders by theme
   - Clear out old/broken files
   - Keep backup of important files

2. **Keep browser updated**
   - Latest browser = best compatibility
   - Update regularly

3. **Monitor system health**
   - Keep PC/Mac clean (no malware)
   - Have enough free disk space (at least 1GB)
   - Have enough RAM (4GB minimum, 8GB recommended)

4. **Reload periodically**
   - Close and reopen browser occasionally
   - Restarting clears memory
   - Fixes many issues

5. **Report bugs**
   - Help improve the app
   - Tell developers what's broken
   - Include detailed info

---

## Version & Support

**Current Version:** 1.0 (2026-03-08)

**Browser Support:**
- ✅ Chrome 90+
- ✅ Firefox 88+
- ⚠️ Safari 14+ (partial)
- ✅ Edge 90+

**System Requirements:**
- 4GB RAM (8GB recommended)
- 100MB free disk space
- Stable internet connection
- Modern graphics card

**Getting Support:**
- Check this FAQ
- Read user guides
- Check community forums
- Contact development team

---

**Last Updated**: 2026-03-08 | **Version**: 1.0
