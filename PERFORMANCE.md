# Mesures et limites — 27 octobre 2026

La mare fonctionne et les contrôles d'intégration ci-dessous passent.
La qualification « portable moyen » et l'objectif strict de zéro allocation restent ouverts.

## Conditions de mesure

- Build de production Next.js 16.4.3, servi par `next start` sur 127.0.0.1:3001.
- Chrome Windows 156.0.8078.49 en instance headless isolée, WebGL2 matériel via ANGLE / Direct3D11.
- GPU identifié : **NVIDIA GeForce RTX 4070 SUPER**.
- Viewport et buffer : **1440 × 900**, DPR 1, échelle de rendu **1.00**.
- À cette surface, World crée 5 adultes + 2 jeunes ; aucun granulé pendant la capture ambiante.
- Préchauffage 3 s, capture comparable 10 s ; 2 407 échantillons GPU.
- Chronomètre `EXT_disjoint_timer_query_webgl2` autour de toute la chaîne de rendu.
- La capture intercepte seulement la lecture des résultats des requêtes GPU ;
  les draw calls restent natifs et le chronomètre reste actif.
- Chrome Performance trace et sampling d'allocations à intervalle de 16 KiB.
  Le profilage ajoute son propre coût ; ces chiffres ne sont pas un benchmark sans instrumentation.

## Résultats de la dernière capture

| Mesure | Médiane | p95 |
| --- | ---: | ---: |
| GPU, scène + eau + peinture + cellules + final | **2.736 ms** | **3.674 ms** |
| Intervalle entre images | **4.20 ms** | **4.30 ms** |
| Callback CPU `PondEngine.frame`, trace Chrome | **0.315 ms** | **0.505 ms** |

Rythme moyen observé : **239.97 images/s**, sur un affichage local à cadence élevée.
Maximum observé du callback CPU : 1.990 ms.
Cela dépasse l'objectif 60 FPS sur **ce GPU**. Ce résultat ne démontre pas les 60 FPS
ou les <10 ms GPU sur un portable moyen, un mobile réel ou un autre pilote.
Le Scaler conserve la logique d'Ardia ; ses décisions sont testées face à l'original.

## Allocations : contrôle effectué, objectif strict non atteint

Première trace comparable : 59 événements GC (`MinorGC`/`MajorGC` complets), 12.795 ms cumulées,
dont un maximum de 2.981 ms. Le profil attribuait environ 235.9 Mo au chemin de déformation
`update` et 117.3 Mo à ses appels `Math.hypot`, sous sampling sur dix secondes.

Corrections effectuées :

- Remplacement des `filter()` du World par compaction stable en place.
- Suppression du tableau temporaire des distances aux bords des boîtes.
- Paramètres de corps, profils, sinus/cosinus, indices et fractions précalculés.
- Tangentes calculées une fois par segment, réutilisées pour tous les sommets.
- Couleurs du ciel préparées une fois, sans parser des chaînes CSS dans la boucle.
- Tri des objets Three désactivé : les matériaux de scène sont opaques, le depth buffer tranche.
- GpuClock : quatre requêtes réutilisées et libérées, plus de création de requête par image.
- Scaler : fenêtres typées fixes, médiane sans copie de tableau.
- Mesures DOM sorties du callback de rendu, effectuées à cadence limitée.

Dernière trace : **6 événements GC**, **4.092 ms cumulées**, maximum **2.630 ms**.
Estimation totale issue du profil d'allocations : environ **37.4 Mo/10 s**.
Ce sont des estimations du profiler, pas des octets de fuite mémoire.
Les gros chemins de déformation et de parsing couleur ont disparu du haut du profil.
Il reste notamment des allocations attribuées à `World.stepKoi`, aux nombres manipulés
par le moteur JS et aux fonctions internes de Three (uniformes, binding et rendu).
Les événements nourriture/ondes/bouchées créent aussi encore de petits objets.

**Aucune garantie de zéro allocation ni de zéro GC.** Réécrire le stockage du World et les
internes de Three pour poursuivre cet absolu dépasserait le portage fidèle demandé.
Critère pratique proposé pour une prochaine qualification : absence de création de géométrie,
texture ou gros buffer dans la boucle, mémoire stable et budget p95 CPU/GPU mesuré sur le
portable cible. Le critère strict demandé reste signalé comme non satisfait.

## Contrôles d'intégration Chrome

Les dix scénarios du script `scripts/validate.mjs ... dev` passent, sans erreur console :

1. Deux attachments MRT complets et clic de nourrissage.
2. Pause debug : temps de simulation figé.
3. Changement reduced motion en direct : image figée et nourrissage bloqué.
4. Chargement initial reduced motion : exactement 240 pas à 1/60 s, puis arrêt.
5. `visibilitychange` : arrêt et reprise de RAF. Test avec propriété `document.hidden` simulée,
   pas avec une minimisation physique de la fenêtre.
6. IntersectionObserver réel : canvas déplacé hors viewport, puis remis en place.
7. Perte/restauration réelle du contexte via `WEBGL_lose_context` : secours puis rendu restauré.
8. Portrait 390 × 844 : 3 koï ; tap tactile émulé qui nourrit sans activer la curiosité au survol.
9. Destruction explicite du moteur et suppression de sa référence de diagnostic.
10. WebGL2 indisponible : dégradé conservé, moteur non démarré.

Production : panneau absent du DOM et ses chaînes/référence `__pond` absentes des chunks produits.
La pause physique d'un onglet, le tactile matériel, Safari/Firefox et une vraie navigation Next
avec montage/démontage de page restent à qualifier séparément.

## Reproduction et preuves

```powershell
npm run dev
node scripts/validate.mjs http://127.0.0.1:3000 dev
npm run build
npm run start -- --port 3001
node scripts/validate.mjs http://127.0.0.1:3001 prod
```

Le script utilise un profil Chrome jetable local, jamais le profil personnel.
Résultats détaillés : `docs/validation/chrome-dev.json` et `chrome-prod.json`.
Artefacts locaux ignorés par Git :

- `artifacts/validation-prod/performance-trace.json` : importable dans Chrome Performance.
- `artifacts/validation-prod/allocations.heapprofile` : importable dans Chrome Memory.
- `artifacts/validation-prod/production-final.png` : rendu de production.
- `artifacts/validation-dev/desktop-final.png`, `portrait-final.png`, `no-webgl2.png`.

Les affiches étaient différées à la phase 5 ; la phase 6 ci-dessous les fournit désormais.

## Après correction des berges et du cadrage — 27 octobre 2026

Nouvelle mesure production, mêmes 1440×900/DPR 1 et RTX 4070 SUPER :
2 407 échantillons GPU, médiane 2.607 ms, p95 4.259 ms ; 239.77 FPS sur 10 secondes.
Les rapports de cette passe sont `docs/validation/chrome-fixes-dev.json` et
`chrome-fixes-prod.json`. Les mesures initiales ci-dessus restent celles de la phase 5.
Le portrait 390×844 conserve une caméra 55°/FOV 40°, une mare large et un rayon de
granulé supérieur à 3.5 px CSS. Aucun test sur téléphone physique n'est revendiqué.

## Après espacement et ombrage — 27 octobre 2026

Même protocole de production 1440×900/DPR 1 sur RTX 4070 SUPER : 2 409 échantillons,
GPU médian 2.748 ms, p95 3.658 ms, 239.97 FPS sur 10 secondes.
Rapports : `docs/validation/chrome-school-dev.json` et `chrome-school-prod.json`.
Les ombres de koï partagent leur géométrie animée et ajoutent une projection GPU par poisson.
Les ombres des feuilles restent analytiques ; aucun budget supplémentaire de shadow map.
Les contacts utilisent les buffers de colonne existants sans allocation par paire.

## Affiches de chargement — 28 octobre 2026

Les poids de cette section correspondent à la livraison initiale de la phase 6,
avant la végétation ajoutée ci-dessous ; le manifeste donne les poids courants.

13 fichiers générés depuis notre premier canvas prêt, sans UI ni textures externes.
Le navigateur télécharge une seule variante avec picture/srcset/sizes ; les fichiers sont
préencodés, sans réencodage Next au chargement. Sharp est un outil de génération en dev,
absent du code navigateur. La bibliothèque entière pèse 764.5 Kio ; un visiteur ne la charge pas entière.

| Cadrage source CSS | Largeurs WebP | Poids par fichier |
| --- | --- | --- |
| Ultralarge 2400×1000 | 1280, 1920, 2400 | 38.3–129.2 Kio |
| Paysage 1440×900 | 960, 1440, 1920 | 27.4–103.6 Kio |
| Intermédiaire 1024×900 | 768, 1280, 1600 | 23.9–92.5 Kio |
| Tablette 768×1024 | 768, 1200 | 28.5–68.1 Kio |
| Téléphone 390×844 | 390, 700 | 10.6–33.9 Kio |

Le manifeste src/pond/posters.json donne les tailles, empreintes et paramètres de capture.
Qualité WebP 70 pour tous les fichiers actuels, encodage borné par budget d'octets.
Les captures utilisent un profil Chrome isolé, avec preserveDrawingBuffer activé uniquement
dans l'outil. Les ressources affichées sur le site gardent leur configuration WebGL habituelle.

Pour régénérer après une modification visuelle, lancer `npm run dev`, puis dans un autre terminal :

```powershell
npm run posters -- http://127.0.0.1:3000/
npm test
npm run build
```

CHROME permet de remplacer le chemin de l'exécutable Chrome. Les fichiers générés sont
versionnés dans public/pond/ et src/pond/posters.json. Refaire le build après génération.

Validation Chrome : affiche avant moteur sous latence simulée de 400 ms, une requête WebP,
CLS < 0.001, fondu 600 ms, fondu désactivé en reduced motion, secours après perte de contexte
et sans WebGL2. Sans JavaScript, les cinq cadrages et leurs styles restent visibles en dev/prod.
Captures : artifacts/validation-dev/loading-poster.png, context-lost-poster.png,
no-js-wide.png et no-js-phone.png ; versions sans JS de production dans validation-prod/.

Nouveau profil production : 1440×900/DPR 1, RTX 4070 SUPER, 2 408 échantillons GPU,
médiane 3.265 ms, p95 4.483 ms ; 239.97 FPS sur 10 secondes.
Rapports : docs/validation/chrome-posters-dev.json et chrome-posters-prod.json.
Ces contrôles ne qualifient pas Safari, un téléphone physique ou un portable moyen.

## Cycle de 3 minutes, fleurs et algues — 28 octobre 2026

Horloge sur 24 h, un tour en 180 s de simulation active ; la pause et les règles de
visibilité/mouvement réduit figent aussi l'éclairage. Le réglage manuel du debug suspend
l'avance automatique, qui reprend depuis l'heure choisie. Les couleurs/vecteurs de lumière
sont précalculés et interpolés dans des objets réutilisés. Les fleurs et algues ajoutent
deux lots de rendu (3 156 triangles au total), avec déformation GPU et buffers statiques.

20 tests passent, dont un tour complet d'horloge en pas fixes, la continuité de minuit,
la validité des directions lumineuses et la génération répétable des plantes.
Chrome vérifie l'avance, la pause, le réglage manuel et le passage de minuit. Les quatre
phases sont capturées dans artifacts/validation-dev/cycle-{dawn,day,dusk,night}.png.
La luminance moyenne du rendu scène descend de 120.98/255 le jour à 55.25/255 la nuit,
en conservant les koï lisibles ; ce n'est pas une mesure photométrique physique.

Nouveau profil production 1440×900/DPR 1, RTX 4070 SUPER : 2 414 échantillons GPU,
médiane 2.826 ms, p95 3.678 ms ; 239.87 FPS sur 10 s.
Rapports : docs/validation/chrome-cycle-dev.json et chrome-cycle-prod.json.
Les affiches actualisées pèsent 799.9 Kio au total, dont un seul fichier est téléchargé :
11.5–34.5 Kio sur téléphone, 133.1 Kio maximum en ultralarge. Les budgets restent inchangés.
Elles représentent le premier état de jour ; la variation temporelle nécessite le moteur.
Les vérifications sur Safari, téléphone physique et portable moyen restent à effectuer.

## Soleil et lune réfléchis — 28 octobre 2026

Deux disques stylisés et agrandis pour la lisibilité : soleil doré, pleine lune texturée
par bruit et zones grises, sans texture externe. Le rayon réfléchi situe l'astre à partir
de la même direction que les ombres. Les ondes déforment son image et produisent des glints.
Une région de flux distincte protège le contour pendant les passes de peinture ;
les masques de scène limitent l'ajout à l'eau libre. Aucun draw call ni render target ajouté.

Validation avec/sans effet par lecture des pixels GPU : 129 493 pixels modifiés le jour,
65 385 la nuit, dont respectivement 8 353 et 6 338 pixels de disque ; aucun pixel modifié
sur les koï, les nénuphars ou les berges. Les captures montrent des disques reconnaissables.
Le reflet solaire traverse la mare entre 9 h et 15 h. Les portions proches de l'horizon
peuvent sortir du cadrage, notamment en portrait. Le cycle automatique reste de 3 minutes.

Profil production 1440×900/DPR 1 sur RTX 4070 SUPER : 2 434 échantillons,
GPU médian 2.609 ms, p95 4.344 ms, 239.97 FPS sur 10 s.
Rapports : docs/validation/chrome-reflections-dev.json et chrome-reflections-prod.json.
Affiches régénérées dans les budgets existants : téléphone 19.7–59.9 Kio,
maximum 159.7 Kio en ultralarge ; qualités adaptées de 48 à 62, 1 042.3 Kio au total,
un seul fichier chargé par visite. Les poids des sections précédentes sont historiques.
Safari, téléphone physique et portable moyen restent à qualifier.
