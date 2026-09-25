const fs = require('fs');
let content = fs.readFileSync('components/cityos/BusinessDashboard.tsx', 'utf8');

content = content.replace(
  "SCHOOL: { href: currentBusiness ? /workspaces/schoolos/ : '/admin/school', label: 'Full EduOS' }",
  "SCHOOL: { href: currentBusiness ? /school/admin?org= : '/school/admin', label: 'Full EduOS' }"
);

fs.writeFileSync('components/cityos/BusinessDashboard.tsx', content);
console.log('Done');
