import { fireEvent, render } from '@testing-library/react-native';

import type { Category } from '@/data/categoryRepository';

import { CategoryPicker } from '../CategoryPicker';

const categories: Category[] = [
  { id: 'food', name: 'Food', color: '#FF9500', icon: 'fork.knife' },
  { id: 'transport', name: 'Transport', color: '#007AFF', icon: 'car.fill' },
];

describe('CategoryPicker', () => {
  it('renders every category', async () => {
    const { getByText } = await render(
      <CategoryPicker categories={categories} onSelect={jest.fn()} />,
    );

    expect(getByText('Food')).toBeTruthy();
    expect(getByText('Transport')).toBeTruthy();
  });

  it('marks the selected category as accessibly selected', async () => {
    const { getByLabelText } = await render(
      <CategoryPicker categories={categories} selectedId="transport" onSelect={jest.fn()} />,
    );

    expect(getByLabelText('Food').props.accessibilityState).toEqual({ selected: false });
    expect(getByLabelText('Transport').props.accessibilityState).toEqual({ selected: true });
  });

  it('calls onSelect with the pressed category id', async () => {
    const onSelect = jest.fn();
    const { getByLabelText } = await render(
      <CategoryPicker categories={categories} onSelect={onSelect} />,
    );

    fireEvent.press(getByLabelText('Transport'));

    expect(onSelect).toHaveBeenCalledWith('transport');
  });

  it('renders nothing for an empty category list', async () => {
    const { queryByText } = await render(<CategoryPicker categories={[]} onSelect={jest.fn()} />);

    expect(queryByText('Food')).toBeNull();
  });
});
