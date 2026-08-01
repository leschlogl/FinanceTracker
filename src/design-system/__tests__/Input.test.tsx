import { render } from '@testing-library/react-native';

import { Input } from '../Input';

describe('Input', () => {
  it('renders the label and placeholder in the default state', async () => {
    const { getByText, getByPlaceholderText } = await render(
      <Input label="Merchant" placeholder="e.g. Starbucks" />,
    );

    expect(getByText('Merchant')).toBeTruthy();
    expect(getByPlaceholderText('e.g. Starbucks')).toBeTruthy();
  });

  it('renders the error message in the error state', async () => {
    const { getByText } = await render(<Input label="Amount" error="Amount is required" />);

    expect(getByText('Amount is required')).toBeTruthy();
  });
});
