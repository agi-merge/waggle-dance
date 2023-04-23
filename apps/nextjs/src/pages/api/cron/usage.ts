import { get } from "@vercel/edge-config";
import { env } from "~/env.mjs";
import { type CombinedResponse, getOpenAIUsage } from "~/utils/openAIUsageAPI";

export const config = {
  runtime: 'edge'
}
export default async function handler() {
  const startDate = new Date();

  try {
    const openAIUsage: CombinedResponse | null = await getOpenAIUsage(
      startDate,
    );

    const cachedOpenAIUsage = (await get("openAIUsage")) as CombinedResponse;

    if (!env.EDGE_CONFIG_WRITE) {
      throw new Error('EDGE_CONFIG_WRITE is not defined')
    }

    if (openAIUsage.allottedUsage == cachedOpenAIUsage.allottedUsage
      && openAIUsage.currentUsage == cachedOpenAIUsage.currentUsage
      && openAIUsage.maxUsage == cachedOpenAIUsage.maxUsage) {
      console.log('No change in OpenAI usage')
      return new Response(JSON.stringify(openAIUsage), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const updateEdgeConfig = await fetch(
      env.EDGE_CONFIG_WRITE,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.VERCEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          items: [
            {
              operation: 'update',
              key: 'openAIUsage',
              value: {
                ...openAIUsage,
              },
            },
          ],
        }),
      },
    );

    return updateEdgeConfig;
    // const updateEdgeConfigResponse = await updateEdgeConfig.text();

    // return new Response(JSON.stringify(updateEdgeConfigResponse), {
    //   status: 200,
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    // });
  } catch (e) {
    console.error(String(e));
    return new Response(JSON.stringify(e), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}