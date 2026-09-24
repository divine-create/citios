import fs from 'fs';

let code = fs.readFileSync('components/restaurantos/pos/POSWorkspace.tsx', 'utf8');

const oldAdd = `let finalName = item.name;
      if (variant) finalName += \\\` (\${variant.name})\\\`;
      
      setPosLines(prev => [...prev, { 
        cartId: Date.now().toString() + Math.random().toString(), 
        menuItemId: item.id, 
        name: finalName, 
        price: finalPrice, 
        qty, 
        notes,
        variantId: variant?.id,
        modifierOptionIds: selectedModifiers.map(m => m.id),
        modifiers: selectedModifiers
      }]);`;

const newAdd = `let finalName = item.name;
      if (variant) finalName += \\\` (\${variant.name})\\\`;
      
      let finalNotes = notes || '';
      if (selectedModifiers.length > 0) {
        const modStrings = selectedModifiers.map(m => \\\`+ \${m.name}\\\`).join(', ');
        finalNotes = finalNotes ? \\\`\${modStrings} | \${finalNotes}\\\` : modStrings;
      }
      
      setPosLines(prev => [...prev, { 
        cartId: Date.now().toString() + Math.random().toString(), 
        menuItemId: item.id, 
        name: finalName, 
        price: finalPrice, 
        qty, 
        notes: finalNotes,
        variantId: variant?.id,
        modifierOptionIds: selectedModifiers.map(m => m.id),
        modifiers: selectedModifiers
      }]);`;

code = code.replace(/let finalName = item\.name;[\s\S]*?\}\]\);/, newAdd);
fs.writeFileSync('components/restaurantos/pos/POSWorkspace.tsx', code);
