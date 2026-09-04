export {};

async function checkRoute(route: string, maxRetries = 30, delayMs = 3000): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`Checking ${route} (Attempt ${i + 1}/${maxRetries})...`);
            const response = await fetch(route);
            if (response.ok) {
                console.log(`SUCCESS: ${route} returned ${response.status}`);
                return true;
            } else {
                console.log(`WAITING: ${route} returned ${response.status}`);
            }
        } catch (error: any) {
            console.log(`ERROR: Could not connect to ${route} - ${error.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    console.error(`FAILED: ${route} did not return 200 OK after ${maxRetries} attempts.`);
    return false;
}

async function main() {
    const routes = [
        'http://localhost:3000/grocery/manager',
        'http://localhost:3000/grocery/picker',
        'http://localhost:3000/grocery/dispatch'
    ];
    
    let allPassed = true;
    for (const route of routes) {
        const passed = await checkRoute(route, 30, 3000); // 30 attempts, 3s delay = 90s per route
        if (!passed) {
            allPassed = false;
        }
    }
    
    if (allPassed) {
        console.log("ALL TESTS PASSED: All grocery portals are up and running.");
        process.exit(0);
    } else {
        console.error("TESTS FAILED: Some grocery portals failed to return 200 OK.");
        process.exit(1);
    }
}

main();
