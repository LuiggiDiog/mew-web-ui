const RESOLUTION_STEP = 8;
const DRAFT_SCALE = 0.75;
const SDXL_MIN_RECOMMENDED_DIMENSION = 512;

type DraftImageDimensionsT = {
  width: number;
  height: number;
};

function roundToStep(value: number): number {
  return Math.max(RESOLUTION_STEP, Math.round(value / RESOLUTION_STEP) * RESOLUTION_STEP);
}

export function getDraftImageDimensions(width: number, height: number): DraftImageDimensionsT {
  let draftWidth = roundToStep(width * DRAFT_SCALE);
  let draftHeight = roundToStep(height * DRAFT_SCALE);

  const minDimension = Math.min(draftWidth, draftHeight);

  if (minDimension < SDXL_MIN_RECOMMENDED_DIMENSION) {
    const scaleUp = SDXL_MIN_RECOMMENDED_DIMENSION / minDimension;
    draftWidth = roundToStep(draftWidth * scaleUp);
    draftHeight = roundToStep(draftHeight * scaleUp);
  }

  return {
    width: Math.min(width, draftWidth),
    height: Math.min(height, draftHeight),
  };
}

