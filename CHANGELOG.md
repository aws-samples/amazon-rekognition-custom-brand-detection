# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2019-12-08
### Changed
- auto login when cognito token is still valid
- limit Label Name to 16 characters max
- use canvas.Image to load image instead of canvas.loadImage
- fix not_found issue on collect-annotation state by lookup frameSequence.json instead of SeqLabel.json which ignores the sub-path.
- change ffmpeg jpeg quality to q:v 2
- reduce concurrent detectCustomLabels to avoid throttling error by reducing the throughput estimation
- reduce logging during build time

### Removed

## [1.0.0] - 2019-06-16
### Added
- initial version

### Changed

### Removed
