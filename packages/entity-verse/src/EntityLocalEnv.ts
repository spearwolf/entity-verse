import {EntityEnv} from './EntityEnv';
import {EntityKernel} from './EntityKernel';
import {EntitiesSyncEvent} from './types';

/**
 * An _entity environment_ that runs within the same process as the _entity view objects_.
 * (which in most cases should be the main/local thread of the active browser window/tab)
 */
export class EntityLocalEnv extends EntityEnv {
  readonly kernel = new EntityKernel();

  constructor(namespace?: string | symbol) {
    super(namespace);

    this.on(EntityEnv.OnSync, (event: EntitiesSyncEvent) => this.kernel.run(event));
  }

  public override start(): EntityLocalEnv {
    super.start();
    return this;
  }
}
