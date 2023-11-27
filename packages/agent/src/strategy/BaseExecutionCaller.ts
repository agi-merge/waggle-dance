// agent/strategy/BaseExecutionCaller.ts
import { type DraftExecutionGraph } from "@acme/db";
import { type ChatOpenAI } from "langchain/chat_models/openai";
import { type StructuredTool } from "langchain/dist/tools/base";
import { type Embeddings } from "langchain/embeddings/base";
import { type OpenAI } from "langchain/llms/openai";
import {
  type ChatPromptTemplate,
} from "langchain/prompts";
import { type BaseMessage, type MessageContent } from "langchain/schema";
import { v4 } from "uuid";
import { parse as yamlParse } from "yaml";
import {
  TaskState,
  createCriticizePrompt,
  createEmbeddings,
  createExecutePrompt,
  createModel,
  createMemory as createShortTermMemory,
  extractTier,
  type ChainValues,
  type MemoryType
} from "../..";
import { type ToolsAndContextPickingInput } from "../prompts/createContextAndToolsPrompt";
import { isTaskCriticism } from "../prompts/types";
import retrieveMemoriesSkill from "../skills/retrieveMemories";
import {
  LLM
} from "../utils/llms";
import { stringifyByMime } from "../utils/mimeTypeParser";
import createSkills from "../utils/skills";
import {
  type CallExecutionAgentProps,
  type ContextAndTools
} from "./execute/callExecutionAgent.types";
import { initializeExecutor, type InitializeExecutorReturnType } from "./execute/initializeAgentExecutor";

export abstract class BaseExecutionCaller {
  protected abstract runName: string;

  protected exeLLM: OpenAI | ChatOpenAI;
  protected embeddings: Embeddings;
  protected taskObj: { id: string; name: string; context: string };
  protected returnType: "YAML" | "JSON";
  protected shortTermMemory: MemoryType | undefined;
  protected revieweeTaskResults: TaskState[];
  protected dagObj: DraftExecutionGraph;
  protected prompt: ChatPromptTemplate = {} as ChatPromptTemplate;
  protected tags: string[] = [];
  protected skills: StructuredTool[] = [];
  protected taskAndGoal: ToolsAndContextPickingInput = {} as ToolsAndContextPickingInput;
  protected memories: string = '';
  protected availableTools: string[] = [];
  protected contextAndTools: ContextAndTools = {} as ContextAndTools;
  protected formattedMessages: BaseMessage[] = [];
  protected systemMessage: MessageContent | undefined = undefined;
  protected humanMessage: MessageContent | undefined = undefined;
  protected filteredSkills: StructuredTool[] = [];
  protected executor: InitializeExecutorReturnType | undefined;
  protected result: ChainValues | undefined = undefined;


 constructor(creation: CallExecutionAgentProps) {
    const {
      creationProps,
      goalPrompt,
      executionId,
      agentPromptingMethod,
      task,
      dag,
      revieweeTaskResults: revieweeTaskResultsNeedDeserialization,
      abortSignal,
      executionNamespace,
      contentType,
      handlePacketCallback,
      agentProtocolOpenAPISpec,
      geo,
    } = creation;

    this.exeLLM = createModel(creationProps, agentPromptingMethod);
    this.embeddings = createEmbeddings({ modelName: LLM.embeddings });
    this.taskObj = yamlParse(task) as { id: string; name: string; context: string };
    this.returnType = contentType === "application/json" ? "JSON" : "YAML";

    this.revieweeTaskResults = revieweeTaskResultsNeedDeserialization.map(
      (t) => new TaskState({ ...t }),
    );
    this.dagObj = yamlParse(dag) as DraftExecutionGraph;
    this.initializeProperties(creation).catch((error) => {
      console.error('Failed to initialize properties:', error);
    });
  }

  private async initializeProperties(creation: CallExecutionAgentProps): Promise<void> {

    const {
      creationProps,
      goalPrompt,
      executionId,
      agentPromptingMethod,
      task,
      dag,
      revieweeTaskResults: revieweeTaskResultsNeedDeserialization,
      abortSignal,
      executionNamespace,
      contentType,
      handlePacketCallback,
      agentProtocolOpenAPISpec,
      geo,
    } = creation;

    this.shortTermMemory = await createShortTermMemory({
      executionNamespace,
      taskId: this.taskObj.id,
      returnUnderlying: false,
    });

    const modelName =  creation.creationProps.modelName;
    const isCriticism = isTaskCriticism(this.taskObj.id);
    this.prompt = isCriticism
      ? createCriticizePrompt({
          revieweeTaskResults: this.revieweeTaskResults,
          goalPrompt: goalPrompt,
          nodes: this.dagObj.nodes,
          executionNamespace: executionNamespace,
          returnType: this.returnType,
        })
      : createExecutePrompt({
          taskObj: this.taskObj,
          taskResults: this.revieweeTaskResults,
          executionId,
          executionNamespace,
          returnType: this.returnType,
          modelName: modelName!,
        });

    this.tags = [
      isCriticism ? "criticize" : "execute",
      creation.agentPromptingMethod,
      this.taskObj.id,
    ];
    modelName && this.tags.push(modelName);

    this.skills = createSkills(
      this.exeLLM,
      this.embeddings,
      creation.agentPromptingMethod,
      isCriticism,
      this.taskObj.id,
      this.returnType,
      creation.agentProtocolOpenAPISpec,
      creation.geo,
    );

    const taskAndGoal = {
      task: `${this.taskObj.name}`,
      inServiceOfGoal: goalPrompt,
    };

    let memories;
    if (extractTier(this.taskObj.id) !== "1") {
      const retrieveMemoriesRunId = v4();
      const retrievals = [stringifyByMime(this.returnType, this.taskAndGoal)];
      await handlePacketCallback({
        type: "handleToolStart",
        input: retrievals.join(", "),
        runId: retrieveMemoriesRunId,
        tool: { lc: 1, type: "not_implemented", id: ["Retrieve Memories"] },
      });
      memories = await retrieveMemoriesSkill.skill.func({
        retrievals: [goalPrompt, task],
        namespace: executionNamespace,
      });

      await handlePacketCallback({
        type: "handleToolEnd",
        lastToolInput: "Retrieve Memories",
        output: memories,
        runId: retrieveMemoriesRunId,
      });
    } else {
      memories = "None yet";
    }
    this.memories = memories;

    this.availableTools = this.skills.map((s) => s.name); // This will be filtered later in the process

    this.contextAndTools = await this.pickContextAndTools();
    this.formattedMessages = await this.formatMessages();
    this.systemMessage = this.formattedMessages.slice(0, 1)[0]?.content;
    this.humanMessage = this.formattedMessages.slice(1)[0]?.content;
    this.filteredSkills = this.filterSkillsByContextAndTools();
    this.executor = await initializeExecutor(
      goalPrompt,
      agentPromptingMethod,
      this.taskObj,
      creationProps,
      this.filteredSkills,
      this.exeLLM,
      this.tags,
      this.runName,
      this.systemMessage,
      this.humanMessage,
      creationProps.callbacks,
      this.shortTermMemory, //FIXME: OpenAI Functions crashes when using conversation/buffer memory
    );
  }

  protected async pickContextAndTools(): Promise<ContextAndTools> {
    // Implementation of context and tools picking logic
    // ...
  }

  protected async formatMessages(): Promise<BaseMessage[]> {
    // Implementation of message formatting logic
    // ...
  }

  protected filterSkillsByContextAndTools(): StructuredTool[] {
    // Implementation of skills filtering logic
    // ...
  }

  // Abstract method to be implemented by subclasses for the specific logic of criticize or execute
  public abstract call(): Promise<string | Error>;

  // Rest of the class implementation...
}