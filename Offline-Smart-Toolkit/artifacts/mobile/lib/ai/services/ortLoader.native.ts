/**
 * ORT Loader — Native platform stub.
 *
 * onnxruntime-web is browser-only. On Android/iOS the app falls back to
 * BodyPix (TF.js CPU). A separate upgrade to onnxruntime-react-native
 * would replace this stub with a real native session loader.
 */
export async function loadOnnxRuntime(): Promise<null> {
  return null;
}
