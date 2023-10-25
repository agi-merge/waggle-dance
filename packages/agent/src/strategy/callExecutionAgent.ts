// agent/strategy/callExecutionAgent.ts

import {
  initializeAgentExecutorWithOptions,
  type InitializeAgentExecutorOptions,
} from "langchain/agents";
import { type ChatOpenAI } from "langchain/chat_models/openai";
import { type InitializeAgentExecutorOptionsStructured } from "langchain/dist/agents/initialize";
import { type StructuredTool, type Tool } from "langchain/dist/tools/base";
import { loadEvaluator } from "langchain/evaluation";
import { PlanAndExecuteAgentExecutor } from "langchain/experimental/plan_and_execute";
import { type OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import { type AgentStep } from "langchain/schema";
import { parse as jsonParse, stringify as jsonStringify } from "superjson";
import { parse as yamlParse, stringify as yamlStringify } from "yaml";

import { type DraftExecutionGraph } from "@acme/db";

import {
  createCriticizePrompt,
  createExecutePrompt,
  createMemory,
  TaskState,
  type MemoryType,
} from "../..";
import checkTrajectory from "../grounding/checkTrajectory";
import { isTaskCriticism } from "../prompts/types";
import type Geo from "../utils/Geo";
import {
  getAgentPromptingMethodValue,
  InitializeAgentExecutorOptionsAgentTypes,
  InitializeAgentExecutorOptionsStructuredAgentTypes,
  LLM,
  LLM_ALIASES,
  ModelStyle,
  type AgentPromptingMethod,
  type InitializeAgentExecutorOptionsAgentType,
  type InitializeAgentExecutorOptionsStructuredAgentType,
} from "../utils/llms";
import { createEmbeddings, createModel } from "../utils/model";
import { type ModelCreationProps } from "../utils/OpenAIPropsBridging";
import createSkills from "../utils/skills";

export async function callExecutionAgent(creation: {
  creationProps: ModelCreationProps;
  goalPrompt: string;
  goalId: string;
  agentPromptingMethod: AgentPromptingMethod;
  task: string;
  dag: string;
  revieweeTaskResults: TaskState[];
  contentType: "application/json" | "application/yaml";
  abortSignal: AbortSignal;
  namespace: string;
  geo?: Geo;
}): Promise<string | Error> {
  const {
    goalId: _goalId,
    creationProps,
    goalPrompt,
    agentPromptingMethod,
    task,
    dag,
    revieweeTaskResults: revieweeTaskResultsNeedDeserialization,
    abortSignal,
    namespace,
    contentType,
    geo,
  } = creation;
  const callbacks = creationProps.callbacks;
  creationProps.callbacks = undefined;
  const llm = createModel(creationProps, agentPromptingMethod);

  const embeddings = createEmbeddings({ modelName: LLM.embeddings });
  const taskObj = yamlParse(task) as { id: string };
  const isCriticism = isTaskCriticism(taskObj.id);
  const returnType = contentType === "application/json" ? "JSON" : "YAML";
  const memory = await createMemory({
    namespace,
    taskId: taskObj.id,
  });

  // methods need to be reattached
  const revieweeTaskResults = revieweeTaskResultsNeedDeserialization.map(
    (t) => new TaskState({ ...t }),
  );

  if (isCriticism && !revieweeTaskResults) {
    throw new Error("No result found to provide to review task");
  }

  const nodes = (yamlParse(dag) as DraftExecutionGraph).nodes;
  const prompt = isCriticism
    ? createCriticizePrompt({
        revieweeTaskResults,
        nodes,
        namespace,
        returnType,
      })
    : createExecutePrompt({
        task,
        goalPrompt,
        namespace,
        returnType,
        modelName: creationProps.modelName || LLM_ALIASES["fast"],
      });
  const tags = [
    isCriticism ? "criticize" : "execute",
    agentPromptingMethod,
    taskObj.id,
  ];
  namespace && tags.push(namespace);
  creationProps.modelName && tags.push(creationProps.modelName);

  const skills = createSkills(
    llm,
    embeddings,
    agentPromptingMethod,
    isCriticism,
    taskObj.id,
    returnType,
    geo,
  );

  const executor = await initializeExecutor(
    goalPrompt,
    agentPromptingMethod,
    taskObj,
    creationProps,
    skills,
    llm,
    tags,
    memory,
  );

  const toolsAndContextExamples = [
    {
      input: {
        task: {
          task: "Research AgentGPT",
          inServiceOfGoal:
            "Compare and contrast AgentGPT, AutoGPT, BabyAGI, https://waggledance.ai, and SuperAGI. Find similar projects or state of the art research papers. Create a .md (GFM) report of the findings.",
          availableDataSources: [
            "user.profile.basic",
            "notion",
            "memory",
            "memory.longterm",
            "stock.market.data",
            "academic.papers",
          ],
          availableTools: [
            "Retrieve Memories",
            "Save Memories",
            "Web Browser",
            "Google Search",
            "Google News",
            "YouTube",
            "Bloomberg Terminal",
            "Google Scholar",
            "Google Trends",
            "Amazon Search",
            "IMDB Search",
            "arXiv Search",
            "GitHub",
          ],
        },
      },
      output: {
        synthesizedContext: [
          {
            knowledgeCutoff:
              "My training data prior my knowledge cut-off does not contain coherent information about AgentGPT.",
          },
          {
            memory:
              "AgentGPT, hosted by Reworkd, allows users to configure and deploy Autonomous AI agents. It provides a user-friendly interface to control and monitor agents, making it easier to bring ideas to life.",
          },
          {
            "user.profile.basic":
              "The User is an expert in AI and has a PhD in Computer Science.",
          },
        ],
        tools: [
          "Retrieve Memories",
          "Save Memories",
          "Google Search",
          "Google News",
          "Google Scholar",
          "Google Trends",
        ],
      },
      remarks: {
        synthesizedContext:
          "The synthesized context is good because it honestly communicates the limitations of the agent's knowledge. It doesn't try to make up information or guess, but instead clearly states that it doesn't have the required information.",
        tools:
          "The tools selected are appropriate for the task at hand. 'Retrieve Memories', 'Save Memories', 'Google Search', 'Google News', 'Google Scholar', 'Google Trends' are external tools that the agent can use to gather information from the web. The agent doesn't try to use a tool that isn't suited for the task, which aligns with the LLM's limitations.",
      },
    },
    {
      input: {
        task: {
          task: "Write a Python script",
          inServiceOfGoal:
            "Write a Python script that scrapes data from a website and stores it in a CSV file.",
          availableDataSources: [
            "user.profile.basic",
            "notion",
            "stock.market.data",
            "memory",
            "memory.longterm",
          ],
          availableTools: [
            "Single-function Python Interpreter",
            "Google Trends",
            "Web Browser",
            "Google Search",
            "Stack Overflow",
            "GitHub",
          ],
        },
      },
      output: {
        synthesizedContext: [
          {
            knowledgeCutoff:
              "I'm aware of Python's capabilities for web scraping up until my last training cut-off.",
          },
          {
            memory:
              "Python's BeautifulSoup and Scrapy libraries are commonly used for web scraping. The csv module can be used to store data in a CSV file.",
          },
          {
            "user.profile.basic":
              "The User is a software developer with Python experience.",
          },
          {
            specificGuidance:
              "Check for version changes to see if BeautifulSoup 4.x is still the latest",
          },
        ],
        tools: [
          "Single-function Python Interpreter",
          "Web Browser",
          "Google Search",
          "Stack Overflow",
          "GitHub",
        ],
      },
      remarks: {
        synthesizedContext:
          "The synthesized context is good because it accurately reflects the agent's knowledge and the user's expertise. It also provides relevant information about the task.",
        tools:
          "The tools selected are appropriate for the task. 'Single-function Python Interpreter' is necessary for writing the script, while 'Web Browser', 'Google Search', 'Stack Overflow', and 'GitHub' can be used to find information and code examples.",
      },
    },
    {
      input: {
        task: {
          task: "Analyze stock market trends",
          inServiceOfGoal:
            "Analyze the stock market trends for the past 5 years and predict the future trends. Create a .xlsx report of the findings.",
          availableDataSources: [
            "notion",
            "user.profile.basic",
            "memory",
            "memory.longterm",
            "stock.market.data",
            "financial.reports",
          ],
          availableTools: [
            "Retrieve Memories",
            "Save Memories",
            "Web Browser",
            "Google Search",
            "Google Finance",
            "Yahoo Finance",
            "Bloomberg Terminal",
            "Google Scholar",
            "Financial Analysis Tool",
          ],
        },
        remarks: {
          synthesizedContext:
            "The synthesized context is good because it accurately reflects the user's needs.",
          tools: "The selected tools are appropriate for the task at hand.",
        },
      },
      output: {
        synthesizedContext: [
          {
            knowledgeCutoff:
              "My training data prior my knowledge cut-off is missing information between the knowledge cut-off and the Current Time.",
          },
          {
            "user.profile.basic": "The User is not an expert in finance.",
          },
        ],
        tools: [
          "Retrieve Memories",
          "Save Memories",
          "Web Browser",
          "Google Search",
          "Google Finance",
          "Yahoo Finance",
        ],
      },
    },
    {
      input: {
        task: {
          task: "Translate text",
          inServiceOfGoal:
            "Translate the following English text to French: 'Hello, how are you?'",
          availableDataSources: [
            "user.profile.basic",
            "memory",
            "stock.market.data",
            "language.databases",
          ],
          availableTools: ["Translation Tool", "Google Search"],
        },
      },
      output: {
        synthesizedContext: [
          {
            "user.profile.basic":
              "The User is fluent in English and wants to translate text to French.",
          },
        ],
        tools: ["Translation Tool"],
      },
      remarks: {
        synthesizedContext:
          "The synthesized context is good because it accurately reflects the user's needs.",
        tools: "The selected tool is appropriate for the task at hand.",
      },
    },
  ];

  const inputTaskAndGoal = {
    task: task,
    inServiceOfGoal: goalPrompt,
    availableDataSources: [],
    availableTools: skills.map((s) => s.name),
  };

  const inputTaskAndGoalString =
    returnType === "JSON"
      ? jsonStringify(inputTaskAndGoal)
      : yamlStringify(inputTaskAndGoal);

  const examples =
    returnType === "JSON"
      ? jsonStringify(toolsAndContextExamples)
      : yamlStringify(toolsAndContextExamples);
  const promptTemplate = PromptTemplate.fromTemplate(
    `[system]
You are an efficient and expert assistant, preparing the context and tool configuration for an ethical LLM Agent to perform a Task for the User.
# Namespace: ${namespace}
# Current Time:
${new Date().toString()}
# LLM/Agent Limitations:
\`\`\`md
### LLM's need Escape Hatches
Building on the previous rule, the model is always looking for an escape hatch when it's confused or unsure. They always want to answer the question they were asked or to perform the task they were given. They will use everything at their disposal to accomplish that. If the model doesn't see the information it needs or the appropriate tool to use it will start hallucinating things in a effort to achieve its goal. You can avoid these hallucinations by giving the model escape paths.

For Agents in particular, a really useful escape hatch is to give the model an "ask" command.  If the model is confused on unsure just ask the user. The model will take this escape hatch more often then you think which is actually good. I give every agent I build "ask" and "answer" commands and these two additions dramatically improved the overall reliability of my agents completing tasks.

## LLM's will Abuse Tools
Careful tool selection is key for building Agents. If you give an agent a screwdriver and it needs a hammer it will try to pound in a nail with a screwdriver. Again, they want to complete the task they're presented with using whatever means possible.

Don't give the model a general purpose code tool because it will use it for everything and it will only work about 25% of the time. Instead give the model a math tool and tell it that it can write any sort of javascript expression to compute a value.  This will dramatically improve the reliability of the model to only use that tool for math and not magic.
Don't show LLM's Overlapping Tools
I could create a whole separate posts that dives into how you should think about breaking problems into a hierarchy of tasks/tools but the upshot is that you shouldn't show the model tools with similar uses. For example, don't give it both a webSearch and a pageSearch tool. You won't be able to predict when it uses one over the other as they're too similar. Instead give the model a single webSearch tool and then have that tool decide when it needs to do a pageSearch.

How you frame your question determines what kind of answer you get. Likely as a result of RLHF training, trained LLMs are biased towards responses that are more likely to be rated positively, rather than what's true.

\`\`\`
# Examples:
${examples}
**It is extremely important to use this as just examples. For example, if "user.profile.basic" is not relevant, do not include it.**
[human]
Provide (in valid ${returnType}) ( tools: string[], context: string | ([key: string]: string)[] ) that would improve the probability of success for the following:
${inputTaskAndGoalString}
`,
  );

  const chatLlm = createModel(creationProps, ModelStyle.Chat) as ChatOpenAI;
  const chain = promptTemplate.pipe(chatLlm);

  const contextCall = await chain.invoke({});

  type ContextAndTools = {
    context: unknown[];
    tools: string[];
  };
  const contextAndTools = (
    returnType === "JSON"
      ? jsonParse(contextCall.content)
      : yamlParse(contextCall.content)
  ) as ContextAndTools;

  console.warn(`${taskObj.id} contextAndTools`, contextAndTools);
  const formattedMessages = await prompt.formatMessages({
    ...contextAndTools,
  });

  const input: string = formattedMessages
    .map((m) => `${m._getType()}: ${m.content}`)
    .join("\n");

  try {
    const call = await executor.call(
      {
        input,
        signal: abortSignal,
        tags,
      },
      callbacks,
    );

    const response = call?.output ? (call.output as string) : "";
    if (response === "Agent stopped due to max iterations.") {
      // brittle; this should really be an error in langchain
      throw new Error(response);
    }

    if (isCriticism) {
      return response;
    }

    const smartModelForEvaluation = createModel(
      { modelName: LLM_ALIASES["smart"] },
      ModelStyle.Chat,
    );

    // from langchain/evaluation/criteria:
    /*
      conciseness: "Is the submission concise and to the point?",
      relevance: "Is the submission referring to a real quote from the text?",
      correctness: "Is the submission correct, accurate, and factual?",
      coherence: "Is the submission coherent, well-structured, and organized?",
      harmfulness: "Is the submission harmful, offensive, or inappropriate?" +
          " If so, response Y. If not, respond N.",
      maliciousness: "Is the submission malicious in any way?" +
          " If so, response Y. If not, respond N.",
      helpfulness: "Is the submission helpful, insightful, and appropriate?" +
          " If so, response Y. If not, respond N.",
      controversiality: "Is the submission controversial or debatable?" +
          " If so, response Y. If not, respond N.",
      misogyny: "Is the submission misogynistic? If so, response Y." +
          " If not, respond N.",
      criminality: "Is the submission criminal in any way?" +
          " If so, response Y. If not, respond N.",
      insensitivity: "Is the submission insensitive to any group of people?" +
          " If so, response Y. If not, respond N.",
      depth: "Does the submission demonstrate depth of thought?",
      creativity: "Does the submission demonstrate novelty or unique ideas?",
      detail: "Does the submission demonstrate attention to detail?",
    */ const taskFulfillmentEvaluator = await loadEvaluator("trajectory", {
      llm: smartModelForEvaluation,
      criteria: {
        taskFulfillment: "Does the submission fulfill the specific TASK?",
      },
      agentTools: skills,
    });

    const schemaAdherenceEvaluator = await loadEvaluator("trajectory", {
      llm: smartModelForEvaluation,
      criteria: {
        schemaAdherence: "Does the submission adhere to the specified SCHEMA?",
      },
      agentTools: skills,
    });

    const constraintsEvaluator = await loadEvaluator("trajectory", {
      llm: smartModelForEvaluation,
      criteria: {
        rulesAdherence: "Does the submission adhere to each of the RULES?",
      },
      agentTools: skills,
    });

    const agentTrajectory = call.intermediateSteps as AgentStep[];

    try {
      const evaluators = [
        taskFulfillmentEvaluator,
        schemaAdherenceEvaluator,
        constraintsEvaluator,
      ];

      await checkTrajectory(
        response,
        input,
        agentTrajectory,
        abortSignal,
        tags,
        callbacks,
        evaluators,
      );

      return response;
    } catch (error) {
      return error as Error;
    }
  } catch (error) {
    console.error(error);
    return error as Error;
  }
}

async function initializeExecutor(
  _goalPrompt: string,
  agentPromptingMethod: AgentPromptingMethod,
  _taskObj: { id: string },
  creationProps: ModelCreationProps,
  tools: StructuredTool[],
  llm: OpenAI | ChatOpenAI,
  tags: string[],
  memory: MemoryType,
) {
  let executor;
  const agentType = getAgentPromptingMethodValue(agentPromptingMethod);
  let options:
    | InitializeAgentExecutorOptions
    | InitializeAgentExecutorOptionsStructured;
  if (
    InitializeAgentExecutorOptionsAgentTypes.includes(
      agentType as InitializeAgentExecutorOptionsAgentType,
    )
  ) {
    options = {
      agentType,
      earlyStoppingMethod: "generate",
      returnIntermediateSteps: true,
      ...creationProps,
      tags,
      handleParsingErrors: true,
    } as InitializeAgentExecutorOptions;

    if (
      agentType !== "zero-shot-react-description" &&
      agentType !== "chat-zero-shot-react-description"
    ) {
      options.memory = memory;
    }

    executor = await initializeAgentExecutorWithOptions(
      tools as Tool[],
      llm,
      options,
    );
  } else if (
    InitializeAgentExecutorOptionsStructuredAgentTypes.includes(
      agentType as InitializeAgentExecutorOptionsStructuredAgentType,
    )
  ) {
    options = {
      agentType: agentType,
      returnIntermediateSteps: true,
      earlyStoppingMethod: "generate",
      ...creationProps,
      tags,
    } as InitializeAgentExecutorOptionsStructured;

    if (agentType !== "structured-chat-zero-shot-react-description") {
      options.memory = memory;
    }

    executor = await initializeAgentExecutorWithOptions(tools, llm, options);
  } else {
    executor = PlanAndExecuteAgentExecutor.fromLLMAndTools({
      llm,
      tools: tools as Tool[],
      tags,
    });
  }
  return executor;
}
