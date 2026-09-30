const fs = require('fs');
let code = fs.readFileSync('components/cityos/CartStore.tsx', 'utf8');

code = code.replace(
  "const clear = useCallback(() => setLines([]), []);",
  "const clear = useCallback(() => {\n    setLines([]);\n    setPendingCityLine(null);\n    setLastAddedId(null);\n    clearCartAction().catch(() => {});\n  }, []);"
);

fs.writeFileSync('components/cityos/CartStore.tsx', code);
