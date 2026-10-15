# Egna spel 🎮

Här samlar vi spelen som jag och barnen bygger tillsammans.

Spelen är ett sätt för barnen att lära sig använda AI-verktyg. De hittar på idéerna, beskriver vad de vill ha och testar resultatet, och tillsammans bygger vi spelen steg för steg med hjälp av AI. På vägen lär de sig att formulera sig tydligt, att testa och att ändra tills det blir som de tänkt sig.

## Spelen

| Spel | Beskrivning |
| --- | --- |
| [🐻 Björnbus](bear-game/) | Var världens starkaste björn (eller en snabb råtta) och hitta på så mycket bus som möjligt i en stor stad. |
| [🚀 Stitch fantastiska värld](stitch-fantastiska-varld/) | Ett 3D-spel där Stitch bor på en färgglad ö som svävar ute i rymden. |

## Starta ett spel

Du behöver [Node.js](https://nodejs.org) (version 24, se `.nvmrc` – kör `nvm use`).

### Från VS Code (enklast)

1. Öppna hela den här mappen (`egna-spel`) i VS Code: **Arkiv → Öppna mapp…** (File → Open Folder…).
2. Klicka på **Kör och felsök** i sidomenyn till vänster (ikonen med en play-knapp och en bugg), eller tryck `Ctrl+Shift+D` (`Cmd+Shift+D` på Mac).
3. Välj spel i listan högst upp:
   - **🐻 Starta Björnbus**
   - **🚀 Starta Stitch fantastiska värld**
4. Tryck på den gröna play-knappen (eller `F5`). Spelet startar och öppnas i webbläsaren.

Stoppa spelet med den röda fyrkanten i verktygsfältet som dyker upp högst upp (eller `Shift+F5`).

### Från terminalen

```bash
cd <spelets-mapp>
npm install
npm run dev
```

Mer information finns i README-filen i varje spels mapp.
