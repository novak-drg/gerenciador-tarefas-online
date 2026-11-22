import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActionMenu, type MenuEntry } from './action-menu';

function setup() {
  const onEdit = vi.fn();
  const onSame = vi.fn();
  const entries: MenuEntry[] = [
    { type: 'item', key: 'same', label: 'Mover para A fazer', disabled: true, onSelect: onSame },
    { type: 'item', key: 'next', label: 'Mover para Concluído', onSelect: vi.fn() },
    { type: 'separator', key: 'sep' },
    { type: 'item', key: 'edit', label: 'Editar', onSelect: onEdit },
  ];
  render(
    <>
      <p>Fora do menu</p>
      <ActionMenu label="Mais ações" entries={entries} />
    </>,
  );
  return { onEdit, onSame, trigger: screen.getByRole('button', { name: 'Mais ações' }) };
}

describe('ActionMenu', () => {
  it('is a menu button that opens a menu and focuses the first enabled item', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Mais ações' })).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    expect(screen.getByRole('menuitem', { name: 'Mover para Concluído' })).toHaveFocus();
  });

  it('moves with the arrow keys, wrapping around, and Home/End', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Mover para A fazer' })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitem', { name: 'Mover para A fazer' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus();
  });

  it('closes on Escape and returns focus to the button', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes on an outside click', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    await user.click(screen.getByText('Fora do menu'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('runs the chosen action and closes; a disabled item does nothing', async () => {
    const user = userEvent.setup();
    const { trigger, onEdit, onSame } = setup();

    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Mover para A fazer' }));
    expect(onSame).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'Editar' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens with the arrow keys from the button', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
