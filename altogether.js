// Add a janky form of Intellisense for P5.js
/// <reference path="./libraries/p5.d/p5.global-mode.d.ts" />

var canvas;
var sizes = {
  'small': {w: 320, h: 330, minW: 0, minH: 0 },
  'medium': {w: 450, h: 460, minW: 510, minH: 620 },
  'large': {w: 625, h: 640, minW: 705, minH: 855 },
}
var canvasWidth = sizes.small.w;
var canvasHeight = sizes.small.h;
var canvasPixelCount = canvasWidth * canvasHeight;
var captureVideo;
var danceVideo;
var audioContext;
var filterNode;
var playButton;
var prevFrame;
var currentFrame;
var recovery = 10;
var threshold = 30;
var captureSuccess = false;

function preload() {
  alertIfIE();
}

function setup() {
  canvas = createCanvas();
  canvas.parent('#canvas-container');

  pixelDensity(1);

  danceVideo = document.querySelector('video#gesture-study');

  playButton = document.querySelector('div#button-container button');
  playButton.onclick = playAudioVideo;

  resizeAtBreakpoints();

  prevFrame = [];
  currentFrame = [];

  var AudioContext = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioContext();
  const track = audioContext.createMediaElementSource(danceVideo);

  filterNode = audioContext.createBiquadFilter();
  track.connect(filterNode);
  filterNode.connect(audioContext.destination);
}

function draw() {
  var pixelsInMotion = 0;

  if (captureSuccess)
  {
    currentFrame = getVideoPixels(captureVideo);
    loadPixels();
    pixelsInMotion = 0;

    if (prevFrame) {
      // Loop through each pixel
      for (var x = 0; x < canvasWidth; x = x + 2) {
        for (var y = 0; y < canvasHeight; y++) {
          // Formula for pixels array: https://p5js.org/reference/#/p5.Image/pixels
          var loc = (4 * x) + 4 * canvasWidth * y;

          // Capture RGB values from previous frame
          var rPrev = prevFrame[loc];
          var gPrev = prevFrame[loc + 1];
          var bPrev = prevFrame[loc + 2];
          
          // Capture RGB values from current frame
          var rCurr = currentFrame[loc];
          var gCurr = currentFrame[loc + 1];
          var bCurr = currentFrame[loc + 2];
          
          // Capture RGBA values from masking image
          var rMask = pixels[loc];
          var gMask = pixels[loc + 1];
          var bMask = pixels[loc + 2];
          var aMask = pixels[loc + 3];

          // If motion is detected in pixel, create a transparent black color
          var d = dist(rPrev, gPrev, bPrev, rCurr, gCurr, bCurr);
          if (d > threshold) {
            rMask = 0;
            gMask = 0;
            bMask = 0;
            aMask = 0;
          }

          // Regardless of motion, add some opacity to the color
          aMask += recovery;
          if (aMask >= 255) {
            aMask = 255;
          } else {
            pixelsInMotion++;
          }

          // Set pixel color in masking image
          pixels[loc] = rMask;
          pixels[loc + 1] = gMask;
          pixels[loc + 2] = bMask;
          pixels[loc + 3] = aMask;

          // Set next pixel as well (we're looping over every other pixel)
          pixels[loc + 4] = rMask;
          pixels[loc + 1 + 4] = gMask;
          pixels[loc + 2 + 4] = bMask;
          pixels[loc + 3 + 4] = aMask;
        }
      }
    }
    updatePixels();

    // Save current pixels for next loop
    prevFrame = currentFrame;
  } else {
    // captureSuccess is false
    pixelsInMotion = canvasPixelCount;
  }

  // Scale % motion to volume using lesser-exponential formula
  var motionPercentage = pixelsInMotion / canvasPixelCount;
  var scaledVolume;
  scaledVolume = map(motionPercentage, 0, 1, .5, 1, true);
  danceVideo.volume = scaledVolume;
  var filterFrequency = map(motionPercentage, 0, 0.6, 500, 4000, false);
  filterNode.frequency.value = filterFrequency;
  
  // For debugging
  // fill('chartreuse');
  // text(`pixelsInMotion: ${pixelsInMotion}`, 0, 20,);
  // text(`frameRate: ${frameRate()}`, 0, 50,);
}

function getVideoPixels(video)
{
  var snapshot = video.get();
  snapshot.loadPixels();
  return snapshot.pixels;
}

function windowResized() {
  resizeAtBreakpoints();
}

function resizeAtBreakpoints() {
  if (windowWidth >= sizes.large.minW && windowHeight >= sizes.large.minH) {
    danceVideo.width = canvasWidth = sizes.large.w;
    danceVideo.height = canvasHeight = sizes.large.h;
  } else if (windowWidth >= sizes.medium.minW && windowHeight >= sizes.medium.minH) {
    danceVideo.width = canvasWidth = sizes.medium.w;
    danceVideo.height = canvasHeight = sizes.medium.h;
  } else {
    danceVideo.width = canvasWidth = sizes.small.w;
    danceVideo.height = canvasHeight = sizes.small.h;
  }

  canvasPixelCount = canvasWidth * canvasHeight;

  resizeCanvas(canvasWidth, canvasHeight);
}

function playAudioVideo() {
  console.log('attempting to loop video and audio...');

  initCaptureDevice(canvasWidth, canvasHeight);

  // check if context is in suspended state (autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  danceVideo.loop = true;
  danceVideo.play();
  this.classList.add('disappearing');
}

// Try to access camera
function initCaptureDevice(width, height) {
  try {
    captureVideo = createCapture(VIDEO, function() {
      captureVideo.size(width, height);
      captureVideo.elt.setAttribute('playsinline', '');
      captureVideo.hide();
      captureSuccess = true;
      console.log(
        '[initCaptureDevice] capture ready. Resolution: ' +
        captureVideo.width + ' ' + captureVideo.height
      );
    });
  } catch(_err) {
    console.log('[initCaptureDevice] capture error: ' + _err);
  }
}

function alertIfIE() {

  var ua = window.navigator.userAgent;
  var msie = ua.indexOf("MSIE ");

  if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./))  // If Internet Explorer, return version number
  {
      alert("Sorry! This site doesn't run well on Internet Explorer. Try another browser like Edge, Chrome, Safari, or Firefox.");
  }

  return false;
}