import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import {
  startRender,
  getRenderStatus,
  type RenderRequest,
} from "@/lib/video/remotion-render";

/**
 * POST /api/video/render
 * Start a Remotion Lambda render for a completed video job.
 *
 * Body: { jobId, shots, textStyle, textFont, bgmUrl?, showIntro, showEnding, whiteFlash, brandName?, tagline? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, ...renderProps } = body;

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: "jobId is required" },
        { status: 400 }
      );
    }

    // Start Lambda render
    const { renderId, bucketName } = await startRender(
      renderProps as RenderRequest
    );

    // Update job with render info
    const supabase = createServerClient();
    await supabase!
      .from("video_jobs")
      .update({
        current_step: "rendering",
        current_step_label: "Rendering video",
        request_data: {
          ...body,
          remotion_render_id: renderId,
          remotion_bucket_name: bucketName,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return NextResponse.json({
      success: true,
      renderId,
      bucketName,
    });
  } catch (err: any) {
    console.error("[render] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/video/render?renderId=xxx&bucketName=yyy&jobId=zzz
 * Poll render progress. When done, update job with final video URL.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const renderId = searchParams.get("renderId");
    const bucketName = searchParams.get("bucketName");
    const jobId = searchParams.get("jobId");

    if (!renderId || !bucketName) {
      return NextResponse.json(
        { success: false, error: "renderId and bucketName are required" },
        { status: 400 }
      );
    }

    const status = await getRenderStatus(renderId, bucketName);

    // If done and we have a jobId, update the job
    if (status.done && jobId) {
      const supabase = createServerClient();

      if (status.outputUrl) {
        await supabase!
          .from("video_jobs")
          .update({
            status: "completed",
            final_video_url: status.outputUrl,
            current_step: "complete",
            current_step_label: "Complete",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      } else if (status.errors?.length) {
        await supabase!
          .from("video_jobs")
          .update({
            status: "failed",
            error_message: status.errors.join("; "),
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }
    }

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (err: any) {
    console.error("[render] Poll error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
