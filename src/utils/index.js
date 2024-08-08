export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const base64ToFile = (base64, fileName) => {
  //将base64转换为blob
  const dataURLtoBlob = function (dataurl) {
    let arr = dataurl.split(","),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };
  //将blob转换为file
  const blobToFile = function (theBlob, fileName) {
    theBlob.lastModifiedDate = new Date();
    theBlob.name = fileName;
    return new window.File([theBlob], theBlob.name, { type: theBlob.type });
  };
  //调用
  const blob = dataURLtoBlob(base64);
  const file = blobToFile(blob, fileName);
  return file;
};
