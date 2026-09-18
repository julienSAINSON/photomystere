# Photo Mystere - Contexte projet

## Objectif du projet

Photo Mystere est un jeu educatif, principalement destine aux enfants. Une image est progressivement revelee pendant une duree definie ; l'enfant doit identifier ce qu'elle represente.

Les contenus pourront faire decouvrir le monde, des personnalites, l'art, des monuments, l'histoire, les sciences, les animaux et la culture.

## Contrainte mobile first

Le smartphone est le support principal. Toute interface doit d'abord convenir a un ecran tactile et etroit : utilisation a un doigt, zones interactives adaptees, texte lisible et aucune action essentielle dependante du survol. L'affichage ordinateur est secondaire.

## Technologies et contraintes

L'application actuelle est un site statique sans dependance : HTML5, CSS3 et JavaScript moderne avec ES Modules charges nativement par le navigateur. Aucun framework, systeme de build, base de donnees ou authentification n'est utilise.

Ne pas introduire de framework, de build ou de dependance externe sans decision explicite. L'application doit continuer a fonctionner en ouvrant directement `index.html` dans un navigateur.

## Architecture actuelle

- `index.html` : page unique en francais ; charge `styles.css`, contient le conteneur `#app` et lance `app.js` comme module.
- `app.js` : point d'entree ; cree le jeu et l'interface, puis effectue le premier rendu.
- `answers.js` : normalise les reponses et compare une proposition aux variantes acceptees, sans dependance au jeu ou a l'interface.
- `game.js` : gere l'etat de partie, les tours des joueurs, le score, le compte a rebours, les indices progressifs, le mode de revelation choisi, la validation de reponse et les abonnements de l'interface ; depend de `answers.js`, `hints.js`, `questions.js`, `scoring.js` et `timer.js`. Il synchronise un moteur de revelation attache via `setRevealEngine()`, lance une session avec une duree explicite et expose la machine d'etat `GAME_PHASES` : `PLAYING`, `PAUSED`, `TIME_UP` et `ANSWERED`.
- `hints.js` : determine les indices dont le seuil temporel est atteint. Ce module pur ne depend ni du jeu, ni du timer, ni du rendu.
- `questions.js` : contient les questions de demonstration en memoire, les questions chargees depuis le catalogue, `QUESTION_CATEGORIES`, `getRandomQuestion()`, `getContentQuestions()` et `setContentQuestions()`. Chaque question suit le modele complet de photo mystere et peut inclure une fiche pedagogique `discovery` enrichissable.
- `content-loader.js` : charge explicitement `content/index.json`, puis les fichiers `question.json` references, sans tenter d'enumerer un dossier statique.
- `zip.js` : cree une archive ZIP standard non compressee dans le navigateur, sans dependance externe. Il empaquette les donnees binaires et le JSON pour l'export.
- `scoring.js` : calcule les points a partir du temps et de l'indice, puis encapsule les scores des joueurs. Il est independant du moteur de revelation.
- `timer.js` : compte a rebours autonome base sur `performance.now()` et `requestAnimationFrame` ; expose demarrage, pause, reinitialisation, etat et destruction, et notifie `game.js` a chaque progression et a la fin.
- `ui.js` : rend la configuration de session, l'ecran de jeu ou l'atelier « Créer une photo mystère » dans `#app` ; charge l'image dans un canvas, attache le moteur choisi, affiche le compte a rebours et ouvre une modale de saisie apres toucher/clic sur l'image. La configuration utilise les questions chargees depuis le catalogue et demande le plein ecran sans bloquer le jeu en cas de refus. L'atelier gere les parametres, les reponses acceptees, la previsualisation et l'export.
- `zone-editor.js` : editeur canvas independant des regles de jeu. Il cree, selectionne, deplace, redimensionne, supprime et change le type des polygones `main`, `secondary` et `normal`, avec des coordonnees normalisees.
- `reveal.js` : moteur de revelation canvas autonome. Il exporte `createRevealEngine(canvas, options)`, `calculateMosaicPriorities()`, `generateRevealOrder()`, `generateBandRevealOrder()` et `REVEAL_MODES`. Les modes `mosaic`, `blur` et `bands` partagent la meme API et sont raccordes au canvas par `ui.js`.
- `styles.css` : styles de l'interface responsive mobile, avec boutons pleine largeur et zones tactiles d'au moins 56 px.
- `.vscode/settings.json` : configure Live Server sur le port 5501 ; cette configuration n'est pas requise par l'application elle-meme.

Les imports actuels sont uniquement locaux : `app.js` importe `game.js`, `ui.js`, `content-loader.js` et `questions.js`, `game.js` importe `answers.js`, `hints.js`, `questions.js`, `scoring.js` et `timer.js`, et `ui.js` importe `reveal.js`, `questions.js`, `zone-editor.js` et `zip.js`.

## Tests et non-regression

Il n'existe actuellement ni test automatise, ni dependance de test, ni script de test. Les verifications de la phase 1 sont manuelles : ouvrir l'application, lancer une partie, verifier que la question et le score a zero s'affichent, puis lancer une nouvelle partie. Ce parcours doit rester fonctionnel, y compris sur smartphone.

La phase 4B a ete verifiee dans le navigateur avec une question injectee temporairement au catalogue : duree personnalisee de 30 secondes prioritaire sur les 120 secondes de la question, pause au toucher, retour incorrect sans reprise automatique et reponse normalisee avec espaces multiples. Un test deterministe de `game.js` a valide les transitions `PLAYING -> PAUSED -> PLAYING -> TIME_UP -> ANSWERED`, la fin de temps, la revelation complete et une reponse encore possible. Le chargeur a aussi ete controle avec un catalogue simule et construit `content/<id>/image.jpg`. Le refus ou l'absence du plein ecran est absorbe par l'interface, qui lance la partie normalement.

Le moteur de revelation et le compte a rebours sont actuellement couverts par un diagnostic JavaScript de l'editeur. Le parcours mobile du timer a ete verifie a 375 x 812 px : depart a 00:30, temps stable en pause, reprise et redemarrage a 00:30. Les moteurs mosaïque, flou et bandes ont ete verifies dans le navigateur avec des images canvas de test : progression, seed, ratio, mouvement reduit, ponderation des zones et rendu final. Le selecteur des trois modes, l'image canvas, le lancement, le formulaire de reponse et la fiche « À découvrir » ont ete verifies a 320 px : erreur sans arret du timer, variante accentuee correcte, revelation finale, explication, fiche complete et commande de pause desactivee. A conserver lors des evolutions.

A chaque fonctionnalite ou modification, identifier les tests necessaires pour verifier le nouveau comportement, les fonctionnalites existantes impactees, les cas limites pertinents et le comportement mobile. Executer les tests automatises existants lorsqu'ils seront disponibles ; en ajouter ou les completer lorsqu'ils sont pertinents. Ne pas inventer de systeme de test inutile tant que le projet ne le justifie pas.

Completer les tests automatises par les verifications manuelles necessaires : absence d'erreur JavaScript, interactions tactiles et principaux parcours utilisateur. Une modification n'est pas terminee parce que le code semble correct ; elle l'est apres les validations adaptees et sans regression connue.

## Fonctionnalites realisees (phase 1)

- Ecran d'accueil mobile avec bouton pour lancer une partie.
- Demarrage d'une partie avec selection aleatoire parmi les questions en memoire.
- Ecran de jeu avec question, score initial a zero et emplacement visuel reserve a la photo.
- Compte a rebours visible de 30 secondes, avec pause, reprise et redemarrage de la meme question.
- Partie multi-joueurs avec tours alternes, total, points gagnes et meilleure performance.
- Indices progressifs automatiques, avec penalite de score apres le premier indice apparu.
- Atelier en memoire de creation, previsualisation jouable et export de questions.
- Synchronisation disponible entre le timer et un moteur de revelation attache.
- Bouton de nouvelle partie.
- Structure modulaire prete a evoluer.

Cette section doit etre mise a jour a chaque fonctionnalite livree.

## Architecture cible connue

Les elements suivants sont prevus mais non developpes : modes de revelation supplementaires, gestion complete des questions et, potentiellement, persistance distante des donnees.

## Moteur de revelation

Le moteur reste independant des questions, du score, de l'interface et de la persistance. Son API actuelle recoit un `canvas` et une configuration contenant `image`, `durationSeconds`, `mode`, `columns`, `rows`, `seed` et `zones`. Il expose `start()`, `pause()`, `stop()`, `reset()`, `update()`, `resize()`, `render()`, `getState()` et `destroy()` ; `setElapsed()` reste disponible comme alias de compatibilite.

Le mode `mosaic` masque l'image en grille, revele les cases selon une progression basee sur le temps reel et utilise une graine pour produire un ordre pseudo-aleatoire reproductible. Lors d'une session, le nombre de colonnes depend de la duree : 10 colonnes a une minute, puis une densite progressive en racine carree, plafonnee a 40 colonnes. Les parties longues utilisent donc des carres plus petits sans cout de rendu excessif. `calculateMosaicPriorities(rows, columns, zones)` attribue une priorite a chaque case, puis `generateRevealOrder(rows, columns, seed, zones)` construit l'ordre pondere. Les zones `main` sont fortement retardees sans etre limitees a la fin, les zones `secondary` apparaissent progressivement, et les cases normales peuvent apparaitre des le debut.

Le mode `blur` applique un flou global qui diminue selon la progression. Les polygones `main` et `secondary` sont redessines avec un flou supplementaire ; la zone principale reste donc moins lisible pendant la premiere partie de la revelation, puis devient nette a la fin. Les zones utilisent des polygones `points`, normalises ou en pixels image. Le canvas peut etre redimensionne sans deformer le ratio de l'image et evite les redraws lorsque le nombre de cases revelees est inchange. Lorsque `prefers-reduced-motion` est actif, la mosaïque reste masquee et le flou reste maximal jusqu'a la revelation finale.

Le mode `bands` masque completement l'image puis revele des bandes horizontales rectangulaires. `generateBandRevealOrder(rows, columns, seed, zones)` derive la priorite de chaque bande a partir des priorites de ses cases : les bandes contenant une zone `main` sont retardees, tandis que les bandes normales et secondaires peuvent apparaitre plus tot. L'ordre reste pseudo-aleatoire, reproductible et pilote par la meme progression temporelle que les autres modes. L'editeur de zones, les modes projecteur, zoom et niveaux de gris vers couleur ne sont pas implementes.

## Gestion du temps

`timer.js` est la source de verite du compte a rebours. Il calcule le temps reel ecoule avec `performance.now()` ; `requestAnimationFrame` ne sert qu'a planifier les mises a jour. `game.js` recoit cet etat et transmet les millisecondes ecoulees a un moteur attache via `update()`. A la fin, le timer s'arrete et le moteur est rendu a sa progression complete. Le moteur peut aussi etre utilise seul avec sa propre animation.

## Session de jeu

L'ecran initial est une configuration de session. Il permet de saisir une duree entiere de 0 a 23 heures et de 0 a 59 minutes, avec un minimum d'une minute. Cette valeur est convertie en secondes, transmise a `game.startSession()` et prime sur `durationSeconds` du `question.json`, qui reste une valeur de repli pour les anciennes utilisations et la previsualisation. Le compteur affiche les heures au format `HH:MM:SS` lorsque la duree les requiert.

La liste de questions est fournie exclusivement par `getContentQuestions()`, donc par les entrees effectivement chargees depuis `content/index.json`. Le bouton « Aléatoire » choisit une de ces entrees sans liste d'images codee en dur. Sans contenu catalogue, le lancement est desactive et l'atelier reste disponible pour preparer un export.

Avant de choisir une question precise ou « Aléatoire », la configuration permet de choisir `mosaic`, `blur` ou `bands`. Ce choix est conserve lorsque la question aleatoire est tiree et prevaut sur le mode enregistre dans la question pour la session. Lors du lancement, `ui.js` appelle l'API Fullscreen depuis l'action utilisateur puis lance aussitot la session. Une absence, une sortie manuelle ou un refus de plein ecran est ignore : la session reste jouable. En plein ecran, le canvas conserve le ratio complet de l'image, avec son haut et son bas visibles, et le temps restant est affiche discretement en surimpression en haut a droite. La partie suit les phases `PLAYING`, `PAUSED`, `TIME_UP` et `ANSWERED`, une seule valeur qui evite des booleens contradictoires. Un appui tactile ou un clic sur le canvas pendant `PLAYING` met le timer en pause et ouvre une modale de reponse avec focus au-dessus de l'image. Pendant `PAUSED`, un appui sur l'image ne relance rien ; la croix de la modale annule la proposition, ferme la modale et appelle `resumeReveal()` pour reprendre le timer et la revelation au temps fige. Une mauvaise reponse conserve la modale. A zero, `TIME_UP` rend l'image entierement revelee, arrete le timer definitivement et conserve la saisie disponible sans croix de reprise. Une bonne reponse mene a `ANSWERED`, bloque toute validation supplementaire et propose « Nouvelle partie » pour revenir a la configuration.

## Score et joueurs

`scoring.js` expose `calculatePoints({ durationMilliseconds, remainingMilliseconds, hintUsed })`. Le calcul donne jusqu'a 600 points pour le temps restant et jusqu'a 300 points pour la part approximativement non revelee de l'image, puis retire 150 points lorsqu'au moins un indice est apparu ; un score ne peut pas etre negatif. La part revelee est deduite du meme ratio temps restant/duree, sans lecture ni dependance au moteur canvas.

Avant le lancement, les prenoms peuvent etre saisis, separes par une virgule ou un retour a la ligne. `game.js` attribue les points uniquement a la bonne reponse, conserve le total de chaque joueur et passe au joueur suivant apres une question terminee. L'interface affiche le total de la partie, la meilleure performance courante et les points gagnes pour la question.

## Zones de l'image

Le modele cible devra pouvoir definir des zones normale, secondaire et principale. La zone principale est generalement celle qui permet d'identifier directement la reponse. Le moteur devra exploiter ces priorites afin de ne pas reveler trop vite la reponse. L'editeur de zones est prevu ulterieurement.

## Donnees des questions

Le modele actuellement implemente dans `questions.js` est :

```js
{
  id,
  title,
  category,
  image,
  answer,
  acceptableAnswers,
  durationSeconds,
  revealMode,
  zones,
  hints,
  explanation,
  discovery
}
```

`QUESTION_CATEGORIES` contient les categories initiales : `monde`, `personnalites`, `art`, `monuments`, `animaux`, `histoire`, `sciences` et `culture`. Les `acceptableAnswers` sont des variantes normalisees, par exemple `tour eiffel` et `la tour eiffel`. Les titres et reponses ne sont pas affiches pendant la revelation afin de ne pas divulguer la solution. Les donnees restent strictement locales ; Supabase n'est pas integre.

Le champ optionnel `discovery` peut contenir `summary`, `facts`, `date`, `location` et `surprisingFact`. L'interface affiche uniquement les champs effectivement renseignes, sans generer ni completer automatiquement de contenu.

`hints` contient une liste d'objets `{ afterSeconds, text }`. Chaque indice devient visible lorsque le temps reel ecoule atteint `afterSeconds`, reste affiche ensuite et ne bloque jamais la saisie de reponse. Les textes simples restent lus comme des indices immediats pour compatibilite avec les anciennes donnees locales.

Le formulaire requiert une image, un ID, un titre, une reponse, une explication et une zone principale d'au moins trois points ; les zones secondaires et les indices restent facultatifs. Les zones sont stockees comme polygones normalises `{ type, points }` directement compatibles avec `reveal.js`.

## Atelier de creation

L'accueil permet d'ouvrir « Créer une photo mystère ». L'atelier suit les etapes image, ID, titre, reponse, reponses acceptees, categorie, duree, mode de revelation `mosaic`, `blur` ou `bands`, zones, indices et explication. Les reponses acceptees sont saisies dans un unique champ multiligne et separees par des points-virgules ; les retours a la ligne sont aussi toleres. Elles sont exportees comme tableau `acceptableAnswers`. Les indices y sont saisis une ligne par indice au format `secondes | texte`. Le bouton de previsualisation passe par `game.startQuestion()` et lance une partie reelle sans modifier le brouillon ; le retour a l'atelier annule proprement son timer.

`zone-editor.js` fonctionne avec la souris et le tactile, sans survol : un clic simple dans une zone ajoute un point a cette zone ; un appui suivi d'un glissement deplace la zone, et un glissement de l'un de ses points la redimensionne. Une nouvelle zone est creee vide et devient une surface a partir de son troisieme point ; tant qu'elle est incomplete, ses clics sont prioritaires, meme au-dessus d'une autre zone. Le bouton « Supprimer le dernier point » retire le dernier point de la zone selectionnee et reste desactive lorsqu'elle est vide. Les zones peuvent etre supprimees ou converties entre `main`, `secondary` et `normal`.

Le bouton « Télécharger le contenu » telecharge une archive `<id>.zip`. L'image source est convertie en JPEG dans le navigateur et l'archive contient exactement `<id>/image.jpg` et `<id>/question.json`, dont le JSON reference `"image": "image.jpg"`. Le lien temporaire est attache au document pendant le clic et son URL `blob:` n'est liberee qu'une seconde plus tard, pour laisser le navigateur lancer le telechargement. Le ZIP peut etre decompresse directement dans `content/`. Aucun brouillon n'est enregistre dans `localStorage`, une base de donnees ou un serveur ; un rafraichissement avant export peut donc effacer le brouillon, volontairement.

`zip.js` utilise le format ZIP standard sans compression, suffisant pour grouper les deux fichiers tout en evitant une bibliotheque, un CDN ou un outil de build. L'ID est limite aux minuscules, chiffres et tirets afin de produire un nom de dossier et un nom de fichier ZIP portables. En cas d'erreur de conversion ou d'archivage, aucun telechargement n'est declenche et le brouillon reste disponible dans l'editeur.

La structure de contenu attendue est :

```text
content/
  index.json
  tour-eiffel/
    image.jpg
    question.json
```

`content/index.json` contient la liste explicite des chemins relatifs vers les fichiers `question.json`, par exemple `["tour-eiffel/question.json"]`. Le chargeur construit le chemin de l'image depuis le dossier de chaque question.

Le `question.json` exporte contient au minimum `id`, `title`, `category`, `image`, `answer`, `acceptableAnswers`, `durationSeconds`, `revealMode: "mosaic"`, `zones`, `hints` et `explanation`.

## Reponses

`answers.js` normalise les propositions en minuscules, supprime les accents et les espaces superflus, puis ignore les articles initiaux `le`, `la` et `les`. `game.js` ne revele la reponse et l'explication qu'apres une proposition correcte ou a l'expiration du temps. Une reponse incorrecte affiche un retour simple et laisse le compte a rebours continuer.

## Indices progressifs

`game.js` interroge `hints.js` a chaque mise a jour du timer et conserve les indices dont les seuils sont atteints. L'interface les affiche dans l'ordre, avec une annonce accessible, sans action manuelle et sans interrompre la recherche. Le score est penalise une seule fois si au moins un indice a ete revele avant la bonne reponse.

## Fiches pedagogiques

Apres la fin d'une question, `ui.js` affiche une fiche « À découvrir » si `discovery` est renseigne. Elle montre l'image complete, le titre, la categorie, le resume et, lorsque les donnees existent, les faits, la date, le lieu et l'information etonnante. Elle ne doit jamais etre affichee apres une reponse incorrecte tant que la partie continue.

## Principes de developpement

Privilegier simplicite, lisibilite, modularite, reutilisation du code existant, performances mobiles, accessibilite et evolutivite. Eviter la duplication, la complexite, les dependances et les modifications globales non necessaires.

## Preservation de l'existant

Avant une modification importante, analyser le code concerne et identifier les modules touches. Ne modifier que le necessaire, verifier les imports, les evenements et les interactions entre modules, puis tester les fonctionnalites existantes impactees.

## Regles pour GitHub Copilot

### Avant de modifier le code

1. Lire `AI_CONTEXT.md`.
2. Examiner le code existant concerne.
3. Verifier si la fonctionnalite existe deja.
4. Identifier les dependances avec les autres modules.
5. Identifier les fonctionnalites susceptibles d'etre impactees.
6. Identifier les tests necessaires.
7. Respecter les decisions d'architecture documentees.

### Pendant la modification

- Ne pas reecrire inutilement le projet ni creer de duplication.
- Ne pas modifier des fonctionnalites non concernees.
- Ne pas introduire de framework sans demande explicite.
- Respecter la contrainte mobile first.
- Conserver ou ameliorer la testabilite du code.

### Apres la modification

1. Executer les tests pertinents.
2. Verifier la nouvelle fonctionnalite et les fonctionnalites existantes impactees.
3. Verifier les erreurs JavaScript, les imports et le comportement mobile.
4. Corriger les regressions eventuelles.
5. Mettre a jour ce document si l'architecture, les fonctionnalites, les tests ou les decisions changent.

Une tache n'est terminee que lorsque les tests necessaires ont ete realises et qu'aucune regression connue n'est presente.

## Historique des fonctionnalites et tests

| Statut | Element | Tests et verifications |
| --- | --- | --- |
| Termine | Phase 1 : accueil, lancement et nouvelle partie, question en memoire, score initial, emplacement de photo | Verification manuelle ; aucun test automatise existant |
| Termine | Moteur de revelation canvas : mode mosaïque autonome, configurable et pondere par zones | Diagnostic JavaScript de l'editeur ; test navigateur avec image de test, progression, seed, ratio, mouvement reduit et priorites de zones |
| Termine | Mosaïque adaptee a la duree de session | Test navigateur de la densite : 10 colonnes a 1 minute, 20 a 4 minutes et plafond de 40 a 16 minutes |
| Termine | Moteur de revelation canvas : mode flou pondere par zones et selecteur de mode | Diagnostic JavaScript de l'editeur ; test navigateur du flou, de la zone principale et du selecteur a 320 px |
| Termine | Moteur de revelation canvas : mode bandes pondere par zones | Diagnostic JavaScript de l'editeur ; test navigateur des bandes, de la seed, de la zone principale et du selecteur a 320 px |
| Termine | Modele local complet de question et categories initiales | Diagnostic JavaScript de l'editeur ; verification navigateur des 11 champs, des categories et du parcours a 320 px |
| Termine | Formulaire de reponse, normalisation et ecran de reussite | Diagnostic JavaScript de l'editeur ; test navigateur des erreurs, variantes accentuees, timer, revelation finale et explication |
| Termine | Fiche pedagogique « À découvrir » pilotee par les donnees | Diagnostic JavaScript de l'editeur ; test navigateur de l'absence apres erreur, puis de l'image, du titre, de la categorie, du resume, des faits et des champs optionnels |
| Termine | Score independant et partie multi-joueurs | Diagnostic JavaScript de l'editeur ; test navigateur a 320 px avec deux joueurs, points gagnes, total, meilleure performance et alternance |
| Termine | Indices progressifs automatiques | Diagnostic JavaScript de l'editeur ; test navigateur a 320 px du formulaire actif et des seuils 19, 20, 35 et 45 secondes |
| Remplace | Atelier initial de creation locale | Remplace par l'editeur de zones et l'export sans persistance de la phase 3 |
| Termine | Phase 3 : editeur de zones et export ZIP du contenu | Diagnostic JavaScript de l'editeur ; test navigateur a 320 px de la creation, selection, type, suppression, coordonnees normalisees, previsualisation et archive ZIP avec JPEG/JSON ; ouverture de format ZIP standard par `ZipArchive` |
| Termine | Compte a rebours, pause/reprise et redemarrage de question | Diagnostic JavaScript de l'editeur ; parcours mobile verifie a 375 x 812 px |
| Termine | Phase 4 : configuration de session, catalogue, pause image et saisie | Tests navigateur du catalogue simule, de la duree personnalisee, du toucher, de la normalisation, de la fin de temps et du chargeur ; refus de plein ecran non bloquant |
| Termine | Phase 4B : ecran de jeu et machine d'etat explicite | Test navigateur et test deterministe de `PLAYING`, `PAUSED`, `TIME_UP`, `ANSWERED`, de la revelation complete et de la reponse apres expiration |
| Termine | Modale de proposition et annulation | Test navigateur mobile de la modale superposee, du focus, de la croix, de sa fermeture et de la reprise du chrono |
| Termine | Retrait du dernier point de zone | Test navigateur de trois points ramenes a deux et bouton desactive sur une zone vide |
| Manquant | Tests automatises | A introduire progressivement lorsque les comportements stabilises le justifieront |

## Decisions d'architecture

| Date | Decision | Raison | Consequences |
| --- | --- | --- | --- |
| 2026-09-18 | Application statique en HTML, CSS et modules JavaScript natifs | Fonctionnement direct dans le navigateur, sans outil ni dependance | Conserver des imports relatifs et un chargement via `type="module"` |
| 2026-09-18 | Etat de jeu, score, questions, revelation et interface separent dans des modules locaux | Garder un socle simple et evolutif | Toute nouvelle responsabilite doit rejoindre le module le plus approprie ou un module clairement justifie |
| 2026-09-18 | Interface pensee d'abord pour smartphone | Le mobile est le support principal du jeu | Tester les parcours et dimensions interactives en petite largeur avant le bureau |
| 2026-09-18 | Moteur de revelation canvas independant avec mode mosaïque | Isoler le rendu progressif des regles du jeu et preparer les futurs modes | L'UI devra lui fournir un canvas et une image chargee, sans lui transmettre questions ou score |
| 2026-09-18 | `timer.js` est la source de verite du temps et synchronise le moteur par `update()` | Eviter une progression basee sur les frames et separer le temps du rendu | `game.js` coordonne les deux modules ; pause et redemarrage repartent du meme etat temporel |
| 2026-09-18 | API mosaïque configurable avec `update()` et ordre exporte | Rendre le moteur pilotable par temps reel et testable sans l'interface | `game.js` utilise `update()` ; les zones sont reservees a une evolution ulterieure |
| 2026-09-18 | Ordre mosaïque pondere par priorites de zones | Retarder le sujet principal tout en permettant des indices progressifs | `zones` accepte des polygones `main` et `secondary` ; l'editeur reste a developper |
| 2026-09-18 | Mode `blur` ajoute au registre avec la meme API que `mosaic` | Permettre le choix de revelation sans coupler `game.js` aux details de rendu | Le mode est stocke comme valeur generique dans `game.js` et choisi par un selecteur natif |
| 2026-09-18 | Mode `bands` ajoute au registre avec la meme API que les autres modes | Introduire des revelations rectangulaires utilisant les priorites existantes | Les bandes horizontales sont ordonnees par priorite et seed, sans modifier `game.js` |
| 2026-09-18 | Questions locales adopte le modele complet de photo mystere | Preparer image, zones, indices et variantes de reponse sans ajouter de persistance | Les reponses acceptees et une illustration de demonstration sont stockees localement |
| 2026-09-18 | Validation de reponse isolee dans `answers.js` | Rendre la comparaison reutilisable et independante de l'interface | `game.js` traduit le resultat en etat de partie et pilote l'arret du timer |
| 2026-09-18 | Fiche « À découvrir » stockee dans `discovery` | Enrichir progressivement chaque question sans faire deduire de contenu par l'interface | Seuls les champs explicitement definis sont affiches apres la fin de partie |
| 2026-09-18 | Score multi-joueurs isole dans `scoring.js` | Calculer les points sans dependance au rendu de revelation | `game.js` fournit les donnees de temps et d'indice ; le canvas ne transmet aucune donnee de score |
| 2026-09-18 | Indices temporels isoles dans `hints.js` | Faire apparaitre plusieurs indices sans coupler leur regle a l'interface ou au moteur canvas | `game.js` transmet le temps ecoule et applique une penalite unique lorsque des indices sont visibles |
| 2026-09-18 | Suppression du stockage `localStorage` des brouillons | Respecter l'export de fichiers sans persistance navigateur de la phase 3 | Un rafraichissement peut effacer le brouillon non exporte ; les fichiers exportes deviennent la source de contenu |
| 2026-09-18 | Zone editor isole et export sans persistance | Preparer des fichiers portables sans coupler l'edition au jeu ni enregistrer de brouillon | `zone-editor.js` gere les polygones, `ui.js` exporte et `content-loader.js` charge un catalogue explicite |
| 2026-09-18 | Export unique en ZIP sans dependance | Fournir un dossier de question directement decomposable dans `content/` | `zip.js` cree `<id>.zip` avec `<id>/image.jpg` et `<id>/question.json` |
| 2026-09-18 | Duree de revelation definie par la session | Permettre une meme question jouee sur des durees differentes | `game.startSession()` recoit la duree choisie et le timer comme le canvas utilisent cette valeur |
| 2026-09-18 | Selection de session limitee au catalogue de contenu | Ne jamais presenter une image inexistante ou une liste codee en dur | `ui.js` lit `getContentQuestions()` apres le chargement de `content/index.json` |
| 2026-09-18 | Machine d'etat de jeu explicite | Distinguer pause, fin de temps et resultat sans etats contradictoires | `GAME_PHASES` controle les transitions et les interactions admises dans `game.js` et `ui.js` |