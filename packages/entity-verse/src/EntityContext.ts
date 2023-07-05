import {Eventize, Priority} from '@spearwolf/eventize';
import {EntityViewSpace} from './EntityViewSpace';
import {EntitiesSyncEvent} from './types';

/**
 * The base class for all _entity contexts_.
 *
 * An _entity context_ is responsible for synchronizing entities from a _view space_ with _entity components_ from a _kernel_.
 */
export class EntityContext extends Eventize {
  static OnSync = Symbol('onSync');

  #namespace: string | symbol;

  get namespace(): string | symbol {
    return this.#namespace;
  }

  get viewSpace(): EntityViewSpace {
    return EntityViewSpace.get(this.#namespace);
  }

  #readyPromise: Promise<EntityContext>;
  #readyResolve!: (value: EntityContext) => void;

  get ready(): Promise<EntityContext> {
    return this.#readyPromise;
  }

  #isReady = false;

  get isReady() {
    return this.#isReady;
  }

  #syncCallsBeforeReady = 0;

  constructor(namespace?: string | symbol) {
    super();

    this.#namespace = namespace ?? EntityViewSpace.GlobalNS;

    this.#readyPromise = new Promise<EntityContext>((resolve) => {
      this.#readyResolve = resolve;
    });
  }

  sync(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isReady) {
        this.#syncCallsBeforeReady++;
        if (this.#syncCallsBeforeReady > 1) {
          return this.once(EntityContext.OnSync, Priority.Low, () => resolve());
        }
      }
      this.ready.then(() => {
        const syncEvent: EntitiesSyncEvent = {
          changeTrail: this.viewSpace.buildChangeTrails(),
        };
        this.emit(EntityContext.OnSync, syncEvent);
        resolve();
      });
    });
  }

  protected start() {
    this.#isReady = true;
    this.#readyResolve(this);
  }
}
