import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './e2e',
    use: { baseURL: 'http://127.0.0.1:4173' },
    // the browser engines behind Chrome/Edge, Firefox and Safari
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } }
    ],
    webServer: {
        command: 'npx vite preview --port 4173 --strictPort --host 127.0.0.1',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI
    }
})
