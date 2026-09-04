export {};

async function testRoute(route: string): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:3000${route}`);
    return res.status === 200;
  } catch (e) {
    return false;
  }
}

async function runTests() {
  const routesToTest = [
    '/hotel/frontdesk',
    '/hotel/manager',
    '/hotel/housekeeping'
  ];

  const alternativeRoutes = [
    '/admin/hotel/frontdesk',
    '/admin/hotel/manager',
    '/admin/hotel/housekeeping'
  ];

  let allPassed = false;
  let attempts = 0;
  const maxAttempts = 60; // Up to 10 minutes

  while (!allPassed && attempts < maxAttempts) {
    console.log(`\nAttempt ${attempts + 1}/${maxAttempts} - Testing routes...`);
    let passCount = 0;
    
    for (let i = 0; i < routesToTest.length; i++) {
      let passed = await testRoute(routesToTest[i]);
      if (passed) {
        console.log(`[PASS] ${routesToTest[i]}`);
        passCount++;
      } else {
        // try alternative
        passed = await testRoute(alternativeRoutes[i]);
        if (passed) {
          console.log(`[PASS] ${alternativeRoutes[i]}`);
          passCount++;
        } else {
          console.log(`[FAIL] ${routesToTest[i]} (and alternative)`);
        }
      }
    }

    if (passCount === routesToTest.length) {
      allPassed = true;
      console.log('\nAll routes successfully returned 200 OK!');
    } else {
      attempts++;
      console.log('Waiting 10 seconds before next attempt...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  if (!allPassed) {
    console.log('\nTests failed after maximum attempts.');
    process.exit(1);
  }
}

runTests();
