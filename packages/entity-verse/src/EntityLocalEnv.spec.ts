import {EventizeApi} from '@spearwolf/eventize';
import {Entity} from './Entity';
import {EntityEnv} from './EntityEnv';
import {EntityLocalEnv} from './EntityLocalEnv';
import {EntityUplink} from './EntityUplink';
import {EntityView} from './EntityView';
import {EntityViewSpace} from './EntityViewSpace';
import {OnCreate, OnInit, OnRemoveFromParent} from './events';
import {EntitiesSyncEvent, EntityChangeType} from './types';
import {getDefaultRegistry} from './EntityRegistry';

const nextSyncEvent = (link: EntityEnv): Promise<EntitiesSyncEvent> =>
  new Promise((resolve) => {
    link.once(EntityEnv.OnSync, resolve);
  });

const waitForNext = (obj: EventizeApi, event: string | symbol): Promise<unknown[]> =>
  new Promise((resolve) => {
    obj.once(event, (...args: unknown[]) => resolve(args));
  });

describe('EntityLocalEnv', () => {
  afterAll(() => {
    EntityViewSpace.get().clear();
    getDefaultRegistry().clear();
  });

  it('should be defined', () => {
    expect(EntityLocalEnv).toBeDefined();
  });

  it('should start', async () => {
    const localEnv = new EntityLocalEnv();

    expect(localEnv.isReady).toBe(false);

    localEnv.start();

    expect(localEnv.isReady).toBe(true);

    await expect(localEnv.ready).resolves.toBe(localEnv);
  });

  it('should sync', async () => {
    const localEnv = new EntityLocalEnv().start();

    const a = new EntityView('a');
    const b = new EntityView('b', a);

    a.setProperty('foo', 'bar');
    b.setProperty('xyz', 123);

    localEnv.sync();

    const event = await nextSyncEvent(localEnv);

    expect(event.changeTrail).toEqual([
      {type: EntityChangeType.CreateEntity, token: 'a', uuid: a.uuid, properties: [['foo', 'bar']]},
      {type: EntityChangeType.CreateEntity, token: 'b', uuid: b.uuid, parentUuid: a.uuid, properties: [['xyz', 123]]},
    ]);
  });

  it('should create entities within kernel', async () => {
    const localEnv = new EntityLocalEnv().start();

    const a = new EntityView('a');
    const b = new EntityView('b', a);

    a.setProperty('foo', 'bar');
    b.setProperty('xyz', 123);

    await localEnv.sync();

    const aa = localEnv.kernel.getEntity(a.uuid);
    const bb = localEnv.kernel.getEntity(b.uuid);

    expect(aa).toBeDefined();
    expect(aa.getProperty('foo')).toBe('bar');
    expect(aa.children).toHaveLength(1);

    expect(bb).toBeDefined();
    expect(bb.parent).toBe(aa);
    expect(aa.children[0]).toBe(bb);
    expect(bb.getProperty('xyz')).toBe(123);
    expect(bb.children).toHaveLength(0);

    const onRemoveFromParent = jest.fn();

    @Entity({token: 'c'})
    class EntityCcc implements OnRemoveFromParent {
      [OnRemoveFromParent](_uplink: EntityUplink) {
        onRemoveFromParent(this);
      }
    }

    const c = new EntityView('c', a, -1);

    await localEnv.sync();

    const cc = localEnv.kernel.getEntity(c.uuid);

    expect(aa.children).toHaveLength(2);
    expect(aa.children[0]).toBe(cc);
    expect(aa.children[1]).toBe(bb);

    expect(onRemoveFromParent).not.toHaveBeenCalled();

    const removeFromParent = waitForNext(cc, OnRemoveFromParent).then(([entity]) => (entity as EntityUplink).uuid);

    c.removeFromParent();

    await localEnv.sync();

    expect(aa.children).toHaveLength(1);
    expect(cc.parent).toBeUndefined();

    expect(onRemoveFromParent).toHaveBeenCalled();
    expect(onRemoveFromParent.mock.calls[0][0]).toBeInstanceOf(EntityCcc);

    await expect(removeFromParent).resolves.toBe(cc.uuid);
  });

  it('should create entity components', async () => {
    const localEnv = new EntityLocalEnv().start();

    const onCreateMock = jest.fn();
    const onInitMock = jest.fn();

    @Entity({token: 'a'})
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

    await localEnv.sync();

    const aa = localEnv.kernel.getEntity(a.uuid);

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
