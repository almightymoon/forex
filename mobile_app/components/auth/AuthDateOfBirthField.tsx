import { Ionicons } from '@expo/vector-icons';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState, useMemo } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  formatDateToDob,
  formatDobInput,
  getDefaultDobPickerDate,
  getMaxDobDate,
} from '../../utils/authValidation';

type Props = {
  label: string;
  value: string;
  error?: string;
  onChangeValue: (value: string) => void;
  onBlur?: () => void;
};

const MIN_DOB = new Date(1900, 0, 1);

export function AuthDateOfBirthField({
  label,
  value,
  error,
  onChangeValue,
  onBlur,
}: Props) {  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [focused, setFocused] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(() => getDefaultDobPickerDate(value));

  const openPicker = () => {
    setPickerDate(getDefaultDobPickerDate(value));
    setShowPicker(true);
  };

  const applyDate = (date: Date) => {
    onChangeValue(formatDateToDob(date));
  };

  const handlePickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'set' && selected) {
        applyDate(selected);
      }
      return;
    }

    if (selected) setPickerDate(selected);
  };

  const confirmIosPicker = () => {
    applyDate(pickerDate);
    setShowPicker(false);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputShell, focused && styles.inputShellFocused, error && styles.inputShellError]}>
        <View style={styles.inputRow}>
          <TextInput
            placeholder="MM/DD/YYYY"
            placeholderTextColor={colors.textDim}
            keyboardType="number-pad"
            value={value}
            style={styles.input}
            onChangeText={(raw) => onChangeValue(formatDobInput(raw))}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              onBlur?.();
            }}
          />
          <Pressable onPress={openPicker} hitSlop={12} style={styles.rightIcon} accessibilityLabel="Open date picker">
            <Ionicons name="calendar-outline" size={19} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {Platform.OS === 'android' && showPicker ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onChange={handlePickerChange}
          maximumDate={getMaxDobDate()}
          minimumDate={MIN_DOB}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowPicker(false)}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => setShowPicker(false)} hitSlop={12}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </Pressable>
                <Text style={styles.modalTitle}>Date of birth</Text>
                <Pressable onPress={confirmIosPicker} hitSlop={12}>
                  <Text style={styles.modalDone}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                onChange={handlePickerChange}
                maximumDate={getMaxDobDate()}
                minimumDate={MIN_DOB}
                themeVariant="dark"
                style={styles.iosPicker}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
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
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  inputShellFocused: {
    borderColor: 'rgba(3,111,252,0.55)',
    backgroundColor: colors.surface,
  },
  inputShellError: {
    borderColor: '#F87171',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 16,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  rightIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: '#F87171',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalSheet: {
    backgroundColor: colors.surfaceHover,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modalCancel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalDone: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brandBlueDeep,
  },
  iosPicker: {
    height: 220,
  },
});
}
