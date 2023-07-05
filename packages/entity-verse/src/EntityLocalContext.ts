import {EntityContext} from './EntityContext';
import {EntityKernel} from './EntityKernel';
import {EntitiesSyncEvent} from './types';

/**
 * An _entity context_ that runs within the same process as the _entity view objects_.
 * (which in most cases should be the main thread of the active browser window/tab)
 */
export class EntityLocalContext extends EntityContext {
  readonly kernel = new EntityKernel();

  constructor(namespace?: string | symbol) {
    super(namespace);

    this.on(EntityContext.OnSync, (event: EntitiesSyncEvent) => this.kernel.run(event));
  }

  public override start(): EntityLocalContext {
    super.start();
    return this;
  }
}
