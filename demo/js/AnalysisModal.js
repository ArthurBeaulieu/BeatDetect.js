'use strict';


class AnalysisModal {


  constructor(options) {
    this._url = options.url;
    this._data = options.data;
    this._bt = options.bt;

    this._name = options.name;
    this._title = options.title;
    this._hotCue = options.hotCue;

    this._loadingOverlay = null;

    this._dom = {
      tracks: null,
      close: null
    };

    this.close = this.close.bind(this);

    this._loadTemplate()
      .then(this._buildTemplate.bind(this))
      .then(this._fillAttributes.bind(this))
      .then(this._handleFiles.bind(this));
  }


  _loadTemplate() {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        headers: new Headers([['Content-Type', 'application/json; charset=UTF-8']])
      };

      fetch(this._url, options)
        .then(response => {
          if (response) {
            if (response.ok) {
              resolve(response.text());
            } else {
              reject(response.status);
            }
          } else {
            reject('Missing argument for fetch call');
          }
        })
        .catch(reject);
    });
  }


  _buildTemplate(htmlString) {
    const parser = new DOMParser();
    const dom = parser.parseFromString(htmlString, 'text/html');
    this._loadingOverlay = document.createElement('DIV');
    this._loadingOverlay.className = 'loading-overlay';
    this._loadingOverlay.appendChild(dom.body.firstChild);
    this.open();
  }


  _fillAttributes() {
    this._dom.title = document.getElementById('modal-title');
    this._dom.tracks = document.getElementById('track-container');
    this._dom.close = document.getElementById('close-button');

    this._dom.close.addEventListener('click', this.close, false);
  }


  _handleFiles() {
    this._dom.title.innerHTML = 'BeatDetect.js analysis...';
    let counter = 0;
    for (let i = 0; i < this._data.length; ++i) {
      const track = document.createElement('DIV');
      track.innerHTML = `<p><b>${this._data[i].name}</b></p>`;
      this._dom.tracks.appendChild(track);
      // Send track to BeatDetect. Track lifecycle is handled in callback
      const objectURL = window.URL.createObjectURL(this._data[i]);
      this._bt.getBeatInfo({
        url: objectURL
      }).then(info => {
        ++counter;
        track.innerHTML += `<p>Result : <b>${info.bpm}</b> BPM<br><i>Offset : <b>${info.offset}</b> s – First Bar : <b>${info.firstBar}</b> s</i><p>`
        console.log(this._data[i].name, info);
        if (counter === this._data.length) {
          this._dom.title.innerHTML = 'BeatDetect.js analysis done';
        }
      }).catch(error => {
        console.error(error);
      });
    }
  }


  open() {
    document.body.appendChild(this._loadingOverlay);
    this._loadingOverlay.addEventListener('click', this.close, false);
  }


  close(event) {
    if ((event && event.target === this._loadingOverlay) || !event || event.target === this._dom.close) {
      document.body.removeChild(this._loadingOverlay);
      this._loadingOverlay.removeEventListener('click', this.close, false);
      this._dom.close.removeEventListener('click', this.close, false);
    }
  }


}


export default AnalysisModal;
