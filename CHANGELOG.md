# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2024-0423
### Changed
- update to NodeJS 20.x
- update ffmpeg dependencies
- replace Canvas with Jimp library
- fix bucket AccessControl

### Removed
- Remove canvas library

### Added
- Added Jimp library for image processing

## [1.3.1] - 2021-1021
### Changed
- remove popper dependency
- createWorkteam requires sagemaker:AddTags permission to tag the team
- extract atmost 1200 frames per video and evenly distribute the frame across the entire video
- add JQ prerequisite to README file

## [1.3.0] - 2021-0812
### Changed
- updated Lambda runtime and layers to NodeJS 14.x
- fixed SageMaker Ground Truth Labeling Job CORS settings, https://docs.aws.amazon.com/sagemaker/latest/dg/sms-cors-update.html
- updated deploy script to check bucket ownership before copying templates to the bucket

## [1.2.0] - 2021-05-20
### Changed
- fixed createWorkteam issue due to policy permission
- added logic to extract 'P' frame for labeling job

### Removed

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
