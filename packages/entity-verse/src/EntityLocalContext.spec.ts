import {EventizeApi} from '@spearwolf/eventize';
import {Entity} from './Entity';
import {EntityContext} from './EntityContext';
import {EntityLocalContext} from './EntityLocalContext';
import {EntityRegistry} from './EntityRegistry';
import {EntityUplink} from './EntityUplink';
import {EntityView} from './EntityView';
import {EntityViewSpace} from './EntityViewSpace';
import {OnCreate, OnInit, OnRemoveFromParent} from './events';
import {EntitiesSyncEvent, EntityChangeType} from './types';

const nextSyncEvent = (link: EntityContext): Promise<EntitiesSyncEvent> =>
  new Promise((resolve) => {
    link.once(EntityContext.OnSync, resolve);
  });

const waitForNext = (obj: EventizeApi, event: string | symbol): Promise<unknown[]> =>
  new Promise((resolve) => {
    obj.once(event, (...args: unknown[]) => resolve(args));
  });

describe('EntityLocalContext', () => {
  const viewSpace = EntityViewSpace.get();

  afterAll(() => {
    viewSpace.clear();
  });

  it('should be defined', () => {
    expect(EntityLocalContext).toBeDefined();
  });

  it('should start', async () => {
    const localCtx = new EntityLocalContext();

    expect(localCtx.isReady).toBe(false);

    localCtx.start();

    expect(localCtx.isReady).toBe(true);

    await expect(localCtx.ready).resolves.toBe(localCtx);
  });

  it('should sync', async () => {
    const localCtx = new EntityLocalContext().start();

    const a = new EntityView('a');
    const b = new EntityView('b', a);

    a.setProperty('foo', 'bar');
    b.setProperty('xyz', 123);

    localCtx.sync();

    const event = await nextSyncEvent(localCtx);

    expect(event.changeTrail).toEqual([
      {type: EntityChangeType.CreateEntity, token: 'a', uuid: a.uuid, properties: [['foo', 'bar']]},
      {type: EntityChangeType.CreateEntity, token: 'b', uuid: b.uuid, parentUuid: a.uuid, properties: [['xyz', 123]]},
    ]);
  });

  it('should create entities within kernel', async () => {
    const localCtx = new EntityLocalContext().start();

    const a = new EntityView('a');
    const b = new EntityView('b', a);

    a.setProperty('foo', 'bar');
    b.setProperty('xyz', 123);

    await localCtx.sync();

    const aa = localCtx.kernel.getEntity(a.uuid);
    const bb = localCtx.kernel.getEntity(b.uuid);

    expect(aa).toBeDefined();
    expect(aa.getProperty('foo')).toBe('bar');
    expect(aa.children).toHaveLength(1);

    expect(bb).toBeDefined();
    expect(bb.parent).toBe(aa);
    expect(aa.children[0]).toBe(bb);
    expect(bb.getProperty('xyz')).toBe(123);
    expect(bb.children).toHaveLength(0);

    const onRemoveFromParent = jest.fn();

    @Entity({registry: localCtx.kernel.registry, token: 'c'})
    class EntityCcc implements OnRemoveFromParent {
      [OnRemoveFromParent](_uplink: EntityUplink) {
        onRemoveFromParent(this);
      }
    }

    const c = new EntityView('c', a, -1);

    await localCtx.sync();

    const cc = localCtx.kernel.getEntity(c.uuid);

    expect(aa.children).toHaveLength(2);
    expect(aa.children[0]).toBe(cc);
    expect(aa.children[1]).toBe(bb);

    expect(onRemoveFromParent).not.toHaveBeenCalled();

    const removeFromParent = waitForNext(cc, OnRemoveFromParent).then(([entity]) => (entity as EntityUplink).uuid);

    c.removeFromParent();

    await localCtx.sync();

    expect(aa.children).toHaveLength(1);
    expect(cc.parent).toBeUndefined();

    expect(onRemoveFromParent).toHaveBeenCalled();
    expect(onRemoveFromParent.mock.calls[0][0]).toBeInstanceOf(EntityCcc);

    await expect(removeFromParent).resolves.toBe(cc.uuid);
  });

  it('should create entity components', async () => {
    const localCtx = new EntityLocalContext().start();
    const registry = new EntityRegistry();

    localCtx.kernel.registry = registry;

    const onCreateMock = jest.fn();
    const onInitMock = jest.fn();

    @Entity({registry, token: 'a'})
    class Aaa implements OnCreate, OnInit {
      [OnCreate](uplink: EntityUplink) {
        onCreateMock(uplink, this);
      }
      [OnInit](uplink: EntityUplink) {
        onInitMock(uplink, this);
      }
    }

    const a = new EntityView('a');
    a.setProperty('foo', 'bar');

    await localCtx.sync();

    const aa = localCtx.kernel.getEntity(a.uuid);

    expect(aa).toBeDefined();
    expect(aa.getProperty('foo')).toBe('bar');

    expect(Aaa).toBeDefined();

    expect(onCreateMock).toBeCalled();
    expect(onCreateMock.mock.calls[0][0]).toBe(aa);
    expect(onCreateMock.mock.calls[0][1]).toBeInstanceOf(Aaa);

    expect(onInitMock).toBeCalled();
    expect(onInitMock.mock.calls[0][0]).toBe(aa);
    expect(onInitMock.mock.calls[0][1]).toBeInstanceOf(Aaa);
  });
});
