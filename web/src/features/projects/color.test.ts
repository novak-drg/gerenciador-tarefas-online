import { describe, expect, it } from 'vitest';
import { PROJECT_COLORS, projectColor, rankProjectColors } from './color';

describe('rankProjectColors', () => {
  it('gives every project its own colour while the palette lasts', () => {
    const ids = PROJECT_COLORS.map((_, i) => `p-${String(i).padStart(2, '0')}`);
    const colors = rankProjectColors(ids);
    expect(new Set(colors.values()).size).toBe(PROJECT_COLORS.length);
  });

  it('ranks by id, whatever the order of the list', () => {
    const a = rankProjectColors(['b', 'c', 'a']);
    const b = rankProjectColors(['a', 'b', 'c']);
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
    expect(a.get('a')).toBe(PROJECT_COLORS[0]);
    expect(a.get('b')).toBe(PROJECT_COLORS[1]);
    expect(a.get('c')).toBe(PROJECT_COLORS[2]);
  });

  it('wraps after the palette is exhausted', () => {
    const ids = Array.from({ length: PROJECT_COLORS.length + 1 }, (_, i) => `p-${i}`);
    const colors = rankProjectColors(ids);
    expect(colors.get(`p-${PROJECT_COLORS.length}`)).toBe(PROJECT_COLORS[0]);
  });

  it('ignores duplicate ids and handles an empty list', () => {
    expect(rankProjectColors(['a', 'a', 'b']).size).toBe(2);
    expect(rankProjectColors([]).size).toBe(0);
  });

  it('keeps the periwinkle accent out of the palette', () => {
    expect(PROJECT_COLORS).not.toContain('#4046B8');
    for (const semantic of ['#2B8202', '#A68B2E', '#D82B25', '#B85450']) {
      expect(PROJECT_COLORS).not.toContain(semantic);
    }
  });
});

describe('projectColor', () => {
  it('is stable for an id and always a palette entry', () => {
    expect(projectColor('abc')).toBe(projectColor('abc'));
    expect(PROJECT_COLORS).toContain(projectColor('abc'));
  });
});
