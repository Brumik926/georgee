# George Demo · Banková simulácia

Samostatná webová aplikácia na precvičenie a ukážku používateľských tokov osobných financií. Názov projektu zostáva George Demo; projekt nie je produktom ani oficiálnou aplikáciou Slovenskej sporiteľne.

## Čo aplikácia obsahuje

- Prehľad modelového účtu a histórie transakcií.
- Demo platobný formulár s validáciou IBAN a načítaním podporovaných platobných QR údajov.
- Evidenciu príjmov a výdavkov v používateľskom účte.
- Sporiace ciele a rozpočtové limity.
- Nastavenia kariet, upozornenia a lokálnu simuláciu biometrického zámku.
- Export demo prehľadu transakcií do PDF.

## Dôležité obmedzenia

- Aplikácia nevykonáva SEPA ani iné skutočné bankové prevody.
- Karty, investičné portfóliá, výnosy a odmeny sú iba modelové.
- Exportované PDF je označené ako demo dokument a nie je bankovým potvrdením ani výpisom.
- Nezadávajte sem skutočné prihlasovacie údaje, PIN, CVV ani údaje aktívnych platobných kariet.
- Existujúce používateľské záznamy v Supabase sa načítavajú podľa prihláseného používateľa; aplikácia pri prihlásení automaticky nevytvára fiktívne transakcie.

## Technológie

- React, TypeScript, Vite a Tailwind CSS
- TanStack Router
- Supabase Auth a databáza
- Vitest a React Testing Library

## Lokálne spustenie

```sh
npm install
npm run dev
```

Testy: `npm run test`

Kontrola štýlu: `npm run lint`

Produkčný build: `npm run build`
