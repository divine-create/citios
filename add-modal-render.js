import fs from 'fs';

let code = fs.readFileSync('components/restaurantos/pos/POSWorkspace.tsx', 'utf8');

const renderOld = `{checkoutMode && (`;
const renderNew = `{modifierSelectionItem && (
        <ModifierSelectionModal 
          item={modifierSelectionItem}
          onCancel={() => setModifierSelectionItem(null)}
          onAdd={handleAddWithModifiers}
        />
      )}
      {checkoutMode && (`;

code = code.replace(renderOld, renderNew);
fs.writeFileSync('components/restaurantos/pos/POSWorkspace.tsx', code);
