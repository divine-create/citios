import fs from 'fs';

let code = fs.readFileSync('components/restaurantos/pos/POSWorkspace.tsx', 'utf8');

const regex = /const\s*\[checkoutMode,\s*setCheckoutMode\]\s*=\s*useState\(false\);\s*const\s*\[receiptModalData,\s*setReceiptModalData\]\s*=\s*useState<any>\(null\);\s*const\s*\[editingNotesForId,\s*setEditingNotesForId\]\s*=\s*useState<string\s*\|\s*null>\(null\);/;

const newBlock = `const [checkoutMode, setCheckoutMode] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState<any>(null);
  const [editingNotesForId, setEditingNotesForId] = useState<string | null>(null);
  const [modifierSelectionItem, setModifierSelectionItem] = useState<any>(null);`;

if (regex.test(code)) {
  code = code.replace(regex, newBlock);
  fs.writeFileSync('components/restaurantos/pos/POSWorkspace.tsx', code);
  console.log("Successfully added modifierSelectionItem state hook!");
} else {
  console.log("Failed to match state hooks!");
}
