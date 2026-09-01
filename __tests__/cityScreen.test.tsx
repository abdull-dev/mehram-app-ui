/**
 * The city step is where the 8MB city dataset is now loaded, so it is where the
 * wait has to be visible: a skeleton while the names come in, then the list.
 * Before, every screen that used city data read it during render and froze
 * instead.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Animated, Text } from 'react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { CityScreen } from '../src/screens/onboarding/CityScreen';

const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

type Tree = ReactTestRenderer.ReactTestRenderer;

// Native-driver animations reach for a host node handle react-test-renderer
// does not provide, and the skeleton pulses on a loop.
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

let mounted: Tree | null = null;

afterEach(() => {
  act(() => {
    mounted?.unmount();
  });
  mounted = null;
});

async function render(countryCode: string): Promise<Tree> {
  let tree!: Tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <CityScreen countryCode={countryCode} countryName="Pakistan" />
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

/** The dataset load is deferred a frame on purpose, so wait like a user would. */
async function settle(tree: Tree) {
  await act(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 150));
  });
  return tree;
}

/** Is the loading placeholder on screen? */
function skeletonShown(tree: Tree): boolean {
  return (
    tree.root.findAll(node => node.props.accessibilityLabel === 'Loading cities')
      .length > 0
  );
}

it('shows a skeleton while the city list loads, then the cities', async () => {
  const tree = await render('PK');

  // The wait is visible, and it is not an empty list pretending to be an answer.
  expect(skeletonShown(tree)).toBe(true);
  expect(texts(tree)).not.toContain('Nothing matches "".\nTry another spelling.');

  await settle(tree);

  expect(skeletonShown(tree)).toBe(false);
  expect(texts(tree)).toContain('Karachi');
  expect(texts(tree)).toContain('Lahore');
});

it('does not make the user wait twice for the same country', async () => {
  const first = await render('PK');
  await settle(first);
  act(() => {
    first.unmount();
  });
  mounted = null;

  // Reopened: the list is already in memory, so there is nothing to skeleton.
  const again = await render('PK');
  expect(skeletonShown(again)).toBe(false);
  expect(texts(again)).toContain('Karachi');
});
