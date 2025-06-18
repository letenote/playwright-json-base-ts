import { isDevMode } from "./core/helpers/isDevMode";
import { main } from "./main";

main({
  rootFolder: "scenarios",
  // devPath: "scenarios/1-portal/0-login/1-empty-form.json",
  // devPath: "scenarios/1-portal/0-login/0-invalid-user.json",
  devPath: "scenarios/0-instagram/0-login/0-ig-login.json",
  config: {
    headless: !isDevMode(),
    defaultBrowser: "chromium",
    devtools: true,
    autoClose: !isDevMode(),
  },
});
