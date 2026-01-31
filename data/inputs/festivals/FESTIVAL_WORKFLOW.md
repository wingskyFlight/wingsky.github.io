# 🎪 Festival Flight Scraper - Guide d'utilisation

## 📋 Workflow Complet

### 1. **Scraping des Prix**
Le script `kayakScFestival.js` :
- Lit la première ligne de `assets/others/festival/festival_data/January.csv`
- Charge les 15 villes de `assets/others/cities.csv`
- Cherche les prix de vols Paris → Chaque ville pour les dates du festival
- Sauvegarde les résultats dans `assets/others/festival/festival_data/events_csv/[nom_event].csv`

```bash
node kayakScFestival.js
```

### 2. **Fichiers Générés**

#### `events_csv/[nom_event].csv`
```csv
Destination,IATA,Country,Price,Currency
London,LON,United Kingdom,250,USD
Barcelona,BCN,Spain,180,USD
...
```

### 3. **Enregistrement Vidéo** (À implémenter)

Pour enregistrer une vidéo TikTok/Reel avec flight_templateV3.html :

```bash
node serverRecorderV3.js January
```

Ce script devrait :
1. Lire le CSV de l'événement (`events_csv/[nom_event].csv`)
2. Charger `flight_templateV3.html` avec les données
3. Enregistrer la vidéo dans `recordings/festival/January/event_January.mp4`

## 📁 Structure des Dossiers

```
WebScrapFlight/
├── assets/others/
│   ├── cities.csv                         # 15 villes populaires
│   ├── festival/
│   │   ├── festival_data/
│   │   │   ├── January.csv                # Tous les événements de janvier
│   │   │   ├── missing_iata.csv           # Villes sans IATA
│   │   │   └── events_csv/               
│   │   │       └── [nom_event].csv        # Prix pour un événement spécifique
│   │   └── festival_images/
│   └── airport_Europe.csv
├── kayakScFestival.js                     # Scraper de prix
├── serverRecorderV3.js                    # Enregistreur vidéo (à créer)
├── flight_templateV3.html                 # Template pour la vidéo
└── recordings/
    └── festival/
        └── January/
            └── event_January.mp4          # Vidéo finale
```

## 🔧 Configuration

### `cities.csv`
Contient 15 villes européennes populaires :
- London, Paris, Barcelona, Rome, Amsterdam
- Berlin, Madrid, Vienna, Prague, Lisbon
- Dublin, Brussels, Copenhagen, Athens, Stockholm

### `January.csv` (Exemple)
```csv
Titre,Date_Depart,Date_Retour,Ville,Lien_Source,Lien_Facebook,Nom_Image_Locale,Trip_URL
"Festival Example","3 Jan","5 Jan","Genoa, Italy","https://...","https://...","image.jpg","https://..."
```

## 🎬 Format Vidéo

### Dimensions
- **Enregistrement** : 420x879 (format mobile TikTok/Reels)
- **Upscale final** : 1080x1920 (Full HD vertical)

### Contenu
- Titre du festival
- Dates (Date_Depart - Date_Retour)
- Ville et pays
- Carrousel des 15 destinations avec prix
- URL vers le festival (lien source)

## 🚀 Commandes Rapides

### Scraper les prix (première ligne de January)
```bash
node kayakScFestival.js
```

### Enregistrer la vidéo (à implémenter)
```bash
node serverRecorderV3.js January
```

### Vérifier les villes sans IATA
```bash
node festival_found.js missingIATA
```

### Scraper tous les événements de janvier
```bash
node festival_found.js January
```

## 📝 Notes

- Le scraping Kayak prend environ 30-45 secondes par ville (15 villes ≈ 10-15 minutes)
- Les prix sont en USD
- Les dates doivent être au format "DD Mon" (ex: "3 Jan", "25 Dec")
- L'origine est toujours Paris (PAR/ORY)
