import './style/main.css'

import randomWord from './js/createRandomStr'

var JSZip = require("jszip");
var FileSaver = require('file-saver');


var openCamera = document.getElementById('openCamera'), // 打开摄像头
  closeCamera = document.getElementById('closeCamera'), // 关闭摄像头
  cutPic = document.getElementById('cutPic'), // 截图
  clearPic = document.getElementById('clearPic'), // 清空截图
  videoCapture = document.getElementById('videoCapture'), // 录制视频
  pause = document.getElementById('pause'), // 暂停录制
  start = document.getElementById('start'), // 开始录制
  stop = document.getElementById('stop'), // 停止录制
  // save = document.getElementById('save'), // 保存录制
  imgWrap = document.getElementById('imgWrap'), // 图片预览
  vedio = document.getElementById('vedio'), // 视频播放组件
  videoWrap = document.getElementById('videoWrap'), // 视频预览
  clearVideo = document.getElementById('clearVideo'), // 清空视频预览
  batchDownloadPics = document.getElementById('batchDownloadPics'), // 批量下载图片
  batchDownloadVideos = document.getElementById('batchDownloadVideos'), // 批量下载视频
  // 获取媒体对象配置
  container = {
    audio: true,
    video: {
      width: 480,
      height: 320
    }
  },
  canvas = getCanVas(),
  context = canvas.getContext('2d'),

  mediaStream,
  mediaRecorder, // 视频录制
  recordTimer, // 视频录制的计时器
  chunks = '', // 录制的视频数据
  allScreenShots = [],  // 所有的截图
  allSavedVedio = [],
  recordTime = 0; // 视频录制时间

//访问用户媒体设备的兼容方法
function getUserMedia(constrains, success, error) {
  if (navigator.mediaDevices.getUserMedia) {
    //最新标准API
    navigator.mediaDevices.getUserMedia(constrains).then(success).catch(error);
  } else if (navigator.webkitGetUserMedia) {
    //webkit内核浏览器
    navigator.webkitGetUserMedia(constrains).then(success).catch(error);
  } else if (navigator.mozGetUserMedia) {
    //Firefox浏览器
    navagator.mozGetUserMedia(constrains).then(success).catch(error);
  } else if (navigator.getUserMedia) {
    //旧版API
    navigator.getUserMedia(constrains).then(success).catch(error);
  }
}

//成功的回调函数
function success(stream) {
  //兼容webkit内核浏览器
  var CompatibleURL = window.URL || window.webkitURL;
  mediaStream = stream;
  video.width = container.video.width + 40;
  video.height = container.video.height + 20;
  //将视频流设置为video元素的源
  // video.src = CompatibleURL.createObjectURL(stream); // 此处的代码将会报错  解决的办法是将video的srcObject属性指向stream即可
  video.srcObject = stream;
  //播放视频
  video.play();
}

//异常的回调函数
function error(error) {
  console.log("访问用户媒体设备失败：", error.name, error.message);
}

// 生成canvas 获取context对象
function getCanVas() {
  var canvas = document.createElement('canvas');
  canvas.width = container.video.width / 2;
  canvas.height = container.video.height / 2;
  return canvas;
}

// 将base64的数据转成Blob对象
function base64ToBlob(urlData, type) {
  let arr = urlData.split(',');
  let mime = arr[0].match(/:(.*?);/)[1] || type; // match方法的使用
  // allScreenShots.push(arr[1]);
  // 去掉url的头，并转化为byte
  let bytes = window.atob(arr[1]);
  // 处理异常,将ascii码小于0的转换为大于0
  let ab = new ArrayBuffer(bytes.length);
  // 生成视图（直接针对内存）：8位无符号整数，长度1个字节
  let ia = new Uint8Array(ab);
  for (let i = 0; i < bytes.length; i++) {
    ia[i] = bytes.charCodeAt(i);
  }
  return new Blob([ab], {
    type: mime
  });
}


// 打开摄像头
openCamera.onclick = function () {
  if (navigator.mediaDevices.getUserMedia || navigator.getUserMedia || navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia) {
    //调用用户媒体设备，访问摄像头
    getUserMedia(container, success, error);
  } else {
    alert("你的浏览器不支持访问用户媒体设备");
  }
}

// 关闭摄像头
closeCamera.onclick = function () {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => {
      track.stop();
    })
    mediaStream = null;
    // video.pause();
    video.src = '';
    video.load(); // 重新加载视频资源  否则将会显示黑色背景
  } else {
    alert('未检测到摄像头！');
  }

}

//截图
cutPic.onclick = function () {
  if (!mediaStream) {
    alert('未检测到视频资源！请先打开摄像头');
    return false;
  }
  //绘制画面
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  let imgData = canvas.toDataURL("image/png");
  let imgBlob = base64ToBlob(imgData);
  allScreenShots.push(imgBlob);
  let download = document.createElement('a');
  download.download = randomWord() + '.png';
  download.href = window.URL.createObjectURL(imgBlob);
  let img = new Image();
  img.onload = function () {
    // TEXT_NODE 3 表示文本节点
    if (imgWrap.firstChild.nodeType === document.TEXT_NODE) {
      imgWrap.replaceChild(img, imgWrap.firstChild);
      // 或者是
      // imgWrap.removeChild(imgWrap.firstChild);
    } else {
      imgWrap.appendChild(img);
    }
    img.onload = null;
  };
  img.onclick = function () {
    download.click();
  }
  img.src = imgData;
}

// 清空所有截图
clearPic.onclick = function () {
  // TEXT_NODE 3 表示文本节点
  if (imgWrap.firstChild.nodeType === document.TEXT_NODE) {
    alert('当前还没有截图哦~');
    return false;
  }
  if (window.confirm('确定要清空所有截图吗？')) {
    imgWrap.innerHTML = '暂无截图';
    allScreenShots = [];
  }
}

// 视频录制
videoCapture.onclick = function () {
  initVideoRecord();
}

// 视频录制初始化
function initVideoRecord() {
  if (recordTimer) {
    alert('当前有视频正在录制，不能重新开始！');
    return false;
  }
  clearTimer();
  if (mediaStream) {
    mediaRecorder = new MediaRecorder(mediaStream);
    mediaRecorder.ondataavailable = function (e) {
      // e.data是一个Blob对象
      // console.log(e.data);
      chunks = e.data;
      createVideoData();
    }
    mediaRecorder.start();
    setRecordTime();
  } else {
    alert('未检测到摄像头，请先打开摄像头！');
  }
}

// 暂停录制
pause.onclick = function () {
  if (!mediaRecorder) {
    alert('操作无效，未检测到摄像头！');
    return false;
  }
  if (mediaRecorder.state !== 'recording') {
    alert('当前不是录制状态，无法执行暂停操作！！');
    return false;
  }
  clearInterval(recordTimer);
  mediaRecorder && mediaRecorder.pause();
}

// 恢复录制
start.onclick = function () {
  if (!mediaRecorder) {
    initVideoRecord();
    return;
  }
  setRecordTime();
  mediaRecorder && mediaRecorder.resume();
}

// 停止录制并保存视频
stop.onclick = function () {
  if (!mediaRecorder) {
    alert('操作无效，未检测到摄像头！');
    return false;
  }
  mediaRecorder && mediaRecorder.stop();
  clearTimer();
  mediaRecorder = null;
}

// 保存视频数据  显示在视频区域
function createVideoData() {
  let videoTag = document.createElement('video');
  videoTag.width = video.width / 3;
  videoTag.height = video.height / 3;
  videoTag.controls = true;
  // chunk 为Blob对象
  allSavedVedio.push(chunks);
  let src = window.URL.createObjectURL(chunks);
  chunks = '';
  mediaRecorder = null;
  videoTag.src = src;
  // TEXT_NODE 3 表示文本节点
  if (videoWrap.firstChild.nodeType === document.TEXT_NODE) {
    videoWrap.replaceChild(videoTag, videoWrap.firstChild);
    // 或者是
    // videoWrap.removeChild(videoWrap.firstChild);
  } else {
    videoWrap.appendChild(videoTag);
  }
  let link = document.createElement('a');
  // let downloadName = randomWord() + '.ogg';   ogg默认用网页打开
  let downloadName = randomWord() + '.flv';
  link.download = downloadName;
  link.href = src;
  videoTag.onclick = function () {
    link.click();
  }
}

// 清空视频预览
clearVideo.onclick = function () {
  // TEXT_NODE 3 表示文本节点
  if (videoWrap.firstChild.nodeType === document.TEXT_NODE) {
    alert('当前还没有视频哦~');
    return false;
  }
  if (window.confirm('确定要清空所有视频吗？')) {
    allSavedVedio = [];
    videoWrap.innerHTML = '暂无视频';
  }
}


// 清除定时器 归零录制时间
function clearTimer() {
  if (recordTimer) {
    recordTime = 0;
    videoCapture.innerHTML = '视频录制';
    clearInterval(recordTimer);
    recordTimer = null;
  }
}

// 设置定时器 计算视频录制时间
function setRecordTime() {
  if (recordTimer) {
    clearInterval(recordTimer);
  }
  recordTimer = setInterval(function timer() {
    recordTime += 1;
    videoCapture.innerHTML = '视频录制（已录制' + recordTime + 's)';
  }, 1000);
}

// 批量下载图片
batchDownloadPics.onclick = function () {
  if (!allScreenShots.length) {
    alert('还没有添加任何截图！！！');
    return false;
  }
  zipUtils('png', allScreenShots);
  // test();
}

// 批量下载视频
batchDownloadVideos.onclick = function () {
  if (!allSavedVedio.length) {
    alert('还没有添加任何视频！！！');
    return false;
  }
  zipUtils('flv', allSavedVedio);
}


/* 
*   批量下载的函数的封装
*   @param type 
*   @param data
*   @param options
*/
function zipUtils(type, data, options) {
  var resultName = type === 'png' ? 'screen_shots.zip' : 'vedio_collect.zip';
  var zip = new JSZip();
  data.forEach(chunk => {
    let fileName = randomWord() + '.' + type;
    zip.file(fileName, chunk, options);
  })
  zip.generateAsync({
    type: "blob"
  })
    .then(function (content) {
      // see FileSaver.js
      FileSaver.saveAs(content, resultName);
      //content 是个Blob对象 type 是application/zip
      // console.log(content);
    });

}

function test() {
  var zip = new JSZip();
  // var img = zip.folder("images");
  // img.file("smile.gif", imgData, {
  //     base64: true
  // });
  zip.file('1.txt', 'hello world');
  zip.file('2.txt', 'hello world');
  zip.generateAsync({
    type: "blob"
  })
    .then(function (content) {
      // see FileSaver.js
      saveAs(content, 'example.zip');
      //content 是个Blob对象 type 是application/zip
      // console.log(content);
    });
}