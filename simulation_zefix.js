const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const url = 'https://ag.chregister.ch/cr-portal/auszug/auszug.xhtml?loeschung=20181009&uid=CHE-101.848.915';
    console.log(`\n🚀 Navigation vers : ${url}`);

    try {
        await page.goto(url, { waitUntil: 'networkidle' });
        // Attendre que le container principal soit là
        await page.waitForSelector('[id="idAuszugForm:rendered-excerpt"]', { timeout: 15000 });

        const tablesSummary = await page.evaluate(() => {
            const container = document.getElementById('idAuszugForm:rendered-excerpt');
            if (!container) return [{ error: "Contenu principal non trouvé" }];

            const tables = Array.from(container.querySelectorAll('table'));
            return tables.map((table, idx) => {
                const rows = Array.from(table.rows);
                const headers = Array.from(rows[0]?.cells || []).map(c => c.innerText.trim());
                return {
                    index: idx,
                    headers: headers,
                    rowCount: rows.length
                };
            });
        });

        console.log("\n--- ANALYSE DES TABLES DANS LE DOM (Container principal) ---");
        tablesSummary.forEach(t => {
            if (t.error) console.log(`❌ ${t.error}`);
            else console.log(`Table #${t.index}: [${t.headers.join(' | ')}] (${t.rowCount} lignes)`);
        });

        const tablesData = await page.evaluate(() => {
            const container = document.getElementById('idAuszugForm:rendered-excerpt');
            const results = {};
            if (!container) return results;

            const tables = Array.from(container.querySelectorAll('table'));

            tables.forEach((table) => {
                const headers = Array.from(table.rows[0]?.cells || []).map(c => c.innerText.trim());

                // Table des Associés
                if (headers.includes('Parts sociales')) {
                    results['Associés'] = {
                        headers: headers,
                        firstRow: Array.from(table.rows[1]?.cells || []).map(c => c.innerText.trim())
                    };
                }

                // Table du Personnel
                if (headers.includes('Fonction')) {
                    results['Personnel'] = {
                        headers: headers,
                        firstRow: Array.from(table.rows[1]?.cells || []).map(c => c.innerText.trim())
                    };
                }
            });

            return results;
        });

        console.log("\n--- SIMULATION D'EXTRACTION RÉUSSIE ---");
        if (tablesData.Associés) {
            console.log("✅ Table 'Associés' détectée");
            console.log("   Colonnes :", tablesData.Associés.headers.join(' | '));
            console.log("   Exemple (Ligne 1) :", tablesData.Associés.firstRow.join(' | '));
        }

        if (tablesData.Personnel) {
            console.log("✅ Table 'Personnel' détectée");
            console.log("   Colonnes :", tablesData.Personnel.headers.join(' | '));
            console.log("   Exemple (Ligne 1) :", tablesData.Personnel.firstRow.join(' | '));
        }

    } catch (err) {
        console.error("❌ Erreur pendant la simulation :", err.message);
    }

    console.log("\nFin de la simulation.");
    await browser.close();
    process.exit(0);
})();
