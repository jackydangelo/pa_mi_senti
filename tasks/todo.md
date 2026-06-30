# Issue #14 — Reverse geocoding (Nominatim)

Ricavare il nome della via dalle coordinate e sostituirlo al placeholder `{indirizzo}` nel messaggio.

## Piano

### Fase 1 — Libreria (`src/lib/location.ts`)
- [ ] `reverseGeocode(coords, timeoutMs=4000)`: fetch Nominatim, `AbortController` per timeout, ritorna `string | null`
- [ ] `composeAddress(address)`: compone `road [house_number], city` dai campi OSM
- [ ] Fallback silenzioso: errore/timeout/no-road → `null` (non bloccare il flusso)

### Fase 2 — Componente (`TemplatePicker.tsx`)
- [ ] Helper `composeFinalMessage(template, coords)`: reverse → replace `{indirizzo}` → append link Maps → formattazione email. Rimuove duplicazione tra GPS e mappa.
- [ ] `handleUseGPS`: usa l'helper (spinner già copre la latenza)
- [ ] `handleMapConfirm`: reso `async`, usa l'helper
- [ ] Se reverse → `null`, lasciare `{indirizzo}` letterale (comportamento attuale)

### Fase 3 — Privacy/consenso
- [ ] `privacy.md`: dichiarare invio coordinate a Nominatim/OSM per ricavare l'indirizzo

### Fase 4 — Doc + verifica
- [ ] `CLAUDE.md`: sezione geolocalizzazione + integrazioni esterne
- [ ] `LOG.md`: voce
- [ ] `npm run build` + `npm run lint`

## Decisioni
- Provider: Nominatim (no key, no backend, CORS aperto).
- Si **mantiene** il link Google Maps in coda (precisione) **oltre** all'indirizzo testuale.
- Indirizzo sempre modificabile dall'utente nel client Twitter/email (non si forza nulla).

## Domande aperte
- Includere la città nell'indirizzo o solo la via? (default: includo città, utile per frazioni)

## Review (completata)

- ✅ `reverseGeocode` + `composeAddress` in `location.ts` (Nominatim, timeout 2.5s, fallback null). Parser validato su 5 casi reali.
- ✅ `composeFinalMessage` in `TemplatePicker`: reverse → replace `{indirizzo}` → link condizionale.
- ✅ Pre-open tab nel gesto (GPS + mappa) per evitare popup-blocking; `sendMessage` riusa la scheda.
- ✅ Guard 280: link Maps omesso su social solo se l'indirizzo è **realmente inserito** (placeholder presente). Regressione su messaggio libero corretta.
- ✅ privacy.md aggiornata (Nominatim).
- ✅ CLAUDE.md + LOG.md aggiornati.
- ✅ `npm run build` + `npm run lint` puliti.

### Verifica manuale residua (richiede browser reale + GPS)
- [ ] Su un device reale: template social → GPS → confermare che la scheda Twitter **si apra davvero** (non solo testo corretto) con l'indirizzo al posto di `{indirizzo}`.
- [ ] Stesso check per il path mappa e per il canale email (mailto).
