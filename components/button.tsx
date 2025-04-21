import {StyleSheet, View, Pressable, Text, Alert} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

type Props = {
    label: string;
    theme?: 'primary';
    icon?: keyof typeof FontAwesome.glyphMap;
    onPress?: () => void;
}

export default function Button({label, theme, icon, onPress}: Props) {
    return (
        <View style={[styles.buttonContainer, theme === 'primary' && styles.primaryContainer]}>
            <Pressable style={[styles.button, theme === 'primary' && styles.primaryButton]} onPress={onPress}>
                <Text style={[styles.buttonLabel, theme === 'primary' && styles.primaryLabel]}>{label}</Text>
                {icon && <FontAwesome name={icon} size={16} color={theme === 'primary' ? '#fff' : '#000'} style={styles.icon} />}
            </Pressable>
        </View>
    )
}       

const styles = StyleSheet.create({
    buttonContainer: {
        width: 320,
        height: 68,
        padding: 4,
        borderRadius: 10,
        backgroundColor: '#fff',
        marginBottom: 10,
    },
    primaryContainer: {
        backgroundColor: '#FF7F00',
    },
    button: {
        borderRadius: 10,
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    primaryButton: {
        backgroundColor: '#FF7F00',
    },
    buttonLabel: {
        color: '#000',
        fontSize: 16,
    },
    primaryLabel: {
        color: '#fff',
    },
    icon: {
        marginLeft: 8,
    }
})  