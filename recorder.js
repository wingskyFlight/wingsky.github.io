const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log("Lancement du navigateur (EN)...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();

  let recordedItems = [];
  let isRecording = false;

  // --- Fonctions exposées ---

  await page.exposeFunction('logItem', (data) => {
    if (isRecording) {
      const entry = {
        ...data,
        timestamp: new Date().toLocaleTimeString(),
        url: page.url()
      };
      recordedItems.push(entry);
      console.log(`[${data.type.toUpperCase()}] : ${data.selector}`);
      return entry;
    }
    return null;
  });

  await page.exposeFunction('setRecordingState', (state) => {
    isRecording = state;
    console.log(state ? "🔴 Enregistrement actif" : "⏸ Enregistrement en pause");
    return true;
  });

  await page.exposeFunction('saveAndStop', (filename) => {
    if (!filename) filename = 'recorded_data';
    if (!filename.endsWith('.json')) filename += '.json';

    const filePath = path.join(__dirname, filename);
    fs.writeFileSync(filePath, JSON.stringify(recordedItems, null, 2));
    console.log(`\n✅ Terminé ! ${recordedItems.length} items sauvegardés dans : ${filePath}`);

    setTimeout(async () => {
      await browser.close();
      process.exit(0);
    }, 500);

    return { success: true, path: filePath, count: recordedItems.length };
  });

  await page.exposeFunction('syncItems', (newList) => {
    recordedItems = newList;
    console.log(`[SYNC] Liste mise à jour. Total: ${recordedItems.length}`);
    return true;
  });

  // --- UI & Logic ---
  async function injectRecorderUI() {
    await page.evaluate(() => {
      if (document.getElementById('pw-recorder-ui')) return;

      let history = [];
      let redoStack = [];
      let savedStyles = new Map();

      // UI Layout
      const container = document.createElement('div');
      container.id = 'pw-recorder-ui';
      Object.assign(container.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '2147483647',
        backgroundColor: '#1e272e',
        padding: '15px',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        border: '1px solid #34495e',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        width: '320px',
        maxHeight: '85vh',
        color: '#f1f2f6'
      });

      const header = document.createElement('div');
      header.innerHTML = '<div style="font-weight:bold; font-size:14px; text-align:center">🚀 JS MULTI-RECORDER</div>' +
        '<div style="font-size:10px; color:#808e9b; text-align:center; margin-top:4px">R-Click: Simple | Shift+R-Click: Block</div>';
      container.appendChild(header);

      const statusDiv = document.createElement('div');
      statusDiv.id = 'recorder-status';
      statusDiv.innerText = '⏹ Stopped';
      Object.assign(statusDiv.style, { color: '#808e9b', fontSize: '11px', textAlign: 'center', margin: '4px 0' });
      container.appendChild(statusDiv);

      const listContainer = document.createElement('div');
      Object.assign(listContainer.style, {
        backgroundColor: '#2f3542',
        borderRadius: '8px',
        padding: '10px',
        height: '180px',
        overflowY: 'auto',
        fontSize: '11px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      });
      container.appendChild(listContainer);

      function updateListDisplay() {
        listContainer.innerHTML = '';
        if (history.length === 0) {
          listContainer.innerHTML = '<div style="color:#747d8c; text-align:center; margin-top:70px">Prêt à enregistrer...</div>';
          return;
        }
        history.forEach((item, index) => {
          const row = document.createElement('div');
          const isTable = item.type === 'block';
          row.innerHTML = `<span style="color:${isTable ? '#ff9f43' : '#54a0ff'}">[${item.type}]</span> ${item.selector}`;
          Object.assign(row.style, {
            borderBottom: '1px solid #1e272e',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            padding: '4px',
            cursor: 'help',
            transition: 'background 0.2s'
          });
          row.title = item.selector;

          row.addEventListener('mouseenter', () => {
            row.style.backgroundColor = '#57606f';
            highlightOnPage(item.selector, true, isTable);
          });
          row.addEventListener('mouseleave', () => {
            row.style.backgroundColor = 'transparent';
            highlightOnPage(item.selector, false, isTable);
          });

          listContainer.appendChild(row);
        });
        listContainer.scrollTop = listContainer.scrollHeight;
      }

      function highlightOnPage(selector, active, isBlock) {
        try {
          const el = document.querySelector(selector);
          if (!el) return;
          if (active) {
            savedStyles.set(el, { outline: el.style.outline, boxShadow: el.style.boxShadow });
            el.style.outline = isBlock ? '4px solid #ff9f43' : '3px solid #54a0ff';
            el.style.boxShadow = `0 0 20px ${isBlock ? 'rgba(255, 159, 67, 0.5)' : 'rgba(84, 160, 255, 0.5)'}`;
          } else {
            const saved = savedStyles.get(el);
            if (saved) {
              el.style.outline = saved.outline;
              el.style.boxShadow = saved.boxShadow;
              savedStyles.delete(el);
            }
          }
        } catch (e) { }
      }

      // Buttons
      const btnRow = (bg = 'transparent') => {
        const row = document.createElement('div');
        Object.assign(row.style, { display: 'flex', gap: '6px', backgroundColor: bg });
        return row;
      };

      const createBtn = (text, color) => {
        const b = document.createElement('button');
        b.innerText = text;
        Object.assign(b.style, {
          flex: '1', padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer',
          backgroundColor: color, color: '#fff', fontSize: '11px', fontWeight: 'bold'
        });
        return b;
      };

      const row1 = btnRow();
      const playBtn = createBtn('▶ PLAY', '#2ed573');
      const pauseBtn = createBtn('⏸ PAUSE', '#ffa502');
      row1.appendChild(playBtn);
      row1.appendChild(pauseBtn);
      container.appendChild(row1);

      const row2 = btnRow();
      const undoBtn = createBtn('↩ Undo', '#57606f');
      const redoBtn = createBtn('↪ Redo', '#57606f');
      row2.appendChild(undoBtn);
      row2.appendChild(redoBtn);
      container.appendChild(row2);

      const nameInput = document.createElement('input');
      nameInput.value = 'extracted_data';
      Object.assign(nameInput.style, {
        width: '100%', boxSizing: 'border-box', padding: '8px', marginTop: '5px',
        borderRadius: '6px', border: '1px solid #57606f', backgroundColor: '#2f3542', color: '#fff', fontSize: '12px'
      });
      container.appendChild(nameInput);

      const stopBtn = createBtn('💾 STOP & SAVE', '#ff4757');
      stopBtn.style.padding = '12px';
      container.appendChild(stopBtn);

      // Event handlers
      playBtn.onclick = async () => { window.__recActive = true; await window.setRecordingState(true); statusDiv.innerText = '🔴 Recording...'; statusDiv.style.color = '#ff4757'; playBtn.style.opacity = '1'; pauseBtn.style.opacity = '0.5'; };
      pauseBtn.onclick = async () => { window.__recActive = false; await window.setRecordingState(false); statusDiv.innerText = '⏸ Paused'; statusDiv.style.color = '#ffa502'; pauseBtn.style.opacity = '1'; playBtn.style.opacity = '0.5'; };

      undoBtn.onclick = async () => { if (history.length > 0) { const r = history.pop(); redoStack.push(r); updateListDisplay(); await window.syncItems(history); } };
      redoBtn.onclick = async () => { if (redoStack.length > 0) { const r = redoStack.pop(); history.push(r); updateListDisplay(); await window.syncItems(history); } };

      stopBtn.onclick = () => {
        const name = nameInput.value.trim() || 'data';
        stopBtn.innerText = '⏳ Saving...';
        stopBtn.disabled = true;
        window.saveAndStop(name);
      };

      document.body.appendChild(container);

      // --- Smart Selection Logic ---
      document.addEventListener('contextmenu', async (e) => {
        if (!window.__recActive) return;
        e.preventDefault();

        let target = e.target;
        let type = 'simple';

        // Si Shift est pressé, on cherche un bloc (Table, List, ou Parent)
        if (e.shiftKey) {
          type = 'block';
          const blockTags = ['TABLE', 'UL', 'OL', 'TBODY', 'SECTION', 'FORM'];
          let blockParent = target.closest(blockTags.join(','));
          if (!blockParent) {
            // Si pas de tag standard, on cherche un div parent qui contient des enfants répétitifs ou significatifs
            blockParent = target.parentElement;
          }
          target = blockParent || target;
        }

        const selector = getDetailedSelector(target);
        const data = { selector, type, tagName: target.tagName.toLowerCase() };

        const entry = await window.logItem(data);
        if (entry) {
          history.push(entry);
          redoStack = [];
          updateListDisplay();

          // Flash feedback
          const origO = target.style.outline;
          target.style.outline = `3px solid ${type === 'block' ? '#ff9f43' : '#54a0ff'}`;
          setTimeout(() => target.style.outline = origO, 300);
        }
      }, true);

      function getDetailedSelector(el) {
        if (!(el instanceof Element)) return '';
        const path = [];
        while (el.nodeType === Node.ELEMENT_NODE) {
          let selector = el.nodeName.toLowerCase();
          if (el.id && !el.id.includes(':')) { // On évite les IDs avec colons car fragiles
            selector += '#' + el.id;
            path.unshift(selector);
            break;
          } else {
            let sib = el, nth = 1;
            while (sib = sib.previousElementSibling) {
              if (sib.nodeName.toLowerCase() == selector) nth++;
            }
            if (nth != 1) selector += `:nth-of-type(${nth})`;
          }
          path.unshift(selector);
          el = el.parentNode;
        }
        return path.join(' > ');
      }

      updateListDisplay();
    });
  }

  page.on('load', injectRecorderUI);
  await page.goto('https://www.google.com'); // Par défaut
  await injectRecorderUI();
  console.log("✅ Multi-Recorder prêt !");
})();
