const fs = require('fs');
let content = fs.readFileSync('app/actions/commerce.ts', 'utf8');

const regex = /revalidatePath\('\/workspaces\/shopos'\);[\s\S]*?revalidatePath\(`\/product\/\$\{item\.productId\}`\);\s*\}/g;

content = content.replace(regex, `try { 
    revalidatePath('/workspaces/shopos'); 
    revalidatePath('/market'); 
    for(const item of input.items) { 
      revalidatePath(\`/product/\${item.productId}\`); 
    } 
  } catch(e) {}`);

fs.writeFileSync('app/actions/commerce.ts', content);
