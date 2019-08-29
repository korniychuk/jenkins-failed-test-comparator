export class Hell {
  private callbacks = new Set<() => void>();

  public constructor(
    private mirror?: Hell,
  ) {}

  public add(cb: () => void): void {
    this.callbacks.add(cb);
    this.mirror && this.mirror.add(cb);
  }

  public delete(cb: () => void): void {
    this.callbacks.delete(cb);
    this.mirror && this.mirror.delete(cb);
  }

  public clear(afterDestroyCb?: (cb: () => void) => void): void {
    this.callbacks.forEach(cb => {
      cb();
      this.delete(cb);

      afterDestroyCb && afterDestroyCb(cb)
    });
  }

}
