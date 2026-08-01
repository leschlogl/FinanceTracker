import { render } from '@testing-library/react-native';

import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders the title and message in the default state', async () => {
    const { getByText } = await render(
      <EmptyState
        icon="tray"
        title="No spendings yet"
        message="Add your first spend to get started"
      />,
    );

    expect(getByText('No spendings yet')).toBeTruthy();
    expect(getByText('Add your first spend to get started')).toBeTruthy();
  });

  it('renders without a message or icon', async () => {
    const { getByText, queryByText } = await render(<EmptyState title="No spendings yet" />);

    expect(getByText('No spendings yet')).toBeTruthy();
    expect(queryByText('Add your first spend to get started')).toBeNull();
  });
});
