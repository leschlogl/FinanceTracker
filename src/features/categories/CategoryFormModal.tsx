import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';

import { Button, Card, Input, Text } from '@/design-system';

import { CATEGORY_COLOR_PRESETS, CATEGORY_ICON_PRESETS } from './constants';

export type CategoryFormValues = {
  name: string;
  color: string;
  icon: SFSymbol;
};

type CategoryFormModalProps = {
  visible: boolean;
  initialValues?: CategoryFormValues | null;
  onSubmit: (values: CategoryFormValues) => void;
  onCancel: () => void;
};

// Only mounted while `visible`, so its local form state always initializes
// fresh from `initialValues` on open (add vs. edit) without needing an
// effect-based reset — React re-derives state on mount, not via setState in
// an effect (see https://react.dev/learn/you-might-not-need-an-effect).
export function CategoryFormModal({
  visible,
  initialValues,
  onSubmit,
  onCancel,
}: CategoryFormModalProps) {
  if (!visible) {
    return null;
  }

  return (
    <CategoryFormModalContent
      initialValues={initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}

type CategoryFormModalContentProps = Omit<CategoryFormModalProps, 'visible'>;

function CategoryFormModalContent({
  initialValues,
  onSubmit,
  onCancel,
}: CategoryFormModalContentProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValues?.name ?? '');
  const [color, setColor] = useState(initialValues?.color ?? CATEGORY_COLOR_PRESETS[0]);
  const [icon, setIcon] = useState<SFSymbol>(initialValues?.icon ?? CATEGORY_ICON_PRESETS[0]);
  const [nameTouched, setNameTouched] = useState(false);

  const nameError =
    nameTouched && name.trim().length === 0 ? t('categories.form.nameRequired') : undefined;

  function handleSave() {
    if (name.trim().length === 0) {
      setNameTouched(true);
      return;
    }

    onSubmit({ name: name.trim(), color, icon });
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCancel}>
      <View className="flex-1 justify-end bg-black/40">
        <Card className="gap-4 rounded-b-none">
          <Text variant="subtitle">
            {initialValues ? t('categories.form.editTitle') : t('categories.form.addTitle')}
          </Text>

          <Input
            label={t('categories.form.nameLabel')}
            placeholder={t('categories.form.namePlaceholder')}
            value={name}
            onChangeText={setName}
            onBlur={() => setNameTouched(true)}
            error={nameError}
          />

          <View className="gap-2">
            <Text variant="caption" className="text-textMuted dark:text-textMutedDark">
              {t('categories.form.colorLabel')}
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {CATEGORY_COLOR_PRESETS.map((preset) => {
                const selected = preset === color;
                return (
                  <Pressable
                    key={preset}
                    accessibilityRole="button"
                    accessibilityLabel={t('categories.form.colorSwatchLabel', { color: preset })}
                    accessibilityState={{ selected }}
                    onPress={() => setColor(preset)}
                    style={{ backgroundColor: preset }}
                    className={`h-9 w-9 rounded-full ${
                      selected
                        ? 'border-4 border-primary dark:border-primaryDark'
                        : 'border-2 border-border dark:border-borderDark'
                    }`}
                  />
                );
              })}
            </View>
          </View>

          <View className="gap-2">
            <Text variant="caption" className="text-textMuted dark:text-textMutedDark">
              {t('categories.form.iconLabel')}
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {CATEGORY_ICON_PRESETS.map((preset) => {
                const selected = preset === icon;
                return (
                  <Pressable
                    key={preset}
                    accessibilityRole="button"
                    accessibilityLabel={t('categories.form.iconSwatchLabel', { icon: preset })}
                    accessibilityState={{ selected }}
                    onPress={() => setIcon(preset)}
                    className={`h-11 w-11 items-center justify-center rounded-full ${
                      selected
                        ? 'border-2 border-primary bg-surface dark:border-primaryDark dark:bg-surfaceDark'
                        : 'border border-border bg-surface dark:border-borderDark dark:bg-surfaceDark'
                    }`}
                  >
                    <SymbolView name={preset} size={20} tintColor={color} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              className="flex-1 items-center rounded-lg border border-border px-4 py-3 active:opacity-60 dark:border-borderDark"
            >
              <Text variant="body">{t('categories.form.cancel')}</Text>
            </Pressable>
            <Button label={t('categories.form.save')} onPress={handleSave} className="flex-1" />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
