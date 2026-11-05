export class ResultBudget {
  private owners = new Map<string, number>();
  constructor(readonly limit: number) {}
  get total() {
    return Array.from(this.owners.values()).reduce((a, b) => a + b, 0);
  }
  canReplace(owner: string, bytes: number) {
    return this.total - (this.owners.get(owner) ?? 0) + bytes <= this.limit;
  }
  replace(owner: string, bytes: number) {
    this.owners.set(owner, bytes);
  }
  release(owner: string) {
    this.owners.delete(owner);
  }
}
