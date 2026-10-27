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

Il n'y a pas d'affiches WebP de chargement générées : la phase 6 facultative est différée.

## Après correction des berges et du cadrage — 27 octobre 2026

Nouvelle mesure production, mêmes 1440×900/DPR 1 et RTX 4070 SUPER :
2 407 échantillons GPU, médiane 2.607 ms, p95 4.259 ms ; 239.77 FPS sur 10 secondes.
Les rapports de cette passe sont `docs/validation/chrome-fixes-dev.json` et
`chrome-fixes-prod.json`. Les mesures initiales ci-dessus restent celles de la phase 5.
Le portrait 390×844 conserve une caméra 55°/FOV 40°, une mare large et un rayon de
granulé supérieur à 3.5 px CSS. Aucun test sur téléphone physique n'est revendiqué.
