type LineItem = {
    name: string;
    cost: number;
}

type DailyCost = {
    timestamp: number;
    line_items: LineItem[]
}

type UsageResponse = {
    total_usage: number;
    daily_costs: DailyCost[]
}

type SubscriptionResponse = {
    soft_limit: number;
    hard_limit: number;
    system_hard_limit: number;
    soft_limit_usd: number;
    hard_limit_usd: number;
    system_hard_limit_usd: number;
};

export type CombinedResponse = {
    currentUsage: number | null;
    allottedUsage: number | null;
    maxUsage: number | null;
};

export const getOpenAIUsage = async (startDate: Date): Promise<CombinedResponse> => {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1)
    startDate.setDate(1)
    endDate.setDate(1)
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "OpenAI-Organization": process.env.OPENAI_ORGANIZATION_ID || "",
        "stale-while-revalidate": "86400",
    };

    // if this isn't exactly one month, usageData will be something other than usd and mess up calculations
    const usageRequest = fetch(
        `https://api.openai.com/dashboard/billing/usage?start_date=${formattedStartDate}&end_date=${formattedEndDate}`,
        {
            headers,
            method: "GET",
        }
    );

    const subscriptionRequest = fetch("https://api.openai.com/dashboard/billing/subscription", {
        headers,
        method: "GET",
    });

    try {
        const [usageResponse, subscriptionResponse] = await Promise.all([
            usageRequest,
            subscriptionRequest,
        ]);

        const usageData = await usageResponse.json() as UsageResponse;
        const subscriptionData = await subscriptionResponse.json() as SubscriptionResponse;
        usageData.total_usage
        subscriptionData.hard_limit_usd
        return {
            currentUsage: (usageData.total_usage / 100),
            allottedUsage: subscriptionData.hard_limit_usd,
            maxUsage: subscriptionData.system_hard_limit_usd,
        };
    } catch (error) {
        console.error("Error fetching OpenAI data:", error);
        throw new Error(`Error fetching OpenAI data: ${JSON.stringify(error)}`);
    }
};

const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};