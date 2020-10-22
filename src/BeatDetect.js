'use strict';


class BeatDetect {


	constructor(options) {
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		window.OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

		this._sampleRate = options.sampleRate || 44100;
		this._log = options.log || false;
		this._perf = options.perf || false;
	}


	getBeatInfo(options) {
		const perf = { // Performances mark to compute execution duration
			m0: performance.now(), // Start beat detection
			m1: 0, // Fetch track done
			m2: 0, // Offline context rendered
			m3: 0 // Bpm processing done
		};

		options.perf = perf;
		return new Promise((resolve, reject) => {
			this._fetchRawTrack(options)
				.then(this._buildOfflineCtx.bind(this))
				.then(this._processRenderedBuffer.bind(this))
				.then(resolve).catch(reject);
		});
	}


	_fetchRawTrack(options) {
		this._logEvent('log', 'Fetch track');
		return new Promise((resolve, reject) => {
	    let request = new XMLHttpRequest();
	    request.open('GET', options.url, true);
	    request.responseType = 'arraybuffer';
	    request.onload = () => {
	    	options.perf.m1 = performance.now();
	    	resolve(Object.assign(request, options));
	    };
	    request.send();
		});
	}


	_buildOfflineCtx(options) {
		this._logEvent('log', 'Offline rendering');
		return new Promise((resolve, reject) => {
			const audioCtx = new AudioContext();
      // Create offline context
      audioCtx.decodeAudioData(options.response, function(buffer) {
        var offlineCtx = new OfflineContext(2, buffer.duration * this._sampleRate, this._sampleRate);
				// Create buffer source
        var source = offlineCtx.createBufferSource();
        source.buffer = buffer;

        // Beats, or kicks, generally occur around the 100 to 150 hz range.
        // Below this is often the bassline.  So let's focus just on that.

        // First a lowpass to remove most of the song.

        var lowpass = offlineCtx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = 150;
        lowpass.Q.value = 1;

        // Run the output of the source through the low pass.

        source.connect(lowpass);

        // Now a highpass to remove the bassline.

        var highpass = offlineCtx.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = 100;
        highpass.Q.value = 1;

        // Run the output of the lowpass through the highpass.

        lowpass.connect(highpass);

        // Run the output of the highpass through our offline context.

        highpass.connect(offlineCtx.destination);

        // Start the source, and render the output into the offline conext.

        source.start(0);
        offlineCtx.startRendering();

			  offlineCtx.oncomplete = result => {
			  	options.perf.m2 = performance.now();
			    resolve(Object.assign(result, options));
			  };
      }.bind(this));
		});
	}


	_processRenderedBuffer(options) {
		this._logEvent('log', 'Collect info');
		return new Promise(resolve => {
			const dataL = options.renderedBuffer.getChannelData(0);
			const dataR = options.renderedBuffer.getChannelData(1);

		  const peaks = this._getPeaks([dataL, dataR]);
		  var groups = this._getIntervals(peaks);
		  // Sort possible bpms by count to get the most accurate one in first position
		  var top = groups.sort((intA, intB) => {
	      return intB.count - intA.count;
	    }).splice(0, 5);

			console.log(top)

			

			this._logEvent('log', 'Analysis done');
			options.perf.m3 = performance.now();
		  resolve(Object.assign({
		  	bpm: top[0].tempo,
		  	offset: this._getTimeOffset(peaks[0], dataL.length, top[0].tempo)
		  }, this._perf ? {
		  	perf: this._getPerfDuration(options.perf)
		  } : null));
		});
	}


	/* BPM guess methods */


	_getPeaks(data) {
		  // What we're going to do here, is to divide up our audio into parts.
		  // We will then identify, for each part, what the loudest sample is in that
		  // part.
		  // It's implied that that sample would represent the most likely 'beat'
		  // within that part.
		  // Each part is 0.5 seconds long - or 22,050 samples.
		  // This will allow us to ignore breaks, and allow us to address tracks with
		  // a BPM below 120.
		  var partSize = this._sampleRate / 2,
		      parts = data[0].length / partSize,
		      peaks = [];

		  for (let i = 0; i < parts; ++i) {
		    let max = 0;
		    for (let j = i * partSize; j < (i + 1) * partSize; ++j) {
		      const volume = Math.max(Math.abs(data[0][j]), Math.abs(data[1][j]));
		      if (!max || (volume > max.volume)) {
		        max = {
		          position: j,
		          volume: volume
		        };
		      }
		    }
		    peaks.push(max);
		  }
		  // We then sort the peaks according to volume...
		  peaks.sort((a, b) => {
		    return b.volume - a.volume;
		  });
		  // ...take the loundest half of those...
		  peaks = peaks.splice(0, peaks.length * 0.5);
		  // ...and re-sort it back based on position.
		  peaks.sort((a, b) => {
		    return a.position - b.position;
		  });

		  return peaks;
	}


	_getIntervals(peaks) {
	  // What we now do is get all of our peaks, and then measure the distance to
	  // other peaks, to create intervals.  Then based on the distance between
	  // those peaks (the distance of the intervals) we can calculate the BPM of
	  // that particular interval.
	  // The interval that is seen the most should have the BPM that corresponds
	  // to the track itself.
	  const groups = [];
	  peaks.forEach((peak, index) => {
	    for (let i = 1; (index + i) < peaks.length && i < 10; ++i) {
	      const group = {
	        tempo: (60 * this._sampleRate) / (peaks[index + i].position - peak.position),
	        count: 1,
					position: peak.position,
					peaks: []
	      };

	      while (group.tempo <= 70) { // TODO options for val
	        group.tempo *= 2;
	      }

	      while (group.tempo > 220) { // TODO options for val
	        group.tempo /= 2;
	      }

	      group.tempo = this._floatRound(group.tempo, 4); // TODO options for val

				const exists = groups.some(interval => {
					if (interval.tempo === group.tempo) {
						interval.peaks.push(peak);
						++interval.count;
						return 1;
					}

					return 0;
	      });

	      if (!exists) {
	        groups.push(group);
	      }
	    }
	  });

	  return groups;
	}


	_getTimeOffset(peak, length, bpm) {
		// Here we compute beat time offset using the first spotted peak.
		// Using its sample index and the found bpm
		const bpmTime = 60 / bpm;
		const firstBeatTime = peak.position / this._sampleRate;
		let offset = firstBeatTime;

		while (offset >= bpmTime) {
			offset -= bpmTime;
		}

		return offset;
	}


	_getPerfDuration(perf) {
		// Convert performance mark into ellapsed seconds
		return {
			total: (perf.m3 - perf.m0) / 1000,
			fetch: (perf.m1 - perf.m0) / 1000,
			render: (perf.m2 - perf.m1) / 1000,
			process: (perf.m3 - perf.m2) / 1000
		}
	}


	/* utils */


	_logEvent(level, string) {
		if (this._log === true) {
			console[level](`BeatDetect : ${string}`);
		}
	}


  _floatRound(value, precision) {
    const multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
  }


}


export default BeatDetect;
