import { Image } from "expo-image";
import { View, StyleSheet } from "react-native";

type Props = {
    imgSource: string;
}

export default function ImageViewer({ imgSource }: Props) {
    return (
        <View style={{ pointerEvents: 'auto' }}>
            <Image 
                source={imgSource} 
                style={styles.image} 
            />
        </View>
    );
}

const styles = StyleSheet.create({
    image: {
        width: 320,
        height: 440,
        borderRadius: 18,
    },
});