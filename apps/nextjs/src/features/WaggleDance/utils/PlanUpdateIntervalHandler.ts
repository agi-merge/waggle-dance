import type {DraftExecutionGraph} from "@acme/db";

export class PlanUpdateIntervalHandler {
  private interval: number | null = null;
  private newDAGAvailable: DraftExecutionGraph | null = null;
  private previousDAG: DraftExecutionGraph | null = null;
  private intervalTime: number;

  constructor(intervalTime: number) {
    this.intervalTime = intervalTime;
  }

  public start(
    setDAG: (dag: DraftExecutionGraph, goalPrompt: string) => void,
    goalPrompt: string,
  ) {
    if (this.interval === null) {
      this.interval = window.setInterval(() => {
        if (this.newDAGAvailable !== null && this.hasNewNodesOrEdges()) {
          setDAG(this.newDAGAvailable, goalPrompt);
          this.previousDAG = this.newDAGAvailable;
          this.newDAGAvailable = null;
        }
      }, this.intervalTime);
    }
  }

  public stop() {
    // flush any pending updates
    if (this.newDAGAvailable !== null) {
      this.previousDAG = this.newDAGAvailable;
      this.newDAGAvailable = null;
    }

    if (this.interval !== null) {
      window.clearInterval(this.interval);
      this.interval = null;
    }
  }

  public updateDAG(newDag: DraftExecutionGraph) {
    this.newDAGAvailable = newDag;
  }

  private hasNewNodesOrEdges(): boolean {
    if (this.previousDAG === null || this.newDAGAvailable === null) {
      return true;
    }

    const diffNodesCount =
      this.newDAGAvailable.nodes.length - this.previousDAG.nodes.length;
    const newEdgesCount =
      this.newDAGAvailable.edges.length - this.previousDAG.edges.length;
    return diffNodesCount > 0 || newEdgesCount > 0;
  }
}

export default PlanUpdateIntervalHandler;
