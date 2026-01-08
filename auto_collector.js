/**
 * AUTO COLLECTOR V2 - FULL PATH PRECISION
 * Suit l'ordre et les sélecteurs CSS exacts enregistrés par le Recorder JS.
 */
const { chromium } = require('playwright');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

async function collectData(selectorFile, excelFile) {
    const selectors = JSON.parse(fs.readFileSync(selectorFile, 'utf8'));
    // On récupère l'URL de base depuis le premier sélecteur
    const targetUrl = selectors[0].url;

    console.log(`🚀 Lancement de l'automatisation pour : ${targetUrl}`);

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        await page.goto(targetUrl, { waitUntil: 'networkidle' });
        // Attente du container principal pour garantir que le DOM est prêt
        await page.waitForSelector('span#idAuszugForm\\:rendered-excerpt', { timeout: 30000 });

        // Extraction en utilisant EXACTEMENT les sélecteurs du JSON
        const results = await page.evaluate((selList) => {
            const getVal = (idx) => document.querySelector(selList[idx].selector)?.innerText.trim() || '';

            const data = {
                companyName: getVal(0),
                cheNumber: getVal(1),
                companyType: getVal(2),
                registered: getVal(3),
                struckOff: getVal(4),
                statutes: getVal(5)
            };

            // Extraction des blocs complexes (Associés et Personnel)
            // On utilise les sélecteurs de table enregistrés (Item 27 et 52 dans votre fichier d'origine)
            // Mais pour être flexible sur le nombre de lignes, on récupère le parent TABLE

            const extractTable = (tableSelector) => {
                const table = document.querySelector(tableSelector);
                if (!table) return [];
                // On remonte au parent <table> si le sélecteur pointe vers une cellule
                const tableEl = table.tagName === 'TABLE' ? table : table.closest('table');
                if (!tableEl) return [];

                return Array.from(tableEl.rows).slice(1).map(row =>
                    Array.from(row.cells).map(cell => cell.innerText.trim())
                );
            };

            // On identifie les tables par leur contenu (plus fiable que l'index fixe si les tables changent de place)
            const allTables = Array.from(document.querySelectorAll('table'));
            allTables.forEach(table => {
                const headerText = table.rows[0]?.innerText || '';
                if (headerText.includes('Parts sociales')) {
                    data.members = Array.from(table.rows).slice(1).map(r => ({
                        interests: r.cells[3]?.innerText.trim(),
                        name: r.cells[4]?.innerText.trim()
                    }));
                }
                if (headerText.includes('Fonction')) {
                    data.personnel = Array.from(table.rows).slice(1).map(r => ({
                        details: r.cells[3]?.innerText.trim(),
                        role: r.cells[4]?.innerText.trim(),
                        sign: r.cells[5]?.innerText.trim()
                    }));
                }
            });

            return data;
        }, selectors);

        // --- Écriture Excel ---
        const wb = xlsx.readFile(excelFile);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const sheetData = xlsx.utils.sheet_to_json(ws, { header: 1 });
        const headers = sheetData[0];

        const newRow = new Array(headers.length).fill('');
        const setVal = (h, v) => { const idx = headers.indexOf(h); if (idx !== -1) newRow[idx] = v; };

        // Mapping précis sur les colonnes (Index 5+)
        setVal('CompanyName', results.companyName);
        setVal('CHENumber', results.cheNumber);
        setVal('CompanyType', results.companyType);
        setVal('RegisteredOn', results.registered);
        setVal('StruckOffTheRegisterOn', results.struckOff);
        setVal('DateOfTheArticlesOfAssociation', results.statutes);

        // LLC Members
        if (results.members) {
            results.members.forEach((m, i) => {
                if (i < 10) {
                    setVal(`LLCMembershipInterests${i + 1}`, m.interests);
                    setVal(`LLCMembers${i + 1}`, m.name);
                }
            });
        }

        // Personnel
        if (results.personnel) {
            results.personnel.forEach((p, i) => {
                if (i < 15) {
                    setVal(`PersonalDetails${i + 1}`, p.details);
                    setVal(`Role${i + 1}`, p.role);
                    setVal(`SigningAuthority${i + 1}`, p.sign);
                }
            });
        }

        // Insertion en haut (Ligne 2)
        sheetData.splice(1, 0, newRow);

        wb.Sheets[wb.SheetNames[0]] = xlsx.utils.aoa_to_sheet(sheetData);
        xlsx.writeFile(wb, excelFile);

        console.log(`\n✅ SUCCÈS : Données de "${results.companyName}" ajoutées en Ligne 2.`);

    } catch (err) {
        console.error(`\n❌ ERREUR : ${err.message}`);
    } finally {
        await browser.close();
    }
}

// Lancer le script
// collectData('companyGmbh.json', 'Excerpt_data collection - company data - GmbH-AG - noprops.xlsx');
