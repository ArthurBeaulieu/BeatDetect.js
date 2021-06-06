import BeatDetect from '../src/BeatDetect.js';

describe('BeatDetect unit test,', () => {
  describe('Object instantiation,', () => {
    it('Default values', done => {
      const bt = new BeatDetect();
      // Compare standard object signature
      expect(JSON.stringify(bt)).toEqual(`{"VERSION":"1.0.0","_log":false,"_perf":false,"_sampleRate":44100,"_round":false,"_float":8,"_lowPassFreq":150,"_highPassFreq":100,"_bpmRange":[90,180],"_timeSignature":4,"count":0,"_ts":{"current":0,"previous":0,"first":0},"_tapResetId":-1}`);
      done();
    });

    it('Custom values', done => {
      const bt = new BeatDetect({
        sampleRate: 48000,
        log: true,
        perf: true,
        round: true,
        float: 42,
        lowPassFreq: 10,
        highPassFreq: 1000,
        bpmRange: [60, 120],
        timeSignature: 3
      });
      // Compare custom object signature
      expect(JSON.stringify(bt)).toEqual(`{"VERSION":"1.0.0","_log":true,"_perf":true,"_sampleRate":48000,"_round":true,"_float":42,"_lowPassFreq":10,"_highPassFreq":1000,"_bpmRange":[60,120],"_timeSignature":3,"count":0,"_ts":{"current":0,"previous":0,"first":0},"_tapResetId":-1}`);
      done();
    });

    it('Without context', done => {
      // Saving and clearing audioCtx and offlineCtx to provoke error on BeatDetect instantiation
      let bt = null;
      const audioBack = window.AudioContext || window.webkitAudioContext;
      const offlineBack = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      window.AudioContext = null;
      window.OfflineContext = null;
      // Spy console as it must trigger an error
      spyOn(console, 'error').and.callFake(err => {
        expect(err).toEqual(`BeatDetect.ERROR : Your browser doesn't support the WebAudio API.`);
        expect(bt).toEqual(null);
        // Restoring audioCtx and offlineCtx
        window.AudioContext = audioBack;
        window.OfflineContext = offlineBack;
        done();
      });
      // Create a new BeatDetect object without any audio ctx (on and off line)
      bt = new BeatDetect();
    });
  });

  describe('Private methods', () => {
    it('_fetchRawTrack no args', done => {
      const bt = new BeatDetect();
      bt._fetchRawTrack().catch(err => {
        expect(err).toEqual(`BeatDetect.ERROR : No options object sent to _fetchRawTrack method.`);
        done();
      });
    });

    it('_fetchRawTrack empty args', done => {
      const bt = new BeatDetect();
      bt._fetchRawTrack({}).catch(err => {
        expect(err).toEqual(`BeatDetect.ERROR : Options object sent to _fetchRawTrack method is invalid.`);
        done();
      });
    });

    it('_fetchRawTrack wrong args', done => {
      const bt = new BeatDetect();
      bt._fetchRawTrack({
        url: 42
      }).catch(err => {
        expect(err).toEqual(`BeatDetect.ERROR : Options object sent to _fetchRawTrack method is invalid.`);
        bt._fetchRawTrack({
          perf: {}
        }).catch(err => {
          expect(err).toEqual(`BeatDetect.ERROR : Options object sent to _fetchRawTrack method is invalid.`);
          done();
        });
      });
    });

    it('_fetchRawTrack unexisting url', done => {
      const bt = new BeatDetect();
      bt._fetchRawTrack({
        url: `/base/demo/audio/Unexisting track.mp3`,
        perf: { m1: null }
      }).catch(err => {
        expect(err).toEqual(`BeatDetect.ERROR : 404 File not found.`);
        done();
      });
    });

    it('_fetchRawTrack logging', done => {
      let calls = 0;
      spyOn(console, 'log').and.callFake(args => {
        if (calls === 0) {
          expect(args).toEqual(`BeatDetect : Fetch track.`);
          ++calls;
        } else {
          expect(args).toEqual(`BeatDetect : Fetch track Testing Music.`);
        }
      });

      const bt = new BeatDetect({ log: true });
      bt._fetchRawTrack({
        url: `/base/demo/audio/Teminite - Don't Stop.mp3`,
        perf: { m1: null }
      }).then(() => {
        bt._fetchRawTrack({
          url: `/base/demo/audio/Teminite - Don't Stop.mp3`,
          name: 'Testing Music',
          perf: { m1: null }
        }).then(opts => {
          expect(opts.perf.m1).not.toEqual('');
          expect(typeof opts.perf.m1).toEqual('number');
          done();
        });
      });
    });

    it('_buildOfflineCtx no args', done => {
      const bt = new BeatDetect();
      bt._buildOfflineCtx().catch(err => {
        expect(err).toEqual(`BeatDetect.ERROR : No options object sent to _buildOfflineCtx method.`);
        done();
      });
    });

    it('_buildOfflineCtx empty args', done => {
      const bt = new BeatDetect();
      bt._buildOfflineCtx({}).catch(err => {
        expect(err).toEqual(`BeatDetect.ERROR : Options object sent to _buildOfflineCtx method is invalid.`);
        done();
      });
    });

    it('_buildOfflineCtx wrong args', done => {
      const bt = new BeatDetect();
      bt._buildOfflineCtx({
        response: 42
      }).catch(err => {
        expect(err).toEqual(`BeatDetect.ERROR : Options object sent to _buildOfflineCtx method is invalid.`);
        bt._buildOfflineCtx({
          perf: {}
        }).catch(err => {
          expect(err).toEqual(`BeatDetect.ERROR : Options object sent to _buildOfflineCtx method is invalid.`);
          done();
        });
      });
    });

    it('_buildOfflineCtx invalid audio data', done => {
      const bt = new BeatDetect();
      bt._buildOfflineCtx({
        response: new ArrayBuffer(),
        perf: { m2: null }
      }).catch(err => {
        expect(err).toEqual(`BeatDetect.ERROR : EncodingError: The buffer passed to decodeAudioData contains an unknown content type.`);
        done();
      });
    });

    it('_buildOfflineCtx logging', done => {
      spyOn(console, 'log').and.callFake(args => {
        expect(args).toEqual(`BeatDetect : Offline rendering of the track.`);
        done();
      });

      const bt = new BeatDetect({ log: true });
      bt._buildOfflineCtx({
        response: new ArrayBuffer(),
        perf: { m2: null }
      });
    });

    it('_processRenderedBuffer no args', done => {
      const bt = new BeatDetect();
      bt._processRenderedBuffer().catch(err => {
        expect(err).toEqual(`BeatDetect.ERROR : No options object sent to _processRenderedBuffer method.`);
        done();
      });
    });

    it('_processRenderedBuffer empty args', done => {
      const bt = new BeatDetect();
      bt._processRenderedBuffer({}).catch(err => {
        expect(err).toEqual(`BeatDetect.ERROR : Options object sent to _processRenderedBuffer method is invalid.`);
        done();
      });
    });

    it('_processRenderedBuffer wrong args', done => {
      const bt = new BeatDetect();
      bt._processRenderedBuffer({
        renderedBuffer: 42
      }).catch(err => {
        expect(err).toEqual(`BeatDetect.ERROR : Options object sent to _processRenderedBuffer method is invalid.`);
        bt._processRenderedBuffer({
          perf: {}
        }).catch(err => {
          expect(err).toEqual(`BeatDetect.ERROR : Options object sent to _processRenderedBuffer method is invalid.`);
          done();
        });
      });
    });
  });
});

describe('BeatDetect integration test,', () => {
  describe('Get beat info,', () => {
    it('Result validity', done => {
      const bt = new BeatDetect();
      // Spies on internal method for beat detection
      spyOn(bt, '_fetchRawTrack').and.callThrough();
      spyOn(bt, '_buildOfflineCtx').and.callThrough();
      spyOn(bt, '_processRenderedBuffer').and.callThrough();
      // Perform beat detection on sample track
      bt.getBeatInfo({
    		url: `/base/demo/audio/Teminite - Don't Stop.mp3`
    	}).then(info => {
        expect(JSON.stringify(info)).toEqual(`{"bpm":140,"offset":0.16157315,"firstBar":1.88417234}`);
        // Check that internal methods where properly called
        expect(bt._fetchRawTrack).toHaveBeenCalled();
        expect(bt._buildOfflineCtx).toHaveBeenCalled();
        expect(bt._processRenderedBuffer).toHaveBeenCalled();
        done();
    	});
    });

    it('Loading failure', done => {
      const bt = new BeatDetect();
      // Perfor beat detection on sample track
      bt.getBeatInfo({
    		url: `/base/demo/audio/Unexisting track.mp3`
    	}).catch(err => {
        expect(err).toEqual(`BeatDetect.ERROR : 404 File not found.`);
        done();
    	});
    });

    it('Decoding failure', done => {
      const bt = new BeatDetect();
      // Emulate a fake response from XMLHTTP to make decode fail
      spyOn(bt, '_fetchRawTrack').and.callFake(() => {
        return new Promise(resolve => {
          resolve({ response: new ArrayBuffer(), perf: {} });
        });
      });
      // Perfor beat detection on sample track
      bt.getBeatInfo({
    		url: `/base/demo/audio/Teminite - Don't Stop.mp3`
    	}).catch(err => {
        expect(err).toEqual(`BeatDetect.ERROR : EncodingError: The buffer passed to decodeAudioData contains an unknown content type.`);
        done();
    	});
    });
  });
});
