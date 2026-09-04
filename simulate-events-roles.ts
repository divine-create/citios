export {};

async function checkRoute(url: string) {
    const maxRetries = 60;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                console.log(`[SUCCESS] ${url} returned ${res.status}`);
                return true;
            } else {
                console.log(`[PENDING] ${url} returned ${res.status}. Retrying in 5s...`);
            }
        } catch (error) {
            console.log(`[ERROR] Failed to fetch ${url}. Retrying in 5s...`);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    console.log(`[FAILED] ${url} did not return 200 OK after ${maxRetries} retries.`);
    return false;
}

async function runTests() {
    const urls = [
        'http://localhost:3000/events/organizer',
        'http://localhost:3000/events/scanner'
    ];
    
    let allPassed = true;
    for (const url of urls) {
        const passed = await checkRoute(url);
        if (!passed) allPassed = false;
    }
    
    if (allPassed) {
        console.log("All routes compiled and rendered correctly.");
        process.exit(0);
    } else {
        console.log("Some routes failed.");
        process.exit(1);
    }
}

runTests();
