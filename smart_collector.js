/**
 * SMART COLLECTOR - AG & GmbH SUPPORT
 * Automatically detects company type and maps data to the correct Excel structure.
 */
const { chromium } = require('playwright');
const xlsx = require('xlsx');

async function scrapeAndSave(urls) {
    const browser = await chromium.launch({ headless: true });
    console.log(`🚀 Starting dual-mode extraction for ${urls.length} companies...`);

    const extractedData = [];

    for (const url of urls) {
        const page = await browser.newPage();
        try {
            console.log(`\nProcessing: ${url}`);
            await page.goto(url, { waitUntil: 'networkidle' });
            // Critical fix: Wait for the main excerpt container to ensure tables are loaded
            try {
                await page.waitForSelector('span#idAuszugForm\\:rendered-excerpt', { timeout: 15000 });
            } catch (e) { console.log("Warning: Main container wait timed out, attempting extraction anyway..."); }

            const data = await page.evaluate(() => {
                const res = { type: 'UNKNOWN', members: [], personnel: [] };
                const get = (sel) => document.querySelector(sel)?.innerText.trim() || '';

                // 1. Basic Info
                // Try strict selectors (from your recording pattern) first, fallback to text search
                res.companyName = get('div#Titel > div:nth-of-type(2) > p > span') || document.querySelector('h1')?.innerText;
                res.uid = get('div#Titel > div:nth-of-type(3) > p > span') || (document.body.innerText.match(/(CHE-\d{3}\.\d{3}\.\d{3})/) || [])[1];
                res.legalFormRaw = get('div#Titel > div:nth-of-type(2) > p:nth-of-type(2)');
                res.regDate = get('div#Titel > div:nth-of-type(3) > p:nth-of-type(2) > span:nth-of-type(2)');

                // Detect Type (Robust)
                const infoText = document.body.innerText.toLowerCase(); // Scan full text for high-level type indicator if selector fails
                const form = (res.legalFormRaw || '').toLowerCase();

                if (form.includes('aktiengesellschaft') || form.includes('société anonyme') || infoText.includes('aktiengesellschaft') || infoText.includes('société anonyme')) {
                    res.type = 'AG';
                }

                if (form.includes('gmbh') || form.includes('sarl') || form.includes('sag') || infoText.includes('gesellschaft mit beschränkter haftung')) {
                    res.type = (res.type === 'AG') ? 'AG' : 'GmbH'; // Prefer AG if ambiguous (rare), but usually distinct
                }

                // If still unknown, check name
                if (res.type === 'UNKNOWN') {
                    if (res.companyName.includes(' AG')) res.type = 'AG';
                    if (res.companyName.includes(' GmbH')) res.type = 'GmbH';
                }

                // 2. Parse Tables & Fields intelligently
                const tables = Array.from(document.querySelectorAll('table'));

                tables.forEach(t => {
                    const h = t.innerText;

                    // Common: Statutes Date
                    if (h.includes('Date des statuts') || h.includes('Statutendatum')) {
                        res.statutesDate = t.rows[1]?.cells[1]?.innerText.trim();
                    }

                    // AG Specifics
                    if (res.type === 'AG') {
                        if (h.includes('Capital-actions') || h.includes('Aktienkapital')) {
                            // Find the row where the Capital column (index 2) actually looks like a currency amount
                            const rows = Array.from(t.rows).slice(1);
                            // Sort/Find the valid active capital row. Usually checking for specific regex is safest.
                            // DEBUG: Log rows to see what we are matching
                            // console.log('Checking rows for capital:', rows.map(r => r.cells[2]?.innerText.trim()));

                            const dataRow = rows.find(r => {
                                const cap = r.cells[2]?.innerText.trim() || '';
                                // Relaxed check: Starts with CHF by roughly, less than 50 chars to filter out descriptions
                                return cap.startsWith('CHF') && cap.length < 50;
                            });

                            if (dataRow) {
                                res.shareCapital = dataRow.cells[2]?.innerText.trim();
                                res.paidIn = dataRow.cells[3]?.innerText.trim();
                                res.denomination = dataRow.cells[4]?.innerText.trim();
                            }
                        }
                    }

                    // GmbH Specifics
                    if (res.type === 'GmbH') {
                        if (h.includes('Capital social') || h.includes('Stammkapital')) {
                            res.shareCapital = t.rows[1]?.cells[1]?.innerText.replace(/CHF/g, '').trim();
                        }
                        if (h.includes('Parts sociales') || h.includes('Stammanteile')) {
                            Array.from(t.rows).slice(1).forEach(r => {
                                const txt = r.innerText;
                                if (txt.includes('CHF')) {
                                    const parts = txt.split('\t'); // Assuming mimic table structure
                                    const valIdx = parts.findIndex(p => p.includes('CHF'));
                                    if (valIdx > -1) {
                                        res.members.push({
                                            int: parts[valIdx],
                                            name: parts[valIdx + 1] || parts[parts.length - 1]
                                        });
                                    }
                                }
                            });
                        }
                    }

                    // Administration / Personnel (Common)
                    if (h.includes('Fonction') || h.includes('Funktion') || h.includes('Zeichnungsberechtigung')) {
                        Array.from(t.rows).slice(1).forEach(r => {
                            const cells = Array.from(r.cells).map(c => c.innerText.trim());
                            // Be robust: look for last 3 cols usually
                            if (cells.length >= 3) {
                                const c = cells;
                                res.personnel.push({
                                    det: c[c.length - 3],
                                    role: c[c.length - 2],
                                    sign: c[c.length - 1]
                                });
                            }
                        });
                    }
                });
                return res;
            });

            extractedData.push(data);
            console.log(`✅ Extracted: ${data.companyName} [${data.type}]`);

        } catch (e) { console.error(`Failed ${url}:`, e); }
        await page.close();
    }
    await browser.close();

    // 3. Write to Excel
    updateExcel(extractedData);
}

function updateExcel(companies) {
    const filename = 'Excerpt_data collection - company data - GmbH-AG - noprops.xlsx';
    let wb, ws, data;

    try {
        wb = xlsx.readFile(filename);
        ws = wb.Sheets[wb.SheetNames[0]];
        data = xlsx.utils.sheet_to_json(ws, { header: 1 });
    } catch (e) { console.log("Creating new Excel..."); data = [[]]; /* Set headers elsewhere if needed */ }

    const headers = data[0];
    const setVal = (row, h, v) => { const idx = headers.indexOf(h); if (idx !== -1) row[idx] = v; };

    companies.forEach(c => {
        const row = new Array(headers.length).fill('');

        // Common
        setVal(row, 'CompanyName', c.companyName);
        setVal(row, 'UID', c.uid);
        setVal(row, 'CHENumber', c.uid); // Mapping both just in case
        setVal(row, 'CompanyType', c.type === 'AG' ? 'Aktiengesellschaft' : 'GmbH');
        setVal(row, 'RegisteredOn', c.regDate);
        setVal(row, 'DateOfTheArticlesOfAssociation', c.statutesDate);
        setVal(row, 'ShareCapital', c.shareCapital);

        if (c.type === 'AG') {
            setVal(row, 'PaidIn', c.paidIn);
            setVal(row, 'DenominationOfShares', c.denomination);
            // No LLC Members for AG
        }

        if (c.type === 'GmbH') {
            setVal(row, 'LLCMembersCapital', c.shareCapital);
            c.members.forEach((m, i) => {
                setVal(row, `LLCMembershipInterests${i + 1}`, m.int);
                setVal(row, `LLCMembers${i + 1}`, m.name);
            });
        }

        // Personnel (Common)
        c.personnel.forEach((p, i) => {
            setVal(row, `PersonalDetails${i + 1}`, p.det);
            setVal(row, `Role${i + 1}`, p.role);
            setVal(row, `SigningAuthority${i + 1}`, p.sign);
        });

        // Add to top (Row 2)
        if (data.length > 1) data.splice(1, 0, row);
        else data.push(row);
    });

    const newWs = xlsx.utils.aoa_to_sheet(data);
    wb.Sheets[wb.SheetNames[0]] = newWs;
    xlsx.writeFile(wb, filename);
    console.log(`\n💾 Saved ${companies.length} companies to Excel.`);
}

// EXECUTE
const targets = [
    'https://ag.chregister.ch/cr-portal/auszug/auszug.xhtml?uid=CHE-100.021.209', // Fretz & Co AG
    'https://ag.chregister.ch/cr-portal/auszug/auszug.xhtml?uid=CHE-110.550.260'  // Other AG
];

scrapeAndSave(targets);
