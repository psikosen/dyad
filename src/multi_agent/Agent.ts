export abstract class Agent {
  constructor(
    public name: string,
    public role: string,
  ) {}

  abstract execute(task: string): Promise<string>;
}
