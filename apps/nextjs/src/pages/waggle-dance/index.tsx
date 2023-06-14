// WaggleDance.tsx
import React from "react";
import type { InferGetStaticPropsType } from "next";
import { TabPanel } from "@mui/joy";

import { getOpenAIUsage, type CombinedResponse } from "~/utils/openAIUsageAPI";
import MainLayout from "~/features/MainLayout";
import WaggleDanceGraph from "~/features/WaggleDance/components/WaggleDanceGraph";
import useGoalStore from "~/stores/goalStore";

export const getStaticProps = async () => {
  const startDate = new Date();

  try {
    const openAIUsage: CombinedResponse | null = await getOpenAIUsage(
      startDate,
    );

    return {
      props: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        openAIUsage: JSON.parse(JSON.stringify(openAIUsage)),
      },
      // Next.js will attempt to re-generate the page:
      // - When a request comes in
      // - At most once every 10 seconds
      revalidate: 300, // In seconds
    };
  } catch (e) {
    return {
      props: {
        openAIUsage: null,
      },
      revalidate: 0,
    };
  }
};

export default function WaggleDance({
  openAIUsage,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const { goalList } = useGoalStore();

  // useEffect(() => {
  //   // Redirect if the goal is undefined or empty
  //   if (goalMap.size === 0) {
  //     void router.push("/");
  //   }
  // }, [goalMap, router]);

  return (
    <MainLayout openAIUsage={openAIUsage}>
      {goalList.map((tab, index) => (
        <TabPanel key={tab.id} value={index}>
          <WaggleDanceGraph />
        </TabPanel>
      ))}
      {goalList.length < 1 && <WaggleDanceGraph />}
    </MainLayout>
  );
}
