import {
  type PddlAction,
  type PddlFunction,
  type PddlPredicate,
  type PddlType,
} from "./types";

export default class PddlDomain {
  name: string;
  requirements: string[];
  types: PddlType[];
  predicates: PddlPredicate[];
  functions: PddlFunction[];
  actions: PddlAction[];

  constructor() {
    this.name = "";
    this.requirements = [];
    this.types = [];
    this.predicates = [];
    this.functions = [];
    this.actions = [];
  }
}
