/**
 * The country step's two reported faults: "Use my location" answered
 * "Location unavailable. Enable in Settings." on a device whose permission was
 * already granted, and picking a country from the list took several taps.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Animated, Text } from 'react-native';
import {
  SafeAreaProvider,
  type Metrics,
} from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
import { citiesOfCountry } from '../src/utils/cityData';
import { CountryScreen } from '../src/screens/onboarding/CountryScreen';

// The screen's entrance animation runs on the native driver, which reaches for
// a host node handle react-test-renderer does not provide — when its delayed
// start fires mid-test it takes the whole run down. Jump straight to the end
// value instead; none of this is what these tests are about.
beforeAll(() => {
  jest
    .spyOn(Animated, 'timing')
    .mockImplementation((value: any, config: any) => ({
      start: (callback?: (result: { finished: boolean }) => void) => {
        value.setValue(config.toValue);
        callback?.({ finished: true });
      },
      stop: () => {},
      reset: () => {},
    }) as any);
});

const geo = Geolocation as unknown as {
  getCurrentPosition: jest.Mock;
  watchPosition: jest.Mock;
  clearWatch: jest.Mock;
};

const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

type Tree = ReactTestRenderer.ReactTestRenderer;

let mounted: Tree | null = null;

async function render(props: Record<string, unknown> = {}): Promise<Tree> {
  let tree!: Tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <CountryScreen {...props} />
      </SafeAreaProvider>,
    );
  });
  mounted = tree;
  return tree;
}

/** The rendered string of every leaf `Text`. */
function texts(tree: Tree): string[] {
  return tree.root
    .findAllByType(Text)
    .filter(node => node.findAllByType(Text).length === 1)
    .map(node => {
      const children = node.props.children;
      return String(Array.isArray(children) ? children.join('') : children ?? '');
    });
}

function textContaining(tree: Tree, needle: string): string | undefined {
  return texts(tree).find(t => t.includes(needle));
}

/**
 * Is this node a `Pressable`?
 *
 * By name, because `react-native`'s export is a memo wrapper that never appears
 * in the test tree — `findAllByType(Pressable)` matches nothing at all.
 */
function isPressable(node: ReactTestRenderer.ReactTestInstance): boolean {
  const type = node.type as { displayName?: string; name?: string };
  return typeof type !== 'string' && (type.displayName ?? type.name) === 'Pressable';
}

/**
 * Press the button containing the leaf `Text` matching `label`.
 *
 * Only real `Pressable`s count. `GradientButton` takes an `onPress` prop
 * whichever variant it renders, so accepting any node with a handler would
 * "press" a disabled button that renders as a plain view.
 */
async function pressText(tree: Tree, label: string) {
  const button = tree.root
    .findAll(node => isPressable(node))
    .find(node =>
      node.findAllByType(Text).some(t => String(t.props.children) === label),
    );
  if (!button) throw new Error(`"${label}" is not a button`);
  if (button.props.disabled) throw new Error(`"${label}" is disabled`);

  const { onPress } = button.props;
  if (typeof onPress !== 'function') throw new Error(`"${label}" does nothing`);
  await act(async () => {
    onPress();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  geo.watchPosition.mockImplementation(() => 1);
});

// The entrance animation and the dataset warm-up both outlive a test that just
// walks away from the tree, and fire into a torn-down environment.
afterEach(() => {
  act(() => {
    mounted?.unmount();
  });
  mounted = null;
});

it('detects the country from a fix and names it', async () => {
  geo.getCurrentPosition.mockImplementation(success =>
    success({ coords: { latitude: 25.204, longitude: 55.27 } }),
  );
  const onLocationDetected = jest.fn();
  const tree = await render({ onLocationDetected });

  await pressText(tree, 'Use my location');

  expect(onLocationDetected).toHaveBeenCalledWith({
    latitude: 25.204,
    longitude: 55.27,
  });
  expect(textContaining(tree, 'Country detected')).toContain(
    'United Arab Emirates',
  );
});

it('blames the provider, not Settings, when there is simply no fix', async () => {
  // What an Android device does indoors: the fused provider answers
  // "unavailable" the moment it is asked, and there is no provider to watch.
  geo.getCurrentPosition.mockImplementation((_success, error) =>
    error({ code: 2, message: 'Location not available (FusedLocationProvider).' }),
  );
  geo.watchPosition.mockImplementation(() => {
    throw new Error('no location provider');
  });

  const tree = await render();
  await pressText(tree, 'Use my location');

  expect(textContaining(tree, 'Turn on Location')).toBeDefined();
  expect(textContaining(tree, 'Enable it in Settings')).toBeUndefined();
  // Three one-shot attempts before it gives up, not one.
  expect(geo.getCurrentPosition).toHaveBeenCalledTimes(3);
});

it('points at Settings only when permission is actually refused', async () => {
  geo.getCurrentPosition.mockImplementation((_success, error) =>
    error({ code: 1, message: 'denied' }),
  );
  const tree = await render();

  await pressText(tree, 'Use my location');

  expect(textContaining(tree, 'Enable it in Settings')).toBeDefined();
  // One refusal, one attempt — no point retrying a no.
  expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
});

it('selects a country on the first tap', async () => {
  const onContinue = jest.fn();
  const tree = await render({ onContinue });

  // Until a country is chosen, Continue is not even a button.
  await expect(pressText(tree, 'Continue')).rejects.toThrow('not a button');

  await pressText(tree, 'Pakistan');
  await pressText(tree, 'Continue');

  expect(onContinue).toHaveBeenCalledTimes(1);
  expect(onContinue).toHaveBeenCalledWith(
    expect.objectContaining({ iso2: 'PK', name: 'Pakistan' }),
  );
});

it('does not touch the city dataset', async () => {
  // The 8MB city list used to be loaded from this screen, on mount and again on
  // selection, which is what stopped the list responding to taps. `null` here
  // means nothing has loaded it.
  const tree = await render();
  await pressText(tree, 'Pakistan');

  expect(citiesOfCountry('PK')).toBeNull();
});
