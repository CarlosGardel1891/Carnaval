import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import './i18n'

// Sin `globals`, Testing Library no desmonta sola lo que renderizó cada test.
afterEach(cleanup)
