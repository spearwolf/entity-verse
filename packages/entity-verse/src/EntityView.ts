import {EntityViewSpace} from './EntityViewSpace';
import {generateUUID} from './generateUUID';

/**
 * The EntityView is a proxy for the actual entity object.
 * With the help of this digital twin the _real_ entity is created, properties are set, events are triggered, etc.
 *
 * While the user is responsible for creating a twin, the actual entities are later managed async by the EntityKernel.
 * The kernel can, but does not have to, run in the same javascript environment. It is also conceivable, for example,
 * that the kernel runs in a web-worker, while the entity twins are created within the main document.
 */
export class EntityView {
  #uuid: string;
  #token: string;
  #namespace?: string | symbol;
  #order = 0;

  #context: EntityViewSpace;
  #parent?: EntityView;

  get uuid() {
    return this.#uuid;
  }

  get token() {
    return this.#token;
  }

  get parent(): EntityView | undefined {
    return this.#parent;
  }

  set parent(parent: EntityView | null | undefined) {
    if (parent) {
      parent.addChild(this);
    } else {
      this.removeFromParent();
    }
  }

  /**
   * The order property sets the order to lay out an entity in a children array of the parent entity container.
   * Items in a children array are sorted by ascending order value and then by their insertion order.
   */
  get order(): number {
    return this.#order;
  }

  set order(order: number | null | undefined) {
    const prevOrder = this.#order;
    this.#order = order ?? 0;
    if (prevOrder !== this.#order) {
      this.#context.changeOrder(this);
    }
  }

  constructor(token: string, parent?: EntityView, order = 0, namespace?: string | symbol) {
    this.#uuid = generateUUID();

    this.#token = token;
    this.#parent = parent;
    this.#order = order;
    this.#namespace = namespace;

    this.#context = EntityViewSpace.get(this.#namespace);
    this.#context.addEntity(this);
  }

  isChildOf(entity: EntityView) {
    return this.#parent === entity;
  }

  removeFromParent() {
    if (this.#parent) {
      this.#context.removeChildFromParent(this.uuid, this.#parent);
      this.#parent = undefined;
    }
  }

  addChild(child: EntityView) {
    if (!child.isChildOf(this)) {
      child.removeFromParent();
      child.#parent = this;
      this.#context.addToChildren(this, child);
    }
  }

  setProperty<T = unknown>(name: string, value: T, isEqual?: (a: T, b: T) => boolean) {
    this.#context.setProperty(this, name, value, isEqual);
  }

  removeProperty(name: string) {
    this.#context.removeProperty(this, name);
  }

  destroy() {
    this.removeFromParent();
    this.#context.removeEntity(this);
  }
}
