# FPT-Parser Verbesserungen (Session 17)

## Aktueller Status
✓ CFB/OLE2 Extraktion funktioniert
✓ LZO1X Decompression vorhanden
✓ Texture & Sound Extraktion arbeitet
✓ Heuristischer Parser (Fallback) vorhanden

## Probleme/Lücken
1. **Playfield-Texture**: Wird erkannt, aber nicht immer korrekt angewendet
2. **Geometrie**: Nur hardcoded Default-Bumper/Targets, nicht aus FPT-Datei
3. **CFB-Stream-Parsing**: Viele Streams werden ignoriert
4. **Koordinaten-Genauigkeit**: Heuristische Koordinaten sind oft ungenau
5. **Materialien-Farben**: Werden geschätzt, nicht aus Datei gelesen
6. **Debug-Info**: Unvollständig

## Geplante Verbesserungen
1. **Enhanced CFB-Explorer**: Alle Streams auflisten + Inhalts-Vorschau
2. **Playfield-Texture-Rendering**: Bessere Anwendung auf Spielfeld
3. **Bumper-Position-Learning**: Intelligente Clustering-Analyse
4. **OLE2-Stream-Structure-Parsing**: Versuche Geometrie aus Stream-Struktur zu extrahieren
5. **Visual Debug-Panel**: Zeige alle gefundenen Assets
6. **Material-Detection**: Verbesserte Farb-Erkennung aus Texturen

## Implementation-Plan
A. Erweitere CFB-Extraktion mit Stream-Explorer
B. Verbessere Koordinaten-Extraktion
C. Implementiere Playfield-Material-Anwendung
D. Erstelle Debug-Panel für visuelle Asset-Vorschau
E. Test mit echten FPT-Dateien
