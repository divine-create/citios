import fs from 'fs';

let code = fs.readFileSync('app/(resident)/workspaces/[os]/[slug]/page.tsx', 'utf8');

const regex = /if\s*\(os\s*===\s*'shopos'\)\s*\{[\s\S]*?\}/;

const replacement = `if (os === 'restaurantos') {
    const { redirect } = await import('next/navigation');
    redirect(\`/workspaces/restaurantos/\${slug}/management/overview\`);
  }

  if (os === 'shopos') {
    return (
      <ShopDashboard
        organizationId={slug}
        userRole={userRole}
        currentUserId={currentUserId}
      />
    );
  }`;

if (code.includes("{os === 'restaurantos' && <RestaurantOSWorkspace slug={slug} />}")) {
  code = code.replace("{os === 'restaurantos' && <RestaurantOSWorkspace slug={slug} />}", "");
  code = code.replace(regex, replacement);
  fs.writeFileSync('app/(resident)/workspaces/[os]/[slug]/page.tsx', code);
  console.log("Updated router!");
} else {
  console.log("Could not find the component to replace");
}
