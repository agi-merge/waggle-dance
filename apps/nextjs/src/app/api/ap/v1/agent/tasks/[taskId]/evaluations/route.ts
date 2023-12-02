import { NextResponse  } from "next/server";
import type {NextRequest} from "next/server";

function toSnakeCase(str: string) {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function keysToSnakeCase(obj: Record<string, any>) {
  return Object.entries(obj).reduce(
    (result, [key, value]) => {
      const newKey = toSnakeCase(key);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        result[newKey] = keysToSnakeCase(value);
      } else {
        result[newKey] = value;
      }
      return result;
    },
    {} as Record<string, unknown>,
  );
}

interface RepositoryInfo {
  repoUrl: string;
  teamName: string;
  benchmarkGitCommitSha: string;
  agentGitCommitSha: string;
}

interface RunDetails {
  runId: string;
  command: string;
  completionTime: string;
  benchmarkStartTime: string;
  testName: string;
}

interface TaskInfo {
  dataPath: string;
  isRegression: boolean;
  category: string[];
  task: string;
  answer: string;
  description: string;
}

interface Metrics {
  difficulty: string;
  success: boolean;
  attempted: boolean;
  successPercentage: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cost: any;
  runTime: string;
}

interface Config {
  agentBenchmarkConfigPath: string;
  host: string;
}

interface Evaluation {
  repositoryInfo: RepositoryInfo;
  runDetails: RunDetails;
  taskInfo: TaskInfo;
  metrics: Metrics;
  reachedCutoff: boolean;
  config: Config;
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function POST(
  _req: NextRequest,
  { params: { taskId: _taskId } }: { params: { taskId: string } },
) {
  const evaluation: Evaluation = {
    repositoryInfo: {
      repoUrl: "",
      teamName: "",
      benchmarkGitCommitSha: "",
      agentGitCommitSha: "",
    },
    runDetails: {
      runId: "",
      command: "",
      completionTime: "",
      benchmarkStartTime: "",
      testName: "",
    },
    taskInfo: {
      dataPath: "",
      isRegression: false,
      category: [],
      task: "",
      answer: "",
      description: "",
    },
    metrics: {
      difficulty: "",
      success: false,
      attempted: false,
      successPercentage: 0,
      cost: {},
      runTime: "",
    },
    reachedCutoff: false,
    config: {
      agentBenchmarkConfigPath: "",
      host: "",
    },
  };

  return NextResponse.json(keysToSnakeCase(evaluation), { status: 201 });
}

// class BenchmarkRun {
//   /// Information about the repository and team associated with the benchmark run.
//   final RepositoryInfo repositoryInfo;

//   /// Specific details about the benchmark run, like unique run identifier, command, and timings.
//   final RunDetails runDetails;

//   /// Information about the task being benchmarked, including its description and expected answer.
//   final TaskInfo taskInfo;

//   /// Performance metrics related to the benchmark run.
//   final Metrics metrics;

//   /// A boolean flag indicating whether the benchmark run reached a certain cutoff.
//   final bool reachedCutoff;

//   /// Configuration settings related to the benchmark run.
//   final Config config;

//   /// Constructs a new `BenchmarkRun` instance.
//   ///
//   /// [repositoryInfo]: Information about the repository and team.
//   /// [runDetails]: Specific details about the benchmark run.
//   /// [taskInfo]: Information about the task being benchmarked.
//   /// [metrics]: Performance metrics for the benchmark run.
//   /// [reachedCutoff]: A flag indicating if the benchmark run reached a certain cutoff.
//   /// [config]: Configuration settings for the benchmark run.
//   BenchmarkRun({
//     required this.repositoryInfo,
//     required this.runDetails,
//     required this.taskInfo,
//     required this.metrics,
//     required this.reachedCutoff,
//     required this.config,
//   });

//   /// Creates a `BenchmarkRun` instance from a map.
//   ///
//   /// [json]: A map containing key-value pairs corresponding to `BenchmarkRun` fields.
//   ///
//   /// Returns a new `BenchmarkRun` populated with values from the map.
//   factory BenchmarkRun.fromJson(Map<String, dynamic> json) => BenchmarkRun(
//         repositoryInfo: RepositoryInfo.fromJson(json['repository_info']),
//         runDetails: RunDetails.fromJson(json['run_details']),
//         taskInfo: TaskInfo.fromJson(json['task_info']),
//         metrics: Metrics.fromJson(json['metrics']),
//         reachedCutoff: json['reached_cutoff'] ?? false,
//         config: Config.fromJson(json['config']),
//       );

//   /// Converts the `BenchmarkRun` instance to a map.
//   ///
//   /// Returns a map containing key-value pairs corresponding to `BenchmarkRun` fields.
//   Map<String, dynamic> toJson() => {
//         'repository_info': repositoryInfo.toJson(),
//         'run_details': runDetails.toJson(),
//         'task_info': taskInfo.toJson(),
//         'metrics': metrics.toJson(),
//         'reached_cutoff': reachedCutoff,
//         'config': config.toJson(),
//       };
// }
