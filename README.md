# 📘 goblin-nabu

## Aperçu

`goblin-nabu` est le module d'internationalisation (i18n) du framework Xcraft. Il fournit l'infrastructure complète pour extraire, stocker, traduire et distribuer les chaînes de caractères d'une application. Il s'appuie sur le format ICU (International Components for Unicode) pour la gestion des pluriels, genres et variables dans les traductions.

Le module expose trois acteurs Goblin principaux (`nabu`, `nabu-toolbar`, `nabu-tools`) ainsi qu'un ensemble de widgets React et de bibliothèques utilitaires accessibles depuis les couches frontend et backend.

## Sommaire

- [Structure du module](#structure-du-module)
- [Fonctionnement global](#fonctionnement-global)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Interactions avec d'autres modules](#interactions-avec-dautres-modules)
- [Configuration avancée](#configuration-avancée)
- [Détails des sources](#détails-des-sources)
- [Licence](#licence)

## Structure du module

Le module est organisé autour de plusieurs composants clés :

- **Service principal** (`lib/service.js`) : Le cœur du module, acteur Goblin singleton `nabu` qui gère l'état global des locales et des traductions.
- **Outils CLI** (`lib/nabu-tools.js`) : Acteur Goblin singleton `nabu-tools` pour les opérations batch en ligne de commande (extraction, import, packaging).
- **Extraction** (`lib/extraction.js`) : Pipeline d'extraction des messages via plugin Babel.
- **Packaging** (`lib/pack.js`) : Sérialisation/désérialisation du cache de traductions (`translations.json`).
- **Utilitaires** (`lib/format.js`, `lib/gettext.js`, `lib/helpers.js`, `lib/string-builder.js`, `lib/tr.js`) : Librairies de formatage ICU, résolution hiérarchique de traductions, calcul d'identifiants et composition de chaînes traduisibles.
- **Plugin Babel** (`lib/extractor/`) : Analyse AST pour détecter les appels `T(...)` dans les sources JS/JSX.
- **Toolbar** (`widgets/nabu-toolbar/`) : Barre d'outils React + acteur Goblin pour le mode traduction interactif.
- **Composants de rendu** (`widgets/t/`, `widgets/text/`) : Composants React pour l'affichage de textes traduisibles.
- **Formulaires d'édition** (`widgets/nabu-message/`, `widgets/translation-field/`, `widgets/icu-message/`) : Interface de saisie des traductions.
- **Helpers frontend** (`widgets/helpers/`) : Fonction `T()`, variantes Immutable et synchrone, HOC pour attributs HTML traduisibles.

## Fonctionnement global

### Pipeline de traduction

Le cycle de vie d'une chaîne traduite passe par quatre étapes :

```
1. MARQUAGE (code source)
   T('Mon texte', 'Description', {param: value})
        ↓
2. EXTRACTION (nabu-tools extract / nabu.extract-messages)
   Plugin Babel analyse les fichiers JS/JSX
   → crée/met à jour les entités nabuMessage en base
        ↓
3. TRADUCTION (interface Nabu ou import JSON)
   Saisie manuelle via nabu-toolbar / nabu-message
   ou import d'un fichier translations.json packagé
        ↓
4. DISTRIBUTION (nabu.pack-messages / nabu.unpack-messages)
   Génère resources/translations.json embarqué dans l'application
   Chargé au démarrage sans accès base de données
```

### Identification des messages

Chaque message est identifié par un hash MD5 de son `nabuId` :

```javascript
// nabuId = "Mon texte" → messageId = "nabuMessage@<16 hex chars>"
// translationId = "nabuTranslation@fr_CH@<16 hex chars>"
```

### Résolution de traduction

La résolution suit un mécanisme de repli hiérarchique :

1. **Contexte** : `"app|section|Mon texte"` → essaie `"app|section|Mon texte"`, puis `"section|Mon texte"`, puis `"Mon texte"`
2. **Sous-locale** : `"fr_CH/valais"` → essaie `"fr_CH/valais"`, puis `"fr_CH"`, puis `"fr"`
3. **Fallback** : le `nabuId` brut (sans contexte) est utilisé si aucune traduction n'existe

### Modes de traduction frontend

| Mode                       | Comportement                                      | Utilisé quand              |
| -------------------------- | ------------------------------------------------- | -------------------------- |
| Cache (`translations`)     | Lecture depuis `backend.nabu.translations`        | Nabu désactivé, production |
| Direct (`nabuTranslation`) | Lecture depuis l'entité `nabuTranslation` en base | Nabu activé, mode édition  |

## Exemples d'utilisation

### Marquer une chaîne à traduire

```javascript
const T = require('goblin-nabu/widgets/helpers/t.js');

// Chaîne simple
const msg = T('Bonjour le monde');

// Avec description pour le traducteur
const msg = T('Save', 'Button label in the toolbar');

// Avec variables ICU
const msg = T(
  '{count} élément{count, plural, one {} other {s}} trouvé{count, plural, one {} other {s}}',
  '',
  {count: 5}
);

// Avec HTML
const msg = T('<b>Important</b>', '', {}, true);
```

### Afficher une chaîne traduite (React)

```jsx
import T from 'goblin-nabu/widgets/t/widget';

// Dans un render de Widget Xcraft
render() {
  return (
    <div>
      <T msgid={T('Bonjour')} workitemId={this.props.id} />
    </div>
  );
}
```

### Traduction synchrone dans les styles (nabu.js)

`widgets/helpers/nabu.js` fournit une variante synchrone de `T()` qui résout directement la traduction depuis le store Redux global (`window.renderer.store`).

```javascript
import T from 'goblin-nabu/widgets/helpers/nabu.js';

// Utilisation synchrone — retourne directement le texte traduit
const label = T('Enregistrer', 'Bouton de sauvegarde', {});
// → "Save" (si locale active = en_US et traduction disponible)
// → "Enregistrer" (si aucune traduction disponible = fallback sur nabuId)
```

> **Note** : contrairement à `widgets/helpers/t.js` qui retourne un objet nabu différé, `nabu.js` retourne immédiatement le texte formaté. Elle doit être utilisée uniquement lorsque le store Redux est déjà initialisé (`window.renderer` disponible).

### Combiner des chaînes traduisibles

```javascript
const StringBuilder = require('goblin-nabu/lib/string-builder.js');
const T = require('goblin-nabu/widgets/helpers/t.js');

// Jointure avec espace
const result = StringBuilder.joinWords(T('Bonjour'), username);

// Jointure avec virgule
const list = StringBuilder.joinSentences([
  T('Pommes'),
  T('Poires'),
  T('Cerises'),
]);

// Combinaison directe
const full = StringBuilder.combine(
  T('Total :'),
  ' ',
  count,
  ' ',
  T('articles')
);
```

### Traduction côté backend

```javascript
const Tr = require('goblin-nabu/lib/tr.js');
const T = require('goblin-nabu/widgets/helpers/t.js');

// Dans une quête Goblin
Goblin.registerQuest('my-goblin', 'my-quest', async function* (quest) {
  const text = await Tr(quest, 'fr_CH', T('Message à envoyer'), true);
  console.log(text); // "Message à envoyer" traduit en français
});
```

### Extraction et packaging via nabu-tools (CLI)

```bash
# Lancer l'extraction pour une application
node app --extract --appid=my-app

# Importer des traductions depuis un JSON
node app --translate --appid=my-app

# Packager les traductions
node app --pack --appid=my-app
```

## Interactions avec d'autres modules

- **[xcraft-core-goblin]** : Fournit les mécanismes de base Goblin (quêtes, Shredder, dispatch, createSingle)
- **[xcraft-core-shredder]** : Manipulation des structures immutables dans les helpers et composants
- **[xcraft-core-host]** : Accès aux chemins du projet (`projectPath`, `resourcesPath`) et aux arguments de démarrage (`appArgs`)
- **[xcraft-core-etc]** : Chargement de la configuration du module (`goblin-nabu`)
- **[xcraft-core-utils]** : Accès aux utilitaires de modules (`modules.extractAllJs`, `modules.loadAppConfig`)
- **[goblin-laboratory]** : Classe `Widget` de base pour tous les composants React du module

## Configuration avancée

Fichier `config.js` exploité via [`xcraft-core-etc`][xcraft-core-etc] :

| Option             | Description                                                      | Type       | Valeur par défaut |
| ------------------ | ---------------------------------------------------------------- | ---------- | ----------------- |
| `storageAvailable` | Active la persistance RethinkDB (nabu-store)                     | `boolean`  | `true`            |
| `locales`          | Liste des locales à charger (ex: `["fr_CH", "de_CH"]`)           | `string[]` | `[]`              |
| `apps`             | Liste des identifiants d'applications à gérer (extraction, pack) | `string[]` | `[]`              |

## Détails des sources

### `lib/service.js` — Acteur Goblin `nabu` (singleton)

Cœur du module. Gère l'état global des locales et des traductions, orchestre l'initialisation, l'extraction, le packaging et la gestion des entités de traduction.

#### État et modèle de données

```javascript
{
  id: 'nabu',
  locales: [
    {
      id: 'locale@fr_CH',
      name: 'fr_CH',
      text: 'Français',
      description: '',
      hide: false      // true si la locale est masquée par hideLocales
    }
  ],
  translations: {
    // Carte des traductions packagées (hors storage)
    // "nabuMessage@<hash>": { "fr_CH": "texte traduit", ... }
  }
}
```

#### Cycle de vie

`nabu` est un singleton créé au démarrage. Sa quête `init` est protégée contre les double-appels. Deux modes d'initialisation existent :

- **Avec storage** (`configuration` fournie) : souscrit à l'événement `nabu-store.locales-loaded`, puis déclenche `unpackMessages` et `loadConfigurationLocales` à la réception. Émet `initialized` via cet abonnement.
- **Sans storage** : exécute directement `unpackMessages` et `loadConfigurationLocales`, puis émet `initialized`.

#### Méthodes publiques

- **`init(desktopId, appName, configuration)`** — Initialise l'acteur. `configuration` contient `mandate`, URLs Elasticsearch/RethinkDB, etc. Ne peut être appelé qu'une seule fois.
- **`get(path)`** — Retourne l'état complet ou une valeur à un chemin donné.
- **`get-locales()`** — Retourne la liste des locales actives.
- **`find-best-locale(locale, avoidCompareLanguages)`** — Trouve la meilleure locale correspondante dans la liste connue (correspondance exacte, puis approximative, puis par langue, puis première disponible).
- **`getFirstLocale()`** — Retourne le nom de la première locale disponible.
- **`get-configuration()`** — Retourne la configuration courante (stockée via `setX`).
- **`is-storage-available()`** — Retourne `true` si la persistance RethinkDB est active.
- **`try-add-locales(desktopId, mandate, locales)`** — Ajoute les locales manquantes (sans doublons), met à jour l'état et persiste via nabu-store si le storage est disponible.
- **`load-configuration-locales(desktopId, mandate)`** — Charge les locales depuis la configuration du module et appelle `tryAddLocales`. Utilise `fr_CH` et `de_CH` par défaut si aucune locale n'est configurée.
- **`add-message(workitemId, desktopId, nabuId, description, custom, rawLoading)`** — Crée ou enrichit une entité `nabuMessage` et charge ses traductions associées.
- **`load-translations(messageId, ownerId, desktopId)`** — Instancie toutes les entités `nabuTranslation` pour un message donné (une par locale).
- **`add-translatable-data(desktopId, entityId, nabuId, defaultTranslation)`** — Crée un message "custom" (traduction libre, non extraite du code) avec une traduction par défaut.
- **`set-translatable-data-translation(desktopId, nabuId, localeName, translation)`** — Définit la traduction d'un message custom pour une locale donnée.
- **`reset-translations(desktopId, ownerId, messageId)`** — Supprime toutes les traductions persistées d'un message (pour réimport).
- **`extract-messages(desktopId, $appName, $appId, $variantId, $outputFile)`** — Lance l'extraction Babel sur tous les fichiers JS du projet.
- **`pack-messages(desktopId, force, $appName, $appId)`** — Génère `resources/translations.json` depuis la base.
- **`unpack-messages(desktopId, mandate)`** — Charge `resources/translations.json` dans l'état (`translations`) sans accès base.
- **`import-packed-messages(desktopId, ownerId, packFilePath)`** — Importe un fichier pack externe en base de données (mode développement uniquement).
- **`set-locales(locales)`** — Remplace la liste des locales dans l'état.
- **`hide-locales(localeNames)`** — Masque les locales non listées (utile pour restreindre l'affichage sans supprimer).
- **`set-translations(translations)`** — Injecte directement le cache de traductions (depuis unpack).
- **`configureNewDesktopSession(desktopId)`** — Ajoute le contexte `nabu` au desktop pour l'affichage dans l'interface.
- **`configureDesktop(clientSessionId, labId, desktopId, session, username, locale, configuration)`** — Configure la session desktop (retourne le thème par défaut).
- **`getMandate()`** — Retourne `'nabu'` (mandate fixe du service).

### `lib/nabu-tools.js` — Acteur Goblin `nabu-tools` (singleton CLI)

Acteur utilitaire destiné à être lancé en ligne de commande (sans interface graphique) pour orchestrer les opérations batch : extraction, import de traductions et packaging.

#### Cycle de vie

Singleton démarré par `boot`/`init`. À l'`init`, il configure un feed Xcraft, démarre le service `nabu`, charge les locales depuis `nabu-store`, puis exécute les opérations demandées via les arguments de ligne de commande (`--extract`, `--translate`, `--pack`). Un `quest.defer` sur `shutdown` assure la fermeture propre après exécution.

#### Méthodes publiques

- **`extract(appid)`** — Extrait les messages pour les applications listées dans la config (ou `appid` si fourni). Génère `<projectPath>/<app>.json`.
- **`translate(appid)`** — Importe les traductions depuis les fichiers JSON générés par `extract`. Crée automatiquement les locales `fr_CH` et `de_CH` si absentes.
- **`pack(appid)`** — Appelle `nabu.pack-messages` pour chaque application de la config.
- **`addNotification(message)`** — Traduit et journalise un message via `Tr`.

### `lib/extraction.js`

Implémente la logique d'extraction des messages à traduire depuis les fichiers source JS/JSX d'une application.

Le processus fonctionne en trois phases :

1. **Scan** : récupère la liste de tous les fichiers JS du projet via `retrieveJsFiles`.
2. **Transformation Babel** : pour chaque fichier, applique le plugin `babel-plugin-extractor` qui collecte tous les appels `T(nabuId, ...)` dans les métadonnées AST.
3. **Synchronisation** : compare les messages extraits avec ceux persistés en base, puis applique les opérations `add`, `patch` (mise à jour des sources) ou `delete` (suppression des sources obsolètes) nécessaires.

Si `$outputFile` est fourni, génère deux fichiers JSON :

- `<app>.json` — destiné aux traducteurs (avec colonnes `fr_CH`, `de_CH`)
- `dev-<app>.json` — destiné aux développeurs (avec les sources détaillées)

#### Méthodes publiques

- **`extractMessages(quest, desktopId, $appName, $appId, $variantId, $outputFile, $msg)`** — Générateur principal d'extraction. Les paramètres préfixés par `$` sont optionnels (convention Xcraft pour les paramètres de message).

### `lib/pack.js`

Gère la sérialisation (pack) et désérialisation (unpack) du cache de traductions.

- **`packMessages(quest, desktopId, force, $appName, $appId)`** — Lit toutes les entités `nabuMessage` et `nabuTranslation` depuis RethinkDB et génère `resources/translations.json`. En mode production, nécessite `force: true`.
- **`unpackMessages(quest, desktopId, mandate)`** — Lit `resources/translations.json` et injecte les locales et traductions dans l'acteur nabu via `tryAddLocales` et `setTranslations`.
- **`importPackedMessages(quest, desktopId, ownerId, packFilePath)`** — Importe un fichier pack externe en base. Pour chaque message existant, réinitialise ses traductions puis importe celles du pack. Signale les messages manquants (extraction nécessaire).

### `lib/format.js`

Utilitaires de formatage des messages ICU.

#### Méthodes publiques

- **`formatMessage(locale, html, message, values)`** — Compile et exécute un message ICU avec les valeurs fournies. Si `html` est `true`, les valeurs de type `string` sont échappées pour éviter les injections XSS. Lance une erreur descriptive en cas d'échec de formatage.
- **`parseParameters(message)`** — Analyse un message ICU et retourne la liste de ses paramètres (`{param}`) ainsi qu'une éventuelle erreur de parsing.

### `lib/gettext.js`

Implémentation de la résolution hiérarchique des traductions, inspirée du système gettext.

#### Méthodes publiques

- **`splitContext(nabuId)`** — Décompose un `nabuId` avec contexte (`"a|b|texte"` → `['a', 'b', 'texte']`). Gère correctement les `|` dans le texte lui-même (détectés par l'espace précédant).
- **`removeContext(nabuId)`** — Retourne uniquement le texte final sans les préfixes de contexte.
- **`translationWithContextAndSublocale(nabuId, locale, accessMsgIdFunc, translationValidFunc, accessTranslationFunc)`** — Version synchrone de la résolution hiérarchique.
- **`translationWithContextAndSublocaleAsync(...)`** — Version asynchrone (générateur watt) pour utilisation dans les quêtes backend.

### `lib/helpers.js`

Fonctions utilitaires pures pour la manipulation des identifiants et locales.

#### Méthodes publiques

- **`computeMessageId(nabuId)`** — Calcule l'identifiant MD5 d'un nabuId (`nabuMessage@<16 hex chars>`).
- **`computeTranslationId(messageId, localeName)`** — Calcule l'identifiant d'une traduction (`nabuTranslation@<localeName>@<hash>`).
- **`extractDesktopId(id)`** — Extrait le `desktopId` depuis un identifiant composite Xcraft.
- **`getToolbarId(widgetId)`** — Retourne l'identifiant de la toolbar nabu associée à un widget (`nabu-toolbar@<desktopId>`).
- **`findBestLocale(locales, localeName, avoidCompareLanguages)`** — Recherche la meilleure correspondance de locale par ordre de précision décroissant : exacte → canonique → langue exacte → langue approchée → première disponible.
- **`canonicalizeLocaleName(localeName)`** — Normalise le nom de locale en minuscules avec `_` (ex : `fr-CH` → `fr_ch`).
- **`getLocaleLanguage(localeName)`** — Extrait la partie langue d'un nom de locale (`fr_CH` → `fr`).

### `lib/string-builder.js`

Permet de composer des chaînes traduisibles hétérogènes (mélange de textes bruts et d'objets nabu) en préservant leur nature traduisible jusqu'au rendu final.

#### Classe `TranslatableString`

Représentation interne d'une chaîne composite. Stocke une liste (`_string`) d'éléments qui peuvent être soit des primitives, soit des objets nabu (`{nabuId, ...}`).

#### Classe `StringBuilder`

- **`StringBuilder.combine(...args)`** — Concatène des éléments hétérogènes. Retourne une primitive si le résultat ne contient que des primitives, sinon un objet `TranslatableString`.
- **`StringBuilder.joinWords(...args)`** — Joint des éléments avec un espace (`" "`).
- **`StringBuilder.joinSentences(...args)`** — Joint des éléments avec `", "`.
- **`StringBuilder.joinHyphen(...args)`** — Joint des éléments avec `—` (tiret cadratin U+2014).
- **`StringBuilder.joinLines(...args)`** — Joint des éléments avec `"\n\n"`.
- **`StringBuilder.join(array, separator)`** — Joint avec un séparateur personnalisé. Les valeurs `null`/`undefined` sont filtrées.
- **`StringBuilder.isTranslatable(text)`** — Retourne `true` si la valeur est compatible avec `TranslatableString` (string, number, nabu object, TranslatableString, ou vide).
- **`StringBuilder._toFlatten(result)`** — ⚠️ Usage debug uniquement. Aplatit un résultat en chaîne lisible, avec `@{nabuId}` pour les objets nabu.

### `lib/tr.js`

Fonction `Tr(quest, localeName, msg, fromCache)` permettant de résoudre une traduction côté backend (dans une quête Goblin), avec accès à la base de données RethinkDB.

Supporte les entrées de type :

- primitive (retournée telle quelle)
- objet Immutable/Shredder (converti via `.toJS()`)
- objet `translatableString` (résolution récursive de chaque élément)
- objet nabu (`{nabuId, ...}`)

Deux stratégies de résolution selon `fromCache` :

- **`fromCache: true`** — Lit depuis le cache `nabu.translations` (traductions packagées, rapide).
- **`fromCache: false`** — Lit directement depuis les entités `nabuTranslation` en base (traductions live).

### `widgets/helpers/t.js` — Fonction `T()`

Point d'entrée universel pour marquer une chaîne à traduire. Retourne un objet nabu sérialisable.

```javascript
T(nabuId, description?, values?, html?, custom?)
// → { nabuId: '...', description?: '...', values?: {...}, html?: true, custom?: true }
```

Les champs `undefined` sont omis pour compatibilité RethinkDB.

### `widgets/helpers/t-frontend.js`

Variante de `T()` qui retourne un objet Immutable.js (`fromJS(ToNabuObject(...))`), utilisé directement dans les composants React connectés au store Redux.

### `widgets/helpers/nabu.js`

Variante de `T()` **synchrone** pour usage dans les styles ou contextes sans accès aux props React. Lit directement depuis `window.renderer.store` (le store Redux global). Retourne le texte formaté ICU ou le `nabuId` brut si la locale n'est pas disponible. Ne doit être utilisée qu'après l'initialisation du renderer.

### `widgets/helpers/element-helpers.js`

HOC (Higher-Order Component) et composants spécialisés pour rendre des attributs HTML traduisibles (titre, placeholder, src...).

#### Export `withT(Component, textPropName, servicePropName, refPropName)`

Enveloppe un composant React pour que sa prop `textPropName` soit automatiquement traduite via le store Nabu.

#### Composants exportés

- **`TranslatableDiv`** — `<div title={T(...)} />` avec titre traduisible.
- **`TranslatableA`** — Ancre avec titre traduisible.
- **`TranslatableTextarea`** — Textarea avec placeholder traduisible.
- **`TranslatableInput`** — Input avec `value` et `placeholder` traduisibles.
- **`TranslatableButton`** — Bouton avec `title` traduisible.
- **`TranslatableVideo`** — Vidéo avec `src` traduisible.

### `widgets/t/widget.js` — Composant `<T>`

Composant React principal pour l'affichage de textes traduisibles. Gère tous les types de contenu nabu :

- **Primitive** (`string`, `number`) → `<span>` direct.
- **`translatableString`** → récursion sur chaque élément du tableau `_string`.
- **`translatableMarkdown`** → rendu via `goblin-gadgets/markdown` avec remplacement des `@{ref}` par des sous-composants `<T>`.
- **Objet nabu** (`{nabuId, ...}`) → délègue à `TextConnected` (composant `NabuText` connecté au store).

**Props principales :**

| Prop         | Type             | Description                                           |
| ------------ | ---------------- | ----------------------------------------------------- |
| `msgid`      | `object\|string` | Objet nabu ou chaîne brute à afficher                 |
| `workitemId` | `string`         | ID du workitem pour résoudre la toolbar nabu associée |

### `widgets/text/widget.js` — Composant `NabuText`

Composant bas niveau pour le rendu d'un unique objet nabu. Connecté au store via `TextConnected` dans `t/widget.js`.

Gère les comportements visuels de la toolbar :

- **Marker mode** : surligne en vert les textes sans traduction quand la toolbar est active.
- **Selection mode** : entoure les textes d'un cadre rouge au survol, permettant de naviguer directement vers le message dans l'éditeur.
- **Focus** : met en évidence le message actuellement sélectionné dans l'éditeur.

### `widgets/nabu-toolbar/service.js` — Acteur Goblin `nabu-toolbar`

Gère l'état et les actions de la barre d'outils de traduction Nabu, instanciée par session desktop.

#### État et modèle de données

```javascript
{
  id: 'nabu-toolbar@<desktopId>',
  show: false,          // Visibilité de la toolbar
  enabled: false,       // Mode traduction actif
  marker: false,        // Surlignage des textes non traduits
  focus: null,          // ID du message en focus
  editor: false,        // Mode éditeur complet (session Nabu dédiée)
  selectedLocaleId: null,
  selectionMode: {
    enabled: false,
    selectedItemId: null  // Message sélectionné par hover
  }
}
```

#### Cycle de vie

Acteur instanciable créé pour chaque session desktop. La quête `create` détecte si le `desktopId` correspond à une session Nabu dédiée (`-nabu-window`) et active automatiquement le mode `editor`. Souscrit à l'événement `edit-message-requested` pour ouvrir automatiquement un message dans l'éditeur.

#### Méthodes publiques

- **`create(desktopId, enabled)`** — Crée la toolbar. Active le mode `editor` pour les sessions Nabu.
- **`delete()`** — Destructeur (vide, nettoyage géré par defer).
- **`open-session()`** — Ouvre une session Nabu dédiée dans un nouvel onglet (fenêtre de traduction complète).
- **`open-locale-search()`** — Ouvre le workitem de recherche de locales.
- **`open-datagrid()`** — Ouvre la grille de recherche de messages.
- **`open-single-entity(entityId, navigate)`** — Ouvre le formulaire d'édition d'un message précis.
- **`open-importPackedMessages()`** — Ouvre l'assistant d'import de fichier pack.
- **`set-selected-item(messageId)`** — Sélectionne un message (en mode sélection) et met à jour le workitem d'édition ouvert.
- **`set-locale-from-name(name)`** — Sélectionne la locale par nom (avec résolution `findBestLocale`).
- **`toggle-enabled()`**, **`enable()`**, **`disable()`** — Bascule le mode traduction.
- **`toggle-marks()`** — Active/désactive le surlignage des textes non traduits.
- **`toggle-selection-mode()`** — Active/désactive le mode sélection par hover.
- **`set-focus(value, messageId)`** — Met en évidence un message spécifique.
- **`set-selected-locale(localeId)`** — Sélectionne la locale active.

### `widgets/nabu-toolbar/widget.js` — Composant `NabuToolbar`

Barre d'outils React de traduction. Se connecte automatiquement à son acteur via `NabuToolbar.connectTo(instance)`.

Affiche différentes interfaces selon le mode :

- **Mode désactivé** : bouton "Ouvrir une session Nabu".
- **Mode activé, non-éditeur** : boutons Marker, Selection Mode, Modifier un message.
- **Mode activé, éditeur** : boutons Recherche locales, Recherche messages + boutons Extract/Pack/Import en mode `development`.

**Utilisation :**

```jsx
// Dans un widget parent
render() {
  const Toolbar = NabuToolbar.connectTo(this);
  return (
    <div>
      <Toolbar desktopId={this.props.id} />
      {/* reste du contenu */}
    </div>
  );
}
```

### `widgets/nabu-message/widget.js` — Composant `NabuMessage`

Formulaire d'édition complet d'un message (`nabuMessage`). Affiche :

- L'identifiant nabu original (avec bouton copie dans le presse-papiers).
- Les champs de traduction pour chaque locale (via `TranslationField`).
- Les paramètres ICU éditables (via `ConnectedIcuParameters`).
- Les sources du message (fichiers et localisations dans le code).

### `widgets/translation-field/widget.js` — Composant `TranslationField`

Champ de saisie pour une traduction spécifique (locale × message). Affiche un éditeur texte multi-lignes connecté au modèle `nabuTranslation`. Intègre `IcuMessage` pour la prévisualisation et validation ICU en temps réel. En mode datagrid, affiche d'abord un `HighlightLabel` cliquable avant de passer en mode édition. Un intervalle de renouvellement TTL (`renewTTL`) est géré pour les sessions longues.

### `widgets/icu-message/widget.js` — Composant `IcuMessage`

Prévisualisation et validation en temps réel d'un message ICU. Affiché sous le champ de traduction, il permet au traducteur de tester les paramètres ICU et visualise les erreurs de formatage ou les paramètres inconnus.

### `widgets/highlight-label/widget.js` — Composant `HighlightLabel`

Label spécialisé pour les résultats de recherche dans la datagrid. Affiche le texte surligné selon les résultats de recherche, avec tronquage à 40 caractères et affichage complet en tooltip. Privilégie le résultat de recherche (`highlight`) sur le texte de traduction.

### `lib/extractor/babel-plugin-extractor.js`

Plugin Babel utilisé pendant l'extraction. Analyse l'AST de chaque fichier JS/JSX et collecte tous les appels `T(nabuId, ...)` dans les métadonnées Babel (`file.metadata['nabu']`).

Détecte trois formes d'appel :

- `import T from 'goblin-nabu'` → `T('...')`
- `const T = require('goblin-nabu')` → `T('...')`
- `this.T('...')` dans les classes Widget (commenté, désactivé)

Enregistre pour chaque message : `nabuId`, `id` (hash), chemin fichier, localisation (ligne/colonne), processus (`frontend`/`backend`), composant JSX parent.

### `lib/extractor/extract-helpers.js`

Helpers pour la synchronisation des messages extraits avec la base de données :

- **`getUniqueSourceString(source)`** — Génère une clé unique pour une source (utilisée pour la déduplication).
- **`updateSources(sources, appName)`** — Fusionne anciennes et nouvelles sources : supprime les sources obsolètes de l'app courante, conserve les sources d'autres apps.
- **`addMessage(quest, message, desktopId, $msg)`** — Persiste un nouveau message.
- **`patchMessage(quest, message, desktopId, appName, $msg)`** — Met à jour les sources d'un message existant.
- **`deleteMessage(quest, message, desktopId, appName, $msg)`** — Supprime les sources de l'app courante pour un message (sans supprimer les sources d'autres apps).
- **`retrieveJsFiles(appId, variantId)`** — Retourne la liste de tous les fichiers JS du projet (en suivant les dépendances de l'app config).

## Licence

Ce module est distribué sous [licence MIT](./LICENSE).

[xcraft-core-goblin]: https://github.com/Xcraft-Inc/xcraft-core-goblin
[xcraft-core-shredder]: https://github.com/Xcraft-Inc/xcraft-core-shredder
[xcraft-core-host]: https://github.com/Xcraft-Inc/xcraft-core-host
[xcraft-core-etc]: https://github.com/Xcraft-Inc/xcraft-core-etc
[xcraft-core-utils]: https://github.com/Xcraft-Inc/xcraft-core-utils
[goblin-laboratory]: https://github.com/Xcraft-Inc/goblin-laboratory

_Ce contenu a été généré par IA_
