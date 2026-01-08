# Analyse du Guide de Collecte de Données (GmbH & AG)

Ce document est un manuel d'instruction détaillé destiné à standardiser l'extraction de données sur les entreprises suisses depuis le portail **Zefix.ch**.

## 1. Objectif du Document
L'objectif est de guider l'utilisateur dans la recherche et l'extraction d'informations légales précises pour deux formes juridiques :
- **AG (Société Anonyme)** 
- **GmbH (Société à Responsabilité Limitée)**

## 2. Procédure de Recherche sur Zefix
Pour chaque entreprise, la recherche doit se faire via le numéro **UID (IDE)** avec les paramètres suivants :
- Utiliser le champ "Business name or UID".
- Cocher **"Exact search"**.
- Cocher **"Include deleted entities"**.
- Cocher **"Include former business names"**.

## 3. Informations à Extraire (Général)
- Nom de l'entreprise.
- Numéro UID.
- Type de société.
- Date d'inscription et, le cas échéant, date de radiation.
- Lien vers l'**extrait cantonal** (source primaire des données détaillées).

## 4. Données Spécifiques par Type de Société

### Pour les AG (Exemple : Rorbissima AG)
- **Capital-actions** : Montant total.
- **Capital libéré** : Montant réellement versé.
- **Valeur nominale** : Détails des actions.
- **Date des statuts**.
- **Administrateurs** : Nom, prénom, origine, commune de résidence.
- **Fonctions et Signatures** : Rôle exact et type de pouvoir de signature.

### Pour les GmbH (Exemple : PRIMUS Solutions GmbH)
- **Capital social**.
- **Parts sociales** : Détails des intérêts de chaque membre.
- **Associés** : Noms et détails des participations.

## 5. Éléments Visuels et Captures d'Écran
Le PDF contient 8 pages avec des captures d'écran annotées (cercles rouges) pour montrer exactement où trouver les informations :
- **Page 3-4** : Navigation sur le site Zefix et accès à l'extrait cantonal.
- **Page 5-6** : Analyse d'un extrait de Registre du Commerce pour une **AG**.
- **Page 7** : Analyse d'un extrait pour une **GmbH** en liquidation.
- **Page 8** : **Résultat attendu (Expected Outcome)** montrant la structure finale des données dans un tableau Excel/CSV.

## 6. Conclusion
Le document sert à assurer la qualité et la cohérence de la base de données finale, en s'assurant que chaque champ (notamment les pouvoirs de signature et les détails du capital) soit correctement capturé.
