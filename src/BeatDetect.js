'use strict';


class BeatDetect {


	constructor(options) {
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		window.OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;

		this._sampleRate = options.sampleRate || 44100;
		this._log = options.log || false;
		this._perf = options.perf || false;
		this._round = options.round || false;
		this._float = options.float || 8;
		this._lowPassFreq = options.lowPassFreq || 150;
		this._highPassFreq = options.highPassFreq || 100;
		this._bpmRange = options.bpmRange || [90, 180];
		this._timeSignature = options.timeSignature || 4;
	}


	getBeatInfo(options) {
		// Performances mark to compute execution duration
		options.perf = {
			m0: performance.now(), // Start beat detection
			m1: 0, // Fetch track done
			m2: 0, // Offline context rendered
			m3: 0 // Bpm processing done
		};
		// In order ; fetch track ,decode its buffer, process it and send back BPM info
		return new Promise((resolve, reject) => {
			this._fetchRawTrack(options)
			.then(this._buildOfflineCtx.bind(this))
			.then(this._processRenderedBuffer.bind(this))
			.then(resolve).catch(reject);
		});
	}


	_fetchRawTrack(options) {
		// TODO use fetch api instead, ES rules
		this._logEvent('log', `Fetch track ${options.name || ''}`);
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
		this._logEvent('log', 'Offline rendering of the track');
		return new Promise((resolve, reject) => {
			// Decode track audio with audio context to later feed the offline context with a buffer
			const audioCtx = new AudioContext();
			audioCtx.decodeAudioData(options.response, buffer => {
				// Define offline context according to the buffer sample rate and duration
				const offlineCtx = new OfflineContext(2, buffer.duration * this._sampleRate, this._sampleRate);
				// Create buffer source from loaded track
				const source = offlineCtx.createBufferSource();
				source.buffer = buffer;
				// Lowpass filter to ignore most frequencies except bass (goal is to retrieve kick impulsions)
				const lowpass = offlineCtx.createBiquadFilter();
				lowpass.type = 'lowpass';
				lowpass.frequency.value = this._lowPassFreq;
				lowpass.Q.value = 1;
				// Apply a high pass filter to remove the bassline
				const highpass = offlineCtx.createBiquadFilter();
				highpass.type = 'highpass';
				highpass.frequency.value = this._highPassFreq;
				highpass.Q.value = 1;
				// Chain offline nodes from source to destination with filters among
				source.connect(lowpass);
				lowpass.connect(highpass);
				highpass.connect(offlineCtx.destination);
				// Start the source and rendering
				source.start(0);
				offlineCtx.startRendering();
				// Continnue analysis when buffer has been read
				offlineCtx.oncomplete = result => {
					options.perf.m2 = performance.now();
					resolve(Object.assign(result, options));
				};
			});
		});
	}


	_processRenderedBuffer(options) {
		this._logEvent('log', 'Collect beat info');
		return new Promise(resolve => {
			// Extract PCM data from offline rendered buffer
			const dataL = options.renderedBuffer.getChannelData(0);
			const dataR = options.renderedBuffer.getChannelData(1);
			// Extract most intebnse peaks, and create intervals between them
			const peaks = this._getPeaks([dataL, dataR]);
			const groups = this._getIntervals(peaks);
			// Sort found intervals by count to get the most accurate one in first position
			var top = groups.sort((intA, intB) => {
				return intB.count - intA.count;
			}).splice(0, 5); // Only keep the 5 best matches

			const offsets = this._getOffsets(dataL, dataL.length, top[0].tempo);
			options.perf.m3 = performance.now();
			this._logEvent('log', 'Analysis done');
			resolve(Object.assign({
				bpm: top[0].tempo,
				offset: this._floatRound(offsets.offset, this._float),
				firstBar: this._floatRound(offsets.firstBar, this._float)
			}, this._perf ? { // Assign perf key to return object if user requested it
				perf: this._getPerfDuration(options.perf)
			} : null));
		});
	}


	/* BPM guess methods */


	_getPeaks(data) {
		// What we're going to do here, is to divide up our audio into parts.
		// We will then identify, for each part, what the loudest sample is in that part.
		// It's implied that that sample would represent the most likely 'beat' within that part.
		// Each part is .5 seconds long - or 22,050 samples.
		const partSize = this._sampleRate / 2;
		const parts = data[0].length / partSize;
		let peaks = [];
		// Iterate over .5s parts we created
		for (let i = 0; i < parts; ++i) {
			let max = 0;
			// Iterate each byte in the studied part
			for (let j = i * partSize; j < (i + 1) * partSize; ++j) {
				const volume = Math.max(Math.abs(data[0][j]), Math.abs(data[1][j]));
				if (!max || (volume > max.volume)) {
					// Save peak at its most intense position
					max = {
						position: j,
						volume: volume
					};
				}
			}
			peaks.push(max);
		}
		// Sort peaks per volume
		peaks.sort((a, b) => {
			return b.volume - a.volume;
		});
		// This way we can ignore the less loud half
		peaks = peaks.splice(0, peaks.length * 0.5);
		// Then sort again by position to retrieve the playback order
		peaks.sort((a, b) => {
			return a.position - b.position;
		});
		// Send back peaks
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

				while (group.tempo <= this._bpmRange[0]) {
					group.tempo *= 2;
				}

				while (group.tempo > this._bpmRange[1]) {
					group.tempo /= 2;
				}

				if (this._round === true) { // Integer rounding
					group.tempo = Math.round(group.tempo);
				} else { // Floating rounding
					group.tempo = this._floatRound(group.tempo, this._float);
				}

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


	_getOffsets(data, length, bpm) {
		// Now we have bpm, we re-calculate peaks for the 30 first seconds.
		// Since a peak is at the maximum waveform height, we need to offset it a little on its left.
		// This offset is empiric, and based on a fraction of the BPM duration in time.
		// We assume the left offset from the highest volule value is 5% of the bpm time frame
		var partSize = this._sampleRate / 2;
		var parts = data.length / partSize;
		var peaks = [];
		// Create peak with little offset on the left to get the very start of the peak
		for (let i = 0; i < parts; ++i) {
			let max = 0;
			for (let j = i * partSize; j < (i + 1) * partSize; ++j) {
				const volume = data[j];
				if (!max || (volume > max.volume)) {
					max = {
						position: j - Math.round(((60 / bpm) * 0.05) * this._sampleRate), // Arbitrary offset on the left of the peak about 5% bpm time
						volume: volume
					};
				}
			}
			peaks.push(max);
		}
		// Saved peaks ordered by position before any sort manipuplation
		const unsortedPeaks = [...peaks]; // Clone array before sorting for first beat matching
		// Sort peak per decreasing volumes
		peaks.sort((a, b) => {
			return b.volume - a.volume;
		});
		// First peak is the loudest, we assume it is a strong time of the 4/4 time signature
		const refOffset = this._getLowestTimeOffset(peaks[0].position, length, bpm);
		let mean = 0;
		let divider = 0;
		// Find shortest offset
		for (let i = 0; i < peaks.length; ++i) {
			const offset = this._getLowestTimeOffset(peaks[i].position, length, bpm);
			if (offset - refOffset < 0.05 || refOffset - offset > -0.05) { // Only keep first times to compute mean
				mean += offset;
				++divider;
			}
		}
		// Find first beat offset
		let i = 0; // Try finding the first peak index that is louder than provided threshold (0.02)
		while (unsortedPeaks[i].volume < 0.02) { // Threshold is also arbitrary...
			++i;
		}
		// Convert position into time
		let firstBar = (unsortedPeaks[i].position / this._sampleRate);
		// If matching first bar is before any possible time ellapsed, we set it at computed offset
		if (firstBar > (mean / divider) && firstBar < (60 / bpm)) {
			firstBar = (mean / divider)
		}
		// Return both offset and first bar offset
		return {
			offset: (mean / divider),
			firstBar: firstBar
		};
	}


	_getLowestTimeOffset(position, length, bpm) {
		// Here we compute beat time offset using the first spotted peak.
		// Using its sample index and the found bpm
		const bpmTime = 60 / bpm;
		const firstBeatTime = position / this._sampleRate;
		let offset = firstBeatTime;

		while (offset >= bpmTime) {
			offset -= (bpmTime * this._timeSignature);
		}

		if (offset < 0) {
			while (offset < 0) {
				offset += bpmTime;
			}
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


	/* setters */


	set sampleRate(sampleRate) {
		this._sampleRate = sampleRate
	}


	set log(Log) {
		this._log = log
	}


	set perf(perf) {
		this._perf = perf
	}


	set round(round) {
		this._round = round
	}


	set float(float) {
		this._float = float
	}


	set lowPassFreq(lowPassFreq) {
		this._lowPassFreq = lowPassFreq
	}


	set highPassFreq(highPassFreq) {
		this._highPassFreq = highPassFreq
	}


}


export default BeatDetect;
