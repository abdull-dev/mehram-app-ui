/**
 * Inviting a wali is part of membership. An unpaid account gets what it costs,
 * not the invite form — the server refuses the invitation, and a button that
 * fails is a worse answer than one that says the price.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Animated, Text } from 'react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { FamilyScreen, clearFamilyScreenCache } from '../src/screens/home/FamilyScreen';
import { createWaliInvite, getFamilyStatus } from '../src/api/wali';

jest.mock('../src/api/wali', () => ({
  getFamilyStatus: jest.fn(),
  createWaliInvite: jest.fn(),
  removeWali: jest.fn(),
}));

const api = {
  getFamilyStatus: getFamilyStatus as jest.Mock,
  createWaliInvite: createWaliInvite as jest.Mock,
};

const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// Native-driver animations reach for a host node handle react-test-renderer
// does not provide, and the skeleton's pulse loops.
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

async function render(props: Record<string, unknown>): Promise<Tree> {
  let tree!: Tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <FamilyScreen {...props} />
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

const LINKED_WALI = {
  membershipId: 'm1',
  relationship: 'Brother',
  joinedAt: '2025-03-04T00:00:00.000Z',
  proposalsAwaitingReview: 0,
  wali: { fullName: 'Bilal Ahmed' },
};

describe('no wali linked yet', () => {
  it('locks the invitation for an unpaid account, and names the price', async () => {
    api.getFamilyStatus.mockResolvedValue(null);
    const tree = await render({ isPaidMember: false, priceLabel: 'PKR 4,500' });

    expect(shows(tree, 'Invitations open with membership')).toBe(true);
    expect(shows(tree, 'Become a member')).toBe(true);
    expect(shows(tree, 'PKR 4,500')).toBe(true);
    // The form is not merely disabled — it is not there.
    expect(shows(tree, 'Invite on WhatsApp')).toBe(false);
    expect(shows(tree, 'Share invite code')).toBe(false);
  });

  it('never asks the server for an invite it cannot have', async () => {
    api.getFamilyStatus.mockResolvedValue(null);
    await render({ isPaidMember: false });
    expect(api.createWaliInvite).not.toHaveBeenCalled();
  });

  it('says nothing about a price it was not given', async () => {
    api.getFamilyStatus.mockResolvedValue(null);
    const tree = await render({ isPaidMember: false });
    expect(shows(tree, 'Become a member')).toBe(true);
    expect(texts(tree).join(' ')).not.toMatch(/PKR/);
  });

  it('offers the invite form to a paid member', async () => {
    api.getFamilyStatus.mockResolvedValue(null);
    const tree = await render({ isPaidMember: true });

    expect(shows(tree, 'Add your wali')).toBe(true);
    expect(shows(tree, 'Invite on WhatsApp')).toBe(true);
    expect(shows(tree, 'Invitations open with membership')).toBe(false);
  });
});

describe('a wali already linked', () => {
  it('does not offer to change wali on an unpaid account', async () => {
    // Changing wali removes the current one and reopens the invite, which an
    // unpaid account cannot finish — it would strip their guardian.
    api.getFamilyStatus.mockResolvedValue(LINKED_WALI);
    const tree = await render({ isPaidMember: false });

    expect(shows(tree, 'Bilal Ahmed')).toBe(true);
    expect(shows(tree, 'Change wali')).toBe(false);
  });

  it('still offers it to a paid member', async () => {
    api.getFamilyStatus.mockResolvedValue(LINKED_WALI);
    const tree = await render({ isPaidMember: true });
    expect(shows(tree, 'Change wali')).toBe(true);
  });
});
