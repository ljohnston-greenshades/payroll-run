// Read-only HubSpot CRM client used by the Play Again screen to
// detect which rep got assigned to a contact (after Clay routes it)
// and to fetch that rep's profile so we can show their meeting link.
//
// Uses a Private App access token (`HUBSPOT_ACCESS_TOKEN`) with two
// scopes:
//   - crm.objects.contacts.read
//   - crm.objects.owners.read

const HS_API = "https://api.hubapi.com";

function authHeaders(): Record<string, string> | null {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

interface ContactSearchResponse {
  total: number;
  results: Array<{
    id: string;
    properties: {
      email?: string;
      hubspot_owner_id?: string | null;
    };
  }>;
}

// Find a contact by email and return their assigned owner_id (if any).
// Returns null if no contact found, no owner assigned, or the API
// call fails (we treat all failures as "not routed yet").
export async function findContactOwnerByEmail(
  email: string,
): Promise<string | null> {
  const headers = authHeaders();
  if (!headers) return null;
  try {
    const res = await fetch(`${HS_API}/crm/v3/objects/contacts/search`, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              { propertyName: "email", operator: "EQ", value: email },
            ],
          },
        ],
        properties: ["email", "hubspot_owner_id"],
        limit: 1,
      }),
    });
    if (!res.ok) {
      console.warn(
        `HubSpot contact search ${res.status} for ${email}: ${(await res
          .text()
          .catch(() => ""))
          .slice(0, 200)}`,
      );
      return null;
    }
    const data = (await res.json()) as ContactSearchResponse;
    const ownerId = data.results[0]?.properties?.hubspot_owner_id;
    return ownerId ? String(ownerId) : null;
  } catch (err) {
    console.warn("HubSpot contact search failed:", err);
    return null;
  }
}

interface OwnerResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

// Get an owner's profile (email + name) by owner_id. Returns null
// on failure — caller treats that as "not routed yet" and falls back
// to the generic demo CTA.
export async function getOwnerProfile(
  ownerId: string,
): Promise<{ email: string; firstName: string; lastName: string } | null> {
  const headers = authHeaders();
  if (!headers) return null;
  try {
    const res = await fetch(`${HS_API}/crm/v3/owners/${ownerId}`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(
        `HubSpot owner ${ownerId} fetch ${res.status}: ${(await res
          .text()
          .catch(() => ""))
          .slice(0, 200)}`,
      );
      return null;
    }
    const data = (await res.json()) as OwnerResponse;
    return {
      email: data.email,
      firstName: data.firstName ?? "",
      lastName: data.lastName ?? "",
    };
  } catch (err) {
    console.warn("HubSpot owner fetch failed:", err);
    return null;
  }
}
