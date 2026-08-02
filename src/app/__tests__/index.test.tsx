import { render } from '@testing-library/react-native';

import '@/lib/i18n';
import DashboardScreen from '../(tabs)/index';

describe('DashboardScreen', () => {
  it('renders the translated dashboard title', async () => {
    const { getByText } = await render(<DashboardScreen />);

    expect(getByText('Dashboard')).toBeTruthy();
  });
});
