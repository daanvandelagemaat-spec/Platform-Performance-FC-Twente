# FC Twente Performance Platform

Prototype van een intern data- en kennisplatform voor het performance team van FC Twente.

## Wat er nu in zit

- Inlogscherm met rollen voor `viewer`, `editor` en `admin`
- Linkerzijbalk met aparte werkruimtes voor dashboard, artikelen, kennisbank, documenten en beheer
- Gebruikersbeheer voor admins
- Artikelenpagina zonder dummy-data, met directe PDF-upload voor wetenschappelijke artikelen
- Kennisbank voor protocollen, afspraken en praktijkinzichten
- PDF-upload per artikel of kennisitem
- Lokale database via `IndexedDB` voor content, gebruikers en documenten
- Zoek- en filterfunctionaliteit over thema en contenttype
- Visuele stijl vereenvoudigd naar alleen FC Twente-rood en wit

## Demo accounts

- `admin@fctwente.nl` / `TwenteAdmin!`
- `performance@fctwente.nl` / `TwenteCoach!`
- `analist@fctwente.nl` / `TwenteView!`

## Bestanden

- `index.html` - structuur van login, dashboard, content en beheer
- `styles.css` - FC Twente look and feel en responsive layout
- `data.js` - seeddata voor gebruikers, artikelen en kennisitems
- `app.js` - authenticatie, IndexedDB-opslag, PDF-koppeling en rendering

## Gebruik

Open `index.html` in een moderne browser. De eerste keer worden de seedgegevens automatisch in IndexedDB geplaatst.

## Belangrijke nuance

Deze versie gebruikt nog steeds een lokale browserdatabase in de browser. Voor echte productie binnen FC Twente is de logische vervolgstap:

- server-side authenticatie
- centrale cloud of on-prem database
- beveiligde bestandsopslag
- audit logging
- koppeling met performance dashboards en interne systemen
