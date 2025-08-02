export class DescriptionBuilder {
  private str: string;

  constructor(str: string) {
    this.str = str;
  }

  withWalletConnect() {
    const appendix = `

1. If a tool response includes { status: "continue" }, always invoke the "nextStep" tool.
2. If the response includes { executeNextStepAfter: <seconds> }, wait that time before invoking "nextStep".
3. If the response includes { callback }, pass it as a parameter when invoking "nextStep".`;
    this.str += appendix;
    return this;
  }

  toString() {
    return this.str;
  }
}
