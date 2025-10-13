// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Load environment variables for tests
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local for integration tests
config({ path: resolve(process.cwd(), '.env.local') })

