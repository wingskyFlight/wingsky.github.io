/**
 * SELECTOR-BASED COLLECTOR
 * Utilise EXACTEMENT les sélecteurs enregistrés dans le JSON du recorder.
 */
const { chromium } = require('playwright');
const xlsx = require('xlsx');
const fs = require('fs');

async function collect(jsonFile, excelFile) {
    const selectorsRaw = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    // Pre-clean selectors
    const selectors = selectorsRaw.map(s => {
        let sel = s.selector ? s.selector.trim() : '';
        // Remove trailing > or # recursively
        while (sel.length > 0 && (sel.endsWith('>') || sel.endsWith('#'))) {
            sel = sel.substring(0, sel.length - 1).trim();
        }
        return { ...s, selector: sel };
    });

    // URL cible demandée par l'utilisateur
    const url = 'https://ag.chregister.ch/cr-portal/auszug/auszug.xhtml?uid=CHE-100.027.264';

    console.log(`🚀 Extraction CIBLE avec ${selectors.length} sélecteurs...`);
    console.log(`URL: ${url}`);

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    const results = await page.evaluate((sels) => {
        const data = { simple: [], blocks: [] };

        sels.forEach((s, idx) => {
            let el = null;
            try {
                if (s.selector) el = document.querySelector(s.selector);
            } catch (e) { }

            // SPECIAL: Pour index 5 et 6 (dates), on veut TOUJOURS la dernière ligne
            if ((idx === 5 || idx === 6) && el && el.tagName === 'TD') {
                const parentTable = el.closest('table');
                if (parentTable) {
                    const rows = Array.from(parentTable.rows);
                    if (rows.length > 1) {
                        const lastRow = rows[rows.length - 1];
                        const rowData = Array.from(lastRow.cells).map(c => c.innerText.trim());
                        data.blocks.push({
                            idx,
                            rows: [rowData],
                            type: 'last_child_row'
                        });
                        return;
                    }
                }
            }

            if (!el) {
                // Si l'élément n'est pas trouvé, mais le sélecteur pointe vers un TD,
                // on tente de remonter au parent TABLE et de prendre la DERNIERE ligne.
                if (s.selector.includes('td')) { // Heuristic: check if selector contains 'td'
                    const parts = s.selector.split('td'); // Rough split
                    const parentTableSelector = parts[0].trim();
                    // Clean trailing > again just in case
                    const cleanParent = parentTableSelector.endsWith('>') ? parentTableSelector.slice(0, -1).trim() : parentTableSelector;

                    let parentTable = null;
                    try { parentTable = document.querySelector(cleanParent); } catch (e) { }

                    if (parentTable && parentTable.tagName === 'TABLE') {
                        const rows = Array.from(parentTable.rows);
                        if (rows.length > 1) {
                            // On prend la dernière ligne de données (le dernier enfant)
                            const lastRow = rows[rows.length - 1];
                            const rowData = Array.from(lastRow.cells).map(c => c.innerText.trim());

                            // On le stocke comme un bloc spécial 'last_child_row' pour le mapping
                            data.blocks.push({
                                idx,
                                rows: [rowData],
                                type: 'last_child_row'
                            });
                            return; // Don't add to simple if handled as last_child_row
                        }
                    }
                }
                data.simple.push({ idx, selector: s.selector, value: 'NOT_FOUND' });
                return;
            }

            if (s.type === 'block') {
                // Pour les tables/blocs, on extrait toutes les lignes
                if (el.tagName === 'TABLE') {
                    const rows = Array.from(el.rows).slice(1).map(r =>
                        Array.from(r.cells).map(c => c.innerText.trim())
                    );
                    data.blocks.push({ idx, selector: s.selector, rows });
                }
            } else {
                data.simple.push({ idx, selector: s.selector, value: el.innerText.trim() });
            }
        });

        return data;
    }, selectors);

    await browser.close();

    console.log('\n📊 Résultats extraits:');
    results.simple.forEach(s => console.log(`  [${s.idx}] ${s.value}`));
    results.blocks.forEach(b => console.log(`  [${b.idx}] TABLE: ${b.rows.length} lignes`));

    // Mapping vers Excel - NOUVELLE LOGIQUE : Trouver la ligne par UID
    const wb = xlsx.readFile(excelFile);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const sheetData = xlsx.utils.sheet_to_json(ws, { header: 1 });
    const headers = sheetData[0];

    // 1. Extraire l'UID des résultats
    const extractedUID = results.simple.find(s => s.idx === 1)?.value;
    if (!extractedUID || extractedUID === 'NOT_FOUND') {
        console.log('❌ UID non trouvé, impossible de mapper dans Excel.');
        await browser.close();
        return;
    }

    // 2. Trouver la ligne existante avec cet UID (colonne B = index 1)
    let targetRowIndex = -1;
    for (let i = 1; i < sheetData.length; i++) {
        if (sheetData[i][1] === extractedUID) {
            targetRowIndex = i;
            break;
        }
    }

    if (targetRowIndex === -1) {
        console.log(`⚠️  UID ${extractedUID} n'existe pas dans l'Excel (colonne B). Aucune ligne à mettre à jour.`);
        await browser.close();
        return;
    }

    console.log(`✅ Ligne trouvée : Index ${targetRowIndex} pour UID ${extractedUID}`);

    // 3. Mettre à jour cette ligne à partir de la colonne E (index 4)
    let row = sheetData[targetRowIndex];
    const set = (h, v) => {
        const i = headers.indexOf(h);
        if (i > -1 && i >= 4) { // Colonne E = index 4, on ne touche pas A-D
            row[i] = v;
        }
    };

    // Mapping des données simples
    results.simple.forEach(s => {
        switch (s.idx) {
            case 0: set('CompanyName', s.value); break;
            case 1:
                // CORRECTION : Écrire CHENumber aussi (pas juste pour chercher)
                set('CHENumber', s.value);
                break;
            case 2:
                // CORRECTION : Écrire CompanyType
                set('CompanyType', s.value);
                break;
            case 3: set('RegisteredOn', s.value); break;
            case 4: set('StruckOffTheRegisterOn', s.value); break;
            case 5:
                // Si trouvé en simple (rare), écrire DateOfArticles
                if (s.value !== 'NOT_FOUND') set('DateOfTheArticlesOfAssociation', s.value);
                break;
            case 6:
                // Si trouvé en simple (rare), écrire SOGC Date
                if (s.value !== 'NOT_FOUND') set('SOGCDate', s.value);
                break;
            case 7:
                // ShareCapital (TD direct pour AG)
                if (s.value !== 'NOT_FOUND') set('ShareCapital', s.value);
                break;
        }
    });

    // Traitement des blocs (tables) et last_child_row
    results.blocks.forEach(b => {
        // Index 5 : Date des statuts (dernière ligne de la table)
        if (b.idx === 5 && b.type === 'last_child_row') {
            if (b.rows[0]) {
                // Prendre la colonne de date (souvent index 1 ou 0)
                const dateValue = b.rows[0][1] || b.rows[0][0];
                set('DateOfTheArticlesOfAssociation', dateValue);
            }
        }
        // Index 6 : SOGC Date (dernière ligne de la table)
        if (b.idx === 6 && b.type === 'last_child_row') {
            if (b.rows[0]) {
                // CORRECTION : Prendre la colonne SOGC date (dernière colonne, souvent index 3 ou 4)
                // Pas la colonne Journal date (index 1)
                const sogcDate = b.rows[0][4] || b.rows[0][3] || b.rows[0][b.rows[0].length - 1];
                set('SOGCDate', sogcDate);
            }
        }
        // Index 7 : Si c'est une table (rare), prendre ShareCapital
        if (b.idx === 7 && b.type === 'last_child_row') {
            if (b.rows[0]) {
                set('ShareCapital', b.rows[0][1] || b.rows[0][0]);
            }
        }
        // Index 8 : Table (Membres pour GmbH, ou autre pour AG)
        if (b.idx === 8) {
            // Pour GmbH : LLC Members
            // Pour AG : Peut-être capital détails (PaidIn/Denomination) ?
            // On va essayer de détecter
            if (b.rows.length <= 3) {
                // Petite table, probablement capital pour AG
                b.rows.forEach((r, i) => {
                    // Si c'est une ligne unique avec plusieurs colonnes : ShareCapital, PaidIn, Denomination
                    if (i === 0) {
                        set('ShareCapital', r[2] || r[0]);
                        set('PaidIn', r[3] || '');
                        set('DenominationOfShares', r[4] || '');
                    }
                });
            } else {
                // Grande table, probablement membres GmbH
                b.rows.forEach((r, i) => {
                    if (i < 10) {
                        set(`LLCMembershipInterests${i + 1}`, r[3] || r[r.length - 2]);
                        set(`LLCMembers${i + 1}`, r[4] || r[r.length - 1]);
                    }
                });
            }
        }
        // Index 9 : Table PersonalDetails
        if (b.idx === 9) {
            b.rows.forEach((r, i) => {
                if (i < 15) {
                    set(`PersonalDetails${i + 1}`, r[3] || r[r.length - 3]);
                    set(`Role${i + 1}`, r[4] || r[r.length - 2]);
                    set(`SigningAuthority${i + 1}`, r[5] || r[r.length - 1]);
                }
            });
        }
    });

    // 4. Sauvegarder (la ligne est mise à jour en place)
    sheetData[targetRowIndex] = row;
    wb.Sheets[wb.SheetNames[0]] = xlsx.utils.aoa_to_sheet(sheetData);
    xlsx.writeFile(wb, excelFile);
    console.log(`\n💾 Ligne ${targetRowIndex} mise à jour dans l'Excel (à partir de la colonne E).`);
}

collect('companyAG.json', 'Excerpt_data collection - company data - GmbH-AG - noprops.xlsx');
