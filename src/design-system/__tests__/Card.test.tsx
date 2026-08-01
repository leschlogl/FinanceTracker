import { Text as RNText } from 'react-native';
import { render } from '@testing-library/react-native';

import { Card } from '../Card';

describe('Card', () => {
  it('renders its children', async () => {
    const { getByText } = await render(
      <Card>
        <RNText>Coffee</RNText>
      </Card>,
    );

    expect(getByText('Coffee')).toBeTruthy();
  });

  it('merges call-site className overrides', async () => {
    const { getByTestId } = await render(
      <Card testID="card" className="p-8">
        <RNText>Rent</RNText>
      </Card>,
    );

    expect(getByTestId('card').props.className).toContain('p-8');
  });
});
