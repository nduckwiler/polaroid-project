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
var playButton;
var mask;
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
  resizeAtBreakpoints();
  canvas.parent('#canvas-container');

  pixelDensity(1);

  // initCaptureDevice(canvasWidth, canvasHeight);

  danceVideo = createVideo('https://cdn.glitch.com/e38ac892-4f4e-45ac-912e-fb4dc1e74e45%2FGestureStudy_Final_minimized.mp4?v=1592367564827');
  danceVideo.parent('#video-container');
  danceVideo.hide();

  playButton = createButton('Play');
  playButton.parent('#button-container');
  playButton.mousePressed(playAudioVideo);

  prevFrame = [];
  currentFrame = [];
  mask = new p5.Image(canvasWidth, canvasHeight);
}

function draw() {
  var pixelsInMotion = 0;

  image(danceVideo, 0, 0, canvasWidth, canvasHeight);

  if (captureSuccess)
  {
    currentFrame = getVideoPixels(captureVideo);
    mask.loadPixels();
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
          var rMask = mask.pixels[loc];
          var gMask = mask.pixels[loc + 1];
          var bMask = mask.pixels[loc + 2];
          var aMask = mask.pixels[loc + 3];

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
          mask.pixels[loc] = rMask;
          mask.pixels[loc + 1] = gMask;
          mask.pixels[loc + 2] = bMask;
          mask.pixels[loc + 3] = aMask;

          // Set next pixel as well (we're looping over every other pixel)
          mask.pixels[loc + 4] = rMask;
          mask.pixels[loc + 1 + 4] = gMask;
          mask.pixels[loc + 2 + 4] = bMask;
          mask.pixels[loc + 3 + 4] = aMask;
        }
      }
    }
    // Draw mask
    mask.updatePixels();
    image(mask, 0, 0, canvasWidth, canvasHeight);

    // Save current pixels for next loop
    prevFrame = currentFrame;
  }

  // Scale % motion to volume using lesser-exponential formula
  var motionPercentage = pixelsInMotion / canvasPixelCount;
  var scaledVolume;
  scaledVolume = Math.pow(motionPercentage, 0.75);
  danceVideo.volume(scaledVolume);

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
    canvasWidth = sizes.large.w;
    canvasHeight = sizes.large.h;
  } else if (windowWidth >= sizes.medium.minW && windowHeight >= sizes.medium.minH) {
    canvasWidth = sizes.medium.w;
    canvasHeight = sizes.medium.h;
  } else {
    canvasWidth = sizes.small.w;
    canvasHeight = sizes.small.h;
  }

  canvasPixelCount = canvasWidth * canvasHeight;

  resizeCanvas(canvasWidth, canvasHeight);
}

function playAudioVideo() {
  console.log('attempting to loop video and audio...');
  danceVideo.loop();
  initCaptureDevice(canvasWidth, canvasHeight);

  this.style('display', 'none');
}

// Try to access camera
function initCaptureDevice(width, height) {
  try {
    captureVideo = createCapture(VIDEO);
    captureVideo.size(width, height);
    captureVideo.elt.setAttribute('playsinline', '');
    captureVideo.hide();
    captureSuccess = true;
    console.log(
      '[initCaptureDevice] capture ready. Resolution: ' +
      captureVideo.width + ' ' + captureVideo.height
    );
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