# MatApp: Offline Ukesplanlegger & Matvarelager for Android (PWA)

En 100 % **offline-først** progressiv webapp (PWA) for middagsplanlegging, dynamisk handleliste og oversikt over matvarelager med holdbarhetssporing og lokale push-varsler. Appen kjører helt lokalt på enheten uten innlogging eller ekstern database/backend.

---

## 🌟 Hovedfunksjoner

### 1. Middagsmeny & Oppskriftsarkiv
- **Oppskriftsarkiv:** Opprett, rediger og lagre middagsretter med ingredienser (mengde, enhet og navn), estimert tid og fremgangsmåte.
- **Fleksibel Ukesmeny:** Velg 3, 7 eller 14 dagers plan.
- **Automatisk lagersjekk:** Hver middag sjekkes i sanntid mot matvarelageret ditt (viser grønn/gul status for hvor mange ingredienser du allerede har).
- **«Finnes i huset»-huking:** Inne i ukesplanen kan du huke av ingredienser du allerede har hjemme – disse trekkes automatisk ut av handlelisten.
- **Porsjonsjustering:** Skaler porsjoner (f.eks. fra 4 til 2 eller 6 porsjoner), og handlelisten justerer mengdene automatisk.

### 2. Dynamisk Handleliste & «Handlemann-modus»
- **Automatisk sammenslåing:** Like ingredienser på tvers av ukens middager slås sammen (f.eks. 200g + 300g = 500g, eller 4dl + 1l = 1.4l).
- **Manuelle varer:** Enkelt legg til ekstra varer som melk, kaffe, såpe etc.
- **Handlemann-modus (tilpasset enhåndsbetjening på mobil):**
  - Store berøringsflater og taktil følelse med haptisk vibrasjon (`navigator.vibrate`) når du krysser av varer i butikken.
  - **Kryss-oppdatering til matvarelager:** Når du huker av en vare som kjøpt, registreres varen umiddelbart i matvarelageret med estimert utløpsdato!
  - Hurtig-angre («Angre»-varsel hvis du trykket feil).
  - Konfetti-feiring når handlekurven er fullført!

### 3. Matvarelager & Holdbarhetssporing
- **Oversikt over beholdning:** Gruppert etter *Kjøleskap*, *Fryser*, *Tørrvare* og *Utløper snart*.
- **Fargekodet holdbarhet:**
  - 🔴 **Rød:** Utløpt eller går ut i dag
  - 🟡 **Gul:** Går ut om 1–3 dager
  - 🟢 **Grønn:** God holdbarhet (> 3 dager)
- **Lokale Push-varsler:** Mottar daglige varsler på mobilen når varer er i ferd med å gå ut på dato. Egen testknapp i innstillinger for å verifisere varsling.
- **Hurtigjustering:** +/- knapper for å justere mengder direkte i oversikten.

### 4. Android-tilpasning & Widget
- **PWA Installasjon:** Kjører som en fullverdig Android-app uten nettleserens adressefelt.
- **App Shortcuts (Quick Actions):** Hold inne app-ikonet på startskjermen på Android for direkte tilgang til:
  - 🛒 Handleliste
  - 🗓️ Ukesmeny
  - 🧊 Matvarelager
  - ➕ Ny oppskrift
- **Android Hurtig-Widget:** Egen innebygd hurtigvisning/widget som viser dagens middag, neste handleliste-elementer og utløpsvarsler med ett trykk.

### 5. Dataintegritet & Sikkerhetskopi
- **100% Offline-først:** Bygget på **IndexedDB** (via Dexie.js). Ingen data sendes til nettet.
- **Eksport & Import:** Ta full sikkerhetskopi (JSON) for overføring mellom telefon og datamaskin, eller tilbakestill til standard eksempelmiddager når som helst.

---

## 🚀 Kom i gang / Lokal kjøring

### Forutsetninger
- Node.js (v18 eller nyere)
- npm

### 1. Klon eller gå til mappen
```bash
cd /Users/olem/Documents/Mat-app
```

### 2. Start utviklingsserveren
```bash
npm run dev
```
Åpne `http://localhost:5173` i nettleseren.

### 3. Bygg produksjonsversjon med Service Worker & PWA Manifest
```bash
npm run build
npm run preview
```

---

## 📱 Slik installerer du appen på en Android-telefon

Du kan installere appen direkte på din Android-enhet på to enkle måter:

### Metode A: Teste lokalt over Wi-Fi
1. Sørg for at PC-en/Mac-en og Android-telefonen er koblet til **samme Wi-Fi-nettverk**.
2. Finn IP-adressen til PC-en din (f.eks. `192.168.1.120`).
3. Start serveren med ekstern tilgang:
   ```bash
   npm run dev -- --host
   ```
4. Åpne **Google Chrome** på Android-telefonen og naviger til adressen (f.eks. `http://192.168.1.120:5173`).
5. Trykk på meny-ikonet (**tre prikker ⋮**) øverst til høyre i Chrome.
6. Velg **«Installer app»** eller **«Legg til på startskjermen»**.
7. Appen installeres på telefonen og vises i app-skuffen på lik linje med vanlige Android-apper. Den vil nå fungere **100 % uten internett**!

### Metode B: Gratis publisering (Vercel / Netlify / GitHub Pages / Cloudflare Pages)
Siden appen er 100 % klientside uten backend, kan `dist/`-mappen publiseres direkte:
```bash
# Bygg appen
npm run build

# Eksempel med Vercel CLI (eller dra dist/-mappen inn i Netlify Drop):
npx vercel deploy --prod ./dist
```
Når du åpner URL-en i Android Chrome vil telefonen automatisk vise et **«Installer app»**-banner nederst på skjermen.

---

## 🛠️ Teknologistack

- **Rammeverk:** React 19 + TypeScript
- **Bundler:** Vite 6
- **Styling:** Tailwind CSS (med støtte for mørk og lys modus)
- **Offline Lagring:** IndexedDB (Dexie.js + dexie-react-hooks)
- **PWA & Offline Caching:** `vite-plugin-pwa` + Workbox Service Worker
- **Ikoner:** Lucide React
- **Feiring/Feedback:** Canvas-confetti + `navigator.vibrate` haptisk feedback
- **Varslinger:** Web Notification API + Service Worker Registration ShowNotification
