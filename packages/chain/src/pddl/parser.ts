import PddlDomain from "./domain";
import PddlTokenizer from "./tokenizer";
import {
  type PddlAction,
  type PddlFunction,
  type PddlObject,
  type PddlPredicate,
  type PddlType,
} from "./types";

export default class PddlParser {
  private tokenizer: PddlTokenizer;

  constructor(pddl: string) {
    this.tokenizer = new PddlTokenizer(pddl);
  }

  parse(): PddlDomain {
    const domain = new PddlDomain();

    while (this.tokenizer.hasNext()) {
      const token = this.tokenizer.next().toLowerCase();

      switch (token) {
        case "define":
          this.parseDefine(domain);
          break;
        case ":requirements":
          domain.requirements = this.parseRequirements();
          break;
        case ":types":
          domain.types = this.parseTypes();
          break;
        case ":predicates":
          domain.predicates = this.parsePredicates();
          break;
        case ":functions":
          domain.functions = this.parseFunctions();
          break;
        case ":durative-action":
          domain.actions.push(this.parseAction());
          break;
        default:
          throw new Error(`Unexpected token: ${token}`);
      }
    }

    return domain;
  }

  // Implement parser functions for each PDDL element such as requirements, types, predicates, functions, and actions
  // Pddl Parser functions for each PDDL element

  private parseDefine(domain: PddlDomain): void {
    this.tokenizer.expect("(");
    domain.name = this.tokenizer.next().toLowerCase();
    this.tokenizer.expect(")");
  }

  private parseRequirements(): string[] {
    const requirements: string[] = [];
    while (this.tokenizer.hasNext() && this.tokenizer.peek() !== ":") {
      requirements.push(this.tokenizer.next().toLowerCase());
    }
    return requirements;
  }

  private parseTypes(): PddlType[] {
    const types: PddlType[] = [];
    while (this.tokenizer.hasNext() && this.tokenizer.peek() !== ":") {
      types.push(this.tokenizer.next().toLowerCase() as PddlType);
    }
    return types;
  }

  private parsePredicates(): PddlPredicate[] {
    const predicates: PddlPredicate[] = [];

    while (this.tokenizer.hasNext() && this.tokenizer.peek() !== ":") {
      this.tokenizer.expect("(");
      const name = this.tokenizer.next().toLowerCase();
      const args = this.parsePredicateArguments();
      this.tokenizer.expect(")");

      predicates.push({ name, args });
    }

    return predicates;
  }

  private parsePredicateArguments(): PddlObject[] {
    const args: PddlObject[] = [];

    while (this.tokenizer.hasNext() && this.tokenizer.peek() !== ")") {
      const name = this.tokenizer.next();
      this.tokenizer.expect("-");
      const type = this.tokenizer.next().toLowerCase() as PddlType;

      args.push({ name, type });
    }

    return args;
  }

  private parseFunctions(): PddlFunction[] {
    const functions: PddlFunction[] = [];

    while (this.tokenizer.hasNext() && this.tokenizer.peek() !== ":") {
      this.tokenizer.expect("(");
      this.tokenizer.expect("=");
      const name = this.tokenizer.next().toLowerCase();
      const args = this.parseFunctionArguments();
      const value = Number(this.tokenizer.next());
      this.tokenizer.expect(")");

      functions.push({ name, args, value });
    }

    return functions;
  }

  private parseFunctionArguments(): PddlObject[] {
    return this.parsePredicateArguments();
  }

  private parseAction(): PddlAction {
    this.tokenizer.expect("(");
    const name = this.tokenizer.next().toLowerCase();
    this.tokenizer.expect(":parameters");
    const parameters = this.parseActionParameters();
    this.tokenizer.expect(":duration");
    const duration = this.parseActionDuration();
    this.tokenizer.expect(":condition");
    const condition = this.parseActionCondition();
    this.tokenizer.expect(":effect");
    const effect = this.parseActionEffect();
    this.tokenizer.expect(")");

    return { name, parameters, duration, condition, effect };
  }

  private parseActionParameters(): PddlObject[] {
    this.tokenizer.expect("(");
    const parameters = this.parsePredicateArguments();
    this.tokenizer.expect(")");
    return parameters;
  }

  private parseActionDuration(): number {
    this.tokenizer.expect("(");
    this.tokenizer.expect("=");
    this.tokenizer.expect("?duration");
    const duration = Number(this.tokenizer.next());
    this.tokenizer.expect(")");
    return duration;
  }

  private parseActionCondition(): PddlPredicate[] {
    this.tokenizer.expect("(");
    const condition = this.parsePredicates();
    this.tokenizer.expect(")");
    return condition;
  }

  private parseActionEffect(): PddlPredicate[] {
    this.tokenizer.expect("(");
    const effect = this.parsePredicates();
    this.tokenizer.expect(")");
    return effect;
  }
}
