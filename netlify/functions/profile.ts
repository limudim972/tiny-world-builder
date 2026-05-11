import type { Config } from '@netlify/functions';
import { db } from '../../db/index.js';
import { profiles } from '../../db/schema.js';
import { and, eq, ne } from 'drizzle-orm';
import { getAuthUserId, unauthorized, corsHeaders, corsResponse } from './auth.js';

async function getProfileByAuthId(auth0Id: string) {
  try {
    const [profile] = await db.select().from(profiles).where(eq(profiles.auth0Id, auth0Id));
    return profile || null;
  } catch (err) {
    // Fallback for deployments where the display_name migration has not run yet.
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('display_name')) throw err;
    const [profile] = await db
      .select({
        id: profiles.id,
        auth0Id: profiles.auth0Id,
        username: profiles.username,
        about: profiles.about,
        image: profiles.image,
        createdAt: profiles.createdAt,
        updatedAt: profiles.updatedAt,
      })
      .from(profiles)
      .where(eq(profiles.auth0Id, auth0Id));
    return profile ? { ...profile, displayName: profile.username } : null;
  }
}

async function saveProfileWithFallback(auth0Id: string, existing: any, values: { username: string; displayName: string; about: string; image: string }) {
  try {
    if (existing) {
      const [updated] = await db
        .update(profiles)
        .set({
          username: values.username,
          displayName: values.displayName,
          about: values.about,
          image: values.image,
          updatedAt: new Date(),
        })
        .where(eq(profiles.auth0Id, auth0Id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(profiles)
      .values({ auth0Id, username: values.username, displayName: values.displayName, about: values.about, image: values.image })
      .returning();
    return created;
  } catch (err) {
    // Fallback for deployments where the display_name migration has not run yet.
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('display_name')) throw err;
    if (existing) {
      const [updated] = await db
        .update(profiles)
        .set({
          username: values.username,
          about: values.about,
          image: values.image,
          updatedAt: new Date(),
        })
        .where(eq(profiles.auth0Id, auth0Id))
        .returning({
          id: profiles.id,
          auth0Id: profiles.auth0Id,
          username: profiles.username,
          about: profiles.about,
          image: profiles.image,
          createdAt: profiles.createdAt,
          updatedAt: profiles.updatedAt,
        });
      return { ...updated, displayName: values.displayName };
    }
    const [created] = await db
      .insert(profiles)
      .values({ auth0Id, username: values.username, about: values.about, image: values.image })
      .returning({
        id: profiles.id,
        auth0Id: profiles.auth0Id,
        username: profiles.username,
        about: profiles.about,
        image: profiles.image,
        createdAt: profiles.createdAt,
        updatedAt: profiles.updatedAt,
      });
    return { ...created, displayName: values.displayName };
  }
}

export default async (req: Request) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  try {
    if (req.method === 'OPTIONS') return corsResponse(origin);

    const auth0Id = await getAuthUserId();
    if (!auth0Id) return unauthorized();

    if (req.method === 'GET') {
      const profile = await getProfileByAuthId(auth0Id);
      if (!profile) return Response.json(null, { headers });
      return Response.json(profile, { headers });
    }

    if (req.method === 'PUT') {
    const body = await req.json();
    const username = String(body.username || '').trim().toLowerCase();
    const displayName = String(body.displayName || '').trim();
    const about = String(body.about || '').trim();
    const image = String(body.image || '').trim();

    if (!username) {
      return Response.json({ error: 'username is required' }, { status: 400, headers });
    }
    if (!/^[a-z0-9_]{3,24}$/.test(username)) {
      return Response.json({ error: 'username must be 3-24 chars: lowercase letters, numbers, underscores' }, { status: 400, headers });
    }
    if (!displayName) {
      return Response.json({ error: 'display name is required' }, { status: 400, headers });
    }
    if (image && image.length > 750_000) {
      return Response.json({ error: 'photo is too large; choose a smaller image' }, { status: 400, headers });
    }

    const existing = await getProfileByAuthId(auth0Id);
    const duplicateWhere = existing
      ? and(eq(profiles.username, username), ne(profiles.auth0Id, auth0Id))
      : eq(profiles.username, username);
    const [duplicate] = await db.select({ id: profiles.id }).from(profiles).where(duplicateWhere).limit(1);
    if (duplicate) {
      return Response.json({ error: 'username is already taken' }, { status: 409, headers });
    }

    const saved = await saveProfileWithFallback(auth0Id, existing, { username, displayName, about, image });
    return Response.json(saved, { status: existing ? 200 : 201, headers });
  }

    return new Response('Method not allowed', { status: 405, headers });
  } catch (err) {
    console.error('profile function failed:', err);
    const message = err instanceof Error ? err.message : 'Profile save failed';
    return Response.json({ error: message }, { status: 500, headers });
  }
};

export const config: Config = {
  path: '/api/profile',
};
