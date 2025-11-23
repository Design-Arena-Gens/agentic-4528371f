import { NextRequest, NextResponse } from "next/server";
import {
  type MetaChannel,
  postMetaResponse,
  type RespondRequest,
} from "../../../lib/meta";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<RespondRequest>;

    if (
      !body.platform ||
      !body.targetId ||
      !body.message ||
      !body.channel
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "platform, targetId, message, and channel are required properties.",
        },
        { status: 400 },
      );
    }

    const channel = body.channel as MetaChannel;
    if (channel !== "comment" && channel !== "message") {
      return NextResponse.json(
        { ok: false, error: "channel must be comment or message" },
        { status: 400 },
      );
    }

    const result = await postMetaResponse({
      platform: body.platform,
      targetId: body.targetId,
      message: body.message,
      channel,
      dryRun: body.dryRun,
      accessToken: body.accessToken,
      instagramBusinessAccountId: body.instagramBusinessAccountId,
      replyToId: body.replyToId,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Failed to send Meta response:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while sending response",
      },
      { status: 500 },
    );
  }
}
