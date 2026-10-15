# 🐻 Björnbus

Du är världens starkaste björn och har tagit dig in i en stor stad – med färgglada skyskrapor, hyreshus med markiser, villor med blomsterrabatter, en park och ett torg med en guldstaty av en björn. Bilar, taxibilar, jeepar och bussar kör runt på gatorna, och människor promenerar på trottoarerna (en del med ballonger!). Ditt jobb? Att hitta på så mycket **bus** som möjligt och samla poäng!

Du kan också välja att vara en **råtta** 🐀, liten och snabb, som klättrar och letar ost i stadens ostbutik.

Mitt på torget står en guldstaty av björnen, och ovanpå den sitter en silverråtta. De två är spelets hjältar!

Spelet är inspirerat av *Goat Simulator*.

---

## Så startar du spelet

Du behöver [Node.js](https://nodejs.org) (version 24, se `.nvmrc` – kör `nvm use`).

1. Öppna en terminal i mappen `bear-game`.
2. Installera allt som behövs (bara första gången):

   ```bash
   npm install
   ```

3. Starta spelet:

   ```bash
   npm run dev
   ```

4. Öppna webbläsaren på adressen som visas, oftast **http://localhost:5173**
5. Välj **Björn** eller **Råtta**, klicka på **SPELA!** och sätt igång. 🐾

Vill du bygga en färdig version som kan läggas upp på nätet:

```bash
npm run build
```

Då hamnar spelet i mappen `dist/`.

---

## Knappar

| Knapp | Vad händer |
|---|---|
| **W A S D** eller **piltangenterna** | Gå |
| **Shift** (håll in) | Spring |
| **Space** | Hoppa |
| **H** | Slå med tassen: saker flyger iväg och bilar välter! |
| **F** | Stampa i marken: en tryckvåg slänger iväg allt runt björnen |
| **F i luften** | **MEGASTAMP**: hoppa först och tryck sedan F, så blir tryckvågen jättestor |
| **R** | Vråla: bilister blir rädda och kör iväg dubbelt så fort |
| **C** | Byt mellan björn och råtta mitt i spelet |
| **B** | Råttan hoppar in i (eller ur) en bil och kör den! |
| **Musen** | Titta runt (klicka i spelet så styr musen kameran) |
| **Q / E** | Vrid kameran om du inte har mus |
| **+ / −** eller **mushjulet** | Zooma in och ut |
| **M** | Gör kartan stor eller liten |
| **Esc** | Släpp musen |

Som **råtta** betyder knapparna lite annat: **H** = bita (välter koner och tomtar och skrämmer människor), **R** = pipa (människor är jätterädda för råttor!), **Space** = hoppa. Råttan kan inte stampa.

Under knapparna i spelet finns tre små gula staplar. De visar när **H**, **F** och **R** går att använda igen.

---

## Hur man får poäng

Allt som björnen knuffar, slår eller stampar iväg ger poäng:

| Bus | Poäng |
|---|---|
| Trafikkon | 20 |
| Trälåda | 30 |
| Staketbit | 40 |
| Soptunna | 50 |
| Brevlåda | 50 |
| Parkbänk | 60 |
| Brandpost (det sprutar vatten!) | 75 |
| Trädgårdstomte | 80 |
| Lyktstolpe | 100 |
| Bankar på ett hus | 15 |
| Krossar ett fönster på en skyskrapa | 30 |
| Skrämmer en bilist med vrålet | 25 |
| Skrämmer en person (gå nära, vråla eller stampa) | 30 |
| Slår till nära en person så den hoppar av skräck | 50 |
| En ballong flyger iväg | 20 |
| Dricker vatten ur en trasig brandpost | 10 per klunk |
| Trampar sönder blommor i en rabatt | 5 per blomma |
| **River en villa** | **300** |
| **River ett hyreshus** | **500** |
| **River en skyskrapa** | **800** |
| **Välter en bil** | **200** |
| **Bil på taket** (bilen landar upp och ner) | **+300** |
| **Välter en buss** | **500** |
| **💰 Välter Lamborghinin** | **1000** |
| Stampkombo (välter flera bilar med en stamp) | 150 per bil |

## 🐀 Spela som råtta

När du är en råtta blir allt jättestort! Kameran kommer ner nära marken, och bilar, hus och människor tornar upp sig ovanför dig.

- **Ostbutiken** ligger vid torget med statyn (titta efter 🧀 på kartan). Den har ett litet **mushål** nere vid marken, till höger om skyltfönstren, under en liten skylt där det står "🐭 IN". Bara råttan får plats! Inne i butiken finns ostbitar på golvet, på disken, på bordet och på hyllorna. Hoppa upp på hyllorna som en trappa.
- **Jätteosten** ligger på den översta hyllan. Den ger 1000 poäng!
- **Statyn:** spring rakt in i fontänkanten, sockeln och björnstatyn så **klättrar** råttan uppför dem. Toppen av björnen ger 500 poäng.
- **Statyn är dubbel:** klättra först upp på björnstatyn, sedan ända upp på silverråttan högst upp. Det ger 1000 poäng! Råttan vänder sig mot väggen när den klättrar och klänger sig fast. Släpp knapparna så hänger den kvar, tryck **Space** för att hoppa ifrån, och den kravlar sig mjukt upp över kanterna.
- Råttan kan också dricka ur trasiga brandposter. Be björnen slå sönder en först (tryck **C** för att byta)!

| Råttbus | Poäng |
|---|---|
| Ostbit | 100 |
| Jätteosten | 1000 |
| Klättra upp på björnstatyn | 500 |
| Stå på toppen av musstatyn | 1000 |
| Kapa en bil / buss / Lamborghini | 100 / 300 / 500 |
| Krocka med en bil när du kör | 200 (som att välta den) |
| Krascha in i ett hus (huset spricker, så småningom rasar det) | 40 |
| Bita nära en person ("EN RÅTTA! AAAH!") | 50 |
| Pipa så att en person blir rädd | 30 |

### 🚗 Råttan kör bil!
Gå fram till en bil, buss eller till och med Lamborghinin som råtta. När det står **"Tryck B för att hoppa in i bilen!"** trycker du **B**. Då klättrar råttan upp på taket och tar över ratten!

| Knapp | När du kör |
|---|---|
| **W** | Gasa |
| **S** | Bromsa och backa |
| **A / D** | Svänga |
| **Shift** | TURBO! |
| **Space** | Handbroms (för att sladda) |
| **H** | Tuta, så hoppar folk undan |
| **B** | Hoppa ur |

Krocka med andra bilar så voltar de. Lamborghinin är snabbast och bussen är långsammast. Människor hoppar alltid undan i tid. När du hoppar ur rullar bilen vidare av sig själv.

## 💥 Riv hus
Alla villor, hyreshus och skyskrapor går att riva! Slå på huset med **H** så skakar det och spricker. Ju fler slag, desto mörkare och trasigare blir det:

- **Villa:** 3 slag
- **Hyreshus:** 5 slag
- **Skyskrapa:** 6 slag

En vanlig stamp (**F**) bredvid ett hus räknas som ett slag och en **MEGASTAMP** som två. Råttan kan också krascha sönder hus med bilen. När huset inte håller längre rasar det ihop i ett dammoln, bitar flyger åt alla håll och kvar blir en grushög. Huset försvinner också från kartan.

## 🌷 Blommor
Rabatterna vid villorna och i parken går sönder när du trampar på dem. Blommorna viker sig och kronbladen flyger. Både björnen och råttan kan trampa sönder dem.

## 🦆 Parkdammen
Dammen i parken är riktigt vatten med vågor, näckrosor och vass. Gå ut i den så sjunker björnen ner i vattnet och plaskar runt, och det blir ringar på vattnet där den går. Står björnen still i dammen så badar den och tvålar in sig, precis som i fontänen. Råttan kan simma i dammen!

## 🚗 Trafiken
Bilarna kör hela tiden runt på stadens gator och svänger i korsningarna. Det är alltid lika många bilar i stan. En bil som har vält bärgas efter en stund och kommer tillbaka på en gata långt bort från dig.

## 🚿 Björnen duschar
Ställ björnen i vattnet från en trasig brandpost, eller i fontänen nära vattenstrålarna. Då reser han sig på bakbenen, gnuggar sig med tassarna, blir alldeles vit av **tvållödder** och nynnar medan såpbubblorna flyger. Skrubb skrubb! Varje skrubb ger 15 poäng, och det finns uppdrag för att duscha både under en brandpost och i fontänen. Löddret sköljs bort sakta när han går därifrån.

## ⛲ Fontänen
Fontänen på torget har tolv vattenstrålar som bågar in mot statyn. Vattenytan har vågor och solglitter, och det blir ringar och skum där strålarna landar. Det porlar när man kommer nära, och det plaskar om man vadar i vattnet.

## 🐾 Björnligans gömställe
Under statyn finns en hemlig tunnel där björnligan kan gömma sig. Så här tar du dig ner:

1. Gå till **torget** med guldstatyn (följ ⭐ på kartan).
2. Mellan fontänen och gatan där du börjar spelet ligger en stor **trälucka med en björntass** målad på. Den ligger platt i marken, så titta noga!
3. Ställ dig på luckan. Står det *"Det låter ihåligt här under..."* är du rätt!
4. **Björnen:** stampa med **F** (eller slå med **H**). **Råttan:** bit i luckan med **H**. Luckan flyger upp!
5. Gå nerför **trappan** och in genom gången. Nu är du i **björnligans gömställe** rakt under statyn!

Där nere finns en soffa, en skattkista full med guldmynt, tunnor, lyktor och efterlysningsaffischer på björnen och råttan. Ingen människa ser dig där nere, så ingen blir rädd hur mycket du än vrålar. Gå uppför trappan igen när du vill tillbaka ut i stan. När luckan är öppen syns en 🐾 på kartan.

| Gömställebus | Poäng |
|---|---|
| Öppna den hemliga luckan | 200 |
| Hitta björnligans gömställe (både björnen och råttan har det som uppdrag) | 500 |

## 🗺️ Kartan

Nere i högra hörnet finns en rund karta över staden. Den vrider sig med kameran, så det som är **uppåt på kartan är rakt fram**. Pilen i mitten är du (orange när du är björn, rosa när du är råtta).

- ⭐ **TORGET** med statyn. Om torget är utanför kartan syns stjärnan vid kanten och visar åt vilket håll du ska gå.
- 🧀 **Ostbutiken** (visas tydligt när du är råtta)
- 🌳 **Parkerna**
- 💰 **Lamborghinin**, när den är i stan
- 🐾 **Luckan till björnligans gömställe**, när du har öppnat den
- Blå hus är skyskrapor, orangea hus är hyreshus och gula hus är villor.

Tryck **M** för att göra kartan stor och se hela staden.

### 💰 Den jätterika personen i Lamborghinin
Efter en halv minut, och sedan ungefär varannan minut, kör en jätterik person med hög hatt och guldkedja in i staden i en guldgul **Lamborghini**. Då dyker en gul pil upp högst upp på skärmen som visar åt vilket håll bilen är och hur långt bort den är. Lamborghinin kör jättefort, så spring (Shift) och försök välta den med **H** eller **F**. Det ger **1000 poäng** (och ännu mer om du har kombo!), pengar sprutar ut och den rika personen springer därifrån!

### 💧 Törstig björn
När du slår sönder en brandpost sprutar det vatten ur den. Ställ dig still bredvid strålen så **dricker björnen vattnet**. Glunk glunk! Varje klunk ger poäng.

### Människor
Människorna promenerar på trottoarerna. Om björnen kommer nära, vrålar eller stampar blir de rädda, slänger upp armarna och springer därifrån. Barn med ballonger tappar dem, och då flyger ballongen upp i himlen. Bilarna stannar för människor som springer ut på gatan.

### Kombo 🔥
Gör du bus snabbt efter varandra (inom 2,5 sekunder) bygger du en **KOMBO**. Var tredje bus i rad höjer multiplikatorn: x2, x3, x4 och som mest **x5**. Då blir varje bus värt mycket mer!

### Busuppdrag
Uppe till höger finns en lista med uppdrag. Björnen och råttan har olika uppdrag, till exempel *"Välta 5 bilar"* eller *"Sparka iväg 8 tomtar"*. Varje klart uppdrag ger **1000 bonuspoäng**. Klarar du alla blir du **BJÖRNKUNGEN**!

### Titlar
Ju fler poäng, desto finare titel:

| Poäng | Björn | Råtta |
|---|---|---|
| 0 | Liten nalle | Liten mus |
| 1 500 | Busig björn | Busig råtta |
| 5 000 | Kvarterets skräck | Ostjägare |
| 12 000 | Stadens mardröm | Kloakens hjälte |
| 25 000 | BJÖRNKUNGEN | RÅTTKUNGEN |
| 50 000 | Legendarisk megabjörn | Legendarisk superråtta |

---

## Tips 💡

- Bilarna stannar och tutar om du ställer dig framför dem. Perfekt läge för ett **H**-slag!
- **MEGASTAMP** (hoppa + F) mitt i en korsning kan välta flera bilar på en gång.
- Villakvarteren långt ut i staden är fulla av staket, brevlådor och trädgårdstomtar.
- Brandposterna längs trottoarerna sprutar vatten när du slår omkull dem.
- Leta upp bussarna (de är röda, gula eller blå och långa). De ger mycket poäng!
- Följ den gula pilen när Lamborghinin kommer. Den är värd 1000 poäng!
- Stampa (F) mitt i en folksamling för att skrämma många personer på en gång.
- Välta bilar bärgas efter en stund och kommer tillbaka på en gata långt bort, så det finns alltid lika många bilar i stan.

---

## Hur spelet är byggt (för den nyfikne)

| Del | Verktyg |
|---|---|
| 3D-grafik | [Three.js](https://threejs.org): ljus, skuggor, himmel och alla 3D-modeller |
| Fysik | [cannon-es](https://github.com/pmndrs/cannon-es): gör att saker flyger, studsar, välter och krockar på riktigt |
| Utvecklingsserver | [Vite](https://vitejs.dev) |
| Ljud | Webbläsarens Web Audio, alla ljud skapas direkt i koden |

```
bear-game/
├── index.html      Sidan med poängtavla, uppdrag och startmeny
└── src/
    ├── main.js     Spelets hjärna: kontroller, kamera, bus, poäng och uppdrag
    ├── world.js    Bygger staden: vägar, hus, villor, park, torget med statyn, ostbutiken och allt man kan förstöra
    ├── cars.js     Bilar, bussar och Lamborghinin som kör runt, stannar och tutar
    ├── people.js   Människor som promenerar, blir rädda och springer
    ├── bear.js     Björnen och hur den rör sig
    ├── rat.js      Råttan och hur den rör sig
    ├── fountain.js Fontänen med vatten, strålar och droppar
    ├── pond.js     Parkdammen med vågor, ringar på vattnet, näckrosor och vass
    ├── tunnel.js   Den hemliga tunneln och björnligans gömställe under statyn
    ├── minimap.js  Kartan i hörnet
    ├── fx.js       Effekter: skräp, damm, glassplitter, vatten och tryckvågor
    ├── audio.js    Ljudeffekter
    └── style.css   Utseende på menyer och poäng
```

Staden byggs om lite slumpmässigt varje gång du startar spelet, så husen och bilarna hamnar inte exakt likadant två gånger.
