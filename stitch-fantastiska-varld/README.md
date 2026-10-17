# Stitch fantastiska värld 🚀🪨

Ett 3D-spel där Stitch bor på en ljus och färgglad ö som svävar ute i rymden. Där finns raketer som är hus, flygande tefat som är butiker, och mat som är stenar!

## Starta spelet

Du behöver ha **Node.js** installerat (version 24, se `.nvmrc` – kör `nvm use`). Ladda ner det från <https://nodejs.org> om du inte har det.

1. Öppna en terminal i den här mappen.
2. Installera allt som spelet behöver (bara första gången):

   ```bash
   npm install
   ```

3. Starta spelet:

   ```bash
   npm run dev
   ```

4. Webbläsaren öppnas av sig själv (annars går du till adressen som syns i terminalen, till exempel `http://localhost:5173`).
5. Skriv vad din Stitch ska heta och välj en färg (blå, rosa, lila, grön, orange, gul eller turkos). Tryck sedan på **Spela! 🚀** eller `Enter`. Spelet kommer ihåg namnet och färgen till nästa gång.

Vill du göra en färdig version som går att lägga upp på en webbsida kör du `npm run build`. Då hamnar spelet i mappen `dist/`.

> Tips: Spelet fungerar bäst i Chrome, Edge eller Safari. Det går att spela på surfplatta också, med knapparna på skärmen.

### Fin eller enkel grafik 🐢

Första gången spelet startar mäter det hur snabbt det går. Om det är för långsamt (till exempel på en äldre iPad) byter spelet själv till **enkel grafik**: lägre upplösning, inga skuggor eller glöd, enklare former och färre Stitchar och fjärilar som springer omkring. Valet sparas till nästa gång.

Du kan byta själv med knappen längst ner på startskärmen, eller genom att lägga till `?grafik=enkel` eller `?grafik=fin` sist i adressen.

## Så spelar du

Allt i spelet kan göras med **tangentbordet**. Varje knapp på skärmen visar vilken tangent som hör till den, och knappen lyser när man trycker på tangenten.

| Tangent | Knapp på skärmen | Vad händer |
|---|---|---|
| `Enter` eller `Mellanslag` | **Spela! 🚀** | Startar spelet |
| `↑` / `W` | ▲ | Stitch går framåt |
| `↓` / `S` | ▼ | Stitch går bakåt |
| `←` / `A` | ◀ | Stitch svänger åt vänster |
| `→` / `D` | ▶ | Stitch svänger åt höger |
| `Mellanslag` | ⬆️ **Hoppa** | Stitch hoppar |
| `F` | 👊 **Slå** | Stitch slår. Står du nära en raket flyger den iväg! Bollar och lådor går att sparka iväg. |
| `E` eller `Enter` | **Den lila knappen** | Gör det som står på knappen, till exempel *Gå in*, *Lägg i korgen*, *Betala*, *Sov*, *Spela musik* eller *Gå ut*. Knappen syns bara när det finns något att göra där Stitch står. |
| `Q` | 😋 **Ät** | Stitch äter en sten ur ryggsäcken |
| `M` | 🔊 | Ljud av/på |
| `C` | 🎥 | Byter kameravinkel (vanlig, långt bort, nära) |
| `H` | ❓ | Visar hjälpen. Stäng med `H`, `Esc` eller `Enter`. |

Det går också att klicka på knapparna med musen eller trycka på dem på en surfplatta. Ett klick på en pil flyttar Stitch en bit. Håller man inne pilen fortsätter Stitch att gå.

## Uppdrag 📜

Högst upp på skärmen står ditt **uppdrag**, till exempel *Fånga en Plupp* eller *Skjut upp alla 5 raketerna*. En **gul pil** på marken bredvid Stitch och en **gul ljuspelare** visar vart du ska gå. När du klarar ett uppdrag blir det fest 🎉 och du får stjärnor. Sedan kommer nästa uppdrag.

De första uppdragen lär dig spelet steg för steg: gå till fontänen, skjut upp en raket, samla stjärnor, fånga en Plupp, handla, äta och mata en rymdvän. Sedan blir det svårare, till exempel ett **Plupp-tåg** med 5 Pluppar och **Rymdloppet** där du ska skjuta upp raketer innan tiden tar slut ⏱️. När alla vanliga uppdrag är klara fortsätter det med nya, lite svårare uppdrag hela tiden.

Spelet **sparar automatiskt** stjärnor, ryggsäck och uppdrag. Vill du börja om trycker du `H` och väljer *Börja om från början*.

## Vad finns i världen?

### 🐙 Andra Stitchar
Du är inte ensam på ön! Fem andra Stitchar i olika färger går omkring och spelar: **Kiki, Momo, Zigge, Pip och Luna**. Namnet syns ovanför huvudet. Det är datorn som styr dem, men de gör samma saker som du:

- skjuter upp raketer 🚀
- samlar stjärnor ⭐ (skynda dig, annars tar de dem!)
- jagar och gosar med Pluppar 🐰
- studsar på studsmattan 🎪
- åker in i butikerna 🛸 och kommer ut och äter sin sten
- går in i husen 🏠 och kommer ut igen
- sparkar bollar, hälsar på rymdvännerna och kommer fram och säger hej till dig

Gå fram till en annan Stitch och tryck på den lila knappen (`E`) för att säga hej. När en annan Stitch skjuter upp en raket får du ingen stjärna, men raketen kommer tillbaka efter en stund. Under Rymdloppet låter de bli raketerna, så att du hinner.

### 🐰 Pluppar
Små fluffiga varelser med långa öron och en lysande antenn som hoppar runt på ön. Kommer du nära blir de rädda och hoppar iväg i sicksack, så du får springa ikapp dem! När du fångar en får du **1 ⭐**, och Pluppen hoppar sedan efter dig i ett **Plupp-tåg**. Går du in i ett hus eller en butik hoppar Plupparna hem igen.

### 👽 Rymdvänner
Fyra rymdvänner promenerar runt på ön:

- **Glorp** – grön, rund och med ett jättestort öga
- **Bibbi** – rosa, med lång hals och tre ögon
- **Zoop** – lila och svävar med sina tentakler
- **Mojo** – en orange robot-alien med propeller på huvudet

Över huvudet har de en pratbubbla som visar vilken **stenmat de är sugna på**. Köp den maten i en butik och gå fram till rymdvännen. Tryck på den lila knappen (`E`) för att ge maten. Då dansar de av glädje och du får **massor av stjärnor**, mer än maten kostade! En stund senare blir de hungriga igen och vill ha något nytt.

### 🦋 Fjärilar
Lysande fjärilar fladdrar runt på ön och flyger upp i luften när Stitch kommer för nära.


### 🚀 Raketerna är hus
Fem raket-hus står i en ring runt torget: **Lilos, Nanis, Jumbas, Pleakleys och Ängels hus**. Varje raket har runda fönster med gardiner, nitar, fenor, en dörr med ringklocka, husnummer, brevlåda, blomkruka, parabol, skorsten som ryker och en blinkande antenn.

- **Slå på en raket** 👊 så skakar den, motorn tänds och den skjuts upp i rymden med eld och rök. Du får **1 ⭐** varje gång!
- En stund senare kommer raketen tillbaka och dalar ner med en randig **fallskärm**.
- **Gå fram till dörren** och tryck på *Gå in* för att gå in i huset.

### 🏠 Inne i huset
Ett runt rum med säng, matbord, bokhylla, surfbräda, ukulele, teckningar på väggarna och runda fönster ut mot rymden. Saker du kan göra:

- 😴 **Sova** i sängen
- 🧸 **Krama Scrump** (dockan på sängen)
- 🎵 **Spela musik** på skivspelaren
- 🎸 **Spela ukulele**
- 🧊 **Ät ett mellanmål ur kylen** – gratis, en gång varje gång du går in i huset
- 🍽️ **Ät Månosten på bordet** – också gratis

**Så äter du inne i huset:** gå fram till kylen eller bordet. Då dyker den lila knappen upp där det står *Ät …*. Tryck på knappen (eller `E`) så äter Stitch direkt.

### 🛸 Butikerna är flygande tefat
Det finns två butiker: **Stenbutiken** och **Kristallkiosken**. De svävar ovanför marken med blinkande lampor och en skylt som snurrar. Ställ dig i ljusstrålen under tefatet och tryck *Åk in* – då lyfts Stitch upp i strålen och in i butiken!

### 🛒 Handla i butiken
I butiken står hyllor fulla med stenmat:

| Sten | Pris | |
|---|---|---|
| 🧀 Månost | 1 ⭐ | Med hål från kratrar |
| 🔥 Lavasten | 2 ⭐ | Varm och krispig |
| 🍪 Meteorbulle | 2 ⭐ | Med strössel från rymden |
| 🧊 Issten | 2 ⭐ | Kall som en komet |
| 💎 Kristallgodis | 3 ⭐ | Glittrar i magen |
| 🌈 Regnbågssten | 4 ⭐ | Smakar alla färger |

1. Gå fram till en hylla och tryck *Lägg i korgen* (max 6 stenar i korgen). En sten flyger då från hyllan ner i den rosa korgen som Stitch bär. Hyllorna fylls på igen nästa gång du går in i butiken.
2. Gå till **kassan**. Där jobbar en **Stitch med keps och förkläde**. Tryck *Betala*.
3. Har du tillräckligt med stjärnor flyttas stenarna till **ryggsäcken** 🎒.
4. Tryck på 😋 **Ät** (eller `Q`) så äter Stitch en sten ur ryggsäcken. Olika stenar gör olika saker – lavasten får Stitch att spruta eld och isstenar får honom att frysa! Du kan också spara stenarna och ge dem till en hungrig rymdvän.

Ät-knappen är grå när ryggsäcken är tom. Den vickar till när det finns något att äta.

Glömmer du att betala och går ut, så ställs stenarna tillbaka på hyllan.

### ⭐ Stjärnor
Gyllene stjärnor svävar runt på ön. Gå (eller hoppa) in i dem för att samla dem. De kommer tillbaka efter en stund. Du får också en stjärna varje gång du skjuter upp en raket.

### 🎪 Annat att upptäcka
- En **studsmatta** – hoppa upp på den och studsa jättehögt!
- En **fontän** med en snurrande stjärna
- **Bollar och rymdpost-lådor** som går att sparka
- Godisfärgade träd, lysande svampar, kristaller och spiralväxter
- En **rymdval** som simmar runt i himlen, en planet med ringar, månar och stjärnfall

## Hur spelet är byggt (för vuxna)

- **[Three.js](https://threejs.org)** – 3D-grafik i webbläsaren, med mjuka skuggor, ACES tone mapping, miljöreflexer och bloom-effekt.
- **[Rapier](https://rapier.rs)** – fysikmotor (open source). Används för Stitchs karaktärskontroll (kollision, trappsteg, gravitation), raketerna, bollarna och lådorna.
- **[Vite](https://vitejs.dev)** – utvecklingsserver och byggverktyg.

Alla modeller (Stitch, raketer, tefat, möbler, stenar) är byggda med kod direkt i Three.js, så det finns inga bildfiler eller 3D-filer att ladda ner. Ljuden skapas också med kod (Web Audio).

```
src/
  main.js              startar spelet
  game.js              spellogik: kamera, köp, raketer, in/ut ur hus, sparning
  quests.js            uppdrag, pil och ljuspelare
  player.js            Stitchs rörelser och fysik
  core/                fysik, ljud och hjälpfunktioner
  models/              Stitch, raket-hus, flygande tefat, stenmat
  world/               ön, himlen, stjärnor, raketer, Pluppar, rymdvänner, fjärilar och Stitch-kompisarna (bots.js)
  interiors/           huset och butiken inuti
  ui/                  knappar och text på skärmen
  fx/                  partiklar (eld, rök, glitter, hjärtan)
```

Stitch tillhör Disney. Det här är ett privat fan-spel som inte är till salu.
