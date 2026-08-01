import { fireEvent, render } from '@testing-library/react-native';

import { IconButton } from '../IconButton';

describe('IconButton', () => {
  it('renders with an accessible label in the default state', async () => {
    const { getByLabelText } = await render(
      <IconButton name="plus" accessibilityLabel="Add spend" />,
    );

    expect(getByLabelText('Add spend')).toBeTruthy();
  });

  it('fires onPress when pressed', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await render(
      <IconButton name="trash" accessibilityLabel="Delete spend" onPress={onPress} />,
    );

    fireEvent.press(getByLabelText('Delete spend'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
