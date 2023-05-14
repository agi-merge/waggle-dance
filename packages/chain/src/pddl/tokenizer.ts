export default class PddlTokenizer {
  private input: string;
  private index: number;
  private length: number;

  constructor(pddl: string) {
    this.input = pddl;
    this.index = 0;
    this.length = pddl.length;
  }

  hasNext(): boolean {
    return this.index < this.length;
  }

  next(): string {
    this.skipWhiteSpace();
    if (!this.hasNext()) {
      throw new Error("Unexpected end of input");
    }

    if (this.input[this.index] === "(") {
      this.index++;
      return "(";
    }

    if (this.input[this.index] === ")") {
      this.index++;
      return ")";
    }

    let token = "";
    while (
      this.hasNext() &&
      !this.isWhiteSpace(this.input[this.index]) &&
      this.input[this.index] !== "(" &&
      this.input[this.index] !== ")"
    ) {
      token += this.input[this.index];
      this.index++;
    }

    return token;
  }

  peek(): string {
    const current = this.index;
    const peekedToken = this.next();
    this.index = current;
    return peekedToken;
  }

  expect(token: string): void {
    const nextToken = this.next();

    if (nextToken !== token) {
      throw new Error(`Expected token "${token}" but found "${nextToken}"`);
    }
  }

  private skipWhiteSpace(): void {
    while (this.hasNext() && this.isWhiteSpace(this.input[this.index])) {
      this.index++;
    }
  }

  private isWhiteSpace(char: string | undefined): boolean {
    return char ? /\s/.test(char) : false;
  }
}
