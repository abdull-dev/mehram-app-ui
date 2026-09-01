/**
 * Removing a wali is destructive and only a fresh invitation the wali accepts
 * can undo it. Two things had to be true and were not: the Family tab removed
 * on the first tap with no warning at all, and the wali-side dialog closed on
 * `finally` — so a request that threw looked exactly like one that succeeded.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Animated, Text } from 'react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { ApiError } from '../src/api/client';
import { FamilyScreen, clearFamilyScreenCache } from '../src/screens/home/FamilyScreen';
import { getFamilyStatus, removeWali } from '../src/api/wali';

jest.mock('../src/api/wali', () => ({
  getFamilyStatus: jest.fn(),
  createWaliInvite: jest.fn(),
  removeWali: jest.fn(),
}));

const api = {
  getFamilyStatus: getFamilyStatus as jest.Mock,
  removeWali: removeWali as jest.Mock,
};

const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

beforeAll(() => {
  jest
    .spyOn(Animated, 'timing')
    .mockImplementation(((value: any, config: any) => ({
      // No completion callback: `Animated.loop` starts its next iteration from
      // it, and a synchronous callback makes that recurse until the stack goes.
      start: () => value.setValue(config.toValue),
      stop: () => {},
      reset: () => {},
    })) as any);
});

type Tree = ReactTestRenderer.ReactTestRenderer;

let mounted: Tree | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  clearFamilyScreenCache();
});

afterEach(() => {
  act(() => {
    mounted?.unmount();
  });
  mounted = null;
});

const LINKED_WALI = {
  membershipId: 'm1',
  relationship: 'Brother',
  joinedAt: '2025-03-04T00:00:00.000Z',
  proposalsAwaitingReview: 2,
  wali: { fullName: 'Bilal Ahmed' },
};

async function render(props: Record<string, unknown> = {}): Promise<Tree> {
  let tree!: Tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <FamilyScreen isPaidMember {...props} />
      </SafeAreaProvider>,
    );
  });
  mounted = tree;
  return tree;
}

function texts(tree: Tree): string[] {
  return tree.root
    .findAllByType(Text)
    .filter(node => node.findAllByType(Text).length === 1)
    .map(node => {
      const children = node.props.children;
      return String(Array.isArray(children) ? children.join('') : children ?? '');
    });
}

function shows(tree: Tree, needle: string): boolean {
  return texts(tree).some(t => t.includes(needle));
}

/** Press the pressable whose accessibility label or text matches. */
async function press(tree: Tree, label: string) {
  const byLabel = tree.root.findAll(
    n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  );
  const target =
    byLabel[0] ??
    tree.root
      .findAll(n => {
        const type = n.type as { displayName?: string; name?: string };
        return (
          typeof type !== 'string' &&
          (type.displayName ?? type.name) === 'Pressable' &&
          n.findAllByType(Text).some(t => String(t.props.children) === label)
        );
      })[0];
  if (!target) throw new Error(`no control labelled "${label}"`);
  await act(async () => {
    target.props.onPress();
  });
}

it('warns before removing, instead of removing on the first tap', async () => {
  api.getFamilyStatus.mockResolvedValue(LINKED_WALI);
  const tree = await render();

  await press(tree, 'Change wali');

  // Warned, and nothing has happened yet.
  expect(shows(tree, 'Remove Bilal as your wali?')).toBe(true);
  expect(api.removeWali).not.toHaveBeenCalled();
});

it('spells out the consequences, including what is waiting', async () => {
  api.getFamilyStatus.mockResolvedValue(LINKED_WALI);
  const tree = await render();
  await press(tree, 'Change wali');

  const copy = texts(tree).join(' ');
  expect(copy).toMatch(/leaves discovery/i);
  expect(copy).toMatch(/2 proposals waiting/i);
  expect(copy).toMatch(/new invitation they accept/i);
  // The safe choice names what is kept, rather than saying "Cancel".
  expect(shows(tree, 'Keep Bilal')).toBe(true);
});

it('invents no consequence when nothing is waiting', async () => {
  api.getFamilyStatus.mockResolvedValue({ ...LINKED_WALI, proposalsAwaitingReview: 0 });
  const tree = await render();
  await press(tree, 'Change wali');

  // Scoped to the dialog's own phrasing: the wali card behind it legitimately
  // shows "0 proposals" as a queue count.
  expect(texts(tree).join(' ')).not.toMatch(/0 proposals? waiting/);
  expect(shows(tree, 'Remove Bilal as your wali?')).toBe(true);
});

it('keeps the wali when the warning is dismissed', async () => {
  api.getFamilyStatus.mockResolvedValue(LINKED_WALI);
  const tree = await render();

  await press(tree, 'Change wali');
  await press(tree, 'Keep Bilal');

  expect(api.removeWali).not.toHaveBeenCalled();
  expect(shows(tree, 'Bilal Ahmed')).toBe(true);
});

it('removes only once confirmed', async () => {
  api.getFamilyStatus.mockResolvedValue(LINKED_WALI);
  api.removeWali.mockResolvedValue(undefined);
  const tree = await render();

  await press(tree, 'Change wali');
  await press(tree, 'Remove wali');

  expect(api.removeWali).toHaveBeenCalledWith('m1');
  // Removal done → the invite form takes over.
  expect(shows(tree, 'Add your wali')).toBe(true);
});

it('keeps a failed removal visible instead of reporting success', async () => {
  api.getFamilyStatus.mockResolvedValue(LINKED_WALI);
  api.removeWali.mockRejectedValue(new ApiError(500, { message: 'Server unavailable' }));
  const tree = await render();

  await press(tree, 'Change wali');
  await press(tree, 'Remove wali');

  // The dialog stays open, says why, and the wali is still linked.
  expect(shows(tree, 'Server unavailable')).toBe(true);
  expect(shows(tree, 'Remove Bilal as your wali?')).toBe(true);
  expect(shows(tree, 'Add your wali')).toBe(false);
});

it('does not fire a second request while the first is running', async () => {
  api.getFamilyStatus.mockResolvedValue(LINKED_WALI);
  let release!: () => void;
  api.removeWali.mockImplementation(
    () => new Promise<void>(resolve => { release = resolve; }),
  );
  const tree = await render();

  await press(tree, 'Change wali');
  await press(tree, 'Remove wali');
  await press(tree, 'Remove wali');

  expect(api.removeWali).toHaveBeenCalledTimes(1);
  await act(async () => { release(); });
});
