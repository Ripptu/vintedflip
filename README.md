# Paintball Day Planner

Eine **mobile-first** Webapp zur Planung eines Gruppen-Paintball-Ausflugs inklusive
After-Activity-Food. Design im Apple-/WHOOP-Stil: reinweißer Hintergrund, viel Weißraum,
eine dezente blaue Akzentfarbe und feine Linien-Statistiken.

## Features

- **Anmeldung** über ein cleanes Namensfeld (`Angemeldet als: …`).
- **Terminumfrage** (Mehrfachauswahl) mit Live-Auswertung.
- **Restaurant-Umfrage** (Mehrfachauswahl) mit Live-Auswertung.
- **Paintball-Paket** (Einzelauswahl: 30€ / 60€ / 90€).
- **Fahrgemeinschaften**: 4 Autos à 5 Plätze (1 Fahrer + 4 Beifahrer), keine Doppelbelegung.
- **Live-Dashboard** für alle Umfragen mit „MEISTGEWÄHLT“-Anzeige und Wählerlisten.
- **Persistenz** über `localStorage` (simuliert eine gemeinsame Echtzeit-Datenbank),
  vorbefüllt mit realistischen Mock-Daten.

## Tech-Stack

React 19 · TypeScript · Tailwind CSS v4 · lucide-react · motion (Framer Motion) · Vite

Die gesamte App-Logik liegt als Single-File-Komponente in [`src/App.tsx`](src/App.tsx).

## Lokal starten

**Voraussetzung:** Node.js

1. Abhängigkeiten installieren: `npm install`
2. App starten: `npm run dev`
3. Build erstellen: `npm run build`
