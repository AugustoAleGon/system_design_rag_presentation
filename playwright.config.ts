import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests',
 use:{baseURL:'http://localhost:4322',viewport:{width:1440,height:900},reducedMotion:'reduce',channel:'chrome'},
 webServer:{command:'npm run preview -- --port 4322 --ignore-lock',url:'http://localhost:4322',reuseExistingServer:!process.env.CI},
});
