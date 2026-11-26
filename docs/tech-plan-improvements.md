# Tech plan : paysage, vagues, boss, UI et effets visuels

Base : branche `test_eval_arena`. Ces changements sont sur la branche `improvements`, hors évaluation.

## 1. Affichage paysage
`main.ts` passe en 1920x1080 avec le même mode `Scale.FIT` dans son conteneur : pas de plein écran.
L'arène devient 4700x3400. Le menu d'accueil se place avec `scale.height`.

## 2. Vagues (`waves.json`, `WaveManager`)
Pas de menu de niveau : la partie enchaîne des vagues. Chaque vague liste des ennemis (`type`, `count`) et un `boss` optionnel.
`WaveManager` annonce la vague, fait spawn les ennemis en respectant le `spawn.delay` et le `spawn.maxActive` de chaque ennemi
(`enemies.json`), puis le boss une fois tout le monde mort, et passe à la vague suivante quand le boss est tué.
Après la dernière vague, la liste recommence avec 50 % d'ennemis en plus par tour (`WAVE_LOOP_COUNT_SCALING`).
La difficulté multiplie aussi le nombre d'ennemis (`waveCountMultiplier`).
`WaveManager` ne connaît que l'interface `WaveSpawner` (implémentée par `EntityManager`) et émet `WAVE_STARTED_EVENT`.

## 3. Boss (`bossMothership` dans `enemies.json`)
Même classe `Enemy`, piloté par la config : sprite dédié (grand, indigo / orange / turquoise), 40 PV, immobile face aux autres
ennemis, anneau de 16 balles sur 360°, mouvement lent en sinusoïde. `stopDistance` l'empêche de foncer sur le joueur.
Sans `shootAnimation`, il gonfle brièvement avant de tirer pour prévenir le joueur. Toucher un boss le blesse de 1 PV au lieu de le détruire.

## 4. Interface
Cœurs pleins / vides (`heartFull`, `heartEmpty`) à la place de « x3 » : le nombre de cœurs suit la vie max (difficulté).
Numéro de vague, bannière d'annonce (« BOSS » en plus pour une vague de boss), barre de vie du boss.
La police bitmap du jeu ne contient que les chiffres : les textes utilisent la police TTF `future`.

## 5. Effets visuels (`EffectsManager`)
Les entités émettent des événements de scène (`ENTITY_DIED`, `ENTITY_DAMAGED`, `BULLET_FIRED`, `BULLET_HIT`, `BULLET_TRAIL`),
`EffectsManager` les écoute : les entités ne connaissent pas les particules.
- Mort d'un ennemi ou du joueur : animation d'explosion rose (`explosionPink`, mélange additif) et éclats ; le boss ajoute flash blanc et secousse.
- Impact d'une balle : étincelles et flash. Dégât reçu par le joueur : flash rouge de l'écran et éclats.
- Tirs : petit flash à la bouche du canon, traînée derrière chaque balle.
- Un émetteur de particules par effet et par couleur, explosions réutilisées via un pool de 32.

## Points d'attention
- Le flash et les secousses de caméra peuvent fatiguer : `onEntityDamaged` et `onEntityDied` les centralisent pour les régler.
- `explosionPink.png` vient d'une image fournie par l'élève : vérifier les droits avant de publier.
- Pas de test automatisé du gameplay : playtest manuel (navigateur headless très lent, délais raccourcis sur une copie du build).

## Playtest manuel
`npm run dev`, SPACE. Vague 1 : 8 ovnis rouges. Vague 3 : après les ovnis, le boss avec sa barre de vie. Mourir ou tuer le boss déclenche explosions et secousses.
