# Tech plan : ennemi rose sinusoïdal + spread shot + niveaux de difficulté (version arena)

Base : le jeu « arena » (monde plus grand que l'écran, caméra qui suit le joueur, ennemis qui poursuivent le joueur).

## Objectif
Un nouvel ennemi qui se déplace en sinusoïde, tire en éventail, avec spawn, mouvement et tir réglables via JSON,
visuellement différent de l'ovni rouge. En bonus : trois niveaux de difficulté choisis dans le menu.

## Config JSON (`public/assets/Data/`)
`enemies.json`, une entrée par type d'ennemi, typée par `src/gameData/EnemyData.ts` :

| Bloc       | Rôle                                                                              |
|------------|-----------------------------------------------------------------------------------|
| `spawn`    | `delay` (ms entre deux spawns), `maxActive` (ennemis vivants de ce type)            |
| `movement` | `speed` (vers le joueur), `sine` optionnel : `amplitude` (px), `frequency` (Hz)    |
| `weapon`   | optionnel (sans arme, l'ennemi poursuit seulement) : délai de tir, `bullet`, `spread` |
| `tint`     | couleur hex qui distingue l'ennemi sans nouveau sprite                              |

`spread` : `{"count": 3, "angle": 30}` ou `{"count": 60, "angle": 360}`.

`difficulties.json` (typé par `DifficultyData.ts`) : `easy`, `normal`, `hard`, avec `spawnDelayMultiplier`,
`maxActiveMultiplier`, `enemySpeedMultiplier`, `bulletSpeedMultiplier`, `playerHealth`.

## Architecture (Entity / Composants)
- `SineMovement` : l'ennemi poursuit le joueur, la sinusoïde est un décalage perpendiculaire à la direction de poursuite.
  On applique la variation du décalage à chaque frame (indépendant du framerate). `reset()` à chaque réutilisation du pool.
- `Weapon.shootSpread(source, spread, direction?)` : répartit `count` balles de façon uniforme autour de la direction.
  À 360° on divise par `count` pour ne pas doubler la balle où l'éventail se referme.
- `Enemy.init(bullets, target, data)` construit ses composants depuis `EnemyData` (`SineMovement` et `Weapon` seulement si définis).
- `EntityManager` crée un groupe poolé et un timer de spawn par entrée du JSON. Ajouter un ennemi = ajouter une entrée.
  `Player.setTargets` accepte maintenant une liste de groupes (visée automatique sur tous les types).
- Difficulté : `DifficultyUtils.scaleEnemyData` renvoie une copie mise à l'échelle des données d'ennemi, le cache JSON reste intact.
  Le choix est dans le registry (`RegistryConstants.Keys.DIFFICULTY`) et sauvegardé via `SaveManager`. `HomeScene` change
  la difficulté avec GAUCHE / DROITE. Pas de dépendance logique vers l'UI.

## Points d'attention
- Pooling : `enable()` remet vie, teinte, drapeau de hit et onde sinus à zéro.
- Flash blanc au hit : `clearTint()` effaçait le rose et `isTinted` ralentissait l'ennemi touché (toujours vrai avec une teinte
  permanente) : remplacés par `_isHit` et `applyBaseTint()`.
- Pool de balles ennemies de 256 : `get()` renvoie `null` quand il est vide, les balles en trop sont perdues sans crash.
- L'ovni rouge garde son comportement (poursuite, sans arme), simplement décrit dans le JSON.

## Plan de commits
1. Add spread shot to Weapon component
2. Add SineMovement component
3. Load enemies from enemies.json instead of hardcoded values
4. Add pink sine enemy with spread shot
5. Scale enemies and player health with a difficulty from difficulties.json
6. Let the player pick the difficulty in the home menu

## Playtest manuel
- `npm run dev`, choisir la difficulté avec GAUCHE / DROITE, SPACE pour lancer.
- Ovnis rouges : poursuivent le joueur sans tirer. Ovnis roses : poursuivent en serpentant, tirent 5 balles roses sur 60°, 2 PV.
- Easy : 5 vies, moins d'ennemis, plus lents. Hard : 2 vies, plus d'ennemis, plus rapides. Le choix est conservé après rechargement.
- Test de config sur une copie du build : `{"count": 24, "angle": 360}` donne un cercle régulier.
- `npm run build-nolog` passe.
