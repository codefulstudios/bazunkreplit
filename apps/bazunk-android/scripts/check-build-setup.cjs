const fs = require('node:fs');
const config = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const projectId = process.env.EXPO_PROJECT_ID || config.expo.extra?.eas?.projectId;
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId || '')) {
  console.error('Expo setup is not complete. Add the real Expo project UUID as the GitHub Actions variable EXPO_PROJECT_ID. See START-HERE.md.');
  process.exit(1);
}
if (!process.env.EXPO_TOKEN) {
  console.error('Add your Expo access token as the GitHub Actions secret EXPO_TOKEN. Never put it in source code or chat.');
  process.exit(1);
}
config.expo.extra = { ...config.expo.extra, eas: { ...config.expo.extra?.eas, projectId } };
fs.writeFileSync('app.json', JSON.stringify(config, null, 2) + '\n');
console.log('Expo project configured. Existing Android signing credentials must also be set up in Expo.');
