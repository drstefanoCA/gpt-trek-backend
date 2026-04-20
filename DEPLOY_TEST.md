# Deploy Test Del Portale

Questa cartella e' pronta per una pubblicazione statica di test.

## Contenuto

- `index.html`: home di ruolo
- `repository.html`: registro documentale
- `document.html`: scheda documento
- `editor.html`: creazione e modifica documento
- `portal-data.js`: dati demo e logica condivisa
- `styles.css`: stile del portale
- `netlify.toml`: configurazione minima per Netlify
- `_headers`: intestazioni utili per limitare l'indicizzazione
- `.nojekyll`: compatibilita' con GitHub Pages

## Destinazioni consigliate

- Netlify: adatto al test esterno con password protection lato piattaforma
- GitHub Pages: utile per anteprima pubblica tecnica, ma senza vera protezione accessi

## Note importanti

- Il portale e' un prototipo statico per test.
- I dati e i file allegati sono fittizi.
- Non usare documenti reali della banca in un hosting pubblico o semi-pubblico.
- Per un test piu' controllato, usare Netlify con password del sito.
