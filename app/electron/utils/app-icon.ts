import path from "node:path";
import { fileURLToPath } from "node:url";

// Window/taskbar icon. Vite copies public/icon.png into dist/, which ships in the package;
// in dev the dist copy may be stale or missing, so read it straight from public/.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const APP_ICON_PATH = path.join(__dirname, process.env.VITE_DEV_SERVER_URL ? "../public/icon.png" : "../dist/icon.png");
