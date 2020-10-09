const SPRITE_WIDTH = 96;
const MAX_PER_ROW = 20;

class SpriteHelper {
  static computeSpriteSize(width, height) {
    const downscale = width / SPRITE_WIDTH;
    return [
      ((Math.round(width / downscale) >> 1) << 1),
      ((Math.round(height / downscale) >> 1) << 1),
      MAX_PER_ROW,
    ];
  }
}

module.exports = SpriteHelper;
