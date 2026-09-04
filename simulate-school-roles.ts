// simulate-school-roles.ts
async function checkRoutes() {
  const routes = [
    'http://localhost:3000/admin/school/admin',
    'http://localhost:3000/admin/school/teacher',
    'http://localhost:3000/school/student',
    'http://localhost:3000/admin/school/finance',
    'http://localhost:3000/admin/school/registrar',
    'http://localhost:3000/admin/school/counselor'
  ];

  const maxRetries = Infinity; // Wait indefinitely for other agents
  const retryDelayMs = 5000;

  for (const route of routes) {
    let success = false;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(route);
        if (response.ok) {
          console.log(`[OK] ${route}`);
          success = true;
          break;
        } else {
          console.log(`[WAITING] ${route} returned ${response.status}. Retrying in ${retryDelayMs/1000}s...`);
        }
      } catch (error) {
        console.log(`[ERROR] ${route} failed: ${(error as any).message}. Retrying in ${retryDelayMs/1000}s...`);
      }
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }
    if (!success) {
      console.error(`[FAILED] ${route} did not return 200 OK after ${maxRetries} attempts.`);
      process.exit(1);
    }
  }
  
  console.log("All routes successfully tested and returned 200 OK!");
}

checkRoutes();
