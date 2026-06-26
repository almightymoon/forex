import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  COUNTRIES,
  flagEmoji,
  findCountryFromPhone,
  type Country,
} from '../../constants/countries';

type Props = {
  label: string;
  value: string;
  country: Country;
  onChangeValue: (value: string) => void;
  onChangeCountry: (country: Country) => void;
  error?: string;
  onBlur?: () => void;
  placeholder?: string;
};

export function CountryPhoneField({
  label,
  value,
  country,
  onChangeValue,
  onChangeCountry,
  error,
  onBlur,
  placeholder = '555 123 4567',
}: Props) {  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [focused, setFocused] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;

    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q.replace(/^\+/, '')) ||
        c.iso.toLowerCase().includes(q),
    );
  }, [search]);

  const handlePhoneChange = (text: string) => {
    onChangeValue(text);

    const matched = findCountryFromPhone(text);
    if (matched && matched.iso !== country.iso) {
      onChangeCountry(matched);
    }
  };

  const handleSelectCountry = (next: Country) => {
    onChangeCountry(next);
    setPickerOpen(false);
    setSearch('');

    if (value.startsWith('+')) {
      const matched = findCountryFromPhone(value);
      if (matched) {
        const digits = value.replace(/[\s()-]/g, '').slice(1);
        const national = digits.slice(matched.dial.length);
        onChangeValue(national);
      }
    }
  };

  const showDialPrefix = !value.startsWith('+');

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputShell, focused && styles.inputShellFocused, error && styles.inputShellError]}>
        <Pressable
          style={styles.prefixBtn}
          onPress={() => setPickerOpen(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Select country, currently ${country.name}`}
        >
          <Text style={styles.flag}>{flagEmoji(country.iso)}</Text>
          <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
          <View style={styles.divider} />
        </Pressable>

        {showDialPrefix ? (
          <Text style={styles.dialCode}>+{country.dial}</Text>
        ) : null}

        <TextInput
          value={value}
          onChangeText={handlePhoneChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textDim}
          keyboardType="phone-pad"
          style={styles.input}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select country</Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.searchShell}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search country or code"
                placeholderTextColor={colors.textDim}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.iso}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => {
                const selected = item.iso === country.iso;
                return (
                  <Pressable
                    style={[styles.countryRow, selected && styles.countryRowSelected]}
                    onPress={() => handleSelectCountry(item)}
                  >
                    <Text style={styles.countryFlag}>{flagEmoji(item.iso)}</Text>
                    <Text style={styles.countryName}>{item.name}</Text>
                    <Text style={styles.countryDial}>+{item.dial}</Text>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No countries found</Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 12,
  },
  inputShellFocused: {
    borderColor: 'rgba(3,111,252,0.55)',
    backgroundColor: colors.surface,
  },
  inputShellError: {
    borderColor: '#F87171',
  },
  prefixBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
    gap: 4,
  },
  flag: {
    fontSize: 20,
    lineHeight: 24,
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: colors.surfaceHover,
    marginLeft: 6,
    marginRight: 8,
  },
  dialCode: {
    fontSize: 15,
    color: colors.textSilver,
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: '#F87171',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '72%',
    backgroundColor: colors.surfaceHover,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHover,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: 8,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 12,
  },
  countryRowSelected: {
    backgroundColor: 'rgba(3,111,252,0.18)',
  },
  countryFlag: {
    fontSize: 22,
    width: 32,
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  countryDial: {
    fontSize: 14,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    paddingVertical: 24,
    fontSize: 14,
  },
});
}
