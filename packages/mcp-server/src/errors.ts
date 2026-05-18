export class UserVisibleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserVisibleError";
  }
}
