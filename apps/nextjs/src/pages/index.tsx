// pages/index.tsx

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { Skeleton } from "@mui/joy";

import ErrorBoundary from "../features/error/ErrorBoundary";

const MainLayout = dynamic(() => import("~/features/MainLayout"));

export default function Home() {
  const router = useRouter();
  return (
    <Suspense fallback={<Skeleton variant="text" />}>
      <MainLayout alertConfigs={[]}>
        <ErrorBoundary router={router}>
          <></>
        </ErrorBoundary>
        <div className="flex min-h-screen flex-col items-center justify-center py-2">
          hey
        </div>
      </MainLayout>
    </Suspense>
  );
}
