/**
 * `react-native-image-picker` for the web, over a file input.
 *
 * The picker's contract is a promise that resolves with either `didCancel` or
 * an `assets` array whose `uri` the caller can upload. A blob: URL satisfies
 * both — it previews in an `<img>` and `fetch` reads it back for the upload.
 */

export interface Asset {
  uri?: string;
  fileName?: string;
  type?: string;
  fileSize?: number;
  width?: number;
  height?: number;
}

export interface ImagePickerResponse {
  didCancel?: boolean;
  errorCode?: string;
  errorMessage?: string;
  assets?: Asset[];
}

export interface ImageLibraryOptions {
  mediaType?: string;
  quality?: number;
  selectionLimit?: number;
}

export function launchImageLibrary(
  options: ImageLibraryOptions = {},
): Promise<ImagePickerResponse> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if ((options.selectionLimit ?? 1) !== 1) input.multiple = true;
    input.style.display = "none";

    let settled = false;
    const finish = (result: ImagePickerResponse) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(result);
    };

    input.addEventListener("change", () => {
      const files = Array.from(input.files ?? []);
      if (!files.length) return finish({ didCancel: true });
      finish({
        assets: files.map((file) => ({
          uri: URL.createObjectURL(file),
          fileName: file.name,
          type: file.type || "image/jpeg",
          fileSize: file.size,
        })),
      });
    });

    // `cancel` is not universal, so a focus-return fallback closes the promise
    // rather than leaving the caller's `uploading` flag stuck on.
    input.addEventListener("cancel", () => finish({ didCancel: true }));
    window.addEventListener(
      "focus",
      () => {
        setTimeout(() => {
          if (!input.files?.length) finish({ didCancel: true });
        }, 400);
      },
      { once: true },
    );

    document.body.append(input);
    input.click();
  });
}

export function launchCamera(
  options: ImageLibraryOptions = {},
): Promise<ImagePickerResponse> {
  return launchImageLibrary(options);
}
