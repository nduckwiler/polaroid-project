// Add a janky form of Intellisense for P5.js
/// <reference path="./libraries/p5.d/p5.global-mode.d.ts" />

var imageWidth = 640;
var imageHeight = 480;
var imagePixelCount = imageWidth * imageHeight;
var canvasWidth = imageWidth * 2;
var canvasHeight = imageHeight;
var sourceImage;
var captureVideo;
var prevFrame;
var currentFrame;
var mask;
var recovery = 10;
var threshold = 30;
var recoverySlider;
var thresholdSlider;
var radioSelector;
var motionPercentage;
var soundFile;

function preload() {
  // Local image
  sourceImage = loadImage('./assets/nick_lazybones_640_480.jpg');
  // Optional external image
  // sourceImage = loadImage('https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Pandas_playing_640x480.ogv/640px--Pandas_playing_640x480.ogv.jpg');

  // Local audio
  soundFile = loadSound('./assets/rain-drops.mp3');
}

function setup() {
  createCanvas(canvasWidth, canvasHeight);
  prevFrame = new p5.Image(imageWidth, imageHeight);
  currentFrame = new p5.Image(imageWidth, imageHeight);
  mask = new p5.Image(imageWidth, imageHeight);

  pixelDensity(1);

  initCaptureDevice();

  recoverySlider = createSlider(0, 100, recovery);
  recoverySlider.position(imageWidth + 10, 10);
  thresholdSlider = createSlider(0, 200, threshold);
  thresholdSlider.position(imageWidth + 10, 80);
  
  radioSelector = createRadio();
  radioSelector.option('linear');
  radioSelector.option('exponential');
  radioSelector.option('lesser-exponential')
  radioSelector.value('lesser-exponential');
  radioSelector.position(imageWidth + 10, 240);

  soundFile.setLoop(true);
  // soundFile.setVolume(1, 4);
  soundFile.play();
  console.log('Starting audio...')
}

function draw() {
  var pixelsInMotion = 0;

  // Draw sliders
  stroke('none');
  fill('white');
  rect(imageWidth, 0, imageWidth, imageHeight);
  fill('black');
  recovery = recoverySlider.value();
  text('recovery rate: ' + recovery + ' alpha points/frame', imageWidth + 10, 50);
  threshold = thresholdSlider.value();
  text('threshold: ' + threshold, imageWidth + 10, 120);

  // Draw source image
  image(sourceImage, 0, 0, imageWidth, imageHeight);

  // Load pixels for current frame and masking image
  currentFrame = captureVideo.get();
  currentFrame.loadPixels();
  mask.loadPixels();
  
  if (prevFrame) {
    prevFrame.loadPixels();

    // Loop through each pixel
    for (var x = 0; x < imageWidth; x++) {
      for (var y = 0; y < imageHeight; y++) {
        // Formula for pixels array: https://p5js.org/reference/#/p5.Image/pixels
        var loc = (4 * x) + 4 * imageWidth * y;

        // Capture RGB values from previous frame
        var rPrev = prevFrame.pixels[loc];
        var gPrev = prevFrame.pixels[loc + 1];
        var bPrev = prevFrame.pixels[loc + 2];
        
        // Capture RGB values from current frame
        var rCurr = currentFrame.pixels[loc];
        var gCurr = currentFrame.pixels[loc + 1];
        var bCurr = currentFrame.pixels[loc + 2];
        
        // Capture RGBA values from masking image
        var rMask = mask.pixels[loc];
        var gMask = mask.pixels[loc+1];
        var bMask = mask.pixels[loc+2];
        var aMask = mask.pixels[loc+3];

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
        mask.pixels[loc+1] = gMask;
        mask.pixels[loc+2] = bMask;
        mask.pixels[loc+3] = aMask;
      }
    }
  }

  // Calculate % motion
  motionPercentage = pixelsInMotion / imagePixelCount;
  fill('black');
  text('% pixels in motion: ', imageWidth + 10, 150);
  fill('grey');
  rect(imageWidth + 10, 170, 100, 20);
  fill('pink');
  rect(imageWidth + 10, 170, motionPercentage * 100, 20);
  fill('black');
  text((motionPercentage * 100).toFixed(2) + '%', imageWidth + 10 + 100 + 10, 180);

  // Scale % motion to volume
  fill('black');
  text('Volume scaling (% motion -> volume)', imageWidth + 10, 230);
  var scaledVolume;
  if (radioSelector.value() === 'linear') {
    scaledVolume = motionPercentage;
  } else if (radioSelector.value() === 'lesser-exponential') {
    scaledVolume = Math.pow(motionPercentage, 0.75);
  } else {
    scaledVolume = Math.pow(motionPercentage, 0.5);
  }
  soundFile.setVolume(scaledVolume);

  // Draw mask
  mask.updatePixels();
  image(mask, 0, 0, imageWidth, imageHeight);

  // Save current pixels for next loop
  prevFrame.copy(currentFrame, 0, 0, imageWidth, imageHeight, 0, 0, imageWidth, imageHeight);
}

// Try to access camera
function initCaptureDevice() {
  try {
    captureVideo = createCapture(VIDEO);
    captureVideo.size(imageWidth, imageHeight);
    captureVideo.elt.setAttribute('playsinline', '');
    // captureVideo.hide();
    console.log(
      '[initCaptureDevice] capture ready. Resolution: ' +
      captureVideo.width + ' ' + captureVideo.height
    );
  } catch(_err) {
    console.log('[initCaptureDevice] capture error: ' + _err);
  }
}

