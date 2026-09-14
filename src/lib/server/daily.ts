export interface DailyRoomResult {
  roomName: string;
  roomUrl: string;
}

export interface CreateDailyTokenParams {
  roomName: string;
  userId: string;
  userName: string;
  isTrainer: boolean;
  start: Date;
  end: Date;
}

function getDailyApiKey(): string | null {
  const key = process.env.DAILY_API_KEY?.trim();
  return key || null;
}

function getDailyDomain(): string {
  const domain = process.env.DAILY_DOMAIN?.trim();
  if (domain) {
    return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
  return "spotter.daily.co";
}

/**
 * Creates a unique private Daily room for a booking.
 * Maximum participants: 2 (trainer + customer).
 * Idempotent: Returns existing room URL if room already exists.
 */
export async function createDailyRoom(
  bookingIdOrNumber: string,
): Promise<DailyRoomResult> {
  const apiKey = getDailyApiKey();
  const sanitizedId = bookingIdOrNumber
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/^-+|-+$/g, "");
  const roomName = `spotter-${sanitizedId}`;

  // If no API key is provided (e.g. local dev / testing without API key), fallback to mock room details
  if (!apiKey) {
    console.warn(
      `[Daily Service] DAILY_API_KEY is not configured. Returning fallback room info for room '${roomName}'.`,
    );
    const domain = getDailyDomain();
    return {
      roomName,
      roomUrl: `https://${domain}/${roomName}`,
    };
  }

  try {
    const res = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: roomName,
        privacy: "private",
        properties: {
          max_participants: 2,
          enable_chat: true,
          enable_knocking: false,
          eject_at_room_exp: false,
        },
      }),
    });

    const data = await res.json();

    if (res.ok && data.url) {
      return {
        roomName: data.name || roomName,
        roomUrl: data.url,
      };
    }

    // Room already exists (Daily API returns HTTP 400 with 'already exists' message)
    if (res.status === 400 || res.status === 409) {
      console.log(`[Daily Service] Room '${roomName}' already exists. Retrieving details...`);
      const getRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (getRes.ok) {
        const getData = await getRes.json();
        if (getData.url) {
          return {
            roomName: getData.name || roomName,
            roomUrl: getData.url,
          };
        }
      }
    }

    console.error(`[Daily Service] Failed to create Daily room '${roomName}':`, data);
    const domain = getDailyDomain();
    return {
      roomName,
      roomUrl: `https://${domain}/${roomName}`,
    };
  } catch (error) {
    console.error(`[Daily Service Error] createDailyRoom for '${roomName}':`, error);
    const domain = getDailyDomain();
    return {
      roomName,
      roomUrl: `https://${domain}/${roomName}`,
    };
  }
}

/**
 * Generates a short-lived Daily meeting token server-side.
 * Trainer -> is_owner: true
 * Customer -> is_owner: false
 */
export async function createDailyMeetingToken(
  params: CreateDailyTokenParams,
): Promise<string> {
  const apiKey = getDailyApiKey();
  const { roomName, userId, userName, isTrainer, start, end } = params;

  // nbf: Allow joining 15 minutes before session start
  const nbf = Math.floor((start.getTime() - 15 * 60 * 1000) / 1000);
  // exp: Expire token 1 hour after session end to allow buffer for wrap-up
  const exp = Math.floor((end.getTime() + 60 * 60 * 1000) / 1000);

  if (!apiKey) {
    console.warn(
      `[Daily Service] DAILY_API_KEY not configured. Generating mock token for user '${userId}'.`,
    );
    return `mock-token-${userId}-${Date.now()}`;
  }

  try {
    const res = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          is_owner: isTrainer,
          user_name: userName || (isTrainer ? "Trainer" : "Customer"),
          user_id: userId,
          nbf,
          exp,
        },
      }),
    });

    const data = await res.json();

    if (res.ok && data.token) {
      return data.token;
    }

    console.error("[Daily Service] Failed to generate meeting token:", data);
    return `mock-token-${userId}-${Date.now()}`;
  } catch (error) {
    console.error("[Daily Service Error] createDailyMeetingToken:", error);
    return `mock-token-${userId}-${Date.now()}`;
  }
}
