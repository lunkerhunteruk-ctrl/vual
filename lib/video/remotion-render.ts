/**
 * Remotion Lambda Rendering Client
 *
 * Triggers rendering on AWS Lambda and polls for completion.
 * Uses Remotion's renderMediaOnLambda and getRenderProgress APIs.
 */

import {
  renderMediaOnLambda,
  getRenderProgress,
  type RenderMediaOnLambdaOutput,
  type AwsRegion,
} from "@remotion/lambda/client";

const REGION = (process.env.REMOTION_AWS_REGION || "us-east-1") as AwsRegion;
const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME || "";
const SERVE_URL = process.env.REMOTION_SERVE_URL || "";

export interface RenderRequest {
  shots: {
    clipUrl: string;
    durationSec: number;
    telopText?: string;
    telopPosition?: string;
  }[];
  textStyle: "slide" | "shuffle" | "minimal";
  textFont: "impact" | "noto-sans" | "montserrat";
  bgmUrl?: string;
  showIntro: boolean;
  showEnding: boolean;
  whiteFlash: boolean;
  brandName?: string;
  tagline?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1" | "4:5";
  colorPreset?: "none" | "natural" | "chrome" | "film";
}

export interface RenderResult {
  renderId: string;
  bucketName: string;
}

export interface RenderStatus {
  done: boolean;
  progress: number;
  outputUrl?: string;
  errors?: string[];
}

/**
 * Start a render on Remotion Lambda.
 */
export async function startRender(
  inputProps: RenderRequest
): Promise<RenderResult> {
  if (!FUNCTION_NAME || !SERVE_URL) {
    throw new Error(
      "REMOTION_FUNCTION_NAME and REMOTION_SERVE_URL environment variables are required"
    );
  }

  const result: RenderMediaOnLambdaOutput = await renderMediaOnLambda({
    region: REGION,
    functionName: FUNCTION_NAME,
    serveUrl: SERVE_URL,
    composition: "VualDynamic",
    inputProps: inputProps as unknown as Record<string, unknown>,
    codec: "h264",
    imageFormat: "jpeg",
    maxRetries: 1,
    framesPerLambda: 900,
    privacy: "public",
    timeoutInMilliseconds: 600000,
  });

  return {
    renderId: result.renderId,
    bucketName: result.bucketName,
  };
}

/**
 * Get progress of a Lambda render.
 */
export async function getRenderStatus(
  renderId: string,
  bucketName: string
): Promise<RenderStatus> {
  const progress = await getRenderProgress({
    renderId,
    bucketName,
    region: REGION,
    functionName: FUNCTION_NAME,
  });

  if (progress.done) {
    return {
      done: true,
      progress: 100,
      outputUrl: progress.outputFile ?? undefined,
    };
  }

  if (progress.fatalErrorEncountered) {
    return {
      done: true,
      progress: 0,
      errors: progress.errors?.map((e) => e.message) ?? ["Unknown render error"],
    };
  }

  return {
    done: false,
    progress: Math.round((progress.overallProgress ?? 0) * 100),
  };
}
