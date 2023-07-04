import {EntityView} from './EntityView';
import {EntityViewContext} from './EntityViewContext';

describe('EntityProxy', () => {
  const ctx = EntityViewContext.get();

  afterAll(() => {
    ctx.clear();
  });

  it('should be defined', () => {
    expect(EntityView).toBeDefined();
  });

  it('should create new entity', () => {
    const entity = new EntityView('test');
    expect(entity.uuid).toBeDefined();
    expect(entity.token).toBe('test');
    expect(entity.parent).toBeUndefined();
    expect(ctx.hasEntity(entity)).toBeTruthy();
    expect(ctx.isRootEntity(entity)).toBeTruthy();
  });

  it('should destroy entity', () => {
    const entity = new EntityView('test');
    expect(ctx.hasEntity(entity)).toBeTruthy();
    entity.destroy();
    expect(ctx.hasEntity(entity)).toBeFalsy();
  });

  it('should add entity as child (constructor)', () => {
    const parent = new EntityView('test');
    const child = new EntityView('test', parent);
    const ctx = EntityViewContext.get();

    expect(ctx.hasEntity(parent)).toBeTruthy();
    expect(ctx.hasEntity(child)).toBeTruthy();
    expect(ctx.isChildOf(child, parent)).toBeTruthy();
    expect(ctx.isRootEntity(child)).toBeFalsy();
  });

  it('should add entity as child (addChild)', () => {
    const parent = new EntityView('test');
    const child = new EntityView('test');

    expect(ctx.hasEntity(parent)).toBeTruthy();
    expect(ctx.hasEntity(child)).toBeTruthy();
    expect(ctx.isChildOf(child, parent)).toBeFalsy();
    expect(ctx.isRootEntity(child)).toBeTruthy();

    parent.addChild(child);

    expect(ctx.isChildOf(child, parent)).toBeTruthy();
    expect(ctx.isRootEntity(child)).toBeFalsy();
  });

  it('should remove from parent', () => {
    const parent = new EntityView('test');
    const child = new EntityView('test', parent);

    expect(ctx.isChildOf(child, parent)).toBeTruthy();
    expect(ctx.isRootEntity(parent)).toBeTruthy();

    child.removeFromParent();

    expect(child.parent).toBeUndefined();
    expect(ctx.isChildOf(child, parent)).toBeFalsy();
    expect(ctx.isRootEntity(child)).toBeTruthy();
  });

  it('should set parent', () => {
    const a = new EntityView('test');
    const b = new EntityView('test', a);
    const c = new EntityView('test');

    expect(ctx.isChildOf(b, a)).toBeTruthy();
    expect(ctx.isChildOf(b, c)).toBeFalsy();

    b.parent = c;

    expect(b.parent).toBe(c);
    expect(ctx.isChildOf(b, a)).toBeFalsy();
    expect(ctx.isChildOf(b, c)).toBeTruthy();
  });
});
