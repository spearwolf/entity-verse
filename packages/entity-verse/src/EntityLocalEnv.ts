import {EntityEnv} from './EntityEnv';
import {EntityKernel} from './EntityKernel';
import {EntitiesSyncEvent, EntityChangeEntryType} from './types';

const hasStructuredClone = typeof structuredClone === 'function' ? true : false;
let structuredCloneWarningHasBeenShown = false;

const checkStructuredClone = () => {
  if (!hasStructuredClone && !structuredCloneWarningHasBeenShown) {
    console.warn('EntityLocalEnv: structuredClone() is not available, ignoring useStructuredClone preference');
    structuredCloneWarningHasBeenShown = true;
  }
  return hasStructuredClone;
};

/**
 * An _entity environment_ that runs within the same process as the _entity view objects_.
 * (which in most cases should be the main/local thread of the active browser window/tab)
 */
export class EntityLocalEnv extends EntityEnv {
  readonly kernel = new EntityKernel();

  useStructuredClone = true;

  constructor(namespace?: string | symbol) {
    super(namespace);

    this.on(EntityEnv.OnSync, (event: EntitiesSyncEvent) => this.kernel.run(event));
  }

  public override start(): EntityLocalEnv {
    super.start();
    return this;
  }

  protected override getChangeTrail(): EntityChangeEntryType[] {
    const changeTrail = super.getChangeTrail();
    return this.useStructuredClone && checkStructuredClone() ? structuredClone(changeTrail) : changeTrail;
  }
}
