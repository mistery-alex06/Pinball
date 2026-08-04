# 🕹️ Neon Pinball

Un flipper giocabile via browser, scritto in HTML/CSS/JavaScript puro (nessuna dipendenza, nessun build step). Fisica a corpo rigido custom su `<canvas>`: pareti, paraurti, pioli, kicker, un mulinello rotante e 6 piccoli paddle a molla che proteggono 3 buche sul fondo del tavolo.

## Come si gioca

Apri `pinball/pinball.html` in un browser — non serve altro.

- **Spazio** (tieni premuto e rilascia): carica e lancia la pallina dalla molla, verticalmente verso l'alto.
- **Freccia sinistra**: attiva i 3 paddle di sinistra (uno per buca).
- **Freccia destra**: attiva i 3 paddle di destra (uno per buca).

Obiettivo: tenere la pallina in gioco il più a lungo possibile colpendo paraurti e ostacoli per fare punti, usando i paddle per impedirle di cadere in una delle 3 buche sul pavimento. Si hanno **3 palline** a partita; quando finiscono, la partita termina.

## Il tavolo

- Struttura a cupola continua che racchiude tutto il campo, nessuna zona aperta.
- Pavimento con **3 buche** (a 1/4, al centro e a 3/4 della larghezza), rivestito per il resto da **tappetini rimbalzanti**.
- **6 paddle** (2 per buca, inclinati verso l'interno) che, se attivati in tempo, chiudono la buca e rimandano la pallina in campo.
- **7 paraurti tondi** colorati che respingono la pallina e danno punti.
- **10 pioli** decorativi sparsi che deviano leggermente la traiettoria.
- **2 kicker** ad alto rimbalzo negli angoli.
- Un **mulinello rotante** che gira di continuo per conto suo, imprevedibile.

## Stack tecnico

- `pinball.html` — struttura della pagina e HUD (punteggio, palline rimaste)
- `style.css` — tema visivo neon
- `script.js` — motore fisico (collisioni cerchio/segmento, sub-stepping per evitare che la pallina attraversi le pareti ad alta velocità) e logica di gioco, tutto vanilla JS, senza librerie esterne

Nessuna installazione, nessun bundler: basta un browser.
