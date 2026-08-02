import { render } from '@testing-library/react-native';

import '@/lib/i18n';

import { OnboardingShortcutsScreen } from '../OnboardingShortcutsScreen';

describe('OnboardingShortcutsScreen', () => {
  it('renders the title and every step of the Shortcuts setup instructions', async () => {
    const { findByText } = await render(<OnboardingShortcutsScreen />);

    expect(await findByText('Set up Apple Pay capture')).toBeTruthy();
    expect(await findByText('1. Open Shortcuts')).toBeTruthy();
    expect(await findByText('2. Start a new automation')).toBeTruthy();
    expect(await findByText('3. Choose the Wallet trigger')).toBeTruthy();
    expect(await findByText('4. Run it silently')).toBeTruthy();
    expect(await findByText('5. Build the FinanceTracker link')).toBeTruthy();
    expect(await findByText('6. Open the link')).toBeTruthy();
    expect(await findByText("That's it")).toBeTruthy();
  });

  it('mentions the financetracker://add-spend deep link so the copy stays in sync with the contract', async () => {
    const { findByText } = await render(<OnboardingShortcutsScreen />);

    expect(await findByText(/financetracker:\/\/add-spend\?amount=/)).toBeTruthy();
  });

  it('tells the user amount/merchant are best-effort and must be confirmed before saving', async () => {
    const { findByText } = await render(<OnboardingShortcutsScreen />);

    expect(await findByText(/best-effort/)).toBeTruthy();
  });
});
