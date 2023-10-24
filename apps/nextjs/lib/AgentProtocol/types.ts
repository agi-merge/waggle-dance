/**
 * Input parameters for the task. Any value is allowed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TaskInput = any;
/**
 * Artifact that the task has produced. Any value is allowed.
 */
export type Artifact = {
  artifact_id: string;
  agent_created: boolean;
  file_name: string;
  relative_path: string | null;
  created_at: string;
};
/**
 * Input parameters for the task step. Any value is allowed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StepInput = any;
/**
 * Output that the task step has produced. Any value is allowed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StepOutput = any;
export declare enum StepStatus {
  CREATED = "created",
  RUNNING = "running",
  COMPLETED = "completed",
}
export interface Step {
  /**
   * The name of the task step
   */
  name?: string;
  /**
   * Output of the task step
   */
  output?: StepOutput;
  /**
   * A list of artifacts that the step has produced.
   */
  artifacts?: Artifact[];
  /**
   * Whether this is the last step in the task.
   */
  is_last?: boolean;
  input?: StepInput;
  /**
   * The ID of the task this step belongs to.
   */
  task_id: string;
  /**
   * The ID of the task step.
   */
  step_id: string;
  /**
   * Current status of step
   */
  status: StepStatus;
}
export interface StepRequestBody {
  input?: StepInput;
}
export interface StepResult {
  /**
   * The name of the step
   */
  name?: string;
  /**
   * Output of the step
   */
  output?: StepOutput;
  /**
   * A list of artifacts that the step has produced.
   */
  artifacts?: Artifact[];
  /**
   * Whether this is the last step in the task.
   */
  is_last?: boolean;
}
export interface Task {
  input?: TaskInput;
  /**
   * The ID of the task.
   */
  task_id: string;
  /**
   * A list of artifacts that the task has produced.
   */
  artifacts?: Artifact[];

  additional_input?: object;
}
export interface TaskRequestBody {
  input?: TaskInput;
  additional_input?: object;
}

/**
 * A function that handles a step in a task.
 * Returns a step result.
 */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type StepHandler = (input: StepInput | null) => Promise<StepResult>;
/**
 * A function that handles a task.
 * Returns a step handler.
 */
export type TaskHandler = (
  taskId: string,
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  input: TaskInput | null,
) => Promise<StepHandler>;
/**
 * A step result with default values.
 * @returns StepResult
 */
export declare class StepResultWithDefaults implements StepResult {
  output?: StepOutput;
  artifacts?: Artifact[];
  is_last?: boolean;
}
/**
 * Creates a task for the agent.
 * @param body TaskRequestBody | null
 * @returns Promise<Task>
 */
export declare const createAgentTask: (
  body: TaskRequestBody | null,
) => Promise<Task>;
/**
 * Lists all tasks that have been created for the agent.
 * @returns Promise<string[]>
 */
export declare const listAgentTaskIDs: () => Promise<string[]>;
/**
 * Get details about a specified agent task.
 * @param taskId string
 * @returns
 */
export declare const getAgentTask: (taskId: string) => Promise<Task>;
/**
 * Lists all steps for the specified task.
 * @param taskId string
 * @returns Promise<string[]>
 */
export declare const listAgentTaskSteps: (taskId: string) => Promise<string[]>;
/**
 * Execute a step in the specified agent task.
 * @param taskId string
 * @param body StepRequestBody | null
 * @returns Promise<Step>
 */
export declare const executeAgentTaskStep: (
  taskId: string,
  body: StepRequestBody | null,
) => Promise<Step>;
/**
 * Get details about a specified task step.
 * @param taskId string
 * @param stepId string
 * @returns Promise<Step>
 */
export declare const getAgentTaskStep: (
  taskId: string,
  stepId: string,
) => Promise<Step>;
export interface AgentConfig {
  port: number;
  workspace: string;
}
export declare class Agent {
  taskHandler: TaskHandler;
  config: AgentConfig;
  constructor(taskHandler: TaskHandler, config: AgentConfig);
  static handleTask(
    _taskHandler: TaskHandler,
    config: Partial<AgentConfig>,
  ): Agent;
  start(port?: number): void;
}

// export default Agent;
