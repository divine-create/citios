import fs from 'fs';

let code = fs.readFileSync('components/restaurantos/pos/POSWorkspace.tsx', 'utf8');

// Add states for modifier selection
const stateHooksOld = `const [checkoutMode, setCheckoutMode] = useState(false);
    const [receiptModalData, setReceiptModalData] = useState<any>(null);
    const [editingNotesForId, setEditingNotesForId] = useState<string | null>(null);`;

const stateHooksNew = `const [checkoutMode, setCheckoutMode] = useState(false);
    const [receiptModalData, setReceiptModalData] = useState<any>(null);
    const [editingNotesForId, setEditingNotesForId] = useState<string | null>(null);
    const [modifierSelectionItem, setModifierSelectionItem] = useState<any>(null);`;
code = code.replace(stateHooksOld, stateHooksNew);

// Update posAdd to trigger modal if variants/modifiers exist and are enabled
const posAddOld = `const posAdd = (item: any) => {
      if (!item.isAvailable) return;
      setPosLines(prev => {
        const ex = prev.find(p => p.menuItemId === item.id);
        if (ex) return prev.map(p => p.menuItemId === item.id ? { ...p, qty: p.qty + 1 } : p);
        return [...prev, { menuItemId: item.id, name: item.name, price: item.price, qty: 1, notes: "" }];
      });
    };`;

const posAddNew = `const posAdd = (item: any) => {
      if (!item.isAvailable) return;
      
      const hasVariants = settings?.enableVariants && item.variants && item.variants.length > 0;
      const hasModifiers = settings?.enableModifiers && item.modifierGroups && item.modifierGroups.length > 0;
      
      if (hasVariants || hasModifiers) {
        setModifierSelectionItem(item);
        return;
      }
      
      // Simple add
      setPosLines(prev => {
        const ex = prev.find((p: any) => p.menuItemId === item.id && !p.variantId && (!p.modifiers || p.modifiers.length === 0));
        if (ex) return prev.map((p: any) => (p.cartId === ex.cartId ? { ...p, qty: p.qty + 1 } : p));
        return [...prev, { cartId: Date.now().toString(), menuItemId: item.id, name: item.name, price: item.price, qty: 1, notes: "" }];
      });
    };
    
    const handleAddWithModifiers = (item: any, qty: number, variant: any, selectedModifiers: any[], notes: string) => {
      let finalPrice = variant ? variant.price : item.price;
      selectedModifiers.forEach(m => finalPrice += m.priceDelta);
      
      let finalName = item.name;
      if (variant) finalName += \` (\${variant.name})\`;
      
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
      }]);
      setModifierSelectionItem(null);
    };`;
code = code.replace(posAddOld, posAddNew);

fs.writeFileSync('components/restaurantos/pos/POSWorkspace.tsx', code);
