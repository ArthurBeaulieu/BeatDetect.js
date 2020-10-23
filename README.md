# BeatDetect.js

![](https://badgen.net/badge/version/0.0.2/blue)
[![License](https://img.shields.io/github/license/ArthurBeaulieu/BeatDetect.js.svg)](https://github.com/ArthurBeaulieu/BeatDetect.js/blob/master/LICENSE.md)
![](https://badgen.net/badge/documentation/written/green)
![](https://badgen.net/badge/test/passed/green)
![](https://badgen.net/badge/dependencies/none/green)

`BeatDetect.js` is a JavaScript ES6 component that calculates the BPM of a track, with its time offset and the time offset to its first true beat. There are several options to fine tune the process, but `BeatDetect.js` works best with modern music (even better on EDM music), based on 4/4 time signature.

With ~6Ko minified, `BeatDetect.js` is designed to be stable and remain as light as possible. It is meant to be used client side ; unfortunately, the web audio API is not supported in nodejs.

[Try me here!](https://arthurbeaulieu.github.io/BeatDetect.js/example.html)

# Get Started

This repository was made to store documentation, test bench and source code. If you want to include this component in your project, you either need the `src/BeatDetect.js` file if you have an assets bundler in your project, or use the `dist/BeatDetect.min.js` to use the minified component. This minified file is compiled in ES5 JavaScript for compatibility reasons. The unminified file is, in the contrary, coded in ES6 JavaScript.

You must first instantiate a `BeatDetect.js` component, with several options as follows :

```javascript
import BeatDetect from './src/BeatDetect.js';
// Component presented with default values
const beatDetect = new BeatDetect({
  sampleRate: 44100, // Most track are using this sample rate
  log: false, // Debug BeatDetect execution with logs
  perf: false, // Attach elapsed time to result object
  round: false, // To have an integer result for the BPM
  float: 4, // The floating precision in [1, Infinity]
  lowPassFreq: 150, // Low pass filter cut frequency
  highPassFreq: 100, // High pass filter cut frequency
  bpmRange: [90, 180], // The BPM range to output  
  timeSignature: 4 // The number of beat in a measure
});
```

Once the instance is created, you can now analyse track by sending the track url to the `getBeatInfo()` public method :

```javascript
beatDetect.getBeatInfo({
  url: `./demo/audio/Teminite - Don't Stop.mp3`,
  name: `Don't Stop from Teminite` // Optional argument, only for logging
}).then(info => {
  console.log(info.bpm); // 140
  console.log(info.offset); // 0.1542
  console.log(info.firstBar); // 0.1.8722
}).catch(error => {
  // The error string
});
```

Since the processing is asynchronous, you can call it in loops, but beware that it implies a significant load on the CPU. Because the `getBeatInfo()` method returns a `Promise`, it might be a better idea to chain them!

You can test those values in a mixing software, or in a [AudioVisualizer](https://github.com/ArthurBeaulieu/AudioVisualizer)'s timeline component, that draws a waveform into a canvas with beat bars that scrolls over playback, the same used in DJ softwares! Just instantiate it with the provided BPM and firstBar values to check their accuracy.

This repository includes examples on how to use this component with hardcoded urls, or with tracks selected by the user (see [example.html](https://github.com/ArthurBeaulieu/BeatDetect.js/blob/main/example.html)).

You're now good to go! If however you need more information, you can read the online [documentation](https://arthurbeaulieu.github.io/BeatDetect.js/doc/).

# Development

If you clone this repository, you can `npm install` to install development dependencies. This will allow you to build dist file, run the component tests or generate the documentation ;

- `npm run build` to generate the minified file ;
- `npm run dev` to watch for any change in source code ;
- `npm run web-server` to launch a local development server ;
- `npm run doc` to generate documentation ;
- `npm run test` to perform all tests at once ;
- `npm run testdev` to keep browsers open to debug tests ;
- `npm run beforecommit` to perform tests, generate doc and bundle the JavaScript.

To avoid CORS when locally loading the example HTML file, run the web server. Please do not use it on a production environment. Unit tests are performed on both Firefox and Chrome ; ensure you have both installed before running tests, otherwise they might fail.

If you have any question or idea, feel free to DM or open an issue (or even a PR, who knows) ! I'll be glad to answer your request.

# Credits

This component is based on the method described by [Joe Sullivan](http://joesul.li/van/beat-detection-using-web-audio/), that renders and filters the track to keep its beats, then calculate intervals between those peaks and assumes that the BPM is based on the interval that is the most represented. The implementation is based on algorithms designed by [José M. Pérez](https://jmperezperez.com/bpm-detection-javascript/) and adds the offset layer.
