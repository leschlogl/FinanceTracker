import { Text as RNText } from 'react-native';
import { render } from '@testing-library/react-native';

import { Screen } from '../Screen';

describe('Screen', () => {
  it('renders its children inside a safe-area root', async () => {
    const { getByText } = await render(
      <Screen>
        <RNText>Dashboard</RNText>
      </Screen>,
    );

    expect(getByText('Dashboard')).toBeTruthy();
  });
});
