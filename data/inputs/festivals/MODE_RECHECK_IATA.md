# 🔍 Mode Re-vérification IATA - Guide d'utilisation

## 📖 Description
Ce mode permet de re-vérifier automatiquement si des codes IATA peuvent être trouvés dans `airport_Europe.csv` pour les villes présentes dans `missing_iata.csv`.

## 🚀 Utilisation

### Commande
```bash
node festival_found.js missingIATA
```

## 📋 Fonctionnement

1. **Charge `airport_Europe.csv`** : 713 villes européennes avec leurs codes IATA
2. **Lit `missing_iata.csv`** : Liste des villes sans IATA trouvé lors du scraping
3. **Re-vérifie chaque ville** : Compare avec `airport_Europe.csv`
4. **Si IATA trouvé** :
   - ✅ Génère l'URL Trip_URL
   - ✅ Ajoute l'événement au CSV mensuel correspondant
   - ✅ Retire la ligne de `missing_iata.csv`
5. **Si IATA non trouvé** :
   - ❌ La ligne reste dans `missing_iata.csv`

## 📊 Exemple de sortie

```
🔍 Mode RE-VÉRIFICATION activé : Recherche IATA pour missing_iata.csv
✅ Airport map chargé : 713 villes

🔍 RE-VÉRIFICATION des codes IATA...

   ✅ IATA trouvé pour "Paris" : PAR
      → Ajouté à January.csv avec Trip_URL
   ❌ Pas d'IATA pour "Milton Keynes" (Milton Keynes, United Kingdom)
   ❌ Pas d'IATA pour "Sanremo" (Sanremo, Italy)

📊 RÉSULTAT:
   ✅ 1 ville(s) avec IATA trouvé
   ❌ 17 ville(s) toujours sans IATA
```

## 🎯 Cas d'usage

### Scénario 1 : Après avoir ajouté un nouveau CSV airport
Si vous avez enrichi `airport_Europe.csv` avec de nouvelles villes :
```bash
node festival_found.js missingIATA
```

### Scénario 2 : Correction manuelle avec IATA_Manuel
Cette colonne est actuellement **ignorée** par le mode `missingIATA`. Pour l'utiliser :
1. Ouvrez `missing_iata.csv`
2. Ajoutez le code IATA dans la colonne `IATA_Manuel`
3. Lancez un scraping normal (par exemple : `node festival_found.js January`)
4. La fonction `reconcileMissingIata()` détectera l'IATA manuel et ajoutera l'événement au CSV

## 📝 Structure de missing_iata.csv

```csv
Titre,Date_Depart,Date_Retour,Ville,Mois,IATA_Manuel
"MKCF Moscow Festival","29 Jan","2 Feb","Moscow, Russia","January",""
```

- **Titre** : Nom complet de l'événement
- **Date_Depart** : Date de début (format : "DD Mon")
- **Date_Retour** : Date de fin (format : "DD Mon")
- **Ville** : Ville et pays (format : "Ville, Pays")
- **Mois** : Mois de l'événement en anglais
- **IATA_Manuel** : Code IATA ajouté manuellement (si disponible)

## ⚠️ Notes importantes

1. **Paris a été automatiquement trouvé** : Si vous voyez Paris dans `missing_iata.csv`, lancez `missingIATA` et il sera automatiquement trouvé car Paris est dans `airport_Europe.csv` avec le code `PAR`

2. **Villes proches** : Pour certaines villes sans aéroport direct, utilisez l'aéroport le plus proche :
   - Bedburg → Cologne (CGN)
   - Terrassa → Barcelona (BCN)
   - Sanremo → Nice (NCE)

3. **Le mode ne modifie que `missing_iata.csv` et les CSV mensuels** : Il n'effectue aucun scraping web

## 🔄 Différence avec reconcileMissingIata()

| Fonction | Déclenchement | Recherche IATA dans | Utilise IATA_Manuel |
|----------|--------------|---------------------|---------------------|
| `reconcileMissingIata()` | Au démarrage de tout scraping | ❌ Non | ✅ Oui |
| `recheckMissingIata()` | `node festival_found.js missingIATA` | ✅ airport_Europe.csv | ❌ Non |

## 💡 Workflow recommandé

1. **Scraping initial** : `node festival_found.js January`
   - Les événements avec IATA → `January.csv`
   - Les événements sans IATA → `missing_iata.csv`

2. **Re-vérification automatique** : `node festival_found.js missingIATA`
   - Cherche les IATA manquants dans `airport_Europe.csv`

3. **Correction manuelle** (si nécessaire) :
   - Ouvrir `missing_iata.csv`
   - Ajouter les codes IATA manuellement dans la colonne `IATA_Manuel`
   - Relancer : `node festival_found.js January`
   - La fonction `reconcileMissingIata()` traitera les corrections manuelles

4. **Vérification finale** : Consulter `missing_iata.csv` pour voir ce qui reste
