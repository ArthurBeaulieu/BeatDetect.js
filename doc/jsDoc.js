{
  "plugins": ["plugins/markdown"],
  "recurseDepth": 10,
  "source": {
    "include": ["./"],
    "exclude": ["./dist/", "./doc/", "./node_modules/", "./test/"],
    "includePattern": ".+\\.js(doc|x)?$",
    "excludePattern": "(^|\\/|\\\\)_"
  },
  "sourceType": "module",
  "tags": {
    "allowUnknownTags": true,
    "dictionaries": ["jsdoc", "closure"]
  },
  "templates": {
    "name": "BeatDetect.js",
    "footerText": "BeatDetect.js",
    "cleverLinks": false,
    "monospaceLinks": false
  },
  "opts": {
    "template": "node_modules/tui-jsdoc-template",
    "destination": "doc/",
    "readme": "README.md",
    "package": "package.json",
    "access": "all",
    "recurse": true,
    "verbose": true,
    "private": true
  }
}
