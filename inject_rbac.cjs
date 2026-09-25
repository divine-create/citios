const fs = require('fs');
let content = fs.readFileSync('lib/rbac.ts', 'utf8');

if (!content.includes('requireSystemAdmin')) {
  content += `
export async function requireSystemAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSystemAdmin) {
    redirect("/");
  }
  return session;
}
`;
  fs.writeFileSync('lib/rbac.ts', content);
}
