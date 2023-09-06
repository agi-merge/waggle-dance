// pages/index.tsx

import { type InferGetServerSidePropsType } from "next";

import GoalDynamicRoute from "~/pages/goal/[[...goal]]";
import { getStaticProps as getStaticPropsMain } from "./goal/[[...goal]]";

export const getStaticProps = getStaticPropsMain;

export default function Home({
  alertConfigs,
}: InferGetServerSidePropsType<typeof getStaticPropsMain>) {
  return <GoalDynamicRoute alertConfigs={alertConfigs} />;
}
