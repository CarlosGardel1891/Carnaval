import { lazy, Suspense } from 'react'

const SamplePage = lazy(() => import('./SamplePage'))

/** La muestra del sistema de diseño, bajada aparte: sólo se usa en desarrollo. */
export function LazySamplePage() {
  return (
    <Suspense fallback={null}>
      <SamplePage />
    </Suspense>
  )
}
