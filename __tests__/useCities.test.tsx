/**
 * The city dataset must not load until something is going to show it.
 *
 * The preferences step renders a city picker that stays mounted while closed.
 * With an eager hook, opening that screen loaded 8MB — one blocking chunk of JS
 * — and a tap on Continue during it went nowhere.
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { citiesOfCountry } from '../src/utils/cityData';
import { useCityNames } from '../src/hooks/useCities';

function Probe({ code, enabled }: { code: string; enabled: boolean }) {
  const { names, loading } = useCityNames(code, enabled);
  return <Text>{loading ? 'loading' : `${names.length}`}</Text>;
}

type Tree = ReactTestRenderer.ReactTestRenderer;

function shown(tree: Tree): string {
  return String(tree.root.findByType(Text).props.children);
}

/** The load is deferred a frame on purpose, so wait like a user would. */
async function settle() {
  await act(async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 150));
  });
}

it('loads nothing until it is enabled', async () => {
  let tree!: Tree;
  await act(async () => {
    tree = ReactTestRenderer.create(<Probe code="BD" enabled={false} />);
  });
  await settle();

  // Not loading, not loaded — the dataset was never touched.
  expect(shown(tree)).toBe('0');
  expect(citiesOfCountry('BD')).toBeNull();

  await act(async () => {
    tree.update(<Probe code="BD" enabled={true} />);
  });
  expect(shown(tree)).toBe('loading');

  await settle();
  expect(Number(shown(tree))).toBeGreaterThan(100);
  expect(citiesOfCountry('BD')).not.toBeNull();

  act(() => tree.unmount());
});

it('reports no wait for a country already in memory', async () => {
  let first!: Tree;
  await act(async () => {
    first = ReactTestRenderer.create(<Probe code="AE" enabled={true} />);
  });
  await settle();
  const count = shown(first);
  act(() => first.unmount());

  let second!: Tree;
  await act(async () => {
    second = ReactTestRenderer.create(<Probe code="AE" enabled={true} />);
  });
  // Straight to the names: no skeleton for a list that is already loaded.
  expect(shown(second)).toBe(count);
  act(() => second.unmount());
});
