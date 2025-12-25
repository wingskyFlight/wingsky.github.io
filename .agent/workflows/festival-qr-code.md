---
description: How to generate QR codes for festival deep-linking in video projects
---

# QR Code Deep-Link pour Festivals Wingsky

Ce workflow explique comment générer des QR codes qui redirigent vers un festival spécifique avec ses vols sur Wingsky.

## 1. Format de l'URL de Deep-Link

Pour ouvrir automatiquement un festival spécifique avec ses vols :

```
https://wingsky.github.io/#festivals?event=NOM_DU_FESTIVAL&city=VILLE
```

**Exemple :**
```
https://wingsky.github.io/#festivals?event=5th%20Kizzaffaire%20Official%20Event&city=Warsaw
```

## 2. Générer le QR code avec l'API qrserver.com

### URL de base de l'API :
```
https://api.qrserver.com/v1/create-qr-code/?size=SIZE&data=URL_ENCODEE
```

### Paramètres :
| Paramètre | Description | Valeurs |
|-----------|-------------|---------|
| `size` | Taille du QR code | `100x100`, `150x150`, `200x200`, etc. |
| `data` | URL encodée | Utiliser `encodeURIComponent()` |

## 3. Exemple JavaScript pour génération vidéo

```javascript
/**
 * Génère les URLs de QR code pour un festival
 * @param {string} festivalName - Nom exact du festival
 * @param {string} city - Ville de destination
 * @param {number} size - Taille du QR code (défaut: 150)
 * @returns {object} - { deepLink, qrUrl }
 */
function generateFestivalQRCode(festivalName, city, size = 150) {
    const baseUrl = 'https://wingsky.github.io/';
    
    // Construire l'URL de deep-link
    const deepLink = `${baseUrl}#festivals?event=${encodeURIComponent(festivalName)}&city=${encodeURIComponent(city)}`;
    
    // Générer l'URL du QR code
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(deepLink)}`;
    
    return {
        deepLink,
        qrUrl
    };
}

// Utilisation
const festival = generateFestivalQRCode("5th Kizzaffaire Official Event", "Warsaw", 150);
console.log("Deep Link:", festival.deepLink);
console.log("QR Code URL:", festival.qrUrl);
```

## 4. Télécharger le QR code localement (Node.js)

```javascript
const https = require('https');
const fs = require('fs');

async function downloadQRCode(qrUrl, outputPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);
        https.get(qrUrl, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(outputPath);
            });
        }).on('error', reject);
    });
}

// Exemple d'utilisation
async function saveQRCode() {
    const { qrUrl } = generateFestivalQRCode("Festival Name", "City", 200);
    await downloadQRCode(qrUrl, './qr_festival.png');
    console.log("QR code saved!");
}
```

## 5. Intégration dans Puppeteer (génération vidéo)

```javascript
// Dans votre script Puppeteer de génération vidéo
async function addQRCodeToVideo(page, festivalName, city) {
    const { qrUrl } = generateFestivalQRCode(festivalName, city, 120);
    
    // Injecter le QR code dans la page
    await page.evaluate((qrUrl, festivalName) => {
        const qrContainer = document.createElement('div');
        qrContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: white;
            padding: 10px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            text-align: center;
            z-index: 9999;
        `;
        qrContainer.innerHTML = `
            <img src="${qrUrl}" alt="QR Code" style="width: 100px; height: 100px;">
            <p style="margin: 8px 0 0; font-size: 10px; color: #666;">Scan for flights</p>
        `;
        document.body.appendChild(qrContainer);
    }, qrUrl, festivalName);
}
```

## 6. HTML pour afficher le QR code

```html
<!-- Exemple d'intégration HTML -->
<div class="qr-container">
    <img 
        src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https%3A%2F%2Fwingsky.github.io%2F%23festivals%3Fevent%3D5th%2520Kizzaffaire%2520Official%2520Event%26city%3DWarsaw" 
        alt="Scan for flights"
    >
    <p>Scan to see festival flights</p>
</div>
```

## 7. Paramètres de Deep-Link disponibles

| Paramètre | Description | Obligatoire | Exemple |
|-----------|-------------|-------------|---------|
| `event` | Nom exact du festival (case-insensitive) | Oui | `5th Kizzaffaire Official Event` |
| `city` | Ville de destination | Non | `Warsaw` |

## 8. Comportement attendu

Quand l'utilisateur scanne le QR code :
1. La page Wingsky s'ouvre
2. Navigation automatique vers l'onglet "Festivals"
3. Le modal du festival s'ouvre automatiquement
4. Les vols disponibles sont affichés avec :
   - Ticket J-1 (départ un jour avant, 15-20€ moins cher)
   - Ticket normal
   - QR codes de réservation pour chaque ticket

## Notes importantes

- **Encodage URL** : Toujours utiliser `encodeURIComponent()` pour les noms de festivals avec espaces ou caractères spéciaux
- **Taille recommandée** : 120x120 à 150x150 pour les vidéos, 200x200 pour l'impression
- **Cache** : L'API qrserver.com cache les QR codes, pas besoin de les régénérer à chaque fois
