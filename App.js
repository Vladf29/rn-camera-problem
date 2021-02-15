import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  View,
  Text,
  Linking,
} from 'react-native';

import RNFS from 'react-native-fs';

import axios from 'axios';
import CameraRoll from '@react-native-community/cameraroll';

import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import RNFetchBlob from 'rn-fetch-blob';

const TOKEN = '';
const URL = '';

/**
 * I write a litte util method to convert localIdentifier to assetURL in JavaScript
 * @param localIdentifier looks like 91B1C271-C617-49CE-A074-E391BA7F843F/L0/001
 * @param ext the extension: JPG, PNG, MOV
 * @returns {string}
 */
export const convertLocalIdentifierToAssetLibrary = (localIdentifier, ext) => {
  const hash = localIdentifier.replace('ph://', '').split('/')[0];
  return `assets-library://asset/asset.${ext}?id=${hash}&ext=${ext}`;
};

export const GetAssets = async (params = {first: 11}) => {
  if (Platform.OS === 'android' && !(await Keyboard.hasAndroidPermission())) {
    return;
  }

  let result = await CameraRoll.getPhotos({...params, assetType: 'All'});
  result.edges.map(async (edge) => {
    if (Platform.OS === 'ios') {
      edge.node.image.uri = convertLocalIdentifierToAssetLibrary(
        edge.node.image.uri.replace('ph://', ''),
        edge.node.type === 'image' ? 'jpg' : 'mov',
      );
    }
    return;
  });
  return result;
};

const App = () => {
  const createUploadURl = async (content_type) => {
    try {
      if (!content_type) {
        throw new Error('content_type');
      }
      const res = await axios.post(
        `${URL}/upload`,
        {
          content_type: content_type,
          description: 'Dev Test, UPLOADED FROM TEST APP',
          place: '',
          collection_id: '',
          kind: '',
          type: 'movie',
          event_date: '',
          event_type: '',
          event_title: '',
          event_price: '',
        },
        {
          headers: {
            Token: TOKEN,
          },
        },
      );

      console.log(res.data);

      return res.data.uploadURL;
    } catch (err) {
      console.log(err);
      throw err;
    }
  };

  const upload = async (destination, body, contentType) => {
    try {
      if (!destination) {
        throw 'destination is missing';
      }

      if (!body) {
        throw 'BODY is missing';
      }

      const headers = {};

      if (contentType) {
        headers['Content-Type'] = contentType;
      }
      //return axios.put(url, body, {headers: {...headers}});
      return await fetch(destination, {
        method: 'PUT',
        body: body,
        headers: {...headers},
      });
      // console.log('[upload]', 'destination', destination);
      // console.log('[upload]', 'filePath', filePath);

      // const res = await RNFetchBlob.fetch(
      //   'PUT',
      //   destination,
      //   {
      //     'Content-Type': content_type,
      //   },
      //   RNFetchBlob.wrap(filePath),
      // );

      // console.log('[upload]', res);
    } catch (err) {
      console.log(err);
      throw err;
    }
  };

  const getBlob = async (filePath) => {
    let imageUri = filePath;
    if (Platform.OS === 'ios') {
      imageUri = filePath.replace('file://', '');
    }
    const imageBody = await (await fetch(imageUri)).blob();

    return imageBody;
  };

  const getCameraRollVideo = async () => {
    const assets = await CameraRoll.getPhotos({
      assetType: 'Videos',
      first: 25,
      include: [
        'filename',
        'fileSize',
        'location',
        'imageSize',
        'playableDuration',
      ],
    });

    const {node} = assets.edges[0];
    // ph://E9A21A25-0A2D-4E22-9CA2-F96F6A3AAB38/L0/001

    let uri = node.image.uri;
    let ext = node.image.filename.split('.').slice(-1)[0];
    if (uri.includes('ph://')) {
      let id = uri.replace('ph://', '');
      id = id.substring(0, id.indexOf('/'));
      uri = `assets-library://asset/asset.${ext}?id=${id}&ext=${ext}`;
      console.log(`Converted file uri to ${uri}`);
    }

    const encodedUri = encodeURI(uri);
    const destPath = `${RNFS.TemporaryDirectoryPath}temp.${ext}`;

    let isVideo = node.type === 'video';

    if (isVideo) {
      uri = await RNFS.copyAssetsVideoIOS(encodedUri, destPath);
    } else {
      uri = await RNFS.copyAssetsFileIOS(encodedUri, destPath, 0, 0);
    }

    console.log('new path', uri);
    node.image.uri = uri;
    return node;
  };

  const openGallery = async () => {
    const logTag = '[openGallery]';
    const options = {
      includeBase64: false,
      mediaType: 'video',
    };
    return new Promise((res, rej) => {
      launchImageLibrary(options, (response) => {
        if (response.errorCode) {
          const {errorCode, errorMessage} = response;

          console.log(logTag, 'openImageLibrary', 'error', errorCode);
          console.log(logTag, 'openImageLibrary', 'error msg', errorMessage);

          rej(errorMessage);
          return;
        }

        if (response.didCancel) {
          rej('Canceled by user');
          return;
        }

        if (!response.uri) {
          rej('No uri');
          return;
        }

        console.log(logTag, 'openImageLibrary', 'successfully');

        res(response);
      });
    });
  };

  const onPress = async () => {
    try {
      const res2 = await getCameraRollVideo();
      // return;
      // const res = await openGallery();

      console.log('CameraRoll', res2);
      // console.log('Gallery',res)

      // console.log('#'.repeat(15))
      console.log(await getBlob(res2.image.uri));

      // console.log('-'.repeat(15));
      // console.log(await getBlob(res.uri))

      // const blob = await getBlob(res.uri);

      // console.log(blob.type);
      // const uri = await createUploadURl(blob.type);

      // await upload(uri, res, blob.type);

      // console.log('='.repeat(15));
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView
        style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <TouchableOpacity onPress={onPress} style={{padding: 8}}>
          <Text>OPEN</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({});

export default App;
