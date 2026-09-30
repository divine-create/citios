const fs = require('fs');

let code = fs.readFileSync('lib/voice/tools/impl/cart.ts', 'utf8');

// Patch getCart
const targetGetCart = `        items: cart.items.map((i: any) => ({
          productId: i.productId,
          name: i.product?.name || 'Unknown',
          price: i.product?.price || 0,
          quantity: i.quantity,
        })),`;

const replaceGetCart = `        items: cart.items.map((i: any) => ({
          productId: i.retailProductId || i.menuItemId,
          name: (i.kind === 'retail' ? i.product?.name : i.menuItem?.name) || 'Unknown',
          price: (i.kind === 'retail' ? i.product?.price : i.menuItem?.price) || 0,
          quantity: i.quantity,
          kind: i.kind
        })),`;

code = code.replace(targetGetCart, replaceGetCart);

// Patch inputSchemas for add, update, remove
const targetAddSchema = `      product_id: { type: "string", description: "Optional. The ID of the product. Omit if it's clear from context." },
      quantity: { type: "number", description: "The quantity to add" }`;

const replaceAddSchema = `      product_id: { type: "string", description: "Optional. The ID of the product. Omit if it's clear from context." },
      quantity: { type: "number", description: "The quantity to add" },
      kind: { type: "string", description: "The type of product: 'retail' or 'food'. Defaults to 'retail'." }`;

code = code.replace(targetAddSchema, replaceAddSchema);

const targetUpdateSchema = `      product_id: { type: "string", description: "Optional. The ID of the product." },
      quantity: { type: "number", description: "The new quantity (0 to remove)" }`;
      
const replaceUpdateSchema = `      product_id: { type: "string", description: "Optional. The ID of the product." },
      quantity: { type: "number", description: "The new quantity (0 to remove)" },
      kind: { type: "string", description: "The type of product: 'retail' or 'food'. Defaults to 'retail'." }`;

code = code.replace(targetUpdateSchema, replaceUpdateSchema);

const targetRemoveSchema = `      product_id: { type: "string", description: "Optional. The ID of the product to remove." }`;
const replaceRemoveSchema = `      product_id: { type: "string", description: "Optional. The ID of the product to remove." },
      kind: { type: "string", description: "The type of product: 'retail' or 'food'. Defaults to 'retail'." }`;
code = code.replace(targetRemoveSchema, replaceRemoveSchema);


// Patch execute bodies
const targetAddExecute = `    const res = await addVoiceCartItem(session.user.personId, productId, qty);`;
const replaceAddExecute = `    const kind = args.kind === 'food' ? 'food' : 'retail';\n    const res = await addVoiceCartItem(session.user.personId, productId, qty, kind);`;
code = code.replace(targetAddExecute, replaceAddExecute);

const targetUpdateExecute = `    const res = await updateVoiceCartQuantity(session.user.personId, productId, qty);`;
const replaceUpdateExecute = `    const kind = args.kind === 'food' ? 'food' : 'retail';\n    const res = await updateVoiceCartQuantity(session.user.personId, productId, qty, kind);`;
code = code.replace(targetUpdateExecute, replaceUpdateExecute);

const targetRemoveExecute = `    const res = await removeVoiceCartItem(session.user.personId, productId);`;
const replaceRemoveExecute = `    const kind = args.kind === 'food' ? 'food' : 'retail';\n    const res = await removeVoiceCartItem(session.user.personId, productId);`;
code = code.replace(targetRemoveExecute, replaceRemoveExecute);

fs.writeFileSync('lib/voice/tools/impl/cart.ts', code);
