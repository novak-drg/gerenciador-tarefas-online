import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './field';
import { Input, Select, Textarea } from './input';

describe('Field', () => {
  it('associates the label with the control', () => {
    render(
      <Field label="E-mail">
        <Input type="email" />
      </Field>,
    );
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  });

  it('wires the error to the control and marks it invalid', () => {
    render(
      <Field label="E-mail" error="Informe um e-mail válido">
        <Input type="email" />
      </Field>,
    );
    const input = screen.getByLabelText('E-mail');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const message = screen.getByText('Informe um e-mail válido');
    expect(input.getAttribute('aria-describedby')).toContain(message.id);
    expect(input).toHaveAccessibleDescription('Informe um e-mail válido');
  });

  it('describes the control with both hint and error', () => {
    render(
      <Field label="Senha" hint="Mínimo de 8 caracteres" error="Senha curta">
        <Input type="password" />
      </Field>,
    );
    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription(
      'Senha curta Mínimo de 8 caracteres',
    );
  });

  it('does not mark a valid control invalid', () => {
    render(
      <Field label="Nome" hint="Como aparece para a equipe">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText('Nome');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).toHaveAccessibleDescription('Como aparece para a equipe');
  });

  it('works with textarea and select', () => {
    render(
      <>
        <Field label="Descrição" error="Longa demais">
          <Textarea />
        </Field>
        <Field label="Prioridade" error="Escolha uma">
          <Select>
            <option value="LOW">Baixa</option>
          </Select>
        </Field>
      </>,
    );
    expect(screen.getByLabelText('Descrição')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Prioridade')).toHaveAttribute('aria-invalid', 'true');
  });

  it('marks the caption as optional', () => {
    render(
      <Field label="Descrição" optional>
        <Textarea />
      </Field>,
    );
    expect(screen.getByText('(opcional)')).toBeInTheDocument();
  });
});
