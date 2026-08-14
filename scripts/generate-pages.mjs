// Generates the example/github/icons HTML pages by invoking the existing
// CommonJS generator modules under src/tools/. These modules read/write
// paths relative to process.cwd(), so this script must be run from the
// repository root (e.g. via `npm run build:pages`).
import createPotreePage from '../src/tools/create_potree_page.js';
import createGithubPage from '../src/tools/create_github_page.js';
import createIconsPage from '../src/tools/create_icons_page.js';

await Promise.all([
	createPotreePage.createExamplesPage(),
	createGithubPage.createGithubPage(),
	createIconsPage.createIconsPage(),
]);
