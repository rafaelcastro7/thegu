/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { SECOPAnalysis } from './components/SECOPAnalysis';

// Lazy-load the full audit platform (Fase 2) to keep initial bundle light
const AuditPlatform = lazy(() => import('./AuditPlatform'));

export default function App() {
  const [showFase2, setShowFase2] = useState(false);

  if (showFase2) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
          <Loader2 className="animate-spin text-[#004884]" size={40} />
        </div>
      }>
        <AuditPlatform onBack={() => setShowFase2(false)} />
      </Suspense>
    );
  }

  return <SECOPAnalysis onFase2={() => setShowFase2(true)} />;
}
