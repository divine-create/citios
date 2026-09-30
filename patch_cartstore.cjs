const fs = require('fs');
let code = fs.readFileSync('components/cityos/CartStore.tsx', 'utf8');

const replacement = `  useEffect(() => {
    async function load() {
      try {
        const res = await fetchUserCart();
        if (res && res.lines && res.lines.length > 0) {
          setLines(res.lines);
          setHydrated(true);
          return;
        }
      } catch (e) {
        console.error('Failed to fetch server cart', e);
      }
      try {
        const saved = localStorage.getItem(KEY);
        if (saved) setLines(JSON.parse(saved));
      } catch {}
      setHydrated(true);
    }
    load();
  }, []);`;

code = code.replace(/  useEffect\(\(\) => \{\n    try \{\n      const saved = localStorage\.getItem\(KEY\);\n      if \(saved\) setLines\(JSON\.parse\(saved\)\);\n    \} catch \{\}\n    setHydrated\(true\);\n  \}, \[\]\);/g, replacement);

fs.writeFileSync('components/cityos/CartStore.tsx', code);
