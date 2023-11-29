// _app.tsx
import "../styles/globals.css";

import { CssVarsProvider } from "@mui/joy/styles";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { SessionProvider } from "next-auth/react";
import type { AppType } from "next/app";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { Suspense, useCallback, useEffect } from "react";

import { Session } from "@acme/auth";

import { TRPCReactProvider } from "~/app/providers";
import useApp from "~/stores/appStore";
import theme from "~/styles/theme";

const Analytics = dynamic(() =>
  import("@vercel/analytics/react").then((mod) => mod.Analytics),
);
type RouteControllerProps = {
  children: React.ReactNode;
};

type Props = InferGetServerSidePropsType<typeof getServerSideProps> & {
  session: Session | null;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { req, res } = context;
  const headers = req.headers;
  // const session = await auth(req, res);

  // You can now use the headers object as needed

  return {
    props: { headers }, // return props here
  };
};

export const RouteControllerProvider = ({ children }: RouteControllerProps) => {
  const { setIsPageLoading } = useApp();
  const router = useRouter();

  const handleStart = useCallback(() => {
    setIsPageLoading(true);
  }, [setIsPageLoading]);

  const handleStop = useCallback(() => {
    setIsPageLoading(false);
  }, [setIsPageLoading]);

  useEffect(() => {
    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleStop);
    router.events.on("routeChangeError", handleStop);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleStop);
      router.events.off("routeChangeError", handleStop);
    };
  }, [handleStart, handleStop, router]);

  return <>{children}</>;
};

const MyApp: AppType<Props> = ({
  Component,
  pageProps: { session, headers, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <TRPCReactProvider headers={headers()}>
        <RouteControllerProvider>
          <CssVarsProvider theme={theme} defaultMode="system">
            <Component {...pageProps} />
          </CssVarsProvider>
        </RouteControllerProvider>
        <Suspense>
          <Analytics />
        </Suspense>
      </TRPCReactProvider>
    </SessionProvider>
  );
};

export default MyApp;
