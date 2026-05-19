import sharp from "sharp";

await sharp("./Logo BL.png").resize(512, 512).png().toFile("public/icon-512x512.png");
console.log("✓ icon-512x512.png");

await sharp("./Logo BL.png").resize(192, 192).png().toFile("public/icon-192x192.png");
console.log("✓ icon-192x192.png");

await sharp("./Logo BL.png").resize(180, 180).png().toFile("public/apple-touch-icon.png");
console.log("✓ apple-touch-icon.png (iOS)");

await sharp("./Logo BL.png").resize(64, 64).png().toFile("public/favicon-64.png");
console.log("✓ favicon-64.png");
