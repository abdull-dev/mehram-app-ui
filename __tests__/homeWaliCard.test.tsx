/**
 * The "add your wali" card is for paid accounts only.
 *
 * It states outright that the membership is active and that a guardian is the
 * one thing left. The server's WALI_REQUIRED does not imply payment, so an
 * unpaid account was shown a card claiming it had paid — and pointed at a wali
 * rather than at the membership actually blocking it.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Animated, Text } from 'react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { HomeScreen } from '../src/screens/home/HomeScreen';

const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// Native-driver animations reach for a host node handle react-test-renderer
// does not provide, and several of these loop.
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
        <HomeScreen
          userName="Ayesha"
          homeStateLoaded
          waliRequired
          {...props}
        />
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

it('shows the wali card to a paid member with no wali', async () => {
  const tree = await render({ isPaidMember: true });
  expect(shows(tree, 'add your wali')).toBe(true);
});

it('does not claim an unpaid membership is active', async () => {
  const tree = await render({ isPaidMember: false });
  expect(shows(tree, 'add your wali')).toBe(false);
});

it('asks an unpaid account for the membership instead', async () => {
  // What the caller resolves WALI_REQUIRED to when the account has not paid.
  const tree = await render({
    isPaidMember: false,
    waliRequired: false,
    underReviewUnpaid: true,
  });
  expect(shows(tree, 'add your wali')).toBe(false);
  expect(texts(tree).join(' ')).toMatch(/member/i);
});
