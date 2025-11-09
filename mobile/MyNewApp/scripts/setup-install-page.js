#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Script to update the install.html with the actual APK URL
function updateInstallPage(apkUrl) {
    const installPagePath = path.join(__dirname, '../public/install.html');
    
    if (!fs.existsSync(installPagePath)) {
        console.error('Install page not found. Please run this from the project root.');
        process.exit(1);
    }
    
    let content = fs.readFileSync(installPagePath, 'utf8');
    content = content.replace('YOUR_APK_URL_HERE', apkUrl);
    
    fs.writeFileSync(installPagePath, content);
    console.log('✅ Install page updated with APK URL:', apkUrl);
    console.log('📱 Users can now visit this page to download and install your app easily!');
}

// Get APK URL from command line argument
const apkUrl = process.argv[2];

if (!apkUrl) {
    console.log('Usage: node setup-install-page.js <APK_URL>');
    console.log('Example: node setup-install-page.js https://expo.dev/artifacts/eas/your-build-id.apk');
    process.exit(1);
}

updateInstallPage(apkUrl);
