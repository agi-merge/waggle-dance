// pages/index.tsx

import { lazy, Suspense } from "react";

const LazyGoalDynamicRoute = lazy(() => import("~/pages/goal/[[...goal]]"));

export default function Home() {
  return (
    <Suspense>
      <LazyGoalDynamicRoute />
    </Suspense>
  );
}
