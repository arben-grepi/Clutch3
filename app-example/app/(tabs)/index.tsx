import { View, StyleSheet, Platform } from "react-native";
import ImageViewer from "../../components/ImageViewer";
import Button from "@/components/button";
import CircleButton from "@/components/CircleButton";
import IconButton from "@/components/iconButton";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import EmojiPicker from "@/components/EmojiPicker";
import EmojiList from "@/components/EmojiList";
import { ImageSource } from "expo-image";
import EmojiSticker from "@/components/emojiSticker";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";
import domtoimage from "dom-to-image";
//Images
const placeholderImage = require("../../assets/images/background-image.png");

export default function Index() {
  const imageRef = useRef<View>(null);
  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [isViewReady, setIsViewReady] = useState(false);
  const [captureInProgress, setCaptureInProgress] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showApp, setShowApp] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [sticker, setSticker] = useState<ImageSource | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    // Set view as ready after a short delay to ensure it's mounted
    const timer = setTimeout(() => {
      setIsViewReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const pickImageAsync = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setShowApp(true);
      console.log(result);
    } else {
      alert("You need to provide a photo");
    }
  };
  const onReset = () => {
    setShowApp(false);
  };
  const onModalClose = () => {
    setIsModalVisible(false);
  };
  const onAddSticker = () => {
    setIsModalVisible(true);
  };

  const onSaveImageAsync = async () => {
    if (captureInProgress) return;
    setCaptureInProgress(true);
    if (Platform.OS === "web") {
      try {
        // @ts-ignore
        const dataUrl = await domtoimage.toJpeg(imageRef.current, {
          quality: 0.95,
          width: 320,
          height: 400,
        });
        let link = document.createElement("a");
        link.download = "sticker-smash.jpeg";
        link.href = dataUrl;
        link.click();
        alert("Image saved successfully!");
        setCaptureInProgress(false);
      } catch (error) {
        console.error("Save error:", error);
        alert("Failed to save image");
      } finally {
        setCaptureInProgress(false);
      }
    } else {
      try {
        if (!permission?.granted) {
          const newPermission = await requestPermission();
          if (!newPermission.granted) {
            alert("Permission to access media library is required");
            return;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
        const localUrl = await captureRef(imageRef, {
          height: 440,
          quality: 1,
          format: "png",
          result: "tmpfile",
        });

        if (!localUrl) throw new Error("Capture failed");
        await MediaLibrary.saveToLibraryAsync(localUrl);
        alert("Image saved successfully!");
      } catch (error) {
        console.error("Save error:", error);
        alert("Failed to save image");
      } finally {
        setCaptureInProgress(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View ref={imageRef} style={styles.imageContainer} collapsable={false}>
        <ImageViewer imgSource={selectedImage || placeholderImage} />
        {sticker && <EmojiSticker imageSize={40} stickerSource={sticker} />}
      </View>
      {showApp ? (
        <View style={styles.optionsContainer}>
          <View style={styles.optionsRow}>
            <IconButton icon="refresh" onPress={onReset} label="Reset" />
            <CircleButton onPress={onAddSticker} />
            <IconButton
              icon="save-alt"
              onPress={onSaveImageAsync}
              label="Save"
            />
          </View>
        </View>
      ) : (
        <View style={styles.footerContainer}>
          <Button
            label="Choose a photo"
            theme="primary"
            icon="photo"
            onPress={pickImageAsync}
          />
          <Button label="Use this photo" />
        </View>
      )}
      <EmojiPicker isVisible={isModalVisible} onClose={onModalClose}>
        <EmojiList onSelect={setSticker} onCloseModal={onModalClose} />
      </EmojiPicker>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#25292e",
  },
  imageContainer: {
    flex: 1,
    marginTop: 50,
  },
  footerContainer: {
    flex: 1 / 3,
    alignItems: "center",
  },
  optionsContainer: {
    position: "absolute",
    bottom: 80,
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
